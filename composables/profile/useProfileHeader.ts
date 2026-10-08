import { formatLocaleDate } from '~/utils/time-format'
import type { ProfileHeaderProps, ProfileHeaderEmits } from './profile-header-types'
import { userNotificationOptions, userNotificationPreference } from '~/utils/user-notification-preference'
import type { NudgeState } from '~/types/api'
import { followedByLabel } from '~/utils/followed-by'
import { buildSocialLinks } from '~/utils/social-links'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { resolveNudgeAction } from '~/utils/nudge-action'
import type { MenuItem } from 'primevue/menuitem'
import { useUserOverlay } from '~/composables/useUserOverlay'
import { avatarRoundClass as getAvatarRoundClass, crewAvatarRoundClass } from '~/utils/avatar-rounding'
import { userColorTier } from '~/utils/user-tier'
import { useProfileHeaderMenus } from './useProfileHeaderMenus'
import type { InjectionKey } from 'vue'

/**
 * Script state for `AppProfileHeader`, shared with its banner, action-row, and details
 * sections through `useProfileHeaderContext()`.
 */
export function useProfileHeader(props: ProfileHeaderProps, emit: ProfileHeaderEmits) {
  const profileState = useProfileHeaderProfile(props, emit)
  const menus = useProfileHeaderMenus(emit, profileState)
  const ctx = { ...profileState, ...menus, emit }
  provide(PROFILE_HEADER_CONTEXT, ctx)
  return ctx
}

export type MenuItemWithIcon = MenuItem & { iconName?: string; value?: 'gotit' | 'ignore' }

/**
 * Profile identity, metadata links, crew pill, follow/chat affordances, and nudge actions.
 */
