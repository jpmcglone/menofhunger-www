import { effectScope, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FeedPost } from '~/types/api'
import { useFeedArrivalPolling } from '~/composables/useFeedArrivalPolling'

const scopes: ReturnType<typeof effectScope>[] = []
afterEach(() => { scopes.splice(0).forEach(s => s.stop()); vi.useRealTimers() })
function setup(fetch = vi.fn<(_: AbortSignal) => Promise<FeedPost[]>>().mockResolvedValue([])) {
  vi.useFakeTimers()
  const active = ref(true), periodic = ref(true), context = ref('me:forYou:all')
  const receive = vi.fn()
  const scope = effectScope(); scopes.push(scope)
  const poller = scope.run(() => useFeedArrivalPolling({active,periodic,context,fetch,receive}))!
  return {active,periodic,context,fetch,receive,scope,...poller}
}

describe('foreground feed arrival polling', () => {
  it('checks once a minute and pauses when hidden or outside For You', async () => {
    const p = setup()
    await vi.advanceTimersByTimeAsync(59_999); expect(p.fetch).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1); expect(p.fetch).toHaveBeenCalledTimes(1)
    p.active.value = false
    await vi.advanceTimersByTimeAsync(120_000); expect(p.fetch).toHaveBeenCalledTimes(1)
    p.active.value = true; p.periodic.value = false
    await vi.advanceTimersByTimeAsync(120_000); expect(p.fetch).toHaveBeenCalledTimes(1)
    p.periodic.value = true
    await vi.advanceTimersByTimeAsync(60_000); expect(p.fetch).toHaveBeenCalledTimes(2)
  })
  it('coalesces overlap and rejects an old response after account/filter changes', async () => {
    let resolve!: (posts: FeedPost[]) => void
    const fetch = vi.fn<(_: AbortSignal) => Promise<FeedPost[]>>(() => new Promise(r => {resolve = r}))
    const p = setup(fetch)
    const first = p.check(); await p.check()
    expect(fetch).toHaveBeenCalledTimes(1)
    p.context.value = 'other:forYou:public'
    expect(fetch.mock.calls[0]?.[0].aborted).toBe(true)
    resolve([{id:'stale'} as FeedPost]); await first
    expect(p.receive).not.toHaveBeenCalled()
  })
  it('drops in-flight responses on hide and cleans up timers on disposal', async () => {
    let resolve!: (posts: FeedPost[]) => void
    const p = setup(vi.fn(() => new Promise<FeedPost[]>(r => {resolve = r})))
    const check = p.check(); p.active.value = false
    resolve([]); await check; expect(p.receive).not.toHaveBeenCalled()
    p.active.value = true; p.scope.stop()
    await vi.advanceTimersByTimeAsync(120_000); expect(p.fetch).toHaveBeenCalledTimes(1)
  })
  it('quietly retries a failed check next minute', async () => {
    const fetch = vi.fn<(_: AbortSignal) => Promise<FeedPost[]>>().mockRejectedValue(new Error('offline'))
    const p = setup(fetch)
    await vi.advanceTimersByTimeAsync(120_000)
    expect(fetch).toHaveBeenCalledTimes(2); expect(p.receive).not.toHaveBeenCalled()
  })
})

describe('polling generation changes', () => {
  it('does not start a second timer when an obsolete request finishes after reactivation', async () => {
    let complete!: (posts: FeedPost[]) => void
    let first = true
    const fetch = vi.fn<(_: AbortSignal) => Promise<FeedPost[]>>(() => {
      if (!first) return Promise.resolve([])
      first = false
      return new Promise(r => {complete = r})
    })
    const p = setup(fetch)
    await vi.advanceTimersByTimeAsync(60_000)
    p.active.value = false; p.active.value = true
    complete([])
    await vi.advanceTimersByTimeAsync(60_000)
    expect(fetch).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(fetch).toHaveBeenCalledTimes(3)
  })
})
