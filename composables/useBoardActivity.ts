import { usePresenceCallback } from '~/composables/presence/usePresenceCallback'
import { useApiClient } from '~/composables/useApiClient'
import { useCursorFeed } from '~/composables/useCursorFeed'
import { useAuth } from '~/composables/useAuth'
import { usePresence } from '~/composables/usePresence'
import { useDocumentVisibility } from '@vueuse/core'
import type { NotificationFeedItem } from '~/types/api'
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
  const feed = useCursorFeed<NotificationFeedItem>({
    stateKey: 'board-activity',
    stateMode: 'local',
    buildRequest: (cursor) => ({
      path: '/notifications',
      query: { kind: 'board', boardCommentsOnly: true, unreadOnly: true, limit: 30, cursor: cursor ?? undefined },
      mohDedupe: false,
    }),
    mergeOnRefresh: (incoming) => unreadBoardActivity(incoming),
    mergeOnLoadMore: (incoming, existing) => unreadBoardActivity([...existing, ...incoming]).slice(existing.length),
    defaultErrorMessage: 'Couldn’t load Board activity.',
    loadMoreErrorMessage: 'Couldn’t load Board activity.',
  })
  const { items, nextCursor, error } = feed
  const loading = computed(() => feed.loading.value || feed.loadingMore.value)
  const markingRead = ref(false)
  // Bumped whenever server state may have moved, so a badge count read before the bump is not applied.
  let revision = 0
  let active = false
  let timer: ReturnType<typeof setTimeout> | undefined

  async function load(reset = true) {
    if (!user.value?.id || !active) return
    if (reset) await feed.refresh()
    else await feed.loadMore()
  }

  function scheduleRefresh() {
    if (!active) return
    // Invalidate pending snapshots immediately, then coalesce event bursts.
    revision += 1
    feed.invalidate()
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
      const countRevision = revision
      const counts = await apiFetch<{ boardUnreadCount?: number; boardMentionCount?: number; articlesUnreadCount?: number }>('/notifications/unread-count', { mohDedupe: false })
      if (active && account === user.value?.id && countRevision === revision) presence.setNotificationNavUnread(counts.data)
    } catch (cause) {
      if (active && account === user.value?.id) error.value = getApiErrorMessage(cause) || 'Couldn’t mark Board activity read.'
    } finally {
      if (account === user.value?.id) markingRead.value = false
    }
  }

  const callback = { onNew: scheduleRefresh, onUpdated: scheduleRefresh, onDeleted: scheduleRefresh }
  const notificationsRealtime = usePresenceCallback('Notifications', callback, { manual: true })
  function activate() {
    if (active) return
    active = true
    notificationsRealtime.register()
    void load()
  }
  function deactivate() {
    active = false
    revision += 1
    feed.invalidate()
    clearTimeout(timer)
    notificationsRealtime.unregister()
  }
  onMounted(activate)
  onActivated(activate)
  onDeactivated(deactivate)
  onBeforeUnmount(deactivate)
  watch(() => user.value?.id, () => {
    revision += 1
    feed.reset()
    markingRead.value = false
    if (active) void load()
  })
  watch(() => presence.notificationNavUnread.value.board, scheduleRefresh)
  watch(presence.isSocketConnected, connected => { if (connected) scheduleRefresh() })
  const visibility = useDocumentVisibility()
  watch(visibility, value => { if (value === 'visible') scheduleRefresh() })
  return { items, nextCursor, loading, markingRead, error, load, markAllRead }
}
