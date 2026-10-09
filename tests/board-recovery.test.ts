import { defineComponent, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import Board from '~/pages/b/index.vue'

const spies = vi.hoisted(() => ({ list: vi.fn(), comments: vi.fn(), fetch: vi.fn() }))
mockNuxtImport('useBoardApi', () => () => ({ listThreads: spies.list, listLatestComments: spies.comments }))
mockNuxtImport('useAuth', () => () => ({ user: ref(null), isAuthed: ref(false), isPremium: ref(false), isVerifiedMember: ref(false) }))
mockNuxtImport('useApiClient', () => () => ({ apiFetch: spies.fetch }))
mockNuxtImport('useBoardActivity', () => () => ({ items: ref([]), nextCursor: ref(null), loading: ref(false), error: ref(null), load: vi.fn() }))
mockNuxtImport('usePresence', () => () => ({ subscribeBoard: vi.fn(), unsubscribeBoard: vi.fn() }))
vi.mock('~/composables/presence/usePresenceCallback', () => ({ usePresenceCallback: () => ({}) }))

const global = {
  stubs: {
    Icon: true, AppIconGlyph: true, AppBoardFiltersBar: true, AppUnderlineTabs: true,
    AppFeedNewPostsPill: true, AppRefreshIndicator: true,
    AppPageContent: defineComponent({ template: '<main><slot /></main>' }),
    AppBoardThreadRow: defineComponent({ props: ['thread'], template: '<article>{{ thread.title }}</article>' }),
    AppScreenState: defineComponent({ props: ['status', 'title'], template: '<div :data-state="status">{{ title }}</div>' }),
  },
}
let view: VueWrapper | undefined
beforeEach(() => {
  vi.clearAllMocks()
  spies.comments.mockResolvedValue({ comments: [], nextCursor: null })
})
afterEach(() => view?.unmount())

async function render() {
  view = await mountSuspended(Board, { route: '/b', global })
  await flushPromises()
  return view
}

describe('Board list request recovery', () => {
  it('shows row placeholders while pending, then retry rather than a false empty state', async () => {
    let reject!: (reason: Error) => void
    spies.list.mockReturnValueOnce(new Promise((_resolve, fail) => { reject = fail }))
    const page = await render()
    expect(page.find('[data-state="loading"]').exists()).toBe(true)
    reject(new Error('Couldn’t load the Board.'))
    await flushPromises()
    expect(page.get('[role="alert"]').text()).toContain('Couldn’t load the Board.')
    expect(page.text()).not.toContain('Nothing here yet')
    spies.list.mockResolvedValueOnce({ threads: [{ id: 'thread', title: 'Recovered discussion' }], nextCursor: null })
    await page.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(page.find('[role="alert"]').exists()).toBe(false)
    expect(page.text()).toContain('Recovered discussion')
  })

  it('keeps existing discussions when pagination fails and retries the same cursor', async () => {
    spies.list.mockResolvedValueOnce({ threads: [{ id: 'one', title: 'Existing discussion' }], nextCursor: 'next' })
    const page = await render()
    spies.list.mockRejectedValueOnce(new Error('Offline'))
    const more = page.findAll('button').find(button => button.text() === 'More')!
    await more.trigger('click')
    await flushPromises()
    expect(page.text()).toContain('Existing discussion')
    expect(page.find('[role="alert"]').exists()).toBe(true)
    spies.list.mockResolvedValueOnce({ threads: [{ id: 'two', title: 'Next discussion' }], nextCursor: null })
    await page.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(spies.list.mock.calls.at(-1)?.[0].cursor).toBe('next')
    expect(page.text()).toContain('Existing discussion')
    expect(page.text()).toContain('Next discussion')
  })
})
