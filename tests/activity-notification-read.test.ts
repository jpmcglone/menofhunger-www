import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useActivityNotificationRead } from '~/composables/notifications/useActivityNotificationRead'
import type { Notification, NotificationFeedItem } from '~/types/api'

const mocks = vi.hoisted(() => ({ api: vi.fn(), refreshCount: vi.fn(), error: vi.fn(), close: vi.fn() }))
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
  me.value = { id: 'viewer' }; rows.value = [row()]; counts.value = { all: 1, comment: 1 }; state.revision.value = 0
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
