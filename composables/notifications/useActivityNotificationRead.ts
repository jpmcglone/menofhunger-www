import { useNotificationsState } from './useNotificationsState'
import { useNotificationBadges } from './useNotificationBadges'
import { markNotificationReadById } from './notificationReadMutation'
import { getAuthGeneration } from '~/composables/auth/authState'
import { useNotificationsBadge } from '~/composables/useNotificationsBadge'
import { useAppToast } from '~/composables/useAppToast'

/** Shares loaded inbox state, without mounting its realtime/fetch machinery. */
export function useActivityNotificationRead() {
  const c = useNotificationsState()
  const { decrementUnreadKind } = useNotificationBadges(c)
  const badge = useNotificationsBadge()
  const errors = useAppToast()

  async function markRead(id: string) {
    const account = c.me.value?.id
    if (!account || c.accountId.value !== account) return
    const generation = getAuthGeneration()
    const current = () => account === c.me.value?.id && generation === getAuthGeneration()
    const now = new Date().toISOString()
    const before = c.notifications.value.find(item => item.type === 'single' && item.notification.id === id)
    const decremented = before?.type === 'single' && !before.notification.readAt && (c.unreadByKind.value[before.notification.kind] ?? 0) > 0
    if (before?.type === 'single' && !before.notification.readAt) {
      c.revision.value += 1
      c.notifications.value = c.notifications.value.map(item => item === before
        ? { ...before, notification: { ...before.notification, readAt: now, deliveredAt: before.notification.deliveredAt ?? now } } : item)
      decrementUnreadKind(before.notification.kind)
    }
    try {
      await markNotificationReadById(c.apiFetch, id)
      if (current()) void badge.fetchUndeliveredCount()
    } catch {
      if (!current()) return
      // Restore only our optimistic single row; concurrent reads and rollups keep their state.
      if (before?.type === 'single' && !before.notification.readAt) {
        let restored = false
        c.notifications.value = c.notifications.value.map(item => {
          if (item.type !== 'single' || item.notification.id !== id || item.notification.readAt !== now) return item
          restored = true
          return before
        })
        if (restored) {
          c.revision.value += 1
          const kind = before.notification.kind
          if (decremented) c.unreadByKind.value = { ...c.unreadByKind.value, [kind]: (c.unreadByKind.value[kind] ?? 0) + 1, all: (c.unreadByKind.value.all ?? 0) + 1 }
        }
      }
      errors.push({ title: 'Couldn’t mark notification read. Try again.', tone: 'error' })
    }
  }
  return { markRead, notifications: c.notifications }
}
