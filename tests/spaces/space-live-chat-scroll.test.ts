import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { markRaw, nextTick, ref } from 'vue'
import { useBottomAnchoredList } from '~/composables/useBottomAnchoredList'

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('space live chat scroll (structural)', () => {
  it('overlays the typing indicator outside the scroller', async () => {
    const panel = await Promise.resolve(read('components/app/radio/RadioLiveChatPanel.vue'))
    expect(panel).toMatch(/RadioLiveChatMessageList[\s\S]*:messages="messages"/)
    expect(panel).toMatch(/ChatReactionPicker/)
    expect(panel).toMatch(/pointer-events-none absolute bottom-0 left-0[\s\S]*<AppTypingIndicator/)
    expect(panel).toMatch(/rounded-full[\s\S]*backdrop-blur-sm[\s\S]*<AppTypingIndicator/)
    expect(read('components/app/radio/RadioLiveChatMessageList.vue')).toMatch(/h-10 shrink-0/)
    expect(panel).not.toMatch(/typingUsersTotalCount/)
  })

  it('sticks to bottom using the pinned flag, not only a live isAtBottom read', async () => {
    const list = await Promise.resolve(read('composables/useBottomAnchoredList.ts'))
    expect(list).toMatch(/atBottom\.value \|\| isAtBottom\(\)/)
  })

  it('treats collapsed join/leave updates like new rows for stick-to-bottom', async () => {
    const panel = await Promise.resolve(read('components/app/radio/RadioLiveChatPanel.vue'))
    expect(panel).toMatch(/chatTailKey/)
    expect(panel).toMatch(/last\.createdAt/)
    expect(panel).toMatch(/stickToBottomIfPinned/)
  })

  it('explains live-only chat from an info button, not a clock-off icon', async () => {
    const header = await Promise.resolve(read('components/app/LiveChatHeader.vue'))
    expect(header).toMatch(/tabler:info-circle/)
    expect(header).toMatch(/How live chat works/)
    expect(header).toMatch(/Messages from before you joined aren’t shown/)
    expect(header).not.toMatch(/tabler:clock-off/)
    expect(header).not.toMatch(/tabler:eye/)
  })

  it('focuses the composer when Reply is pressed', async () => {
    const panel = await Promise.resolve(read('components/app/radio/RadioLiveChatPanel.vue'))
    expect(panel).toMatch(/function onReply/)
    expect(panel).toMatch(/composerRef\.value\?\.focus/)
  })

  it('re-pins on content resize while at bottom, not only on new rows', async () => {
    const list = await Promise.resolve(read('composables/useBottomAnchoredList.ts'))
    const panel = await Promise.resolve(read('components/app/radio/RadioLiveChatPanel.vue'))
    expect(list).toMatch(/ResizeObserver/)
    expect(list).toMatch(/lastProgrammaticTop/)
    expect(panel).toMatch(/overflow-anchor:none/)
  })
})

