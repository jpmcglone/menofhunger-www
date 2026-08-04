import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { markRaw, ref } from 'vue'
import { useChatScroll, BOTTOM_THRESHOLD } from '~/composables/chat/useChatScroll'

/**
 * Behavioural tests for the chat scroller.
 *
 * The bug these encode kept coming back in three different disguises, so the
 * tests drive the real composable against a fake scroller rather than asserting
 * on source text. The invariant under test is always the same:
 *
 *   While `atBottom` is true, the scroller stays pinned to the bottom through
 *   any amount of content growth. Only a real user scroll clears it.
 *
 * The three historical failures, each with a test below:
 *
 *   1. A per-conversation scrollTop cache restored a mid-load offset on reopen,
 *      which set atBottom=false and permanently blocked the ResizeObserver.
 *   2. Chrome's overflow-anchor moved scrollTop while images decoded, which
 *      looked like a user scroll and cleared atBottom.
 *   3. Our own bottom-pin raced content growth: the scroll event it fired was
 *      measured a frame later, after the content had grown, so our own pin
 *      read as "user scrolled away".
 */

// ─── Fakes ───────────────────────────────────────────────────────────────────

interface FakeScroller {
  scrollHeight: number
  clientHeight: number
  scrollTop: number
  firstElementChild: unknown
  scrollTo: (opts: ScrollToOptions) => void
  /** Simulate late-decoding images / new messages expanding the content. */
  grow: (byPx: number) => void
  /** Simulate a user dragging the scrollbar or wheeling. */
  userScrollTo: (top: number) => void
}

/**
 * `markRaw` matters: Vue leaves real DOM elements untouched inside a `ref`, but
 * deep-proxies plain objects. Without it `messagesScroller.value !== scroller`
 * and every identity guard in the composable bails out.
 */
function createScroller(opts: { scrollHeight: number; clientHeight: number }): FakeScroller {
  let height = opts.scrollHeight
  let top = 0
  const contentEl = markRaw({ __role: 'content' })

  const clamp = (v: number) => Math.min(Math.max(0, v), Math.max(0, height - el.clientHeight))

  const el: FakeScroller = markRaw({
    clientHeight: opts.clientHeight,
    firstElementChild: contentEl,
    get scrollHeight() {
      return height
    },
    set scrollHeight(v: number) {
      height = v
    },
    get scrollTop() {
      return top
    },
    set scrollTop(v: number) {
      top = clamp(v)
    },
    scrollTo(o: ScrollToOptions) {
      if (typeof o?.top === 'number') el.scrollTop = o.top
    },
    grow(byPx: number) {
      height += byPx
    },
    userScrollTo(next: number) {
      top = clamp(next)
    },
  })
  return el
}

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = []
  callback: ResizeObserverCallback
  targets: unknown[] = []

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    FakeResizeObserver.instances.push(this)
  }

  observe(target: unknown) {
    this.targets.push(target)
  }

  unobserve() {}

  disconnect() {
    this.targets = []
  }

  /** Drive a resize notification for one observed target. */
  fire(target: unknown, height = 0) {
    this.callback(
      [{ target, contentRect: { height } }] as unknown as ResizeObserverEntry[],
      this as unknown as ResizeObserver,
    )
  }

  static latest(): FakeResizeObserver {
    const found = FakeResizeObserver.instances.at(-1)
    if (!found) throw new Error('no ResizeObserver was constructed')
    return found
  }
}

let rafQueue: FrameRequestCallback[] = []

function flushFrame() {
  const queued = rafQueue
  rafQueue = []
  for (const cb of queued) cb(0)
}

// ─── Harness ─────────────────────────────────────────────────────────────────

function setup(scrollerOpts: { scrollHeight: number; clientHeight: number }) {
  const scroller = createScroller(scrollerOpts)
  const messagesScroller = ref<HTMLElement | null>(scroller as unknown as HTMLElement)
  const selectedChatKey = ref<string | null>('conv-1')
  const selectedConversationId = ref<string | null>('conv-1')
  const prefersReducedMotion = ref(false)
  const onReachedBottom = vi.fn()

  const api = useChatScroll({
    messagesScroller,
    selectedChatKey,
    selectedConversationId,
    prefersReducedMotion,
    onReachedBottom,
  })

  /** Mount and settle the one frame the composable schedules. */
  function mount(chatKey = 'conv-1', mountOpts?: { hasJumpTarget?: boolean }) {
    api.onMessagesScrollerMounted(scroller as unknown as HTMLElement, chatKey, mountOpts)
    flushFrame()
  }

  /** Deliver a scroll event the way the DOM would, through the rAF coalescer. */
  function emitScroll() {
    api.onMessagesScroll()
    flushFrame()
  }

  const maxTop = () => Math.max(0, scroller.scrollHeight - scroller.clientHeight)

  return {
    api,
    scroller,
    messagesScroller,
    selectedChatKey,
    prefersReducedMotion,
    onReachedBottom,
    mount,
    emitScroll,
    maxTop,
    resizeObserver: () => FakeResizeObserver.latest(),
    content: () => scroller.firstElementChild,
  }
}

