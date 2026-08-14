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
})

describe('useBottomAnchoredList — stick on append', () => {
  let rafQueue: FrameRequestCallback[] = []

  beforeEach(() => {
    rafQueue = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafQueue.push(cb)
      return rafQueue.length
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

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
})