describe('useBottomAnchoredList — stick on append', () => {
  let rafQueue: FrameRequestCallback[] = []
  let resizeCallbacks: ResizeObserverCallback[] = []

  beforeEach(() => {
    rafQueue = []
    resizeCallbacks = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafQueue.push(cb)
      return rafQueue.length
    })
    vi.stubGlobal('ResizeObserver', class {
      constructor(cb: ResizeObserverCallback) {
        resizeCallbacks.push(cb)
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    })
    vi.stubGlobal('MutationObserver', class {
      observe() {}
      disconnect() {}
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function flushResize() {
    for (const cb of resizeCallbacks) cb([], {} as ResizeObserver)
  }

  function flushFrame() {
    const queued = rafQueue
    rafQueue = []
    for (const cb of queued) cb(0)
  }

  function createScroller(opts: { scrollHeight: number; clientHeight: number; scrollTop: number }) {
    let height = opts.scrollHeight
    let top = opts.scrollTop
    const listeners = new Set<() => void>()
    const el = markRaw({
      firstElementChild: { tagName: 'DIV' },
      clientHeight: opts.clientHeight,
      get scrollHeight() {
        return height
      },
      get scrollTop() {
        return top
      },
      set scrollTop(v: number) {
        top = Math.min(Math.max(0, v), Math.max(0, height - el.clientHeight))
      },
      scrollTo(o: ScrollToOptions) {
        if (typeof o.top === 'number') el.scrollTop = o.top
      },
      addEventListener(_type: string, fn: () => void) {
        listeners.add(fn)
      },
      removeEventListener(_type: string, fn: () => void) {
        listeners.delete(fn)
      },
      grow(byPx: number) {
        height += byPx
      },
    })
    return el
  }

  it('stays pinned when a new row already pushed the live bottom check past the threshold', async () => {
    const scroller = createScroller({ scrollHeight: 500, clientHeight: 400, scrollTop: 100 })
    const elRef = ref<HTMLElement | null>(scroller as unknown as HTMLElement)
    const api = useBottomAnchoredList(elRef)
    await nextTick()
    flushFrame()

    expect(api.atBottom.value).toBe(true)

    // Message already in the DOM: 80px taller than the 24px threshold.
    scroller.grow(80)
    api.onNewItemsAppended({ count: 1 })
    await nextTick()
    flushFrame()

    expect(api.atBottom.value).toBe(true)
    expect(scroller.scrollTop).toBe(scroller.scrollHeight - scroller.clientHeight)
    expect(api.pendingNewCount.value).toBe(0)
  })

  it('pins on a tail update without counting a new message', async () => {
    const scroller = createScroller({ scrollHeight: 500, clientHeight: 400, scrollTop: 100 })
    const elRef = ref<HTMLElement | null>(scroller as unknown as HTMLElement)
    const api = useBottomAnchoredList(elRef)
    await nextTick()
    flushFrame()

    expect(api.atBottom.value).toBe(true)

    scroller.grow(28)
    expect(api.stickToBottomIfPinned()).toBe(true)
    await nextTick()
    flushFrame()

    expect(api.atBottom.value).toBe(true)
    expect(scroller.scrollTop).toBe(scroller.scrollHeight - scroller.clientHeight)
    expect(api.pendingNewCount.value).toBe(0)
  })

  it('does not steal the user away when they have scrolled up', async () => {
    const scroller = createScroller({ scrollHeight: 800, clientHeight: 400, scrollTop: 50 })
    const elRef = ref<HTMLElement | null>(scroller as unknown as HTMLElement)
    const api = useBottomAnchoredList(elRef)
    await nextTick()
    flushFrame()
    api.syncAtBottomFromScroll()

    expect(api.atBottom.value).toBe(false)

    scroller.grow(80)
    api.onNewItemsAppended({ count: 1 })
    await nextTick()
    flushFrame()

    expect(api.atBottom.value).toBe(false)
    expect(scroller.scrollTop).toBe(50)
    expect(api.pendingNewCount.value).toBe(1)
  })

  it('re-pins when the last row grows while the user is at bottom', async () => {
    const scroller = createScroller({ scrollHeight: 500, clientHeight: 400, scrollTop: 100 })
    const elRef = ref<HTMLElement | null>(scroller as unknown as HTMLElement)
    const api = useBottomAnchoredList(elRef)
    await nextTick()
    flushFrame()

    expect(api.atBottom.value).toBe(true)
    expect(scroller.scrollTop).toBe(100)

    // First reaction on the latest message: same row, taller content.
    scroller.grow(36)
    expect(scroller.scrollTop).toBe(100)
    expect(api.isAtBottom()).toBe(false)

    flushResize()

    expect(api.atBottom.value).toBe(true)
    expect(scroller.scrollTop).toBe(scroller.scrollHeight - scroller.clientHeight)
  })

  it('does not jump to bottom on a row-height change after the user scrolled up', async () => {
    const scroller = createScroller({ scrollHeight: 800, clientHeight: 400, scrollTop: 50 })
    const elRef = ref<HTMLElement | null>(scroller as unknown as HTMLElement)
    const api = useBottomAnchoredList(elRef)
    await nextTick()
    flushFrame()
    api.syncAtBottomFromScroll()

    expect(api.atBottom.value).toBe(false)

    scroller.grow(36)
    flushResize()

    expect(api.atBottom.value).toBe(false)
    expect(scroller.scrollTop).toBe(50)
  })
})
