import type { UserPreviewCardProps } from './user-preview-card-types'
import type { LookupMessageConversationResponse } from '~/types/api'
import { useUserOverlay } from '~/composables/useUserOverlay'
import { formatDateTime, formatListTime } from '~/utils/time-format'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { resolveNudgeAction } from '~/utils/nudge-action'
import type { MenuItem } from 'primevue/menuitem'
import { avatarRoundClass as getAvatarRoundClass } from '~/utils/avatar-rounding'
import { userColorTier } from '~/utils/user-tier'
import { PRIMARY_PREMIUM_ORANGE, PRIMARY_VERIFIED_BLUE } from '~/utils/theme-tint'

export type MenuItemWithIcon = MenuItem & { iconName?: string; value?: 'gotit' | 'ignore' }

/**
 * Script state for `AppUserPreviewCard`: viewer relationship, follow, message, and
 * nudge actions, the more menu, and status and last-online labels.
 */
export function useUserPreviewCard(props: UserPreviewCardProps) {
  const { user } = useUserOverlay(computed(() => props.user))

  const avatarRoundClass = computed(() => getAvatarRoundClass(Boolean(user.value?.isOrganization)))

  const { user: authUser, isPageAccount } = useAuth()
  const isAuthed = computed(() => Boolean(authUser.value?.id))
  const isSelf = computed(() => Boolean(authUser.value?.id && user.value.id && authUser.value.id === user.value.id))
  const viewerIsPremium = computed(() => Boolean(authUser.value?.premium || authUser.value?.premiumPlus))
  const previewUserFollowsViewer = computed(() => Boolean(user.value.relationship?.userFollowsViewer))
  const viewerIsVerified = computed(() => (authUser.value?.verifiedStatus ?? 'none') !== 'none')
  const previewUserIsVerified = computed(() => userColorTier(user.value) !== 'normal')

  const { apiFetchData } = useApiClient()
  const dmLookupCache = useState<Record<string, string | null>>('moh-dm-lookup-cache', () => ({}))
  const dmLookupConversationId = ref<string | null>(null)
  const dmLookupInflight = ref(false)

  const isMutualFollow = computed(() => {
    const rel = user.value.relationship
    return Boolean(rel?.viewerFollowsUser && rel?.userFollowsViewer)
  })

  const viewerIsAdmin = computed(() => Boolean(authUser.value?.siteAdmin))

  // Verified users can start DMs with mutuals; premium users and admins can DM any member.
  const viewerCanStartChats = computed(() => viewerIsPremium.value || viewerIsAdmin.value || isMutualFollow.value)

  const shouldCheckExistingChat = computed(() => {
    if (!isAuthed.value) return false
    if (!viewerIsVerified.value && !viewerIsAdmin.value) return false
    if (!previewUserIsVerified.value && !viewerIsAdmin.value) return false
    if (isSelf.value) return false
    if (!user.value.id) return false
    // If viewer can't start a new chat (not premium, not mutual), check for an existing conversation to still show the button.
    if (!viewerCanStartChats.value) return true
    // Decide filled vs outline based on whether the other user follows back.
    if (!previewUserFollowsViewer.value) return true
    return false
  })

  watch(
    () => [shouldCheckExistingChat.value, user.value.id] as const,
    async ([shouldCheck, userId]) => {
      dmLookupConversationId.value = null
      if (!shouldCheck || !userId) return

      const cached = dmLookupCache.value[userId]
      if (cached !== undefined) {
        dmLookupConversationId.value = cached
        return
      }

      dmLookupInflight.value = true
      try {
        const res = await apiFetchData<LookupMessageConversationResponse['data']>('/messages/lookup', {
          method: 'POST',
          body: { user_ids: [userId] },
        })
        const convoId = res?.conversationId ?? null
        dmLookupCache.value = { ...dmLookupCache.value, [userId]: convoId }
        dmLookupConversationId.value = convoId
      } catch {
        // Best-effort: treat as unknown/no chat.
        dmLookupConversationId.value = null
      } finally {
        dmLookupInflight.value = false
      }
    },
    { immediate: true },
  )

  const hasExistingChat = computed(() => Boolean(dmLookupConversationId.value))

  const canSendMessageFromPreview = computed(() => {
    if (!isAuthed.value) return false
    if (!viewerIsVerified.value && !viewerIsAdmin.value) return false
    if (!previewUserIsVerified.value && !viewerIsAdmin.value) return false
    if (isSelf.value) return false
    if (!user.value.id || !user.value.username) return false
    // Verified mutuals and premium can start new chats; others need an existing conversation.
    if (viewerCanStartChats.value) return true
    return hasExistingChat.value
  })

  const nudgeState = ref(user.value.nudge ?? null)
  watch(
    () => user.value.nudge ?? null,
    (next) => {
      nudgeState.value = next ?? null
    },
    { immediate: true },
  )

  const nudgeAction = computed(() => resolveNudgeAction({
    isAuthed: isAuthed.value,
    isSelf: isSelf.value,
    hasTarget: Boolean(user.value.id && user.value.username),
    isMutualFollow: isMutualFollow.value,
    viewerIsVerified: viewerIsVerified.value,
    inboundPending: Boolean(nudgeState.value?.inboundPending),
    outboundPending: Boolean(nudgeState.value?.outboundPending),
    viewerIsPage: isPageAccount.value,
    targetIsPage: user.value.accountKind === 'page',
  }))
  const showNudge = computed(() => nudgeAction.value.kind !== 'hidden')
  const nudgeDisabledTooltip = computed(() => (
    nudgeAction.value.reason ? tinyTooltip(nudgeAction.value.reason) : undefined
  ))

  const nudgeInflight = ref(false)
  const ignoreInflight = ref(false)
  const { nudgeUser, ackNudge, ignoreNudge, markNudgeNudgedBackById } = useNudge()
  const { push: pushToast } = useAppToast()

  const nudgePrimaryDisabled = computed(() => (
    nudgeInflight.value || ignoreInflight.value || nudgeAction.value.disabled
  ))
  const gotItNudgeTooltip = 'Accepts the nudge. They can nudge you again without you nudging back.'
  const ignoreNudgeTooltip = 'Dismisses it, but they still can’t nudge you again for 24 hours (unless you nudge them back).'
  const nudgeMenuRef = ref<{ toggle: (event: Event) => void } | null>(null)
  const nudgeMenuItems = computed<MenuItemWithIcon[]>(() => [
    {
      label: 'Got it',
      iconName: 'tabler:check',
      value: 'gotit',
      command: () => void onNudgeGotIt(),
    },
    {
      label: 'Ignore',
      iconName: 'tabler:ban',
      value: 'ignore',
      command: () => void onNudgeIgnore(),
    },
  ])

  function toggleNudgeMenu(event: Event) {
    nudgeMenuRef.value?.toggle(event)
  }

  async function onNudgeGotIt() {
    const id = nudgeState.value?.inboundNotificationId ?? null
    if (!id) return
    ignoreInflight.value = true
    try {
      await ackNudge(id, { username: user.value.username ?? null })
      nudgeState.value = {
        outboundPending: Boolean(nudgeState.value?.outboundPending),
        inboundPending: false,
        inboundNotificationId: null,
        outboundExpiresAt: nudgeState.value?.outboundExpiresAt ?? null,
      }
      pushToast({ title: 'Got it', tone: 'success' })
    } finally {
      ignoreInflight.value = false
    }
  }

  async function onNudgeIgnore() {
    const id = nudgeState.value?.inboundNotificationId ?? null
    if (!id) return
    ignoreInflight.value = true
    try {
      await ignoreNudge(id, { username: user.value.username ?? null })
      nudgeState.value = {
        outboundPending: Boolean(nudgeState.value?.outboundPending),
        inboundPending: false,
        inboundNotificationId: null,
        outboundExpiresAt: nudgeState.value?.outboundExpiresAt ?? null,
      }
      pushToast({ title: 'Ignored', tone: 'success' })
    } finally {
      ignoreInflight.value = false
    }
  }

  async function onNudgeBack() {
    if (nudgeAction.value.disabled) return
    const username = user.value.username ?? null
    const inboundId = nudgeState.value?.inboundNotificationId ?? null
    if (!username || !inboundId) return

    nudgeInflight.value = true
    try {
      await markNudgeNudgedBackById(inboundId, { username }).catch(() => {})
      const res = await nudgeUser(username)
      nudgeState.value = {
        outboundPending: true,
        inboundPending: false,
        inboundNotificationId: null,
        outboundExpiresAt: res.nextAllowedAt ?? null,
      }
      pushToast({ title: 'Nudged back', tone: 'success' })
    } finally {
      nudgeInflight.value = false
    }
  }

  async function onNudgePrimary() {
    if (nudgeAction.value.disabled) return
    const username = user.value.username ?? null
    if (!username) return

    nudgeInflight.value = true
    try {
      const res = await nudgeUser(username)
      nudgeState.value = {
        outboundPending: true,
        inboundPending: false,
        inboundNotificationId: null,
        outboundExpiresAt: res.nextAllowedAt ?? null,
      }
    } finally {
      nudgeInflight.value = false
    }
  }

  const { addInterest, removeInterest, getPresenceStatus, getUserStatus, getCurrentSpaceForUser, isPresenceKnown } = usePresence()
  const { select: selectSpace } = useSpaceLobby()
  const { getById: getSpaceById } = useSpaces()
  const lastUserId = ref<string | null>(null)
  watch(
    () => user.value.id ?? null,
    (nextId) => {
      if (!import.meta.client) return
      const prev = lastUserId.value
      if (prev && prev !== nextId) removeInterest([prev])
      lastUserId.value = nextId ?? null
      if (nextId) addInterest([nextId])
    },
    { immediate: true },
  )
  onBeforeUnmount(() => {
    const id = lastUserId.value
    if (id) removeInterest([id])
  })

  const presenceStatus = computed(() => {
    const id = user.value.id
    if (!id) return 'offline'
    return getPresenceStatus(id)
  })
  const showOnlineNow = computed(() => presenceStatus.value !== 'offline')
  const activeStatus = computed(() => getUserStatus(user.value.id ?? ''))

  // Status pill shape adapts to wrapped text: pill (rounded-full) when the
  // status fits on one line, rounded rectangle (rounded-xl) when it wraps to
  // two lines. Measurement runs on the span so we react to width changes from
  // the pop-over resizing as well as text edits.
  const statusTextEl = ref<HTMLElement | null>(null)
  const { isMultiline: statusIsMultiline } = useIsMultiline(statusTextEl)
  const currentSpaceId = computed(() => getCurrentSpaceForUser(user.value.id ?? ''))
  const currentSpace = computed(() => getSpaceById(currentSpaceId.value))

  const viewerCanSeeLastOnline = computed(() => {
    const status = authUser.value?.verifiedStatus ?? 'none'
    return Boolean(authUser.value?.siteAdmin) || (typeof status === 'string' && status !== 'none')
  })

  const showLastOnline = computed(() => {
    if (!viewerCanSeeLastOnline.value) return false
    if (presenceStatus.value !== 'offline') return false
    if (!user.value.id || !isPresenceKnown(user.value.id)) return false
    return Boolean(user.value.lastOnlineAt)
  })
  const { nowMs } = useNowTicker({ everyMs: 15_000 })
  const lastOnlineShort = computed(() => {
    const iso = user.value.lastOnlineAt ?? null
    const t = formatListTime(iso, nowMs.value)
    if (t === 'now') return '<1m ago'
    if (/^\d+[mhd]$/.test(t)) return `${t} ago`
    return t
  })
  const lastOnlineTooltip = computed(() => {
    const iso = user.value.lastOnlineAt ?? null
    if (!iso) return null
    return formatDateTime(iso, { dateStyle: 'medium', timeStyle: 'short' })
  })

  const profilePath = computed(() => {
    const u = (user.value.username ?? '').trim()
    return u ? `/u/${encodeURIComponent(u)}` : null
  })

  const locationLabel = computed(() => {
    const s = user.value.locationDisplay ?? null
    const v = typeof s === 'string' ? s.trim() : ''
    return v || null
  })

  const locationState = computed(() => {
    const s = user.value.locationState ?? null
    return typeof s === 'string' && s.trim() ? s.trim().toUpperCase() : null
  })

  const locationTo = computed(() => {
    if (!locationState.value) return null
    return `/state/${String(locationState.value).toLowerCase()}`
  })
  const followersPath = computed(() => (profilePath.value ? `${profilePath.value}/followers` : null))
  const followingPath = computed(() => (profilePath.value ? `${profilePath.value}/following` : null))

  const displayName = computed(() => {
    const nm = (user.value.name ?? '').trim()
    if (nm) return nm
    const un = (user.value.username ?? '').trim()
    return un ? `@${un}` : 'User'
  })

  const pop = useUserPreviewPopover()
  function onNavigate() {
    pop.close()
  }

  async function joinCurrentSpace() {
    const spaceId = currentSpaceId.value
    if (!spaceId) return
    pop.close()
    await selectSpace(spaceId)
  }

  const messageTier = computed(() => userColorTier(user.value))
  const messageFilledButtonClass = computed(() => {
    const tier = messageTier.value
    // Orgs are silver: use same treatment as org chat bubbles.
    if (tier === 'organization') return '!border-[#313643] !bg-[#313643] !text-white hover:opacity-95'
    // Use fixed colors so org viewer theme can't override target tier.
    if (tier === 'premium') return `!border-[${PRIMARY_PREMIUM_ORANGE[500]}] !bg-[${PRIMARY_PREMIUM_ORANGE[500]}] !text-white hover:opacity-95`
    if (tier === 'verified') return `!border-[${PRIMARY_VERIFIED_BLUE[500]}] !bg-[${PRIMARY_VERIFIED_BLUE[500]}] !text-white hover:opacity-95`
    return '!border-gray-900 !bg-gray-900 !text-white hover:opacity-95 dark:!border-white dark:!bg-white dark:!text-gray-900'
  })

  const messageOutlineButtonClass = computed(() => {
    const tier = messageTier.value
    if (tier === 'organization') {
      return '!bg-transparent !border-[#313643] !text-[#313643] dark:!border-[#8b96aa] dark:!text-[#b0bac9] hover:!bg-[rgba(49,54,67,0.08)] dark:hover:!bg-[rgba(176,186,201,0.12)]'
    }
    if (tier === 'premium') {
      return `!bg-transparent !border-[${PRIMARY_PREMIUM_ORANGE[500]}] !text-[${PRIMARY_PREMIUM_ORANGE[500]}] hover:!bg-[rgba(var(--moh-premium-rgb),0.08)] dark:hover:!bg-[rgba(var(--moh-premium-rgb),0.16)]`
    }
    if (tier === 'verified') {
      return `!bg-transparent !border-[${PRIMARY_VERIFIED_BLUE[500]}] !text-[${PRIMARY_VERIFIED_BLUE[500]}] hover:!bg-[rgba(43,123,185,0.08)] dark:hover:!bg-[rgba(43,123,185,0.16)]`
    }
    return '!bg-transparent !border-gray-900 !text-gray-900 hover:!bg-gray-900/5 dark:!border-gray-200 dark:!text-gray-200 dark:hover:!bg-white/10'
  })

  const messageButtonClass = computed(() => {
    // Filled when:
    // - they follow you OR
    // - you already have a chat together
    // Outline only when:
    // - they don't follow you AND
    // - you don't already have a chat
    if (hasExistingChat.value) return messageFilledButtonClass.value
    return previewUserFollowsViewer.value ? messageFilledButtonClass.value : messageOutlineButtonClass.value
  })

  function onSendMessage() {
    const username = (user.value.username ?? '').trim()
    const userId = user.value.id ?? null
    if (!username || !userId) return
    pop.close()
    void (async () => {
      // If we already know there's a conversation, deep-link directly to it (avoids the extra URL hop).
      const cached = dmLookupCache.value[userId]
      let conversationId: string | null = dmLookupConversationId.value ?? (cached !== undefined ? cached : null)

      // If we haven't checked yet, do a quick lookup on click.
      if (conversationId === null && cached === undefined && !dmLookupInflight.value) {
        try {
          const res = await apiFetchData<LookupMessageConversationResponse['data']>('/messages/lookup', {
            method: 'POST',
            body: { user_ids: [userId] },
          })
          conversationId = res?.conversationId ?? null
          dmLookupCache.value = { ...dmLookupCache.value, [userId]: conversationId }
          dmLookupConversationId.value = conversationId
        } catch {
          // ignore
        }
      }

      if (conversationId) {
        await navigateTo({ path: '/chat', query: { c: conversationId } })
        return
      }
      await navigateTo({ path: '/chat', query: { to: username } })
    })()
  }

  return {
    user,
    avatarRoundClass,
    canSendMessageFromPreview,
    nudgeAction,
    showNudge,
    nudgeDisabledTooltip,
    nudgePrimaryDisabled,
    gotItNudgeTooltip,
    ignoreNudgeTooltip,
    nudgeMenuRef,
    nudgeMenuItems,
    toggleNudgeMenu,
    onNudgeBack,
    onNudgePrimary,
    showOnlineNow,
    activeStatus,
    statusTextEl,
    statusIsMultiline,
    currentSpaceId,
    currentSpace,
    showLastOnline,
    lastOnlineShort,
    lastOnlineTooltip,
    profilePath,
    locationLabel,
    locationState,
    locationTo,
    followersPath,
    followingPath,
    displayName,
    pop,
    onNavigate,
    joinCurrentSpace,
    messageButtonClass,
    onSendMessage,
  }
}
