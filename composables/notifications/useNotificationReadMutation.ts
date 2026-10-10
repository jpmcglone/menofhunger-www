import { toRaw } from 'vue'
import type { NotificationFeedItem } from '~/types/api'
import { useNotificationsState } from './useNotificationsState'
import { useNotificationBadges } from './useNotificationBadges'
import { markNotificationReadById } from './notificationReadMutation'
import { getAuthGeneration } from '~/composables/auth/authState'
import { useNotificationsBadge } from '~/composables/useNotificationsBadge'
import { useAppToast } from '~/composables/useAppToast'

type FeedItem = NotificationFeedItem
const record = (item: FeedItem) => item.type === 'single' ? item.notification : item.type === 'group' ? item.group : item.rollup
const key = (item: FeedItem) => `${item.type}:${record(item).id}`
const withRead = (item: FeedItem, readAt: string | null, deliveredAt: string | null): FeedItem => {
  if (item.type === 'single') return { ...item, notification: { ...item.notification, readAt, deliveredAt } }
  if (item.type === 'group') return { ...item, group: { ...item.group, readAt, deliveredAt } }
  return { ...item, rollup: { ...item.rollup, readAt, deliveredAt } }
}

// Scope in-flight promises to the Nuxt app (one per SSR request), outside serialized state.
const pendingByApp = new WeakMap<object, Map<string, Promise<void>>>()

/** One read action for inbox rows, activity links, and inline invite actions. */
export function useNotificationReadMutation() {
  const c = useNotificationsState()
  const { decrementUnreadKind } = useNotificationBadges(c)
  const badge = useNotificationsBadge()
  const errors = useAppToast()
  const app = useNuxtApp()
  const pending = pendingByApp.get(app) ?? new Map<string, Promise<void>>()
  pendingByApp.set(app, pending)

  function markRead(target: string | FeedItem): Promise<void> {
    const account = c.me.value?.id
    if (!account || c.accountId.value !== account) return Promise.resolve()
    const generation = getAuthGeneration()
    const current = () => account === c.me.value?.id && account === c.accountId.value && generation === getAuthGeneration()
    const before = c.notifications.value.find(item => typeof target === 'string'
      ? item.type !== 'followed_posts_rollup' && record(item).id === target
      : key(item) === key(target))
    const item = before ?? (typeof target === 'string' ? undefined : target)
    // A rollup has no individual notification id. Its destination marks the subject read.
    const id = typeof target === 'string' ? target : target.type === 'followed_posts_rollup' ? null : record(target).id
    const operationKey = `${account}:${generation}:${id ?? (item ? key(item) : '')}`
    const existing = pending.get(operationKey)
    if (existing) return existing

    const now = new Date().toISOString()
    const previous = before ? record(before) : undefined
    const kind = before?.type === 'single' ? before.notification.kind : before?.type === 'group' ? before.group.kind : before ? 'followed_post' : undefined
    const oldKindCount = kind ? c.unreadByKind.value[kind] ?? 0 : 0
    const oldTotal = c.unreadByKind.value.all ?? 0
    let optimistic: FeedItem | undefined
    if (before && !previous?.readAt) {
      optimistic = withRead(before, now, previous?.deliveredAt ?? now)
      c.revision.value += 1
      c.notifications.value = c.notifications.value.map(row => row === before ? optimistic! : row)
      decrementUnreadKind(kind ?? null)
    }
    const kindDelta = kind ? oldKindCount - (c.unreadByKind.value[kind] ?? 0) : 0
    const totalDelta = oldTotal - (c.unreadByKind.value.all ?? 0)
    if (!id) return Promise.resolve()

    const operation = (async () => {
      try {
        await markNotificationReadById(c.apiFetch, id)
        if (current()) void badge.fetchUndeliveredCount()
      } catch {
        if (!current()) return
        let restored = false
        if (before && optimistic && previous) {
          c.notifications.value = c.notifications.value.map(row => {
            // Realtime snapshots/reads replace the row and own its state from then on.
            if (toRaw(row) !== optimistic) return row
            restored = true
            return withRead(row, previous.readAt, previous.deliveredAt)
          })
        }
        if (restored) {
          c.revision.value += 1
          if (kind && kindDelta) c.unreadByKind.value = {
            ...c.unreadByKind.value,
            [kind]: (c.unreadByKind.value[kind] ?? 0) + kindDelta,
            all: (c.unreadByKind.value.all ?? 0) + totalDelta,
          }
        }
        errors.push({ title: 'Couldn’t mark notification read. Try again.', tone: 'error' })
      } finally {
        pending.delete(operationKey)
      }
    })()
    pending.set(operationKey, operation)
    return operation
  }
  return { markRead, notifications: c.notifications }
}