beforeEach(() => {
  FakeResizeObserver.instances = []
  rafQueue = []
  vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => rafQueue.push(cb))
  vi.stubGlobal('cancelAnimationFrame', () => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useChatScroll — opening a thread', () => {
  it('lands on the newest message when the thread mounts', () => {
    const t = setup({ scrollHeight: 3000, clientHeight: 600 })
    t.mount()

    expect(t.scroller.scrollTop).toBe(t.maxTop())
    expect(t.api.atBottom.value).toBe(true)
  })

  it('reports reaching the bottom so the conversation can be marked read', () => {
    const t = setup({ scrollHeight: 3000, clientHeight: 600 })
    t.mount('conv-1')

    expect(t.onReachedBottom).toHaveBeenCalledWith('conv-1')
  })

  it('reopening a thread ignores where the user had scrolled to last time', () => {
    // Regression: a per-conversation scrollTop cache used to restore a
    // mid-history offset here, which pinned atBottom=false and stranded the
    // user in the middle of the thread forever after.
    const t = setup({ scrollHeight: 3000, clientHeight: 600 })
    t.mount()

    t.scroller.userScrollTo(400)
    t.emitScroll()
    expect(t.api.atBottom.value).toBe(false)

    // Navigate away and back: the pane remounts with the same conversation.
    t.mount()

    expect(t.scroller.scrollTop).toBe(t.maxTop())
    expect(t.api.atBottom.value).toBe(true)
  })

  it('leaves positioning alone when the thread was opened at a jump target', () => {
    const t = setup({ scrollHeight: 3000, clientHeight: 600 })
    t.scroller.userScrollTo(900)

    t.mount('conv-1', { hasJumpTarget: true })

    // scrollToJumpTarget owns the position in this case; we must not fight it.
    expect(t.scroller.scrollTop).toBe(900)
    expect(t.api.atBottom.value).toBe(false)
  })
})

describe('useChatScroll — staying pinned while content grows', () => {
  it('follows the bottom when late-loading media expands the thread', () => {
    const t = setup({ scrollHeight: 3000, clientHeight: 600 })
    t.mount()

    // Images decode after first paint and nearly double the content height.
    t.scroller.grow(3000)
    t.resizeObserver().fire(t.content(), 6000)

    expect(t.scroller.scrollTop).toBe(t.maxTop())
    expect(t.api.atBottom.value).toBe(true)
  })

  it('follows the bottom across a cascade of separate growth events', () => {
    const t = setup({ scrollHeight: 3000, clientHeight: 600 })
    t.mount()

    for (const growth of [31, 440, 1200, 900]) {
      t.scroller.grow(growth)
      t.resizeObserver().fire(t.content())
    }

    expect(t.scroller.scrollHeight).toBe(3000 + 31 + 440 + 1200 + 900)
    expect(t.scroller.scrollTop).toBe(t.maxTop())
    expect(t.api.atBottom.value).toBe(true)
  })

  it('re-pins when the viewport shrinks, e.g. the composer grows', () => {
    const t = setup({ scrollHeight: 3000, clientHeight: 600 })
    t.mount()

    t.scroller.clientHeight = 400
    t.resizeObserver().fire(t.scroller, 400)

    expect(t.scroller.scrollTop).toBe(t.maxTop())
    expect(t.api.atBottom.value).toBe(true)
  })

  it('does not treat its own pin as a user scroll when content grows underneath', () => {
    // Regression (the hardest of the three): pinning to the bottom fires a
    // scroll event. That event is measured a frame later — by which time more
    // images have landed and scrollHeight has grown. The stale reading made
    // our own pin look like the user scrolling away, which cleared atBottom
    // and stopped every later re-pin.
    const t = setup({ scrollHeight: 3000, clientHeight: 600 })
    t.mount()

    const pinnedAt = t.scroller.scrollTop
    t.scroller.grow(3000) // content grows before the scroll event is measured
    t.emitScroll()

    expect(t.scroller.scrollTop).toBe(pinnedAt) // scroller itself never moved
    expect(t.api.atBottom.value).toBe(true)

    // The invariant that actually matters: the next resize still re-pins.
    t.resizeObserver().fire(t.content())
    expect(t.scroller.scrollTop).toBe(t.maxTop())
  })
})

