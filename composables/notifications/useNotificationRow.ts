import type { CommunityGroupShell, FollowSummaryResponse, Notification } from '~/types/api'
import { stableListKey } from '~/utils/stable-list-key'
import type { MenuItem } from 'primevue/menuitem'

/**
 * Script state for `AppNotificationRow`: local read overlay, actor/group hover
 * previews, and the inline nudge, follow-back, crew-invite, and group-invite actions.
 */
export function useNotificationRow(props: { notification: Notification; nudgeIsTopmost?: boolean }) {
  const activityBadgeTone = useActivityBadgeTone()

  const {
    actorDisplay,
    subjectPostVisibilityTextClass,
    subjectTierRowClass,
    titleSuffix,
    isBoostOfStatus,
    statusBoostText,
    boostSubjectNoun,
    formatWhen,
    formatWhenFull,
  } = useNotifications()

  /** Splits a string like "foo **bar** baz" into bold/plain segments for inline rendering. */
  function parseBoldSegments(text: string): Array<{ text: string; bold: boolean }> {
    const segments: Array<{ text: string; bold: boolean }> = []
    const parts = text.split(/\*\*/)
    for (let i = 0; i < parts.length; i++) {
      if (parts[i]) segments.push({ text: parts[i]!, bold: i % 2 === 1 })
    }
    return segments
  }
  const localReadAt = ref<string | null>(null)
  const notification = computed<Notification>(() => {
    if (!localReadAt.value) return props.notification
    return { ...props.notification, readAt: localReadAt.value }
  })

  const { onEnter: onActorEnter, onMove: onActorMove, onLeave: onActorLeave } = useUserPreviewTrigger({
    username: computed(() => props.notification.actor?.username ?? ''),
  })

  // Minimal shell for the marv_not_in_group group-name hover preview.
  const marvGroupShell = computed<CommunityGroupShell | null>(() => {
    const n = notification.value
    if (n.kind !== 'marv_not_in_group') return null
    if (!n.subjectGroupId || !n.subjectGroupSlug || !n.subjectGroupName) return null
    return {
      id: n.subjectGroupId,
      slug: n.subjectGroupSlug,
      name: n.subjectGroupName,
      description: '',
      rules: null,
      coverImageUrl: null,
      avatarImageUrl: n.subjectGroupAvatarUrl ?? null,
      joinPolicy: 'open',
      memberCount: 0,
      isFeatured: false,
      featuredOrder: 0,
      createdAt: '',
      viewerMembership: null,
      viewerPendingApproval: false,
    }
  })
  const { onEnter: onGroupEnter, onMove: onGroupMove, onLeave: onGroupLeave } = useGroupPreviewTrigger({
    shell: marvGroupShell,
  })
  const nudgeIsTopmost = computed(() => props.nudgeIsTopmost !== false)

  function notificationMediaPreviewKey(
    media: { kind?: string | null; url?: string | null; thumbnailUrl?: string | null },
    idx: number,
  ): string {
    return stableListKey('media', media.kind ?? 'unknown', media.thumbnailUrl ?? media.url ?? 'none', idx)
  }

  const { nudgeUser, ignoreNudge, ackNudge, markNudgeNudgedBackById } = useNudge()
  const { apiFetchData } = useApiClient()
  const { push: pushToast } = useAppToast()
  const followState = useFollowState()

  const nudgeActionState = ref<'idle' | 'nudged' | 'ignored' | 'gotit'>('idle')
  const gotItNudgeTooltip = 'Accepts the nudge. They can nudge you again without you nudging back.'
  const ignoreNudgeTooltip = 'Dismisses it, but they still can’t nudge you again for 24 hours (unless you nudge them back).'

  const canShowNudgeBack = ref(false)
  const nudgeInflight = ref(false)
  const ignoreInflight = ref(false)

  type MenuItemWithIcon = MenuItem & { iconName?: string; value?: 'gotit' | 'ignore' }
  const nudgeMenuMounted = ref(false)
  const nudgeMenuRef = ref<{ toggle: (event: Event) => void } | null>(null)
  const nudgeMenuItems = computed<MenuItemWithIcon[]>(() => [
    { label: 'Got it', iconName: 'tabler:check', value: 'gotit', command: () => void onGotIt() },
    { label: 'Ignore', iconName: 'tabler:ban', value: 'ignore', command: () => void onIgnore() },
  ])

  async function toggleNudgeMenu(event: Event) {
    nudgeMenuMounted.value = true
    await nextTick()
    nudgeMenuRef.value?.toggle(event)
  }

  onMounted(async () => {
    if (notification.value.kind !== 'nudge') return
    const username = notification.value.actor?.username ?? null
    if (!username) return
    try {
      const rel = await apiFetchData<FollowSummaryResponse>(
        `/follows/summary/${encodeURIComponent(username)}`,
        { method: 'GET' },
      )
      const mutual = Boolean(rel?.viewerFollowsUser && rel?.userFollowsViewer)
      const canNudgeNow = mutual && !rel?.nudge?.outboundPending
      canShowNudgeBack.value = Boolean(canNudgeNow)
    } catch {
      // If status fails, fall back to showing only Ignore.
      canShowNudgeBack.value = false
    }
  })

  const followInflight = ref(false)
  const followRel = ref<{ viewerFollowsUser: boolean; userFollowsViewer: boolean } | null>(null)

  const isFollowingActor = computed(() => Boolean(followRel.value?.viewerFollowsUser))
  const canFollowBack = computed(() => Boolean(followRel.value && followRel.value.userFollowsViewer && !followRel.value.viewerFollowsUser))

  onMounted(async () => {
    if (notification.value.kind !== 'follow') return
    const username = notification.value.actor?.username ?? null
    if (!username) return
    try {
      const rel = await apiFetchData<{ viewerFollowsUser: boolean; userFollowsViewer: boolean }>(
        `/follows/status/${encodeURIComponent(username)}`,
        { method: 'GET' },
      )
      followRel.value = { viewerFollowsUser: Boolean(rel?.viewerFollowsUser), userFollowsViewer: Boolean(rel?.userFollowsViewer) }
    } catch {
      followRel.value = null
    }
  })

  async function onIgnore() {
    const id = notification.value.id
    const username = notification.value.actor?.username ?? null
    ignoreInflight.value = true
    try {
      await ignoreNudge(id, { username })
      // Update local row state so the highlight clears immediately.
      localReadAt.value = new Date().toISOString()
      nudgeActionState.value = 'ignored'
      pushToast({ title: 'Ignored', tone: 'success' })
    } finally {
      ignoreInflight.value = false
    }
  }

  async function onGotIt() {
    const id = notification.value.id
    const username = notification.value.actor?.username ?? null
    ignoreInflight.value = true
    try {
      await ackNudge(id, { username })
      localReadAt.value = new Date().toISOString()
      nudgeActionState.value = 'gotit'
      pushToast({ title: 'Got it', tone: 'success' })
    } finally {
      ignoreInflight.value = false
    }
  }

  async function onNudgeBack() {
    const username = notification.value.actor?.username ?? null
    if (!username) return
    nudgeInflight.value = true
    try {
      // Persist "you nudged back" on this notification, then send our nudge.
      await markNudgeNudgedBackById(notification.value.id, { username }).catch(() => {})
      await nudgeUser(username)
      localReadAt.value = new Date().toISOString()
      nudgeActionState.value = 'nudged'
      pushToast({ title: 'Nudged back', tone: 'success' })
    } catch {
      // ignore (backend enforces if not allowed / blocked)
    } finally {
      nudgeInflight.value = false
    }
  }

  // Crew invite (accept / decline directly from the row).
  const crewApi = useCrew()
  const viewerCrew = useViewerCrew()
  const crewInviteInflight = ref(false)
  const crewInviteAction = ref<'accept' | 'decline' | null>(null)
  // Local override: optimistic state set by clicking Accept/Decline in this tab.
  // Survives until the page is reloaded — at which point the server-provided
  // `subjectCrewInviteStatus` takes over.
  const crewInviteLocalState = ref<'accepted' | 'declined' | null>(null)
  // Resolved on demand for legacy notifications that predate `subjectCrewInviteId`.
  const resolvedCrewInviteId = ref<string | null>(null)

  const crewInviteDisplayState = computed<
    'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired'
  >(() => {
    if (crewInviteLocalState.value) return crewInviteLocalState.value
    const serverStatus = notification.value.subjectCrewInviteStatus
    if (serverStatus && serverStatus !== 'pending') return serverStatus
    return 'pending'
  })

  async function getCrewInviteId(): Promise<string | null> {
    const direct = notification.value.subjectCrewInviteId
    if (direct) return direct
    if (resolvedCrewInviteId.value) return resolvedCrewInviteId.value
    const inviterId = notification.value.actor?.id ?? null
    if (!inviterId) return null
    try {
      const inbox = await crewApi.listInbox()
      // Most recent pending invite from this inviter wins; the API returns inbox
      // sorted by createdAt desc so a simple .find() does the right thing.
      const match = inbox.find((inv) => inv.status === 'pending' && inv.invitedBy.id === inviterId)
      if (match) {
        resolvedCrewInviteId.value = match.id
        return match.id
      }
    } catch {
      // fall through and let the caller surface a sensible toast
    }
    return null
  }

  async function onAcceptCrewInvite() {
    if (crewInviteInflight.value) return
    crewInviteInflight.value = true
    crewInviteAction.value = 'accept'
    try {
      const inviteId = await getCrewInviteId()
      if (!inviteId) {
        crewInviteLocalState.value = 'declined'
        return
      }
      await crewApi.acceptInvite(inviteId)
      crewInviteLocalState.value = 'accepted'
      localReadAt.value = new Date().toISOString()
      // Mark the underlying notification as read so the unread badge clears
      // (otherwise the bell would still bounce until next visit).
      void apiFetchData(`/notifications/${encodeURIComponent(notification.value.id)}/mark-read`, {
        method: 'POST',
      }).catch(() => {})
      pushToast({ title: 'Joined crew', tone: 'success' })
      // Refresh nav membership so the rail/tab label flips to "Your Crew" before
      // we navigate. Founding accepts make the inviter the owner; accepting an
      // invite into an existing crew makes the viewer a member — `/crew/me` has
      // the canonical role, so we just refetch.
      void viewerCrew.refresh()
      // Take them to their crew so they can post on the wall right away.
      void navigateTo('/crew')
    } catch (e: unknown) {
      const msg = (e as { data?: { meta?: { errors?: Array<{ message?: string }> } } })?.data?.meta?.errors?.[0]?.message
        ?? 'Could not accept invite.'
      pushToast({ title: msg, tone: 'error' })
    } finally {
      crewInviteInflight.value = false
      crewInviteAction.value = null
    }
  }

  async function onDeclineCrewInvite() {
    if (crewInviteInflight.value) return
    crewInviteInflight.value = true
    crewInviteAction.value = 'decline'
    try {
      const inviteId = await getCrewInviteId()
      if (!inviteId) {
        crewInviteLocalState.value = 'declined'
        return
      }
      await crewApi.declineInvite(inviteId)
      crewInviteLocalState.value = 'declined'
      localReadAt.value = new Date().toISOString()
      void apiFetchData(`/notifications/${encodeURIComponent(notification.value.id)}/mark-read`, {
        method: 'POST',
      }).catch(() => {})
      pushToast({ title: 'Invite declined', tone: 'success' })
    } catch (e: unknown) {
      const msg = (e as { data?: { meta?: { errors?: Array<{ message?: string }> } } })?.data?.meta?.errors?.[0]?.message
        ?? 'Could not decline invite.'
      pushToast({ title: msg, tone: 'error' })
    } finally {
      crewInviteInflight.value = false
      crewInviteAction.value = null
    }
  }

  // Community group invite (accept / decline directly from the row).
  const groupInvitesApi = useGroupInvites()
  const groupInviteInflight = ref(false)
  const groupInviteAction = ref<'accept' | 'decline' | null>(null)
  const groupInviteLocalState = ref<'accepted' | 'declined' | null>(null)

  const groupInviteDisplayState = computed<
    'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired'
  >(() => {
    if (groupInviteLocalState.value) return groupInviteLocalState.value
    const serverStatus = notification.value.subjectCommunityGroupInviteStatus ?? null
    if (serverStatus && serverStatus !== 'pending') return serverStatus
    return 'pending'
  })

  async function onAcceptGroupInvite() {
    if (groupInviteInflight.value) return
    const inviteId = notification.value.subjectCommunityGroupInviteId
    if (!inviteId) {
      groupInviteLocalState.value = 'declined'
      return
    }
    groupInviteInflight.value = true
    groupInviteAction.value = 'accept'
    try {
      const res = await groupInvitesApi.acceptInvite(inviteId)
      groupInviteLocalState.value = 'accepted'
      localReadAt.value = new Date().toISOString()
      void apiFetchData(`/notifications/${encodeURIComponent(notification.value.id)}/mark-read`, {
        method: 'POST',
      }).catch(() => {})
      pushToast({ title: 'Joined group', tone: 'success' })
      if (res?.groupSlug) {
        void navigateTo(`/g/${encodeURIComponent(res.groupSlug)}`)
      }
    } catch (e: unknown) {
      const msg = (e as { data?: { meta?: { errors?: Array<{ message?: string }> } } })?.data?.meta?.errors?.[0]?.message
        ?? 'Could not accept invite.'
      pushToast({ title: msg, tone: 'error' })
    } finally {
      groupInviteInflight.value = false
      groupInviteAction.value = null
    }
  }

  async function onDeclineGroupInvite() {
    if (groupInviteInflight.value) return
    const inviteId = notification.value.subjectCommunityGroupInviteId
    if (!inviteId) {
      groupInviteLocalState.value = 'declined'
      return
    }
    groupInviteInflight.value = true
    groupInviteAction.value = 'decline'
    try {
      await groupInvitesApi.declineInvite(inviteId)
      groupInviteLocalState.value = 'declined'
      localReadAt.value = new Date().toISOString()
      void apiFetchData(`/notifications/${encodeURIComponent(notification.value.id)}/mark-read`, {
        method: 'POST',
      }).catch(() => {})
      pushToast({ title: 'Invite declined', tone: 'success' })
    } catch (e: unknown) {
      const msg = (e as { data?: { meta?: { errors?: Array<{ message?: string }> } } })?.data?.meta?.errors?.[0]?.message
        ?? 'Could not decline invite.'
      pushToast({ title: msg, tone: 'error' })
    } finally {
      groupInviteInflight.value = false
      groupInviteAction.value = null
    }
  }

  async function onFollowBack() {
    const actorId = notification.value.actor?.id ?? null
    const username = notification.value.actor?.username ?? null
    if (!actorId || !username) return

    followInflight.value = true
    try {
      await followState.follow({ userId: actorId, username })
      followRel.value = { viewerFollowsUser: true, userFollowsViewer: true }
      localReadAt.value = new Date().toISOString()
      pushToast({ title: 'Followed', tone: 'success' })
    } finally {
      followInflight.value = false
    }
  }

  return {
    activityBadgeTone,
    actorDisplay,
    subjectPostVisibilityTextClass,
    subjectTierRowClass,
    titleSuffix,
    isBoostOfStatus,
    statusBoostText,
    boostSubjectNoun,
    formatWhen,
    formatWhenFull,
    parseBoldSegments,
    notification,
    onActorEnter,
    onActorMove,
    onActorLeave,
    onGroupEnter,
    onGroupMove,
    onGroupLeave,
    nudgeIsTopmost,
    notificationMediaPreviewKey,
    nudgeActionState,
    gotItNudgeTooltip,
    ignoreNudgeTooltip,
    canShowNudgeBack,
    nudgeInflight,
    ignoreInflight,
    nudgeMenuMounted,
    nudgeMenuRef,
    nudgeMenuItems,
    toggleNudgeMenu,
    followInflight,
    isFollowingActor,
    canFollowBack,
    onNudgeBack,
    crewInviteInflight,
    crewInviteAction,
    crewInviteDisplayState,
    onAcceptCrewInvite,
    onDeclineCrewInvite,
    groupInviteInflight,
    groupInviteAction,
    groupInviteDisplayState,
    onAcceptGroupInvite,
    onDeclineGroupInvite,
    onFollowBack,
  }
}
