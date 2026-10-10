import type { Notification } from '~/types/api'
import { notificationCategory, notificationFilterCategory } from '~/utils/notification-category'
import type { NotificationsCallback } from '~/composables/usePresence'
import type { NotificationsState } from './useNotificationsState'

import type { useNotificationBadges } from './useNotificationBadges'
import type { useNotificationsInbox } from './useNotificationsInbox'

/** Realtime inbox merge: local list patches plus one refcounted socket callback per tab. */
export function useNotificationsRealtime(c: Pick<NotificationsState,
  | 'addNotificationsCallback' | 'removeNotificationsCallback' | 'accountId' | 'revision'
  | 'notifications' | 'loading' | 'pendingRefresh' | 'activeKind' | 'hasFetched'
> & Pick<ReturnType<typeof useNotificationsInbox>, 'fetchList'>
  & Pick<ReturnType<typeof useNotificationBadges>, 'decrementUnreadKind'>) {
  const {
    addNotificationsCallback,
    removeNotificationsCallback,
    accountId,
    revision,
    notifications,
    loading,
    pendingRefresh,
    activeKind,
    hasFetched,
  } = c

  function notificationMatchesActiveKind(n: Notification): boolean {
    if (!activeKind.value) return true
    if (activeKind.value === 'board') return Boolean(n.boardThreadId)
    if (['followed_post', 'comment', 'mention', 'status_update', 'follow', 'boost', 'other'].includes(activeKind.value)) {
      return notificationCategory(n) === notificationFilterCategory(activeKind.value)
    }
    return n.kind === activeKind.value
  }

  function prependNotification(n: Notification): boolean {
    if (!n?.id || !notificationMatchesActiveKind(n)) return false
    // Distinct events about one post remain distinct. Keep existing groups until
    // an authoritative response can regroup them with the arrival.
    if (patchNotificationInPlace(n)) return true
    if (notifications.value.some(item => item.type === 'group' && item.group.id === n.id)) return true
    const next = notifications.value
    notifications.value = [{ type: 'single', notification: n }, ...next]
    hasFetched.value = true
    return true
  }

  function requestSync() {
    revision.value += 1
    pendingRefresh.value = true
    if (!loading.value && accountId.value) void c.fetchList({ forceRefresh: true })
  }

  /**
   * Replace an already-rendered notification's contents without moving it in the list.
   * Used for `silent` arrivals (e.g. a status reworded in place) where reordering the row
   * to the top would read as fresh activity. Returns false when the row isn't loaded.
   */
  function patchNotificationInPlace(n: Notification): boolean {
    if (!n?.id) return false
    let found = false
    const next = notifications.value.map((item) => {
      if (item.type !== 'single' || item.notification.id !== n.id) return item
      found = true
      return { type: 'single' as const, notification: n }
    })
    if (found) notifications.value = next
    return found
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

  /**
   * When a post is viewed anywhere, the API emits `notifications:updated` with
   * `clearedPostIds`. Patch matching rows to read so unread bars / sticky highlights
   * clear without waiting for a full refetch.
   */
  function applyClearedPostIds(postIds: string[], boardThreadIds: string[] = []): void {
    const cleared = new Set(postIds.map((id) => (id ?? '').trim()).filter(Boolean))
    const clearedThreads = new Set(boardThreadIds.map((id) => (id ?? '').trim()).filter(Boolean))
    if (!cleared.size && !clearedThreads.size) return
    const now = new Date().toISOString()
    let mutated = false
    notifications.value = notifications.value.map((item) => {
      if (item.type === 'single') {
        const n = item.notification
        const matches =
          (n.subjectPostId && cleared.has(n.subjectPostId))
          || (n.actorPostId && cleared.has(n.actorPostId))
          || (n.post?.id && cleared.has(n.post.id))
          || (n.boardThreadId && clearedThreads.has(n.boardThreadId))
        if (!matches) return item
        // A scoped server acknowledgement owns read state even if a local action
        // already marked this row. Replace its identity so a late failure cannot undo it.
        if (n.readAt) return { ...item, notification: { ...n } }
        mutated = true
        c.decrementUnreadKind(n.kind)
        return {
          ...item,
          notification: {
            ...n,
            readAt: now,
            deliveredAt: n.deliveredAt ?? now,
          },
        }
      }
      if (item.type === 'group') {
        const g = item.group
        if (!g.subjectPostId || !cleared.has(g.subjectPostId)) return item
        if (g.readAt) return { ...item, group: { ...g } }
        mutated = true
        return { ...item, group: { ...g, readAt: now, deliveredAt: g.deliveredAt ?? now } }
      }
      return item
    })
    if (mutated) {
      // no-op: list already replaced above; callers may prune sticky highlights
    }
  }

  // Realtime: singleton callback with refcount so mounting N notification rows on
  // /notifications doesn't fan a single socket event into N c.fetchList() calls.
  const wsRefCount = useState<number>('notifications-ws-refcount', () => 0)
  const wsCbRef = useState<NotificationsCallback | null>('notifications-ws-cb', () => null)
  if (import.meta.client) {
    wsRefCount.value += 1

    if (!wsCbRef.value) {
      const notificationsCb: NotificationsCallback = {
        onUpdated: (payload) => {
          if (!accountId.value) return
          if (payload?.clearedPostIds?.length || payload?.clearedBoardThreadIds?.length) {
            applyClearedPostIds(payload.clearedPostIds ?? [], payload.clearedBoardThreadIds ?? [])
          }
          requestSync()
        },
        onNew: (payload) => {
          if (!accountId.value || !payload?.notification?.id) return
          if (payload.silent) patchNotificationInPlace(payload.notification)
          else prependNotification(payload.notification)
          requestSync()
        },
        onDeleted: (payload) => {
          if (!accountId.value) return
          removeNotificationsByIds(payload?.notificationIds ?? [])
          requestSync()
        },
      }
      wsCbRef.value = notificationsCb
      addNotificationsCallback(notificationsCb)
    }

    onScopeDispose(() => {
      wsRefCount.value = Math.max(0, wsRefCount.value - 1)
      if (wsRefCount.value !== 0) return
      const cb = wsCbRef.value
      if (!cb) return
      removeNotificationsCallback(cb)
      wsCbRef.value = null
    })
  }


  return { notificationMatchesActiveKind, prependNotification, requestSync, patchNotificationInPlace, removeNotificationsByIds, applyClearedPostIds }
}
