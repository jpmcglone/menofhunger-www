import type { GetNotificationsResponse, Notification } from '~/types/api'

type NotificationsListResponse = {
  data: Notification[]
  pagination?: GetNotificationsResponse['pagination']
}

/**
 * Seen vs Read semantics:
 * - Unseen = deliveredAt === null (user has not opened the notifications page since it arrived)
 * - Unread = readAt === null (user has not clicked through or marked as read)
 * - New = both null (neither seen nor read)
 * Row highlight uses unseen; dot shows only for unread. When read: no dot, no highlight.
 */
export function useNotifications() {
  const { apiFetch } = useApiClient()
  const route = useRoute()

  const notifications = ref<Notification[]>([])
  const nextCursor = ref<string | null>(null)
  const loading = ref(false)
  const isNotificationsPage = computed(() => route.path === '/notifications')

  async function fetchList(opts?: { cursor?: string | null; limit?: number; forceRefresh?: boolean }) {
    const cursor = opts?.cursor ?? null
    const limit = opts?.limit ?? 30
    const forceRefresh = opts?.forceRefresh ?? false
    if (!forceRefresh && !cursor && notifications.value.length > 0 && !opts) return
    loading.value = true
    try {
      const q = new URLSearchParams()
      if (limit) q.set('limit', String(limit))
      if (cursor) q.set('cursor', cursor)
      const path = `/notifications?${q.toString()}`
      const res = await apiFetch<Notification[]>(path) as NotificationsListResponse
      const list = res.data ?? []
      const pagination = res.pagination
      if (cursor) {
        notifications.value = [...notifications.value, ...list]
      } else {
        notifications.value = list
      }
      nextCursor.value = pagination?.nextCursor ?? null
      return pagination
    } finally {
      loading.value = false
    }
  }

  async function markDelivered() {
    try {
      await apiFetch('/notifications/mark-delivered', { method: 'POST' })
    } catch {
      // Ignore
    }
  }

  async function markReadBySubject(params: { post_id?: string; user_id?: string }) {
    if (!params.post_id && !params.user_id) return
    try {
      await apiFetch('/notifications/mark-read', {
        method: 'POST',
        body: params,
      })
    } catch {
      // Fire-and-forget; ignore
    }
  }

  async function markAllRead() {
    try {
      await apiFetch('/notifications/mark-all-read', { method: 'POST' })
    } catch {
      // Ignore
    }
  }

  function actorDisplay(n: Notification): string {
    const actor = n.actor
    return actor?.username ? `@${actor.username}` : (actor?.name ?? 'Someone')
  }

  /** Tailwind class for actor username by tier (premium > verified > default). Use ! so it wins over layout text color. */
  function actorTierClass(n: Notification): string {
    const a = n.actor
    if (a?.premium) return '!text-[var(--moh-premium)]'
    if (a?.verifiedStatus && a.verifiedStatus !== 'none') return '!text-[var(--moh-verified)]'
    return ''
  }

  /** Row highlight when unseen (deliveredAt null) and unread (readAt null). When read: no highlight. */
  function subjectTierRowClass(n: Notification): string {
    if (n.readAt || n.deliveredAt) return ''
    const t = n.subjectTier ?? null
    if (t === 'premium') return 'border-l-2 border-[var(--moh-premium)] bg-[var(--moh-premium)]/5 dark:bg-[var(--moh-premium)]/10'
    if (t === 'verified') return 'border-l-2 border-[var(--moh-verified)] bg-[var(--moh-verified)]/5 dark:bg-[var(--moh-verified)]/10'
    return 'border-l-2 border-gray-300 dark:border-zinc-600 bg-gray-50/80 dark:bg-zinc-900/40'
  }

  function titleSuffix(n: Notification): string {
    switch (n.kind) {
      case 'comment':
        return n.title ?? 'commented on your post'
      case 'boost':
        return 'boosted your post'
      case 'follow':
        return 'followed you'
      case 'mention':
        return 'mentioned you'
      case 'generic':
        return n.title ?? 'Notification'
      default:
        return 'Notification'
    }
  }

  /** Icon class for notification kind (PrimeIcons). */
  function notificationIcon(n: Notification): string {
    switch (n.kind) {
      case 'comment':
        return 'pi-comment'
      case 'boost':
        return '' // Custom SVG
      case 'follow':
        return 'pi-user-plus'
      case 'mention':
        return 'pi-at'
      case 'generic':
        return 'pi-bell'
      default:
        return 'pi-bell'
    }
  }

  function notificationTitle(n: Notification): string {
    return `${actorDisplay(n)} ${titleSuffix(n)}`
  }

  function notificationContext(n: Notification): string {
    if (n.kind === 'generic' && n.body) return n.body
    switch (n.kind) {
      case 'comment':
        return 'Comment'
      case 'boost':
        return 'Boost'
      case 'follow':
        return 'New follower'
      case 'mention':
        return 'Mention'
      default:
        return ''
    }
  }

  function formatWhen(createdAt: string): string {
    const d = new Date(createdAt)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffM = Math.floor(diffMs / 60000)
    const diffH = Math.floor(diffMs / 3600000)
    const diffD = Math.floor(diffMs / 86400000)
    if (diffM < 1) return 'Just now'
    if (diffM < 60) return `${diffM}m`
    if (diffH < 24) return `${diffH}h`
    if (diffD < 7) return `${diffD}d`
    return d.toLocaleDateString()
  }

  function rowHref(n: Notification): string | null {
    if (n.subjectPostId) return `/p/${n.subjectPostId}`
    if (n.subjectUserId && n.actor?.username) return `/u/${n.actor.username}`
    if (n.subjectUserId) return `/u/id/${n.subjectUserId}`
    return null
  }

  return {
    notifications,
    nextCursor,
    loading,
    isNotificationsPage,
    fetchList,
    markDelivered,
    markReadBySubject,
    markAllRead,
    actorDisplay,
    actorTierClass,
    subjectTierRowClass,
    titleSuffix,
    notificationTitle,
    notificationContext,
    notificationIcon,
    formatWhen,
    rowHref,
  }
}
