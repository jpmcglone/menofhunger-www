import type { GetNotificationsResponse, Notification } from '~/types/api'
import type { NotificationsCallback } from '~/composables/usePresence'
import { useUsersStore } from '~/composables/useUsersStore'

type NotificationsListResponse = {
  data: Notification[]
  pagination?: GetNotificationsResponse['pagination']
}

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
  const { addNotificationsCallback, removeNotificationsCallback } = usePresence()

  const notifications = ref<Notification[]>([])
  const nextCursor = ref<string | null>(null)
  const loading = ref(false)
  const isNotificationsPage = computed(() => route.path === '/notifications')

  // Realtime: insert new/updated notifications without a full refetch.
  const notificationsCb: NotificationsCallback = {
    onNew: (payload) => {
      const n = payload?.notification
      if (!n?.id) return
      // Dedupe and keep newest at top.
      const existing = notifications.value
      const without = existing.filter((x) => x.id !== n.id)
      notifications.value = [n, ...without]
    },
    onDeleted: (payload) => {
      const ids = Array.isArray(payload?.notificationIds) ? payload.notificationIds : []
      if (ids.length === 0) return
      const idSet = new Set(ids.filter((x) => typeof x === 'string' && x))
      if (!idSet.size) return
      notifications.value = notifications.value.filter((n) => !idSet.has(n.id))
    },
  }
  if (import.meta.client) {
    onMounted(() => addNotificationsCallback(notificationsCb))
    onBeforeUnmount(() => removeNotificationsCallback(notificationsCb))
  }

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
    const actor = n.actor?.id ? (usersStore.overlay(n.actor as any) as any) : n.actor
    return actor?.username ? `@${actor.username}` : (actor?.name ?? 'Someone')
  }

  /** Tailwind class for actor username by tier (premium > verified > default). Use ! so it wins over layout text color. */
  function actorTierClass(n: Notification): string {
    const a = n.actor?.id ? (usersStore.overlay(n.actor as any) as any) : n.actor
    if (a?.premium) return '!text-[var(--moh-premium)]'
    if (a?.verifiedStatus && a.verifiedStatus !== 'none') return '!text-[var(--moh-verified)]'
    return ''
  }

  /** Background color for notification type icon based on sender (actor) tier, not notification kind. */
  function actorTierIconBgClass(n: Notification): string {
    const a = n.actor?.id ? (usersStore.overlay(n.actor as any) as any) : n.actor
    if (a?.premium) return 'bg-[var(--moh-premium)]'
    if (a?.verifiedStatus && a.verifiedStatus !== 'none') return 'bg-[var(--moh-verified)]'
    return 'bg-gray-500'
  }

  /** Background color for mention icon based on *viewer* tier (your account). */
  function viewerTierIconBgClass(): string {
    const u = me.value
    if (u?.premium) return 'bg-[var(--moh-premium)]'
    if (u?.verifiedStatus && u.verifiedStatus !== 'none') return 'bg-[var(--moh-verified)]'
    return 'bg-gray-500'
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
    return actorTierIconBgClass(n)
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
        return 'replied to your post'
      case 'boost':
        return 'boosted your post'
      case 'follow':
        return 'followed you'
      case 'followed_post':
        return 'shared a post'
      case 'mention':
        return 'mentioned you'
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
      case 'mention':
        return 'tabler:at'
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
        return 'Reply'
      case 'boost':
        return 'Boost'
      case 'follow':
        return 'New follower'
      case 'followed_post':
        return 'New post'
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
    actorTierIconBgClass,
    notificationTypeIconBgClass,
    subjectPostVisibilityTextClass,
    subjectTierRowClass,
    titleSuffix,
    notificationTitle,
    notificationContext,
    notificationIconName,
    formatWhen,
    rowHref,
  }
}
