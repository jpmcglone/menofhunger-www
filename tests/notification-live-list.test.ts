import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope, ref, nextTick, type EffectScope } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useNotifications } from '~/composables/useNotifications'
import { notificationCategory } from '~/utils/notification-category'
import type { Notification, NotificationFeedItem } from '~/types/api'

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), add: vi.fn(), remove: vi.fn() }))
const user = ref<{ id: string } | null>({ id: 'viewer' })
const states = new Map<string, ReturnType<typeof ref>>()
mockNuxtImport('useState', () => (key: string, init: () => unknown) => {
  if (!states.has(key)) states.set(key, ref(init()))
  return states.get(key)
})
vi.mock('~/composables/useApiClient', () => ({ useApiClient: () => ({ apiFetch: mocks.fetch }) }))
vi.mock('~/composables/useAuth', () => ({ useAuth: () => ({ user }) }))
mockNuxtImport('useRoute', () => () => ({ path: '/home' }))
vi.mock('~/composables/usePresence', () => ({ usePresence: () => ({
  addNotificationsCallback: mocks.add, removeNotificationsCallback: mocks.remove,
  setNotificationUndeliveredCount: vi.fn(), groupsUnread: ref({ total: 0, byGroupId: {} }), setGroupsUnread: vi.fn(),
}) }))
vi.mock('~/composables/useUsersStore', () => ({ useUsersStore: () => ({ overlay: (u: unknown) => u }) }))

function row(id: string, kind = 'followed_post', parentId: string | null = null): NotificationFeedItem {
  return { type: 'single', notification: { id, kind, createdAt: '2026-09-09T12:00:00Z', readAt: null, deliveredAt: null,
    post: { id: 'same-post', parentId } } as Notification }
}
function response(rows: NotificationFeedItem[]) {
  return { data: rows, pagination: { nextCursor: null, unreadByKind: { all: rows.length }, unreadByCategory: { all: rows.length } } }
}
function deferred() {
  let resolve!: (value: ReturnType<typeof response>) => void
  const promise = new Promise<ReturnType<typeof response>>(r => { resolve = r })
  return { promise, resolve }
}
let scope: EffectScope
let inbox: ReturnType<typeof useNotifications>
const callback = () => mocks.add.mock.calls.at(-1)![0]
beforeEach(() => {
  states.clear()
  vi.clearAllMocks()
  user.value = { id: 'viewer' }
  mocks.fetch.mockImplementation(() => new Promise(() => {}))
  scope = effectScope()
  inbox = scope.run(() => useNotifications())!
})
afterEach(() => scope.stop())

describe('session notification lifecycle', () => {
  it('keeps distinct events about one post and deduplicates repeated IDs offscreen', () => {
    callback().onNew({ notification: (row('one') as any).notification })
    callback().onNew({ notification: (row('two', 'mention') as any).notification })
    callback().onNew({ notification: (row('one') as any).notification })
    expect(inbox.notifications.value.map((n: any) => n.notification.id)).toEqual(['two', 'one'])
    expect(mocks.fetch).toHaveBeenCalledTimes(1)
  })

  it('retains a live arrival when an older HTTP response finishes, then regroups authoritatively', async () => {
    const stale = deferred(), current = deferred()
    mocks.fetch.mockReturnValueOnce(stale.promise).mockReturnValueOnce(current.promise)
    const loading = inbox.fetchList({ forceRefresh: true })
    callback().onNew({ notification: (row('new') as any).notification })
    stale.resolve(response([row('old')]))
    await loading
    expect(inbox.notifications.value.map((n: any) => n.notification.id)).toEqual(['new'])
    current.resolve(response([row('new'), row('old')]))
    await nextTick()
    expect(inbox.notifications.value).toHaveLength(2)
  })

  it('ignores a response from the previous filter', async () => {
    const old = deferred(), replies = deferred()
    mocks.fetch.mockReturnValueOnce(old.promise).mockReturnValueOnce(replies.promise)
    const loading = inbox.fetchList({ forceRefresh: true })
    const changing = inbox.setKind('comment')
    replies.resolve(response([row('reply', 'comment')]))
    await changing
    old.resolve(response([row('old')]))
    await loading
    expect((inbox.notifications.value[0] as any).notification.id).toBe('reply')
  })

  it('clears account state and rejects the previous account response', async () => {
    const old = deferred()
    mocks.fetch.mockReturnValueOnce(old.promise)
    const loading = inbox.fetchList({ forceRefresh: true })
    user.value = { id: 'another' }
    old.resolve(response([row('private')]))
    await loading
    expect(inbox.notifications.value).toEqual([])
    expect(inbox.loading.value).toBe(false)
  })

  it('patches silent changes and deletions while browsing elsewhere', () => {
    inbox.notifications.value = [row('first'), row('second')]
    callback().onNew({ notification: { ...(row('second') as any).notification, body: 'edited' }, silent: true })
    expect((inbox.notifications.value[1] as any).notification.body).toBe('edited')
    callback().onDeleted({ notificationIds: ['second'] })
    expect(inbox.notifications.value).toHaveLength(1)
  })

  it('retains existing groups while regrouping after an arrival', () => {
    inbox.notifications.value = [{ type: 'group', group: { id: 'group', kind: 'follow', count: 5 } } as NotificationFeedItem]
    callback().onNew({ notification: (row('follower', 'follow') as any).notification })
    expect(inbox.notifications.value).toHaveLength(2)
    expect((inbox.notifications.value[1] as any).group.count).toBe(5)
  })

  it('remains retryable after a failed sync without an automatic failure loop', async () => {
    mocks.fetch.mockRejectedValueOnce(new Error('offline'))
    await inbox.fetchList({ forceRefresh: true })
    expect(inbox.pendingRefresh.value).toBe(true)
    expect(mocks.fetch).toHaveBeenCalledTimes(1)
    mocks.fetch.mockResolvedValueOnce(response([row('retry')]))
    await inbox.fetchList({ forceRefresh: true })
    expect(inbox.fetchError.value).toBe(null)
    expect(inbox.notifications.value).toHaveLength(1)
  })
})

describe('notification categories', () => {
  it.each([['community_group_post', 'posts'], ['checkin_post', 'posts'], ['crew_wall_mention', 'mentions'],
    ['repost', 'other'], ['message', 'other'], ['future_kind', 'other']])('%s belongs to %s', (kind, expected) => {
    expect(notificationCategory({ kind } as Notification)).toBe(expected)
  })
  it('uses event identity for a mention inside a reply', () => {
    expect(notificationCategory((row('mention', 'mention', 'parent') as any).notification)).toBe('mentions')
    expect(notificationCategory((row('reply', 'followed_post', 'parent') as any).notification)).toBe('replies')
  })
})