export function useProfileHeaderProfile(props: ProfileHeaderProps, emit: ProfileHeaderEmits) {
  const crewAvatarRound = crewAvatarRoundClass()

  const boardPoints = computed(() => props.profile?.boardPoints ?? 0)
  /** Organization accounts only: the API sends null for people, which hides the count. */
  const affiliateCount = computed(() => {
    const count = props.profile?.affiliateCount
    return typeof count === 'number' ? count : null
  })
  const followedByAuthors = computed(() =>
    (props.followedBy?.users ?? []).map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      avatarUrl: u.avatarUrl,
      avatarVideo: u.avatarVideo ?? null,
      isOrganization: u.isOrganization,
    })),
  )
  const followedByLabelText = computed(() =>
    props.followedBy ? followedByLabel(props.followedBy.users, props.followedBy.total) : null,
  )

  const { user: profile } = useUserOverlay(computed(() => props.profile ?? null))
  const avatarRoundClass = computed(() => getAvatarRoundClass(Boolean(profile.value?.isOrganization)))
  const profileName = computed(() => props.profileName)
  const profileAvatarUrl = computed(() => props.profileAvatarUrl ?? null)
  const profileBannerUrl = computed(() => props.profileBannerUrl ?? null)
  const hasAvatar = computed(() => Boolean((profileAvatarUrl.value ?? '').trim()))
  const hasBanner = computed(() => Boolean((profileBannerUrl.value ?? '').trim()))
  const relationshipTagLabel = computed(() => props.relationshipTagLabel ?? null)
  const isSelf = computed(() => Boolean(props.isSelf))
  const isAdminOverride = computed(() => Boolean(props.isAdminOverride))
  const showEditProfileNudge = computed(() => isSelf.value && !hasAvatar.value && !hasBanner.value)
  const editProfileNudgeToneClass = computed(() => {
    const p = profile.value
    if (p?.premium || p?.premiumPlus) return 'moh-edit-profile-nudge--premium'
    if (p?.verifiedStatus && p.verifiedStatus !== 'none') return 'moh-edit-profile-nudge--verified'
    return 'moh-edit-profile-nudge--normal'
  })
  const followState = useFollowState()
  const followRelationship = computed(() => {
    const id = profile.value?.id ?? null
    if (id) return followState.get(id) ?? props.followRelationship ?? null
    return props.followRelationship ?? null
  })
  const nudgeFromProps = computed(() => props.nudge ?? null)
  const showFollowCounts = computed(() => Boolean(props.showFollowCounts))
  const followingCount = computed(() => props.followingCount ?? null)
  const hideBannerThumb = computed(() => Boolean(props.hideBannerThumb))
  const hideAvatarThumb = computed(() => Boolean(props.hideAvatarThumb))
  const hideAvatarDuringBanner = computed(() => Boolean(props.hideAvatarDuringBanner))

  const followerCountN = computed(() => Math.max(0, Math.floor(props.followerCount ?? 0)))
  const followerLabel = computed(() => (followerCountN.value === 1 ? 'Follower' : 'Followers'))

  const { user: authUser, isVerifiedMember, isPageAccount } = useAuth()
  const isAuthed = computed(() => Boolean(authUser.value?.id))
  // Setting your own status is a verified-only engagement feature. Unverified
  // users still see everyone's statuses (including their own, read-only).
  const canSetStatus = computed(() => isSelf.value && isVerifiedMember.value)
  const { show: showAuthActionModal } = useAuthActionModal()
  const viewerIsPremium = computed(() => Boolean(authUser.value?.premium || authUser.value?.premiumPlus))
  // Verified users can start DMs with mutuals; premium users can DM any member.
  const viewerIsAdmin = computed(() => Boolean(authUser.value?.siteAdmin))
  const viewerCanStartChats = computed(() => {
    if (viewerIsPremium.value || viewerIsAdmin.value) return true
    const rel = followRelationship.value
    return viewerIsVerified.value && Boolean(rel?.viewerFollowsUser && rel?.userFollowsViewer)
  })
  const viewerIsVerified = computed(() => (authUser.value?.verifiedStatus ?? 'none') !== 'none')

  const locationLabel = computed(() => {
    const s = (profile.value as any)?.locationDisplay ?? null
    const v = typeof s === 'string' ? s.trim() : ''
    return v ? v : null
  })

  const locationState = computed(() => {
    const s = (profile.value as any)?.locationState ?? null
    return typeof s === 'string' && s.trim() ? s.trim().toUpperCase() : null
  })

  const locationTo = computed(() => {
    const p = profile.value as any
    const state = typeof p?.locationState === 'string' ? p.locationState.trim().toUpperCase() : ''
    if (!state) return null
    // State posts feed (with members facepile); "See all" there opens /l.
    return `/state/${state.toLowerCase()}`
  })

  const websiteHref = computed(() => {
    const s = (profile.value as any)?.website ?? null
    const v = typeof s === 'string' ? s.trim() : ''
    return v ? v : null
  })

  const socialLinks = computed(() => {
    const p = profile.value as any
    return buildSocialLinks({
      xUsername: p?.xUsername ?? null,
      pickaxUsername: p?.pickaxUsername ?? null,
      rumbleUrl: p?.rumbleUrl ?? null,
      linkedinUrl: p?.linkedinUrl ?? null,
      youtubeUrl: p?.youtubeUrl ?? null,
    })
  })

  const websiteLabel = computed(() => {
    const href = websiteHref.value
    if (!href) return ''
    try {
      const u = new URL(href)
      const host = u.hostname
      const path = u.pathname && u.pathname !== '/' ? u.pathname.replace(/\/$/, '') : ''
      return `${host}${path}`
    } catch {
      return href
    }
  })

  const birthdayLabel = computed(() => {
    const display = (profile.value as any)?.birthdayDisplay ?? null
    const displayV = typeof display === 'string' ? display.trim() : ''
    if (displayV) return displayV
    const s = (profile.value as any)?.birthdayMonthDay ?? null
    const v = typeof s === 'string' ? s.trim() : ''
    return v ? v : null
  })

  const joinedLabel = computed(() => {
    const raw = (profile.value as any)?.createdAt ?? null
    if (!raw) return null
    const d = new Date(String(raw))
    if (Number.isNaN(d.getTime())) return null
    return formatLocaleDate(d, { month: 'short', year: 'numeric' })
  })

  // Subtle "my crew" pill sourced lazily from the compact crew summary endpoint.
  // Keeps profile page lean and avoids inflating the PublicProfile DTO with crew data
  // that most viewers never look at.
  const crewApi = useCrew()
  const crewPill = ref<import('~/types/api').CrewPublic | null>(null)
  const crewPillName = computed(() => {
    if (!crewPill.value) return ''
    const n = (crewPill.value.name ?? '').trim()
    return n.length > 0 ? n : 'Untitled Crew'
  })
  watch(
    () => profile.value?.id ?? null,
    async (id) => {
      if (!id) {
        crewPill.value = null
        return
      }
      try {
        crewPill.value = await crewApi.getCrewForUser(id)
      } catch {
        crewPill.value = null
      }
    },
    { immediate: true },
  )

  const crewPreviewPop = useCrewPreviewPopover()

  function onCrewPillEnter(e: MouseEvent) {
    const crew = crewPill.value
    const el = e.currentTarget as HTMLElement | null
    if (!crew || !el) return
    crewPreviewPop.onTriggerEnter({ crew, anchorEl: el })
  }

  function onCrewPillLeave() {
    crewPreviewPop.onTriggerLeave()
  }

  const viewerFollowsUser = computed(() => Boolean(followRelationship.value?.viewerFollowsUser))
  const showPostBell = computed(() => {
    if (!isAuthed.value) return false
    if (isSelf.value) return false
    if (!profile.value?.id || !profile.value?.username) return false
    return viewerFollowsUser.value
  })

  const notificationPreferencesOpen = ref(false)
  const notificationPreference = computed(() => userNotificationPreference(followRelationship.value))
  const notificationLabel = computed(() => userNotificationOptions.find(option => option.value === notificationPreference.value)?.label || 'Off')
  watch(() => profile.value?.id, () => { notificationPreferencesOpen.value = false })
  watch(showPostBell, shown => { if (!shown) notificationPreferencesOpen.value = false })

  const showChatButton = computed(() => {
    if (!isAuthed.value) return false
    if (!viewerIsVerified.value && !viewerIsAdmin.value) return false
    if (isSelf.value) return false
    if (!profile.value?.username) return false
    // Admins can message anyone; non-admins can't start chats with unverified accounts.
    if (!viewerIsAdmin.value && userColorTier(profile.value) === 'normal') return false
    return true
  })

  const startChatInfoVisible = ref(false)
  function goPremium() {
    return navigateTo('/tiers')
  }
  function goBilling() {
    return navigateTo('/settings/billing')
  }
  function onChatClick() {
    const username = (profile.value?.username ?? '').trim()
    if (!username) return
    if (!viewerCanStartChats.value) {
      startChatInfoVisible.value = true
      return
    }
    void navigateTo({ path: '/chat', query: { to: username } })
  }

  const isMutualFollow = computed(() => {
    const rel = followRelationship.value
    if (!rel) return false
    return Boolean(rel.viewerFollowsUser && rel.userFollowsViewer)
  })

  const nudgeState = ref<NudgeState | null>(nudgeFromProps.value)
  watch(
    nudgeFromProps,
    (next) => {
      nudgeState.value = next ?? null
    },
    { immediate: true },
  )

  const nudgeAction = computed(() => resolveNudgeAction({
    isAuthed: isAuthed.value,
    isSelf: isSelf.value,
    hasTarget: Boolean(profile.value?.id && profile.value?.username),
    isMutualFollow: isMutualFollow.value,
    viewerIsVerified: viewerIsVerified.value,
    inboundPending: Boolean(nudgeState.value?.inboundPending),
    outboundPending: Boolean(nudgeState.value?.outboundPending),
    viewerIsPage: isPageAccount.value,
    targetIsPage: profile.value?.accountKind === 'page',
  }))
  const showNudge = computed(() => nudgeAction.value.kind !== 'hidden')
  const nudgeDisabledTooltip = computed(() => (
    nudgeAction.value.reason ? tinyTooltip(nudgeAction.value.reason) : undefined
  ))

  const nudgeInflight = ref(false)
  const ignoreInflight = ref(false)
  const { nudgeUser, ackNudge, ignoreNudge, markNudgeNudgedBackById } = useNudge()
  const { push: pushToast } = useAppToast()

  const gotItNudgeTooltip = 'Accepts the nudge. They can nudge you again without you nudging back.'
  const ignoreNudgeTooltip = 'Dismisses it, but they still can’t nudge you again for 24 hours (unless you nudge them back).'

  const nudgePrimaryDisabled = computed(() => (
    nudgeInflight.value || ignoreInflight.value || nudgeAction.value.disabled
  ))
  const nudgeMenuMounted = ref(false)
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

  async function toggleNudgeMenu(event: Event) {
    nudgeMenuMounted.value = true
    await nextTick()
    nudgeMenuRef.value?.toggle(event)
  }

  async function onNudgeGotIt() {
    const id = nudgeState.value?.inboundNotificationId ?? null
    if (!id) return
    ignoreInflight.value = true
    try {
      await ackNudge(id, { username: profile.value?.username ?? null })
      nudgeState.value = {
        outboundPending: Boolean(nudgeState.value?.outboundPending),
        inboundPending: false,
        inboundNotificationId: null,
        outboundExpiresAt: nudgeState.value?.outboundExpiresAt ?? null,
      }
      emit('nudge-updated', nudgeState.value)
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
      await ignoreNudge(id, { username: profile.value?.username ?? null })
      nudgeState.value = {
        outboundPending: Boolean(nudgeState.value?.outboundPending),
        inboundPending: false,
        inboundNotificationId: null,
        outboundExpiresAt: nudgeState.value?.outboundExpiresAt ?? null,
      }
      emit('nudge-updated', nudgeState.value)
      pushToast({ title: 'Ignored', tone: 'success' })
    } finally {
      ignoreInflight.value = false
    }
  }

  async function onNudgeBack() {
    if (nudgeAction.value.disabled) return
    const username = profile.value?.username ?? null
    const inboundId = nudgeState.value?.inboundNotificationId ?? null
    if (!username || !inboundId) return

    nudgeInflight.value = true
    try {
      // Mark "nudged back" on the inbound notification (best-effort), then send our nudge.
      await markNudgeNudgedBackById(inboundId, { username }).catch(() => {})
      const res = await nudgeUser(username)
      nudgeState.value = {
        outboundPending: true,
        inboundPending: false,
        inboundNotificationId: null,
        outboundExpiresAt: res.nextAllowedAt ?? null,
      }
      emit('nudge-updated', nudgeState.value)
      pushToast({ title: 'Nudged back', tone: 'success' })
    } finally {
      nudgeInflight.value = false
    }
  }

  async function onNudgePrimary() {
    if (nudgeAction.value.disabled) return
    const username = profile.value?.username ?? null
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
      emit('nudge-updated', nudgeState.value)
    } finally {
      nudgeInflight.value = false
    }
  }

  return {
    crewAvatarRound,
    boardPoints,
    affiliateCount,
    followedByAuthors,
    followedByLabelText,
    profile,
    avatarRoundClass,
    profileName,
    profileAvatarUrl,
    profileBannerUrl,
    relationshipTagLabel,
    isSelf,
    isAdminOverride,
    showEditProfileNudge,
    editProfileNudgeToneClass,
    followRelationship,
    showFollowCounts,
    followingCount,
    hideBannerThumb,
    hideAvatarThumb,
    hideAvatarDuringBanner,
    followerCountN,
    followerLabel,
    authUser,
    isAuthed,
    canSetStatus,
    showAuthActionModal,
    viewerIsVerified,
    locationLabel,
    locationState,
    locationTo,
    websiteHref,
    socialLinks,
    websiteLabel,
    birthdayLabel,
    joinedLabel,
    crewPill,
    crewPillName,
    onCrewPillEnter,
    onCrewPillLeave,
    showPostBell,
    notificationPreferencesOpen,
    notificationPreference,
    notificationLabel,
    showChatButton,
    startChatInfoVisible,
    goPremium,
    goBilling,
    onChatClick,
    nudgeAction,
    showNudge,
    nudgeDisabledTooltip,
    gotItNudgeTooltip,
    ignoreNudgeTooltip,
    nudgePrimaryDisabled,
    nudgeMenuMounted,
    nudgeMenuRef,
    nudgeMenuItems,
    toggleNudgeMenu,
    onNudgeBack,
    onNudgePrimary,
  }
}

export type ProfileHeaderContext = ReturnType<typeof useProfileHeader>

export const PROFILE_HEADER_CONTEXT: InjectionKey<ProfileHeaderContext> = Symbol('profile-header')

/** Section components of AppProfileHeader read the shared context here. */
export function useProfileHeaderContext(): ProfileHeaderContext {
  const ctx = inject(PROFILE_HEADER_CONTEXT)
  if (!ctx) throw new Error('useProfileHeaderContext() must be used inside AppProfileHeader')
  return ctx
}
