import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import type { Notification, NotificationFeedItem } from '~/types/api'
import { boardActivityHref, unreadBoardActivity, useBoardActivity } from '~/composables/useBoardActivity'

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), add: vi.fn(), remove: vi.fn(), counts: vi.fn() }))
const user = ref<{ id: string } | null>({ id: 'viewer' })
const unread = ref({ board: 2, articles: 1 })
const connected = ref(true)
vi.mock('~/composables/useApiClient', () => ({ useApiClient: () => ({ apiFetch: mocks.fetch }) }))
vi.mock('~/composables/useAuth', () => ({ useAuth: () => ({ user }) }))
vi.mock('~/composables/usePresence', () => ({ usePresence: () => ({
  addNotificationsCallback: mocks.add, removeNotificationsCallback: mocks.remove,
  notificationNavUnread: unread, isSocketConnected: connected, setNotificationNavUnread: mocks.counts,
}) }))
vi.mock('@vueuse/core', () => ({ useDocumentVisibility: () => ref('visible') }))

function row(id: string, readAt: string | null = null): NotificationFeedItem {
  return { type: 'single', notification: { id, kind: 'comment', createdAt: '2026-09-28T10:00:00Z', readAt,
    boardThreadId: 'thread', boardCommentId: 'reply' } as Notification }
}
const response = (items: NotificationFeedItem[], nextCursor: string | null = null) => ({ data: items, pagination: { nextCursor } })
let wrapper: VueWrapper
let activity: ReturnType<typeof useBoardActivity>
beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  user.value = { id: 'viewer' }
  unread.value = { board: 2, articles: 1 }
  mocks.fetch.mockReset().mockResolvedValue(response([row('one')], 'next'))
  wrapper = mount(defineComponent({ setup() { activity = useBoardActivity(); return () => h('div') } }))
})
afterEach(() => { wrapper.unmount(); vi.useRealTimers() })

describe('Board unread Activity', () => {
  it('loads without marking anything read and preserves exact comment links', async () => {
    await flushPromises()
    expect(mocks.fetch).toHaveBeenCalledWith('/notifications', expect.objectContaining({ query: expect.objectContaining({ kind: 'board', boardCommentsOnly: true, unreadOnly: true }) }))
    expect(mocks.fetch.mock.calls.every(call => !call[1]?.method)).toBe(true)
    expect(boardActivityHref(row('one'))).toBe('/b/thread/c/reply')
    expect(unreadBoardActivity([row('one'), row('one'), row('read', 'now')])).toHaveLength(1)
  })
  it('paginates and deduplicates repeated notification identities', async () => {
    await flushPromises()
    mocks.fetch.mockResolvedValue(response([row('one'), row('two')]))
    await activity.load(false)
    expect(activity.items.value).toHaveLength(2)
    expect(mocks.fetch.mock.calls.at(-1)?.[1].query.cursor).toBe('next')
  })
  it('keeps rows and badge on acknowledgement failure and can retry', async () => {
    await flushPromises()
    mocks.fetch.mockRejectedValueOnce(new Error('offline'))
    await activity.markAllRead()
    expect(activity.items.value).toHaveLength(1)
    expect(activity.error.value).toBeTruthy()
    expect(mocks.counts).not.toHaveBeenCalled()
    mocks.fetch.mockResolvedValueOnce({ data: {} }).mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce({ data: { boardUnreadCount: 0, articlesUnreadCount: 1 } })
    await activity.markAllRead()
    expect(activity.items.value).toHaveLength(0)
    expect(mocks.counts).toHaveBeenCalledWith({ boardUnreadCount: 0, articlesUnreadCount: 1 })
  })
  it('discards a previous account response', async () => {
    await flushPromises()
    let resolve!: (data: ReturnType<typeof response>) => void
    mocks.fetch.mockReturnValueOnce(new Promise(r => { resolve = r }))
    const loading = activity.load()
    user.value = { id: 'second' }
    mocks.fetch.mockResolvedValue(response([]))
    await nextTick()
    resolve(response([row('private')]))
    await loading
    await flushPromises()
    expect(activity.items.value).toEqual([])
  })
  it('coalesces realtime changes and rejects an older in-flight snapshot', async () => {
    await flushPromises()
    let resolve!: (data: ReturnType<typeof response>) => void
    mocks.fetch.mockReturnValueOnce(new Promise(r => { resolve = r }))
    const loading = activity.load()
    const callback = mocks.add.mock.calls[0]![0]
    callback.onNew({}); callback.onUpdated({}); callback.onDeleted({})
    resolve(response([row('stale')]))
    await loading
    expect(activity.items.value.map(item => (item as { notification: Notification }).notification.id)).toEqual(['one'])
    mocks.fetch.mockResolvedValue(response([row('fresh')]))
    await vi.advanceTimersByTimeAsync(120)
    expect(activity.items.value).toEqual([row('fresh')])
    expect(mocks.fetch).toHaveBeenCalledTimes(3)
  })
})
