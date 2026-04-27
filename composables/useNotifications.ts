import type { GetNotificationsResponse, Notification, NotificationFeedItem, NotificationGroup, NotificationGroupKind, NotificationKind } from '~/types/api'
import type { NotificationsCallback } from '~/composables/usePresence'
import { useUsersStore } from '~/composables/useUsersStore'
import { userColorTier, userTierBgClass, userTierTextClass } from '~/utils/user-tier'
import {
  closeAllBrowserNotifications,
  closeBrowserNotifications,
  closeBrowserNotificationsForIds,
  closeBrowserNotificationsForSubject,
} from '~/utils/browser-notifications'

type NotificationsListResponse = {
  data: NotificationFeedItem[]
  pagination?: GetNotificationsResponse['pagination']
}

type NotificationUnreadByKind = Partial<Record<NotificationKind | 'all', number>>

/**
 * Seen vs Read semantics:
 * - Unseen = deliveredAt === null (user has not opened the notifications page since it arrived)
 * - Unread = readAt === null (user has not clicked through or marked as read)
 * - New = both null (neither seen nor read)
 * Row highlight and the left bar reflect unread. When read: no bar, no highlight.
 */
export function useNotifications() {
  const { apiFetch } = useApiClient()
  const route = useRoute()
  const { user: me } = useAuth()
  const usersStore = useUsersStore()
  const { addNotificationsCallback, removeNotificationsCallback, setNotificationUndeliveredCount } = usePresence()

  const stateKey = `notifications:${me.value?.id ?? 'anon'}`
  const notifications = useState<NotificationFeedItem[]>(`${stateKey}:items`, () => [])
  const nextCursor = useState<string | null>(`${stateKey}:nextCursor`, () => null)
  const loading = useState<boolean>(`${stateKey}:loading`, () => false)
  const pendingRefresh = useState<boolean>(`${stateKey}:pendingRefresh`, () => false)
  const activeKind = useState<NotificationKind | null>(`${stateKey}:activeKind`, () => null)
  const unreadByKind = useState<NotificationUnreadByKind>(`${stateKey}:unreadByKind`, () => ({ all: 0 }))
  // True once the first fetch has completed (success or error). Used to distinguish
  // "never fetched yet" (show loader) from "fetched and empty" (show empty state).
  const hasFetched = useState<boolean>(`${stateKey}:hasFetched`, () => false)
  const isNotificationsPage = computed(() => route.path === '/notifications')
  const groupedKinds = new Set<NotificationGroupKind>(['comment', 'boost', 'repost', 'follow', 'followed_post', 'nudge'])

  function notificationMatchesActiveKind(n: Notification): boolean {
    return !activeKind.value || n.kind === activeKind.value
  }

  function prependNotification(n: Notification): boolean {
    if (!n?.id || !notificationMatchesActiveKind(n)) return true
    if (groupedKinds.has(n.kind as NotificationGroupKind)) return false
    const next = notifications.value.filter((item) => item.type !== 'single' || item.notification.id !== n.id)
    notifications.value = [{ type: 'single', notification: n }, ...next]
    hasFetched.value = true
    return true
  }

  function removeNotificationsByIds(ids: string[]): void {
    const idSet = new Set(ids.map((id) => (id ?? '').trim()).filter(Boolean))
    if (!idSet.size) return
    notifications.value = notifications.value.filter((item) => {
      if (item.type === 'single') return !idSet.has(item.notification.id)
      if (item.type === 'group') return !idSet.has(item.group.id)
      return !idSet.has(item.rollup.id)
    })
  }

  // Realtime: the API now returns grouped feed items, so we refetch when relevant events arrive.
  const notificationsCb: NotificationsCallback = {
    onUpdated: () => {
      if (!isNotificationsPage.value) return
      if (loading.value) {
        pendingRefresh.value = true
        return
      }
      void fetchList({ forceRefresh: true })
    },
    onNew: (payload) => {
      const notification = payload?.notification
      if (!notification?.id) return
      if (!isNotificationsPage.value) return
      const patched = prependNotification(notification)
      if (patched) return
      if (loading.value) {
        pendingRefresh.value = true
        return
      }
      // Grouped rows need the server's aggregation shape.
      void fetchList({ forceRefresh: true })
    },
    onDeleted: (payload) => {
      const ids = Array.isArray(payload?.notificationIds) ? payload.notificationIds : []
      if (ids.length === 0) return
      if (!isNotificationsPage.value) return
      removeNotificationsByIds(ids)
    },
  }
  if (import.meta.client) {
    onMounted(() => addNotificationsCallback(notificationsCb))
    onBeforeUnmount(() => removeNotificationsCallback(notificationsCb))
  }

  let fetchPromise: Promise<GetNotificationsResponse['pagination'] | undefined> | null = null
  async function fetchList(opts?: { cursor?: string | null; limit?: number; forceRefresh?: boolean }) {
    // Prevent overlapping refresh/load-more requests which can corrupt pagination + grouping.
    if (fetchPromise) {
      // If this is a "load more" request, wait for the current request and then proceed.
      if (opts?.cursor) {
        await fetchPromise
      } else {
        if (opts?.forceRefresh) pendingRefresh.value = true
        return await fetchPromise
      }
    }

    const cursor = opts?.cursor ?? null
    const limit = opts?.limit ?? 30
    const forceRefresh = opts?.forceRefresh ?? false
    if (!forceRefresh && !cursor && notifications.value.length > 0 && !opts) return

    const run = async (): Promise<GetNotificationsResponse['pagination'] | undefined> => {
      loading.value = true
      try {
        const q = new URLSearchParams()
        if (limit) q.set('limit', String(limit))
        if (cursor) q.set('cursor', cursor)
        if (activeKind.value) q.set('kind', activeKind.value)
        const path = `/notifications?${q.toString()}`
        // This endpoint includes a custom pagination shape (undeliveredCount), so use the endpoint-specific type.
        const res = (await apiFetch<NotificationFeedItem[]>(path)) as unknown as GetNotificationsResponse
        const list = res.data ?? []
        const pagination = res.pagination
        unreadByKind.value = normalizeUnreadByKind(pagination?.unreadByKind)
        if (cursor) {
          notifications.value = [...notifications.value, ...list]
        } else {
          notifications.value = list
        }
        nextCursor.value = pagination?.nextCursor ?? null
        return pagination
      } finally {
        loading.value = false
        hasFetched.value = true
        if (pendingRefresh.value && isNotificationsPage.value) {
          pendingRefresh.value = false
          void fetchList({ forceRefresh: true })
        }
      }
    }

    fetchPromise = run()
    try {
      return await fetchPromise
    } finally {
      fetchPromise = null
    }
  }

  async function markDelivered() {
    try {
      await apiFetch('/notifications/mark-delivered', { method: 'POST' })
    } catch (e: unknown) {
      if (import.meta.dev) {
        console.warn('[notifications] markDelivered failed', e)
      }
    }
  }

  async function markReadBySubject(params: {
    post_id?: string
    user_id?: string
    article_id?: string
    crew_id?: string
    group_id?: string
  }) {
    if (!params.post_id && !params.user_id && !params.article_id && !params.crew_id && !params.group_id) return
    try {
      await apiFetch('/notifications/mark-read', {
        method: 'POST',
        body: params,
      })
      closeBrowserNotificationsForSubject(params)
    } catch (e: unknown) {
      if (import.meta.dev) {
        console.warn('[notifications] markReadBySubject failed', e)
      }
    }
  }

  /**
   * Mark a single notification as read by id. Used for snappy optimistic clears
   * on the notifications page (e.g. when the user opens a row in a new tab —
   * the destination's `markReadBySubject` will eventually fire too, but this
   * gives the originating tab immediate visual feedback).
   */
  async function markReadById(id: string) {
    if (!id) return
    try {
      await apiFetch(`/notifications/${encodeURIComponent(id)}/mark-read`, { method: 'POST' })
      closeBrowserNotificationsForIds([id])
    } catch (e: unknown) {
      if (import.meta.dev) {
        console.warn('[notifications] markReadById failed', e)
      }
    }
  }

  async function markAllRead() {
    try {
      await apiFetch('/notifications/mark-all-read', { method: 'POST' })
      closeAllBrowserNotifications()
    } catch (e: unknown) {
      if (import.meta.dev) {
        console.warn('[notifications] markAllRead failed', e)
      }
    }
  }

  function normalizeUnreadByKind(counts: NotificationUnreadByKind | null | undefined): NotificationUnreadByKind {
    const next: NotificationUnreadByKind = { all: 0 }
    if (!counts) return next
    for (const [kind, value] of Object.entries(counts)) {
      const count = Math.max(0, Math.floor(Number(value) || 0))
      if (count <= 0) continue
      next[kind as NotificationKind | 'all'] = count
      if (kind !== 'all') next.all = (next.all ?? 0) + count
    }
    if (typeof counts.all === 'number') next.all = Math.max(0, Math.floor(counts.all))
    return next
  }

  function clearUnreadKind(kind: NotificationKind | 'all' | null) {
    if (!kind || kind === 'all') {
      unreadByKind.value = { all: 0 }
      return
    }
    const prev = unreadByKind.value
    const removed = Math.max(0, Math.floor(Number(prev[kind]) || 0))
    unreadByKind.value = {
      ...prev,
      [kind]: 0,
      all: Math.max(0, Math.floor(Number(prev.all) || 0) - removed),
    }
  }

  function decrementUnreadKind(kind: NotificationKind | null, amount = 1) {
    if (!kind) return
    const prev = unreadByKind.value
    const current = Math.max(0, Math.floor(Number(prev[kind]) || 0))
    if (current <= 0) return
    const delta = Math.min(current, Math.max(1, Math.floor(amount)))
    unreadByKind.value = {
      ...prev,
      [kind]: Math.max(0, current - delta),
      all: Math.max(0, Math.floor(Number(prev.all) || 0) - delta),
    }
  }

  async function markNewPostsRead() {
    try {
      const res = await apiFetch<{ undeliveredCount?: number }>('/notifications/new-posts/mark-read', { method: 'POST' })
      if (typeof res.data?.undeliveredCount === 'number') {
        setNotificationUndeliveredCount(res.data.undeliveredCount)
      }
      closeBrowserNotifications({ kinds: ['followed_post'] })
    } catch (e: unknown) {
      if (import.meta.dev) {
        console.warn('[notifications] markNewPostsRead failed', e)
      }
    }
  }

  function actorDisplay(n: Notification): string {
    const actor = n.actor?.id ? (usersStore.overlay(n.actor as any) as any) : n.actor
    return actor?.username ? `@${actor.username}` : (actor?.name ?? 'Someone')
  }

  /** Tailwind class for actor username by tier (premium > verified > default). Use ! so it wins over layout text color. */
  function actorTierClass(n: Notification): string {
    const a = n.actor?.id ? (usersStore.overlay(n.actor as any) as any) : n.actor
    return userTierTextClass(userColorTier(a), { important: true })
  }

  /** Background color for notification type icon based on sender (actor) tier, not notification kind. */
  function actorTierIconBgClass(n: Notification): string {
    const a = n.actor?.id ? (usersStore.overlay(n.actor as any) as any) : n.actor
    return userTierBgClass(userColorTier(a), { fallback: 'bg-gray-500' })
  }

  /** Background color for mention icon based on *viewer* tier (your account). */
  function viewerTierIconBgClass(): string {
    const u = me.value
    return userTierBgClass(userColorTier(u), { fallback: 'bg-gray-500' })
  }

  /** Inline text color class for the subject post's visibility (used for the word \"post\" in comment notifications). */
  function subjectPostVisibilityTextClass(n: Notification): string {
    const v = n.subjectPostVisibility ?? null
    if (v === 'premiumOnly') return '!text-[var(--moh-premium)]'
    if (v === 'verifiedOnly') return '!text-[var(--moh-verified)]'
    if (v === 'onlyMe') return '!text-[var(--moh-onlyme)]'
    return ''
  }

  /**
   * Notification type icon background tint:
   * - Mention: color by viewer tier (your account)
   * - Generic: always normal/neutral
   * - Everything else (comment/boost/follow): color by actor tier (who did it)
   */
  function notificationTypeIconBgClass(n: Notification): string {
    if (n.kind === 'mention') return viewerTierIconBgClass()
    if (n.kind === 'generic') return 'bg-gray-500'
    if (n.kind === 'coin_transfer') return 'bg-amber-500'
    if (n.kind === 'poll_results_ready') {
      const v = n.subjectPostVisibility ?? null
      if (v === 'premiumOnly') return 'bg-[var(--moh-premium)]'
      if (v === 'verifiedOnly') return 'bg-[var(--moh-verified)]'
      if (v === 'onlyMe') return 'bg-[var(--moh-onlyme)]'
      return 'bg-gray-500'
    }
    return actorTierIconBgClass(n)
  }

  function notificationTypeIconTextClass(n: Notification): string {
    if (n.kind === 'mention') {
      const u = me.value
      return userTierTextClass(userColorTier(u), { fallback: 'text-gray-500 dark:text-gray-400' })
    }
    if (n.kind === 'coin_transfer') return 'text-amber-500'
    if (n.kind === 'generic') return 'text-gray-500 dark:text-gray-400'
    if (n.kind === 'poll_results_ready') {
      const v = n.subjectPostVisibility ?? null
      if (v === 'premiumOnly') return 'text-[var(--moh-premium)]'
      if (v === 'verifiedOnly') return 'text-[var(--moh-verified)]'
      if (v === 'onlyMe') return 'text-[var(--moh-onlyme)]'
      return 'text-gray-500 dark:text-gray-400'
    }
    const a = n.actor?.id ? (usersStore.overlay(n.actor as any) as any) : n.actor
    return userTierTextClass(userColorTier(a), { fallback: 'text-rose-500' })
  }

  /** Row highlight when unread. When read: no highlight. */
  function subjectTierRowClass(n: Notification): string {
    if (n.readAt) return ''
    const t = n.subjectTier ?? null
    if (t === 'premium') return 'bg-[var(--moh-premium)]/5 dark:bg-[var(--moh-premium)]/10'
    if (t === 'verified') return 'bg-[var(--moh-verified)]/5 dark:bg-[var(--moh-verified)]/10'
    return 'bg-gray-50/80 dark:bg-zinc-900/40'
  }

  function titleSuffix(n: Notification): string {
    if (n.title) return n.title
    switch (n.kind) {
      case 'comment':
        return n.subjectArticleId ? 'replied to your article' : 'replied to your post'
      case 'boost':
        return 'boosted your post'
      case 'repost':
        return 'reposted your post'
      case 'follow':
        return 'followed you'
      case 'followed_post':
        return 'shared a post'
      case 'followed_article':
        return 'published an article'
      case 'mention':
        return 'mentioned you'
      case 'nudge':
        return 'nudged you'
      case 'coin_transfer':
        return n.title ?? 'sent you coins'
      case 'group_join_request':
        return 'requests to join your group'
      case 'crew_invite_received':
        return 'invited you to their crew'
      case 'crew_invite_accepted':
        return 'accepted your crew invite'
      case 'crew_invite_declined':
        return 'declined your crew invite'
      case 'crew_invite_cancelled':
        return 'cancelled their crew invite'
      case 'crew_member_joined':
        return 'joined your crew'
      case 'crew_member_left':
        return 'left your crew'
      case 'crew_member_kicked':
        return 'was removed from your crew'
      case 'crew_owner_transferred':
        return 'Crew ownership transferred'
      case 'crew_owner_transfer_vote':
        return 'started a vote in your crew'
      case 'crew_wall_mention':
        return 'mentioned you on the wall'
      case 'crew_disbanded':
        return 'Your crew was disbanded'
      case 'community_group_invite_received':
        return 'invited you to their group'
      case 'community_group_invite_accepted':
        return 'accepted your group invite'
      case 'community_group_invite_declined':
        return 'declined your group invite'
      case 'community_group_invite_cancelled':
        return 'cancelled their group invite'
      case 'community_group_member_joined':
        return 'joined the group'
      case 'community_group_join_approved':
        return 'Your join request was approved'
      case 'community_group_join_rejected':
        return 'Your join request was not accepted'
      case 'community_group_member_removed':
        return 'You were removed from a group'
      case 'community_group_disbanded':
        return 'A group you were in was disbanded'
      case 'message':
        return 'sent you a message'
      case 'generic':
        return 'Notification'
      default:
        return 'Notification'
    }
  }

  /** Icon name for notification kind (Iconify). */
  function notificationIconName(n: Notification): string {
    switch (n.kind) {
      case 'comment':
        return 'tabler:message-circle'
      case 'boost':
        return '' // Custom SVG
      case 'follow':
        return 'tabler:user-plus'
      case 'followed_post':
        return 'tabler:file-text'
      case 'followed_article':
        return 'tabler:article'
      case 'mention':
        return 'tabler:at'
      case 'nudge':
        return 'tabler:hand-click'
      case 'poll_results_ready':
        return 'tabler:chart-bar'
      case 'coin_transfer':
        return 'tabler:coin'
      case 'message':
        return 'tabler:message'
      case 'group_join_request':
      case 'community_group_invite_received':
      case 'community_group_invite_accepted':
      case 'community_group_invite_declined':
      case 'community_group_invite_cancelled':
      case 'community_group_member_joined':
      case 'community_group_join_approved':
      case 'community_group_join_rejected':
      case 'community_group_member_removed':
      case 'community_group_disbanded':
        return 'tabler:users-group'
      case 'crew_invite_received':
      case 'crew_invite_accepted':
      case 'crew_invite_declined':
      case 'crew_invite_cancelled':
      case 'crew_member_joined':
      case 'crew_member_left':
      case 'crew_member_kicked':
      case 'crew_owner_transferred':
      case 'crew_owner_transfer_vote':
      case 'crew_wall_mention':
      case 'crew_disbanded':
        return 'tabler:shield-check'
      case 'generic':
        return 'tabler:bell'
      default:
        return 'tabler:bell'
    }
  }

  function notificationTitle(n: Notification): string {
    return `${actorDisplay(n)} ${titleSuffix(n)}`
  }

  function notificationContext(n: Notification): string {
    if (n.kind === 'generic' && n.body) return n.body
    switch (n.kind) {
      case 'comment':
        return n.subjectArticleId ? 'Article reply' : 'Reply'
      case 'boost':
        return 'Boost'
      case 'follow':
        return 'New follower'
      case 'followed_post':
        return 'New post'
      case 'followed_article':
        return 'New article'
      case 'mention':
        return 'Mention'
      case 'nudge':
        return 'Nudge'
      case 'coin_transfer':
        return 'Coins'
      case 'group_join_request':
        return 'Join request'
      case 'community_group_invite_received':
      case 'community_group_invite_accepted':
      case 'community_group_invite_declined':
      case 'community_group_invite_cancelled':
        return 'Group invite'
      case 'community_group_member_joined':
        return 'New member'
      case 'community_group_join_approved':
        return 'Join approved'
      case 'community_group_join_rejected':
        return 'Join not accepted'
      case 'community_group_member_removed':
        return 'Removed from group'
      case 'community_group_disbanded':
        return 'Group disbanded'
      case 'message':
        return 'Direct message'
      default:
        return ''
    }
  }

  async function setKind(kind: NotificationKind | null) {
    activeKind.value = kind
    await fetchList({ forceRefresh: true })
  }

  function formatWhen(createdAt: string): string {
    const d = new Date(createdAt)
    if (Number.isNaN(d.getTime())) return ''
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffM = Math.floor(diffMs / 60000)
    const diffH = Math.floor(diffMs / 3600000)
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    if (sameDay) {
      if (diffM < 1) return 'now'
      if (diffM < 60) return `${diffM}m`
      return `${Math.max(1, diffH)}h`
    }
    const sameYear = d.getFullYear() === now.getFullYear()
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: sameYear ? undefined : 'numeric',
    })
  }

  function formatWhenFull(createdAt: string): string {
    const d = new Date(createdAt)
    if (Number.isNaN(d.getTime())) return ''
    const rawTime = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    const time = rawTime.replace(/\s/g, '').toLowerCase()
    const date = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    return `${time} - ${date}`
  }

  function rowHref(n: Notification): string | null {
    if (n.kind === 'coin_transfer') return '/coins'
    if (n.kind === 'message' && n.subjectConversationId) {
      return `/messages/${encodeURIComponent(n.subjectConversationId)}`
    }
    if (n.kind === 'group_join_request' && n.subjectGroupSlug) {
      return `/g/${encodeURIComponent(n.subjectGroupSlug)}/pending`
    }
    // Community group invites — invitee and inviter both land on the group
    // page; the row's inline Accept/Decline buttons take care of the action
    // itself, so the click-through is just for context.
    if (
      (n.kind === 'community_group_invite_received' ||
        n.kind === 'community_group_invite_accepted' ||
        n.kind === 'community_group_invite_declined' ||
        n.kind === 'community_group_invite_cancelled' ||
        n.kind === 'community_group_member_joined' ||
        n.kind === 'community_group_join_approved' ||
        n.kind === 'community_group_join_rejected' ||
        n.kind === 'community_group_member_removed' ||
        n.kind === 'community_group_disbanded') &&
      n.subjectGroupSlug
    ) {
      return `/g/${encodeURIComponent(n.subjectGroupSlug)}`
    }
    // All crew notifications route into the user's crew area; the page knows how to
    // surface invites (inbox), wall, members, and ownership transfer state.
    if (
      n.kind === 'crew_invite_received' ||
      n.kind === 'crew_invite_cancelled' ||
      n.kind === 'crew_invite_accepted' ||
      n.kind === 'crew_invite_declined' ||
      n.kind === 'crew_member_joined' ||
      n.kind === 'crew_member_left' ||
      n.kind === 'crew_member_kicked' ||
      n.kind === 'crew_owner_transferred' ||
      n.kind === 'crew_owner_transfer_vote' ||
      n.kind === 'crew_wall_mention' ||
      n.kind === 'crew_disbanded'
    ) {
      return '/crew'
    }
    // Article-related notifications always route to the article page.
    if (n.subjectArticleId && (
      n.kind === 'followed_article' || n.kind === 'comment' || n.kind === 'mention' || n.kind === 'boost'
    )) {
      const hash = n.subjectArticleCommentId ? `#comment-${n.subjectArticleCommentId}` : ''
      return `/a/${encodeURIComponent(n.subjectArticleId)}${hash}`
    }
    if ((n.kind === 'comment' || n.kind === 'followed_post' || n.kind === 'mention' || n.kind === 'repost') && n.actorPostId) {
      return `/p/${encodeURIComponent(n.actorPostId)}`
    }
    if (n.subjectPostId) return `/p/${encodeURIComponent(n.subjectPostId)}`
    if (n.subjectUserId && n.actor?.username) return `/u/${encodeURIComponent(n.actor.username)}`
    return null
  }

  function groupHref(g: NotificationGroup): string | null {
    if (g.kind === 'follow') {
      const meUsername = (me.value?.username ?? '').trim()
      return meUsername ? `/u/${encodeURIComponent(meUsername)}/followers` : '/settings'
    }
    if (g.kind === 'followed_post') return '/new-posts'
    if (g.subjectPostId) return `/p/${g.subjectPostId}`
    return null
  }

  function itemHref(item: NotificationFeedItem): string | null {
    if (item.type === 'single') return rowHref(item.notification)
    if (item.type === 'group') return groupHref(item.group)
    return '/new-posts'
  }

  return {
    notifications,
    nextCursor,
    loading,
    hasFetched,
    activeKind,
    unreadByKind,
    setKind,
    isNotificationsPage,
    fetchList,
    markDelivered,
    markReadBySubject,
    markReadById,
    markAllRead,
    markNewPostsRead,
    clearUnreadKind,
    decrementUnreadKind,
    actorDisplay,
    actorTierClass,
    actorTierIconBgClass,
    notificationTypeIconBgClass,
    notificationTypeIconTextClass,
    subjectPostVisibilityTextClass,
    subjectTierRowClass,
    titleSuffix,
    notificationTitle,
    notificationContext,
    notificationIconName,
    formatWhen,
    formatWhenFull,
    rowHref,
    groupHref,
    itemHref,
  }
}
