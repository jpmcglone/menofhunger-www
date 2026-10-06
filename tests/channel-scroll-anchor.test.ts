import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { markRaw, nextTick, ref } from 'vue'
import { useBottomAnchoredList } from '~/composables/useBottomAnchoredList'

describe('useBottomAnchoredList — opening and sending', () => {
  let frames: FrameRequestCallback[] = []

  beforeEach(() => {
    frames = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb))
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
    vi.stubGlobal('MutationObserver', class { observe() {} disconnect() {} })
  })
  afterEach(() => vi.unstubAllGlobals())

  function scroller(height: number, client: number) {
    let top = 0
    const listeners = new Map<string, Set<(event: Event) => void>>()
    const el = markRaw({
      firstElementChild: {},
      clientHeight: client,
      scrollHeight: height,
      get scrollTop() { return top },
      set scrollTop(value: number) { top = Math.min(Math.max(0, value), el.scrollHeight - client) },
      scrollTo() {},
      addEventListener(type: string, fn: (event: Event) => void) { listeners.set(type, (listeners.get(type) ?? new Set()).add(fn)) },
      removeEventListener(type: string, fn: (event: Event) => void) { listeners.get(type)?.delete(fn) },
      emit(type: string, event: Partial<Event> = {}) { listeners.get(type)?.forEach(fn => fn({ type, ...event } as Event)) },
    })
    return el
  }

  it('opens at the bottom even when cached rows render before the first scroll sync', async () => {
    const el = scroller(1200, 400)
    const api = useBottomAnchoredList(ref(el as unknown as HTMLElement))
    api.lockToBottom()
    await nextTick()
    frames.splice(0).forEach(cb => cb(0))
    el.emit('scroll')
    expect(api.atBottom.value).toBe(true)
    expect(el.scrollTop).toBe(800)
  })

  it('stays pinned through layout shifts until the reader scrolls up', async () => {
    const el = scroller(1200, 400)
    const api = useBottomAnchoredList(ref(el as unknown as HTMLElement))
    api.lockToBottom()
    await nextTick()
    el.scrollHeight = 1500
    el.emit('scroll')
    expect(el.scrollTop).toBe(1100)
    expect(api.atBottom.value).toBe(true)

    el.emit('wheel', { deltaY: -40 } as Partial<WheelEvent>)
    el.scrollTop = 600
    el.emit('scroll')
    expect(api.atBottom.value).toBe(false)
    expect(el.scrollTop).toBe(600)
  })

  it('scrolling down does not release the pin', async () => {
    const el = scroller(1200, 400)
    const api = useBottomAnchoredList(ref(el as unknown as HTMLElement))
    api.lockToBottom()
    await nextTick()
    el.emit('wheel', { deltaY: 40 } as Partial<WheelEvent>)
    el.scrollHeight = 1300
    el.emit('scroll')
    expect(el.scrollTop).toBe(900)
  })
})