describe('useChatScroll — respecting the reader', () => {
  it('stops following the bottom once the user scrolls up', () => {
    const t = setup({ scrollHeight: 3000, clientHeight: 600 })
    t.mount()

    t.scroller.userScrollTo(500)
    t.emitScroll()

    expect(t.api.atBottom.value).toBe(false)

    // New messages arrive; the reader must not be yanked away.
    t.scroller.grow(800)
    t.resizeObserver().fire(t.content())

    expect(t.scroller.scrollTop).toBe(500)
  })

  it('resumes following the bottom after the user scrolls back down', () => {
    const t = setup({ scrollHeight: 3000, clientHeight: 600 })
    t.mount()

    t.scroller.userScrollTo(500)
    t.emitScroll()
    expect(t.api.atBottom.value).toBe(false)

    t.scroller.userScrollTo(t.maxTop())
    t.emitScroll()
    expect(t.api.atBottom.value).toBe(true)

    t.scroller.grow(800)
    t.resizeObserver().fire(t.content())
    expect(t.scroller.scrollTop).toBe(t.maxTop())
  })

  it('still counts as at-bottom within the threshold', () => {
    const t = setup({ scrollHeight: 3000, clientHeight: 600 })
    t.mount()

    t.scroller.userScrollTo(t.maxTop() - BOTTOM_THRESHOLD)
    t.emitScroll()
    expect(t.api.atBottom.value).toBe(true)

    t.scroller.userScrollTo(t.maxTop() - BOTTOM_THRESHOLD - 1)
    t.emitScroll()
    expect(t.api.atBottom.value).toBe(false)
  })

  it('shows the scroll-to-bottom button only when the reader is away from the bottom', () => {
    const t = setup({ scrollHeight: 3000, clientHeight: 600 })
    t.mount()
    expect(t.api.showScrollToBottomButton.value).toBe(false)

    t.scroller.userScrollTo(500)
    t.emitScroll()
    expect(t.api.showScrollToBottomButton.value).toBe(true)

    t.scroller.userScrollTo(t.maxTop())
    t.emitScroll()
    expect(t.api.showScrollToBottomButton.value).toBe(false)
  })

  it('hides the scroll-to-bottom button with no conversation selected', () => {
    const t = setup({ scrollHeight: 3000, clientHeight: 600 })
    t.mount()
    t.scroller.userScrollTo(500)
    t.emitScroll()
    expect(t.api.showScrollToBottomButton.value).toBe(true)

    t.selectedChatKey.value = null
    expect(t.api.showScrollToBottomButton.value).toBe(false)
  })
})

describe('useChatScroll — stickToBottom', () => {
  it('returns the reader to the bottom and resumes pinning', () => {
    const t = setup({ scrollHeight: 3000, clientHeight: 600 })
    t.mount()
    t.scroller.userScrollTo(500)
    t.emitScroll()

    t.api.stickToBottom({ reason: 'test' })

    expect(t.scroller.scrollTop).toBe(t.maxTop())
    expect(t.api.atBottom.value).toBe(true)

    t.scroller.grow(800)
    t.resizeObserver().fire(t.content())
    expect(t.scroller.scrollTop).toBe(t.maxTop())
  })

  it('does not yank a reader who has scrolled up when ifNearBottom is set', () => {
    const t = setup({ scrollHeight: 3000, clientHeight: 600 })
    t.mount()
    t.scroller.userScrollTo(500)
    t.emitScroll()

    const moved = t.api.stickToBottom({ ifNearBottom: true, reason: 'incoming-message' })

    expect(moved).toBe(false)
    expect(t.scroller.scrollTop).toBe(500)
  })

  it('scrolls for a reader who is already at the bottom when ifNearBottom is set', () => {
    const t = setup({ scrollHeight: 3000, clientHeight: 600 })
    t.mount()

    t.scroller.grow(800)
    const moved = t.api.stickToBottom({ ifNearBottom: true, reason: 'incoming-message' })

    expect(moved).toBe(true)
    expect(t.scroller.scrollTop).toBe(t.maxTop())
  })

  it('honours reduced-motion by scrolling instantly', () => {
    const t = setup({ scrollHeight: 3000, clientHeight: 600 })
    t.prefersReducedMotion.value = true
    t.mount()
    t.scroller.userScrollTo(0)
    t.emitScroll()

    t.api.stickToBottom({ behavior: 'smooth', reason: 'test' })

    expect(t.scroller.scrollTop).toBe(t.maxTop())
  })
})

describe('useChatScroll — teardown', () => {
  it('stops observing so a stale thread cannot move the new one', () => {
    const t = setup({ scrollHeight: 3000, clientHeight: 600 })
    t.mount()
    const observer = t.resizeObserver()

    t.api.teardown()

    expect(observer.targets).toHaveLength(0)
  })

  it('ignores resize notifications aimed at a scroller that is no longer mounted', () => {
    const t = setup({ scrollHeight: 3000, clientHeight: 600 })
    t.mount()
    const observer = t.resizeObserver()

    // The pane swapped to a different conversation's scroller.
    t.messagesScroller.value = createScroller({ scrollHeight: 10, clientHeight: 10 }) as unknown as HTMLElement
    t.scroller.userScrollTo(0)
    observer.fire(t.content())

    expect(t.scroller.scrollTop).toBe(0)
  })
})
