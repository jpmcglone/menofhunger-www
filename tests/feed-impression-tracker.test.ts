import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { effectScope, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePostViewTracker } from '~/composables/usePostViewTracker'

const state = vi.hoisted(() => ({ fetch: vi.fn(), user: { value: { id: 'impressions' } }, patches: vi.fn() }))
mockNuxtImport('useApiClient', () => () => ({ apiFetchData: state.fetch }))
mockNuxtImport('useAuth', () => () => ({ isAuthed: ref(true), user: state.user }))
mockNuxtImport('useAnonViewId', () => () => ref('anonymous_impressions'))
mockNuxtImport('usePresence', () => () => ({ groupsUnread: ref({ total: 0, byGroupId: {} }), setGroupsUnread: vi.fn() }))
mockNuxtImport('usePostCache', () => () => ({ get: () => ({}), patch: state.patches }))
let callbacks: IntersectionObserverCallback[] = []
const scopes: ReturnType<typeof effectScope>[] = []
const stops: (() => void)[] = []
let sequence = 0
function tracker() {
  const scope = effectScope(); scopes.push(scope)
  return scope.run(() => usePostViewTracker())!
}
function entry(index: number, visible: boolean) {
  callbacks[index]!([{ isIntersecting: visible, intersectionRatio: visible ? 0.7 : 0, intersectionRect: { height: visible ? 450 : 0 } } as IntersectionObserverEntry], {} as IntersectionObserver)
}
beforeEach(() => {
  vi.useFakeTimers()
  state.user.value.id = `impressions-${++sequence}`
  state.fetch.mockReset().mockResolvedValue([])
  callbacks = []
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: IntersectionObserverCallback) { callbacks.push(callback) }
    observe() {} unobserve() {} disconnect() {}
  })
})
afterEach(() => {
  stops.splice(0).forEach(stop => stop()); scopes.splice(0).forEach(scope => scope.stop())
  vi.useRealTimers(); vi.unstubAllGlobals()
})
describe('feed impressions', () => {
  it('requires a full visible second and never counts offscreen or stationary cards twice', async () => {
    const t = tracker()
    stops.push(t.observe('board', document.createElement('div')))
    entry(0, true)
    await vi.advanceTimersByTimeAsync(999); await t.flush()
    expect(state.fetch).not.toHaveBeenCalled()
    entry(0, false)
    await vi.advanceTimersByTimeAsync(1000); await t.flush()
    expect(state.fetch).not.toHaveBeenCalled()
    entry(0, true)
    await vi.advanceTimersByTimeAsync(1000); await t.flush()
    expect(state.fetch).toHaveBeenCalledTimes(1)
    expect(state.fetch.mock.calls[0]?.[1].body).toMatchObject({ postIds: ['board'], source: 'feed_scroll' })
    await vi.advanceTimersByTimeAsync(60_000); await t.flush()
    expect(state.fetch).toHaveBeenCalledTimes(1)
  })
  it('refresh waits for an in-flight impression write', async () => {
    const t = tracker()
    stops.push(t.observe('board', document.createElement('div')))
    entry(0, true); await vi.advanceTimersByTimeAsync(1000)
    let resolve!: (value: unknown[]) => void
    state.fetch.mockImplementation(() => new Promise(r => { resolve = r }))
    const first = t.flush()
    let finished = false
    const second = t.flush().then(() => { finished = true })
    await vi.advanceTimersByTimeAsync(0)
    expect(finished).toBe(false)
    resolve([])
    await Promise.all([first, second])
    expect(finished).toBe(true)
    expect(state.fetch).toHaveBeenCalledTimes(1)
  })
  it('keeps failed impressions queued for retry', async () => {
    const t = tracker()
    stops.push(t.observe('retry', document.createElement('div')))
    entry(0, true); await vi.advanceTimersByTimeAsync(1000)
    state.fetch.mockRejectedValue(new Error('offline'))
    await t.flush()
    state.fetch.mockResolvedValue([])
    await t.flush()
    expect(state.fetch).toHaveBeenCalledTimes(2)
    expect(state.fetch.mock.calls[1]?.[1].body.postIds).toEqual(['retry'])
  })
  it('restores pending impressions on browser reload and flushes them before a new feed request', async () => {
    sessionStorage.setItem(`moh-pending-impressions:${state.user.value.id}`, JSON.stringify({ at: Date.now(), ids: ['before-reload'] }))
    const t = tracker()
    await t.flush()
    expect(state.fetch.mock.calls[0]?.[1].body.postIds).toEqual(['before-reload'])
    expect(JSON.parse(sessionStorage.getItem(`moh-pending-impressions:${state.user.value.id}`)!).ids).toEqual([])
  })
  it('does not count a dwell completed in a hidden browser tab', async () => {
    const t = tracker()
    stops.push(t.observe('hidden', document.createElement('div')))
    entry(0, true)
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(1100); await t.flush()
    expect(state.fetch).not.toHaveBeenCalled()
    visibility.mockRestore()
  })
  it('records opening the thread independently of a preceding feed impression', async () => {
    const t = tracker()
    stops.push(t.observe('board', document.createElement('div')))
    entry(0, true); await vi.advanceTimersByTimeAsync(1000); await t.flush()
    await t.markOpened('board'); await t.markOpened('board')
    expect(state.fetch.mock.calls.map(call => call[1].body.source)).toEqual(['feed_scroll', 'post_open'])
  })
})
