import { useApiClient } from '~/composables/useApiClient'
import { useAuth } from '~/composables/useAuth'
import { usePresence } from '~/composables/usePresence'
import { useDocumentVisibility } from '@vueuse/core'
import type { GetNotificationsResponse, NotificationFeedItem } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { boardCommentHref, boardThreadHref } from '~/composables/useBoardApi'

export function boardActivityHref(item: NotificationFeedItem): string | null {
  if (item.type === 'single' && item.notification.boardThreadId) {
    const n = item.notification
    return n.boardCommentId ? boardCommentHref(n.boardThreadId!, n.boardCommentId) : boardThreadHref({ id: n.boardThreadId! })
  }
  if (item.type === 'group' && item.group.boardThreadId) return boardThreadHref({ id: item.group.boardThreadId })
  return null
}

export function boardActivityKey(item: NotificationFeedItem): string {
  return item.type === 'single' ? `s-${item.notification.id}` : item.type === 'group' ? `g-${item.group.id}` : `r-${item.rollup.id}`
}

export function unreadBoardActivity(items: NotificationFeedItem[]): NotificationFeedItem[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const readAt = item.type === 'single' ? item.notification.readAt : item.type === 'group' ? item.group.readAt : item.rollup.readAt
    const key = boardActivityKey(item)
    if (readAt || !boardActivityHref(item) || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Isolated from the bell's filter, paging and seen state. */
export function useBoardActivity() {
  const { apiFetch } = useApiClient()
  const { user } = useAuth()
  const presence = usePresence()
  const items = ref<NotificationFeedItem[]>([])
  const nextCursor = ref<string | null>(null)
  const loading = ref(false)
  const markingRead = ref(false)
  const error = ref<string | null>(null)
  let generation = 0
  let active = false
  let timer: ReturnType<typeof setTimeout> | undefined

  async function load(reset = true) {
    const account = user.value?.id
    if (!account || !active || (!reset && (loading.value || !nextCursor.value))) return
    const ticket = ++generation
    loading.value = true
    error.value = null
    const current = () => active && ticket === generation && account === user.value?.id
    try {
      const response = await apiFetch<NotificationFeedItem[]>('/notifications', {
        query: { kind: 'board', unreadOnly: true, limit: 30, cursor: reset ? undefined : nextCursor.value },
        mohDedupe: false,
      }) as unknown as GetNotificationsResponse
      if (!current()) return
      items.value = unreadBoardActivity([...(reset ? [] : items.value), ...response.data])
      nextCursor.value = response.pagination.nextCursor
    } catch (cause) {
      if (current()) error.value = getApiErrorMessage(cause) || 'Couldn’t load Board activity.'
    } finally {
      if (current()) loading.value = false
    }
  }

  function scheduleRefresh() {
    if (!active) return
    // Invalidate pending snapshots immediately, then coalesce event bursts.
    generation += 1
    clearTimeout(timer)
    timer = setTimeout(() => { void load() }, 120)
  }

  async function markAllRead() {
    if (markingRead.value || !user.value?.id) return
    const account = user.value.id
    markingRead.value = true
    error.value = null
    try {
      await apiFetch('/notifications/mark-read', { method: 'POST', body: { filter: 'board' } })
      if (!active || account !== user.value?.id) return
      await load()
      // Never zero a badge optimistically: another update may arrive during the mutation.
      const countRevision = generation
      const counts = await apiFetch<{ boardUnreadCount?: number; articlesUnreadCount?: number }>('/notifications/unread-count', { mohDedupe: false })
      if (active && account === user.value?.id && countRevision === generation) presence.setNotificationNavUnread(counts.data)
    } catch (cause) {
      if (active && account === user.value?.id) error.value = getApiErrorMessage(cause) || 'Couldn’t mark Board activity read.'
    } finally {
      if (account === user.value?.id) markingRead.value = false
    }
  }

  const callback = { onNew: scheduleRefresh, onUpdated: scheduleRefresh, onDeleted: scheduleRefresh }
  function activate() {
    if (active) return
    active = true
    presence.addNotificationsCallback(callback)
    void load()
  }
  function deactivate() {
    active = false
    generation += 1
    loading.value = false
    clearTimeout(timer)
    presence.removeNotificationsCallback(callback)
  }
  onMounted(activate)
  onActivated(activate)
  onDeactivated(deactivate)
  onBeforeUnmount(deactivate)
  watch(() => user.value?.id, () => {
    generation += 1
    items.value = []
    nextCursor.value = null
    error.value = null
    markingRead.value = false
    loading.value = false
    if (active) void load()
  })
  watch(() => presence.notificationNavUnread.value.board, scheduleRefresh)
  watch(presence.isSocketConnected, connected => { if (connected) scheduleRefresh() })
  const visibility = useDocumentVisibility()
  watch(visibility, value => { if (value === 'visible') scheduleRefresh() })
  return { items, nextCursor, loading, markingRead, error, load, markAllRead }
}
