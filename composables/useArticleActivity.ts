import { useApiClient } from '~/composables/useApiClient'
import { useCursorFeed } from '~/composables/useCursorFeed'
import { useAuth } from '~/composables/useAuth'
import { usePresence } from '~/composables/usePresence'
import { useDocumentVisibility } from '@vueuse/core'
import type { NotificationFeedItem } from '~/types/api'

export function articleActivityHref(item: NotificationFeedItem): string | null {
  if (item.type !== 'single' || !item.notification.subjectArticleId) return null
  const n = item.notification
  return `/a/${encodeURIComponent(n.subjectArticleId!)}${n.subjectArticleCommentId ? `#comment-${encodeURIComponent(n.subjectArticleCommentId)}` : ''}`
}

export function articleActivityKey(item: NotificationFeedItem): string {
  return item.type === 'single' ? `s-${item.notification.id}` : item.type === 'group' ? `g-${item.group.id}` : `r-${item.rollup.id}`
}

export function unreadArticleActivity(items: NotificationFeedItem[]): NotificationFeedItem[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const readAt = item.type === 'single' ? item.notification.readAt : item.type === 'group' ? item.group.readAt : item.rollup.readAt
    const key = articleActivityKey(item)
    if (readAt || !articleActivityHref(item) || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Isolated from the bell's filter, paging and seen state. */
export function useArticleActivity() {
  const { apiFetch } = useApiClient()
  const { user } = useAuth()
  const presence = usePresence()
  const feed = useCursorFeed<NotificationFeedItem>({
    stateKey: 'article-activity',
    stateMode: 'local',
    buildRequest: (cursor) => ({
      path: '/notifications',
      query: { kind: 'articles', unreadOnly: true, limit: 30, cursor: cursor ?? undefined },
      mohDedupe: false,
    }),
    // Already presented previews stay through refreshes until the visit ends.
    mergeOnRefresh: (incoming, existing) => unreadArticleActivity([...existing, ...incoming]),
    mergeOnLoadMore: (incoming, existing) => unreadArticleActivity([...existing, ...incoming]).slice(existing.length),
    defaultErrorMessage: 'Couldn’t load article activity.',
    loadMoreErrorMessage: 'Couldn’t load article activity.',
  })
  const { items, nextCursor, error } = feed
  const loading = computed(() => feed.loading.value || feed.loadingMore.value)
  const failedIds = ref<string[]>([])
  const acknowledged = new Set<string>()
  const pending = new Set<string>()
  let lifetime = 0
  let countGeneration = 0
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

  async function acknowledge(id: string) {
    if (!active || !user.value?.id || acknowledged.has(id) || pending.has(id)) return
    const account = user.value.id
    const visit = lifetime
    const current = () => active && visit === lifetime && account === user.value?.id
    pending.add(id)
    try {
      await apiFetch(`/notifications/${encodeURIComponent(id)}/mark-read`, { method: 'POST' })
      if (!current()) return
      acknowledged.add(id)
      failedIds.value = failedIds.value.filter(value => value !== id)
      await refreshCounts()
    } catch {
      if (current() && !acknowledged.has(id) && !failedIds.value.includes(id)) failedIds.value.push(id)
    } finally {
      if (current()) pending.delete(id)
    }
  }

  async function refreshCounts() {
    const account = user.value?.id
    const visit = lifetime
    const startRevision = revision
    const countTicket = ++countGeneration
    const current = () => active && visit === lifetime && account === user.value?.id && startRevision === revision && countTicket === countGeneration
    try {
      const counts = await apiFetch<{ boardUnreadCount?: number; boardMentionCount?: number; articlesUnreadCount?: number }>('/notifications/unread-count', { mohDedupe: false })
      if (current()) presence.setNotificationNavUnread(counts.data)
    } catch {
      if (current()) error.value = 'Couldn’t refresh the activity badge.'
    }
  }

  async function retry() {
    await Promise.all(failedIds.value.map(acknowledge))
    await load()
    await refreshCounts()
  }

  function resetVisit() {
    lifetime += 1
    feed.reset()
    acknowledged.clear()
    pending.clear()
    failedIds.value = []
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
    resetVisit()
    revision += 1
    clearTimeout(timer)
    presence.removeNotificationsCallback(callback)
  }
  onMounted(activate)
  onActivated(activate)
  onDeactivated(deactivate)
  onBeforeUnmount(deactivate)
  watch(() => user.value?.id, () => {
    revision += 1
    resetVisit()
    if (active) void load()
  })
  watch(() => presence.notificationNavUnread.value.articles, scheduleRefresh)
  watch(presence.isSocketConnected, connected => { if (connected) scheduleRefresh() })
  const visibility = useDocumentVisibility()
  watch(visibility, value => { if (value === 'visible') scheduleRefresh() })
  return { items, nextCursor, loading, failedIds, error, load, acknowledge, retry }
}
