import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useActivityNotificationRead } from '~/composables/notifications/useActivityNotificationRead'
import { bumpAuthGeneration } from '~/composables/auth/authState'
import { useNotificationReadMutation } from '~/composables/notifications/useNotificationReadMutation'
import type { Notification, NotificationFeedItem, NotificationGroup, FollowedPostsRollup } from '~/types/api'

const mocks = vi.hoisted(() => ({ api: vi.fn(), refreshCount: vi.fn(), error: vi.fn(), close: vi.fn() }))
const appScope = {}
mockNuxtImport('useNuxtApp', () => () => appScope)
const me = ref<{ id: string } | null>({ id: 'viewer' })
const rows = ref<NotificationFeedItem[]>([])
const counts = ref<Record<string, number>>({ all: 1, comment: 1 })
const state = { apiFetch: mocks.api, me, accountId: ref('viewer'), notifications: rows, unreadByKind: counts,
  unreadByCategory: ref({}), revision: ref(0) }
vi.mock('~/composables/notifications/useNotificationsState', () => ({ useNotificationsState: () => state }))
vi.mock('~/utils/browser-notifications', () => ({ closeBrowserNotificationsForIds: mocks.close }))
vi.mock('~/composables/useNotificationsBadge', () => ({ useNotificationsBadge: () => ({ fetchUndeliveredCount: mocks.refreshCount }) }))
vi.mock('~/composables/useAppToast', () => ({ useAppToast: () => ({ push: mocks.error }) }))
function row(): NotificationFeedItem { return { type: 'single', notification: { id: 'one', kind: 'comment', readAt: null, deliveredAt: null } as Notification } }
beforeEach(() => {
  vi.clearAllMocks(); mocks.api.mockResolvedValue({ data: {} })
  state.accountId.value = 'viewer'; me.value = { id: 'viewer' }; rows.value = [row()]; counts.value = { all: 1, comment: 1 }; state.revision.value = 0
})
describe('activity notification read', () => {
  it('marks a loaded single row optimistically, uses only the individual mutation and refreshes counts', async () => {
    let resolve!: (value: unknown) => void
    mocks.api.mockImplementation(() => new Promise(value => { resolve = value }))
    const read = useActivityNotificationRead().markRead('one')
    expect(rows.value[0]?.type === 'single' && rows.value[0].notification.readAt).toBeTruthy()
    expect(counts.value).toEqual({ all: 0, comment: 0 })
    expect(mocks.api).toHaveBeenCalledWith('/notifications/one/mark-read', { method: 'POST' })
    resolve({ data: {} }); await read
    expect(mocks.refreshCount).toHaveBeenCalledOnce()
    expect(mocks.api).toHaveBeenCalledTimes(1)
  })
  it('restores its optimistic single row on failure and rejects late effects after an identity change', async () => {
    mocks.api.mockRejectedValueOnce(new Error('offline'))
    await useActivityNotificationRead().markRead('one')
    expect(rows.value).toEqual([row()]); expect(counts.value).toEqual({ all: 1, comment: 1 })
    expect(mocks.error).toHaveBeenCalledOnce()
    let reject!: (value: unknown) => void
    mocks.api.mockImplementation(() => new Promise((_resolve, failure) => { reject = failure }))
    const read = useActivityNotificationRead().markRead('one')
    me.value = { id: 'other' }; rows.value = []; counts.value = { all: 0 }
    reject(new Error('offline')); await read
    expect(rows.value).toEqual([]); expect(counts.value).toEqual({ all: 0 })
    expect(mocks.error).toHaveBeenCalledOnce(); expect(mocks.refreshCount).not.toHaveBeenCalled()
  })
})


describe('shared notification read action', () => {
  it('deduplicates simultaneous inbox and toast reads and rolls back only once', async () => {
    let reject!: (error: Error) => void
    mocks.api.mockImplementation(() => new Promise((_resolve, fail) => { reject = fail }))
    const inbox = useNotificationReadMutation().markRead(rows.value[0]!)
    const toast = useActivityNotificationRead().markRead('one')
    expect(mocks.api).toHaveBeenCalledTimes(1)
    expect(counts.value).toEqual({ all: 0, comment: 0 })
    reject(new Error('offline'))
    await Promise.all([inbox, toast])
    expect(rows.value).toEqual([row()])
    expect(counts.value).toEqual({ all: 1, comment: 1 })
    expect(mocks.error).toHaveBeenCalledOnce()
  })

  it('does not roll back a row or counts replaced by an authoritative update', async () => {
    let reject!: (error: Error) => void
    mocks.api.mockImplementation(() => new Promise((_resolve, fail) => { reject = fail }))
    const read = useNotificationReadMutation().markRead('one')
    const current = rows.value[0]!
    if (current.type !== 'single') throw new Error('fixture')
    rows.value = [{ ...current, notification: { ...current.notification, body: 'Updated by socket', readAt: 'server-read' } }]
    counts.value = { all: 5, comment: 5 }
    reject(new Error('offline')); await read
    expect(rows.value[0]?.type === 'single' && rows.value[0].notification.body).toBe('Updated by socket')
    expect(rows.value[0]?.type === 'single' && rows.value[0].notification.readAt).toBe('server-read')
    expect(counts.value).toEqual({ all: 5, comment: 5 })
  })

  it('ignores an old session even if the same account signs back in', async () => {
    let reject!: (error: Error) => void
    mocks.api.mockImplementation(() => new Promise((_resolve, fail) => { reject = fail }))
    const read = useNotificationReadMutation().markRead('one')
    bumpAuthGeneration()
    rows.value = [row()]; counts.value = { all: 1, comment: 1 }
    reject(new Error('offline')); await read
    expect(rows.value).toEqual([row()])
    expect(counts.value).toEqual({ all: 1, comment: 1 })
    expect(mocks.error).not.toHaveBeenCalled()
    expect(mocks.refreshCount).not.toHaveBeenCalled()
  })

  it('marks a group by its representative id and restores it if the mutation fails', async () => {
    const group: NotificationFeedItem = { type: 'group', group: { id: 'representative', kind: 'comment', readAt: null, deliveredAt: null } as NotificationGroup }
    rows.value = [group]
    mocks.api.mockRejectedValueOnce(new Error('offline'))
    await useNotificationReadMutation().markRead(group)
    expect(mocks.api).toHaveBeenCalledWith('/notifications/representative/mark-read', { method: 'POST' })
    expect(rows.value).toEqual([group])
    expect(counts.value).toEqual({ all: 1, comment: 1 })
  })

  it('marks rollups locally without sending their synthetic id as a notification id', async () => {
    const rollup: NotificationFeedItem = { type: 'followed_posts_rollup', rollup: { id: 'rollup', readAt: null, deliveredAt: null } as FollowedPostsRollup }
    rows.value = [rollup]; counts.value = { all: 1, followed_post: 1 }
    await useNotificationReadMutation().markRead(rollup)
    expect(rows.value[0]?.type === 'followed_posts_rollup' && rows.value[0].rollup.readAt).toBeTruthy()
    expect(counts.value).toEqual({ all: 0, followed_post: 0 })
    expect(mocks.api).not.toHaveBeenCalled()
  })

  it('acknowledges unloaded notifications without changing unrelated inbox state', async () => {
    await useNotificationReadMutation().markRead('unloaded')
    expect(rows.value).toEqual([row()])
    expect(counts.value).toEqual({ all: 1, comment: 1 })
    expect(mocks.close).toHaveBeenCalledWith(['unloaded'])
    expect(mocks.refreshCount).toHaveBeenCalledOnce()
  })
})
