import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref, nextTick } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useBadgeHydrationBefore } from './fixtures/performance/badge-hydration-before'
import { useBadgeHydration } from '~/composables/useBadgeHydration'

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), set: vi.fn(), other: vi.fn(), add: vi.fn(), remove: vi.fn() }))
const user = ref<Record<string, unknown> | null>(null)
const states = new Map<string, ReturnType<typeof ref>>()
const app = {}
mockNuxtImport('useState', () => (key: string, init: () => unknown) => {
  if (!states.has(key)) states.set(key, ref(init()))
  return states.get(key)
})
mockNuxtImport('useNuxtApp', () => () => app)
vi.mock('~/composables/useAuth', () => ({ useAuth: () => ({ user }) }))
vi.mock('~/composables/usePresence', () => ({ usePresence: () => ({
  isSocketConnected: ref(false), addCrewCallback: mocks.add, removeCrewCallback: mocks.remove,
  addGroupInviteCallback: mocks.add, removeGroupInviteCallback: mocks.remove,
  setNotificationUndeliveredCount: mocks.set, setNotificationUnreadCommentCount: vi.fn(),
  setMessageUnreadCounts: vi.fn(), setGroupsUnread: vi.fn(), setNotificationNavUnread: vi.fn(),
}) }))
vi.mock('~/composables/useNotificationsBadge', () => ({ useNotificationsBadge: () => ({ fetchUndeliveredCount: mocks.fetch }) }))
vi.mock('~/composables/useMessagesBadge', () => ({ useMessagesBadge: () => ({ fetchUnreadCounts: mocks.other }) }))
vi.mock('~/composables/useGroupsBadge', () => ({ useGroupsBadge: () => ({ refresh: mocks.other }) }))
vi.mock('~/composables/useCrewInvitesBadge', () => ({ useCrewInvitesBadge: () => ({ refresh: mocks.other, setCount: vi.fn() }) }))
vi.mock('~/composables/useGroupInvitesBadge', () => ({ useGroupInvitesBadge: () => ({ refresh: mocks.other, setCount: vi.fn() }) }))

let hydration: ReturnType<typeof useBadgeHydration>
const Harness = defineComponent({ setup() {
  hydration = useBadgeHydration()
  return () => h('main', 'Content ready')
} })
function account(id = 'one') {
  return { id, notificationUndeliveredCount: 7, notificationUnreadCommentCount: 2,
    messageUnreadCounts: { primary: 1, requests: 0 }, groupsUnread: { total: 0, byGroupId: {} },
    crewInviteInboxCount: 0, groupInviteInboxCount: 0 }
}
beforeEach(() => {
  states.clear()
  vi.clearAllMocks()
  user.value = account()
  mocks.fetch.mockImplementation(() => new Promise(() => {}))
})

describe('badge hydration critical path', () => {
  it('server rendering seeds counts but never starts recovery, even through refresh()', async () => {
    expect(await renderToString(h(Harness))).toContain('Content ready')
    await hydration.refresh()
    expect(mocks.set).toHaveBeenCalledWith(7)
    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(states.get('badge-hydration:user-id')?.value).toBeNull()
  })
  it('mount renders immediately while recovery is held; calls coalesce and seeding is not repeated', async () => {
    let release!: () => void
    mocks.fetch.mockImplementation(() => new Promise<void>(resolve => { release = resolve }))
    const wrapper = mount(Harness)
    expect(wrapper.text()).toBe('Content ready')
    expect(mocks.fetch).toHaveBeenCalledTimes(1)
    const first = hydration.refresh()
    const second = hydration.refresh()
    expect(mocks.fetch).toHaveBeenCalledTimes(1)
    release()
    await Promise.all([first, second])
    expect(states.get('badge-hydration:user-id')?.value).toBe('one')
    expect(mocks.set).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
  it('a late old-account recovery cannot mark the next account refreshed', async () => {
    const releases: Array<() => void> = []
    mocks.fetch.mockImplementation(() => new Promise<void>(resolve => { releases.push(resolve) }))
    const wrapper = mount(Harness)
    user.value = account('two')
    await nextTick()
    releases[0]!()
    await Promise.resolve()
    await nextTick()
    expect(states.get('badge-hydration:user-id')?.value).not.toBe('one')
    releases[1]!()
    await hydration.refresh()
    expect(states.get('badge-hydration:user-id')?.value).toBe('two')
    wrapper.unmount()
  })
})


it('records twenty matched SSR repetitions with a controlled 40ms badge response', async () => {
  const durations: Record<string, number[]> = { before: [], after: [] }
  const requests: Record<string, number[]> = { before: [], after: [] }
  for (const mode of ['before', 'after'] as const) {
    for (let i = 0; i < 20; i++) {
      states.clear()
      mocks.fetch.mockClear()
      mocks.fetch.mockImplementation(() => new Promise<void>(resolve => setTimeout(resolve, 40)))
      const Page = defineComponent({ async setup() {
        const badges = mode === 'before' ? useBadgeHydrationBefore() : useBadgeHydration()
        // Match the layout: old SSR awaited recovery; new SSR only seeds its snapshot.
        if (mode === 'before') await badges.refresh()
        else (badges as ReturnType<typeof useBadgeHydration>).seed()
        return () => h('main', 'Content ready')
      } })
      const start = performance.now()
      expect(await renderToString(h(Page))).toContain('Content ready')
      durations[mode]!.push(performance.now() - start)
      requests[mode]!.push(mocks.fetch.mock.calls.length)
    }
  }
  expect(requests.before).toEqual(Array(20).fill(1))
  expect(requests.after).toEqual(Array(20).fill(0))
  process.stdout.write(`MOH_PERF badge_ssr ${JSON.stringify({ durations, requests })}\n`)
})
