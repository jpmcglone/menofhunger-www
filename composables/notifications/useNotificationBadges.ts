import type { NotificationKind } from '~/types/api'
import { closeBrowserNotifications } from '~/utils/browser-notifications'
import type { NotificationsState, NotificationUnreadByKind } from './useNotificationsState'

/** Unread-by-kind badge counts. */
export function useNotificationBadges(c: Pick<NotificationsState, 'apiFetch' | 'setNotificationUndeliveredCount' | 'unreadByKind' | 'unreadByCategory'>) {
  const {
    apiFetch,
    setNotificationUndeliveredCount,
    unreadByKind,
    unreadByCategory,
  } = c

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
      unreadByCategory.value = { all: 0, posts: 0, replies: 0, mentions: 0, statuses: 0, follows: 0, boosts: 0, other: 0 }
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
      closeBrowserNotifications({ kinds: ['followed_post', 'checkin_post'] })
    } catch (e: unknown) {
      if (import.meta.dev) {
        console.warn('[notifications] markNewPostsRead failed', e)
      }
    }
  }


  return { normalizeUnreadByKind, clearUnreadKind, decrementUnreadKind, markNewPostsRead }
}
