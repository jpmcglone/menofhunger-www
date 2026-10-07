import type { GetNotificationsResponse, NotificationFeedItem, NotificationKind } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import {
  closeAllBrowserNotifications,
  closeBrowserNotificationsForIds,
  closeBrowserNotificationsForSubject,
} from '~/utils/browser-notifications'
import type { NotificationsContext } from './useNotificationsState'

/** Inbox fetch, kind filter, and read/delivered/lock-screen mutations. */
export function useNotificationsInbox(c: NotificationsContext) {
  const {
    apiFetch,
    me,
    groupsUnread,
    setGroupsUnread,
    accountId,
    generation,
    revision,
    notifications,
    nextCursor,
    loading,
    pendingRefresh,
    activeKind,
    unreadByKind,
    hasFetched,
    fetchError,
    unreadByCategory,
  } = c

  async function fetchList(opts?: { cursor?: string | null; limit?: number; forceRefresh?: boolean }) {
    if (!accountId.value) return
    if (loading.value) {
      if (opts?.forceRefresh) pendingRefresh.value = true
      return
    }
    const cursor = opts?.cursor ?? null
    const request = ++generation.value
    const requestedAccount = accountId.value
    const requestedKind = activeKind.value
    const startedRevision = revision.value
    const isCurrent = () => request === generation.value && requestedAccount === accountId.value && requestedKind === activeKind.value
    pendingRefresh.value = false
    loading.value = true
    fetchError.value = null
    let succeeded = false
    try {
      const q = new URLSearchParams({ limit: String(opts?.limit ?? 30) })
      if (cursor) q.set('cursor', cursor)
      if (requestedKind) q.set('kind', requestedKind)
      const res = (await apiFetch<NotificationFeedItem[]>(`/notifications?${q}`)) as unknown as GetNotificationsResponse
      if (!isCurrent()) return
      // A snapshot started before an arrival/edit/read/delete cannot replace live state.
      // Keep the rendered groups while one coalesced follow-up obtains a current snapshot.
      succeeded = true
      if (revision.value !== startedRevision) {
        pendingRefresh.value = true
        return
      }
      const list = cursor ? [...notifications.value, ...(res.data ?? [])] : (res.data ?? [])
      const seen = new Set<string>()
      notifications.value = list.filter(item => {
        const key = item.type === 'single' ? `single:${item.notification.id}` : item.type === 'group' ? `group:${item.group.id}` : `rollup:${item.rollup.id}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      hasFetched.value = true
      nextCursor.value = res.pagination?.nextCursor ?? null
      unreadByKind.value = c.normalizeUnreadByKind(res.pagination?.unreadByKind)
      unreadByCategory.value = res.pagination?.unreadByCategory ?? {}
      return res.pagination
    } catch (error: unknown) {
      if (!isCurrent()) return
      hasFetched.value = true
      fetchError.value = getApiErrorMessage(error) || 'Could not load notifications.'
      pendingRefresh.value = true
    } finally {
      if (isCurrent()) {
        loading.value = false
        // Failure stays retryable on entry/foreground/reconnect, without a retry loop.
        if (succeeded && pendingRefresh.value) void fetchList({ forceRefresh: true })
      }
    }
  }

  async function markDelivered() {
    await apiFetch('/notifications/mark-delivered', { method: 'POST' })
  }

  async function clearLockScreen(section: 'inbox' | 'groups') {
    try {
      await apiFetch('/notifications/lock-screen/clear', {
        method: 'POST',
        body: { section },
      })
    } catch (e: unknown) {
      if (import.meta.dev) {
        console.warn('[notifications] clearLockScreen failed', e)
      }
    }
  }

  async function markBoardNotificationsRead() {
    if (!me.value?.id) return
    try {
      await apiFetch('/notifications/mark-read', {
        method: 'POST',
        body: { filter: 'board' },
      })
    } catch (e: unknown) {
      if (import.meta.dev) {
        console.warn('[notifications] markBoardNotificationsRead failed', e)
      }
    }
  }

  async function markReadBySubject(params: {
    post_id?: string
    user_id?: string
    article_id?: string
    crew_id?: string
    group_id?: string
    board_thread_id?: string
  }) {
    if (!params.post_id && !params.user_id && !params.article_id && !params.crew_id && !params.group_id && !params.board_thread_id) return
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
   * Mark all `community_group_post` badge rows for a specific group as seen
   * (deliveredAt set, NOT readAt). Called when the user opens a group page.
   * Posts become "read" only when actually viewed on screen.
   * Optimistically clears the per-group count in the shared `groupsUnread` state
   * so the badge disappears immediately; the server will emit the authoritative
   * `groups:unreadChanged` event shortly after.
   */
  async function markGroupPostsSeen(groupId: string) {
    if (!groupId) return
    // Optimistic clear so the badge disappears immediately.
    const prev = groupsUnread.value
    const byGroupId = { ...prev.byGroupId }
    const cleared = byGroupId[groupId] ?? 0
    delete byGroupId[groupId]
    setGroupsUnread({ total: Math.max(0, prev.total - cleared), byGroupId })
    // Fire-and-forget; the server emits groups:unreadChanged to confirm.
    try {
      await apiFetch(`/notifications/groups/${encodeURIComponent(groupId)}/mark-delivered`, { method: 'POST' })
    } catch (e: unknown) {
      if (import.meta.dev) {
        console.warn('[notifications] markGroupPostsSeen failed', e)
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
    await apiFetch(`/notifications/${encodeURIComponent(id)}/mark-read`, { method: 'POST' })
    closeBrowserNotificationsForIds([id])
  }

  async function markAllRead() {
    await apiFetch('/notifications/mark-all-read', { method: 'POST' })
    closeAllBrowserNotifications()
  }

  async function markReadByKind(kind: 'word_of_the_day' | 'quote_of_the_day' | 'checkin_reminder' | 'on_this_day') {
    try {
      await apiFetch('/notifications/mark-read-by-kind', { method: 'POST', body: { kind } })
    } catch (e: unknown) {
      if (import.meta.dev) {
        console.warn('[notifications] markReadByKind failed', e)
      }
    }
  }


  async function setKind(kind: NotificationKind | 'other' | 'board' | null) {
    const next = kind === 'checkin_post' ? 'followed_post' : kind
    if (next !== activeKind.value) {
      generation.value += 1
      loading.value = false
      nextCursor.value = null
      activeKind.value = next
    }
    await fetchList({ forceRefresh: true })
  }


  return { fetchList, markDelivered, clearLockScreen, markBoardNotificationsRead, markReadBySubject, markGroupPostsSeen, markReadById, markAllRead, markReadByKind, setKind }
}
