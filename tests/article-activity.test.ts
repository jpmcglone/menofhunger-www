import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import type { Notification, NotificationFeedItem } from '~/types/api'
import { articleActivityHref, unreadArticleActivity, useArticleActivity } from '~/composables/useArticleActivity'

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
    subjectArticleId: 'thread', subjectArticleCommentId: 'reply' } as Notification }
}
const response = (items: NotificationFeedItem[], nextCursor: string | null = null) => ({ data: items, pagination: { nextCursor } })
let wrapper: VueWrapper
let activity: ReturnType<typeof useArticleActivity>
beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  user.value = { id: 'viewer' }
  unread.value = { board: 2, articles: 1 }
  mocks.fetch.mockReset().mockResolvedValue(response([row('one')], 'next'))
  wrapper = mount(defineComponent({ setup() { activity = useArticleActivity(); return () => h('div') } }))
})
afterEach(() => { wrapper.unmount(); vi.useRealTimers() })

describe('Article activity', () => {
  it('does not read on fetch and links to the exact comment', async () => {
    await flushPromises()
    expect(mocks.fetch).toHaveBeenCalledWith('/notifications', expect.objectContaining({ query: expect.objectContaining({ kind: 'articles', unreadOnly: true }) }))
    expect(mocks.fetch.mock.calls.every(call => !call[1]?.method || call[1].method === 'GET')).toBe(true)
    expect(articleActivityHref(row('one'))).toBe('/a/thread#comment-reply')
    expect(unreadArticleActivity([row('one'), row('one'), row('old', 'now')])).toHaveLength(1)
  })
  it('acknowledges only presented IDs and retains their highlight through refresh', async () => {
    await flushPromises()
    mocks.fetch.mockImplementation(async (path: string) => path === '/notifications' ? response([]) : { data: { articlesUnreadCount: 0 } })
    await activity.acknowledge('one')
    expect(mocks.fetch).toHaveBeenCalledWith('/notifications/one/mark-read', { method: 'POST' })
    expect(mocks.counts).toHaveBeenCalledWith({ articlesUnreadCount: 0 })
    await activity.load()
    expect(activity.items.value).toEqual([row('one')])
    const count = mocks.fetch.mock.calls.length
    await activity.acknowledge('one')
    expect(mocks.fetch).toHaveBeenCalledTimes(count)
  })
  it('preserves badge and rows on failed read, then retries', async () => {
    await flushPromises()
    let fail = true
    mocks.fetch.mockImplementation(async (path: string) => {
      if (path.includes('mark-read') && fail) throw new Error('offline')
      return path === '/notifications' ? response([]) : { data: { articlesUnreadCount: 0 } }
    })
    await activity.acknowledge('one')
    expect(activity.failedIds.value).toEqual(['one'])
    expect(activity.items.value).toHaveLength(1)
    expect(mocks.counts).not.toHaveBeenCalled()
    fail = false
    await activity.retry()
    expect(activity.failedIds.value).toEqual([])
    expect(activity.items.value).toHaveLength(1)
    expect(mocks.counts).toHaveBeenCalled()
  })
  it('retries a failed badge refresh without acknowledging twice', async () => {
    await flushPromises()
    let failCount = true
    mocks.fetch.mockImplementation(async (path: string) => {
      if (path === '/notifications/unread-count' && failCount) throw new Error('offline')
      return path === '/notifications' ? response([]) : { data: { articlesUnreadCount: 0 } }
    })
    await activity.acknowledge('one')
    expect(activity.error.value).toBe('Couldn’t refresh the activity badge.')
    expect(mocks.counts).not.toHaveBeenCalled()
    failCount = false
    await activity.retry()
    expect(mocks.counts).toHaveBeenCalledWith({ articlesUnreadCount: 0 })
    expect(mocks.fetch.mock.calls.filter(call => call[0].includes('mark-read'))).toHaveLength(1)
  })
  it('paginates without dropping already presented previews', async () => {
    await flushPromises()
    mocks.fetch.mockResolvedValue(response([row('one'), row('two')]))
    await activity.load(false)
    expect(activity.items.value).toHaveLength(2)
    expect(mocks.fetch.mock.calls.at(-1)?.[1].query.cursor).toBe('next')
  })
  it('discards responses from the previous account', async () => {
    await flushPromises()
    let resolve!: (data: ReturnType<typeof response>) => void
    let delay = true
    mocks.fetch.mockImplementation(() => delay ? new Promise(r => { resolve = r }) : Promise.resolve(response([])))
    const loading = activity.load()
    user.value = { id: 'second' }
    delay = false
    await nextTick()
    resolve(response([row('private')]))
    await loading
    await flushPromises()
    expect(activity.items.value).toEqual([])
  })
})
