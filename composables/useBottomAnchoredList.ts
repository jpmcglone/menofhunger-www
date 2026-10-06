import { computed, nextTick, onBeforeUnmount, ref, watch, type Ref } from 'vue'

export type BottomAnchoredListOptions = {
  /** Treat the user as \"at bottom\" within this pixel threshold. */
  bottomThresholdPx?: number
}

export function useBottomAnchoredList(scroller: Ref<HTMLElement | null>, options: BottomAnchoredListOptions = {}) {
  // Treat user as "at bottom" even if a few pixels off (scroll rounding, safe-area, etc).
  const bottomThresholdPx = Math.max(0, Math.floor(options.bottomThresholdPx ?? 24))

  const atBottom = ref(true)
  const pendingNewCount = ref(0)

  /**
   * Last scrollTop we wrote ourselves. Content can grow under a stationary
   * scroller (first reaction, image decode) and measure as "not at bottom"
   * even though the user never scrolled. Matching this keeps the pin.
   */
  let lastProgrammaticTop = -1
  /**
   * Set while the view is deliberately pinned (opening a conversation, sending). Layout shifts
   * (cached rows rendering, images decoding, the composer growing) fire scroll events that look
   * like the reader leaving the bottom; only real user input may release the pin.
   */
  let holdPin = false
  let resizeObserver: ResizeObserver | null = null
  let childObserver: MutationObserver | null = null
  let observedContent: Element | null = null

  function scheduleAfterFrame(fn: () => void) {
    if (!import.meta.client) return
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(fn)
    else setTimeout(fn, 0)
  }

  function isAtBottom(): boolean {
    const el = scroller.value
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight <= bottomThresholdPx
  }

  function pinToBottom(el: HTMLElement) {
    el.scrollTop = el.scrollHeight
    lastProgrammaticTop = el.scrollTop
  }

  function scrollToBottom(behavior: ScrollBehavior = 'auto') {
    const el = scroller.value
    if (!el) return
    let nextBehavior = behavior
    if (behavior === 'smooth' && typeof window !== 'undefined') {
      const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
      if (prefersReduced) nextBehavior = 'auto'
    }
    if (nextBehavior === 'auto') {
      pinToBottom(el)
      return
    }
    el.scrollTo({ top: el.scrollHeight, behavior: nextBehavior })
  }

  function syncAtBottomFromScroll() {
    const el = scroller.value
    const bottom = isAtBottom()
    if (holdPin && !bottom && el) {
      pinToBottom(el)
      return
    }
    // Content grew under our own pin — stay pinned and let ResizeObserver
    // land on the new bottom. A real user scroll changes scrollTop.
    if (!bottom && el && lastProgrammaticTop >= 0 && el.scrollTop === lastProgrammaticTop) {
      return
    }
    lastProgrammaticTop = -1
    atBottom.value = bottom
    if (bottom) pendingNewCount.value = 0
  }

  function observeContent(el: HTMLElement) {
    if (!resizeObserver) return
    const content = el.firstElementChild
    if (content === observedContent) return
    if (observedContent) resizeObserver.unobserve(observedContent)
    observedContent = content
    if (content) resizeObserver.observe(content)
  }

  function bindSizeObservers(el: HTMLElement) {
    unbindSizeObservers()
    if (typeof ResizeObserver === 'function') {
      resizeObserver = new ResizeObserver(() => {
        if (scroller.value !== el) return
        if (!atBottom.value && !holdPin) return
        pinToBottom(el)
      })
      resizeObserver.observe(el)
      observeContent(el)
    }
    if (typeof MutationObserver === 'function') {
      childObserver = new MutationObserver(() => observeContent(el))
      childObserver.observe(el, { childList: true })
    }
  }

  function unbindSizeObservers() {
    resizeObserver?.disconnect()
    resizeObserver = null
    childObserver?.disconnect()
    childObserver = null
    observedContent = null
  }

  function stickToBottomIfPinned(): boolean {
    // Prefer the sticky flag: by the time this runs the new row is often already
    // in the DOM, so a live isAtBottom() read can be >threshold even when the
    // user was pinned. Live check still catches the "just scrolled to bottom"
    // case where the flag hasn't flushed yet.
    const shouldStick = atBottom.value || isAtBottom()
    if (!shouldStick) return false
    atBottom.value = true
    void nextTick().then(() => {
      // Avoid smooth scrolling here: it can briefly toggle atBottom and flash the button.
      scrollToBottom('auto')
      scheduleAfterFrame(() => scrollToBottom('auto'))
      pendingNewCount.value = 0
    })
    return true
  }

  /** Pin to the end and keep it there through layout shifts until the reader scrolls away. */
  function lockToBottom() {
    holdPin = true
    atBottom.value = true
    pendingNewCount.value = 0
    const el = scroller.value
    if (el) pinToBottom(el)
    void nextTick().then(() => {
      if (!holdPin || !scroller.value) return
      pinToBottom(scroller.value)
      scheduleAfterFrame(() => { if (holdPin && scroller.value) pinToBottom(scroller.value) })
    })
  }

  function releasePin() {
    holdPin = false
  }

  function onNewItemsAppended(params?: { count?: number }) {
    const count = Math.max(1, Math.floor(Number(params?.count ?? 1)) || 1)
    if (stickToBottomIfPinned()) return
    pendingNewCount.value += count
  }

  const showScrollToBottomButton = computed(() => !atBottom.value)

  const pendingNewLabel = computed(() => {
    const n = Math.max(0, Math.floor(Number(pendingNewCount.value) || 0))
    if (n > 0) return `${n} new messages`
    return 'Scroll to bottom'
  })

  function onScrollToBottomClick() {
    releasePin()
    scrollToBottom('smooth')
    pendingNewCount.value = 0
    atBottom.value = true
  }

  let removeScrollListener: (() => void) | null = null
  watch(
    scroller,
    (el) => {
      if (removeScrollListener) {
        removeScrollListener()
        removeScrollListener = null
      }
      if (!el || typeof el.addEventListener !== 'function') {
        unbindSizeObservers()
        return
      }

      const onScroll = () => syncAtBottomFromScroll()
      const onUserInput = (event: Event) => {
        if (event.type === 'keydown' && !['ArrowUp', 'PageUp', 'Home'].includes((event as KeyboardEvent).key)) return
        if (event.type === 'wheel' && (event as WheelEvent).deltaY >= 0) return
        releasePin()
      }
      const inputEvents = ['wheel', 'touchmove', 'keydown', 'pointerdown'] as const
      el.addEventListener('scroll', onScroll, { passive: true })
      inputEvents.forEach(name => el.addEventListener(name, onUserInput, { passive: true }))
      removeScrollListener = () => {
        el.removeEventListener('scroll', onScroll)
        inputEvents.forEach(name => el.removeEventListener(name, onUserInput))
      }
      bindSizeObservers(el)
      // Initial sync.
      scheduleAfterFrame(() => syncAtBottomFromScroll())
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    if (removeScrollListener) removeScrollListener()
    removeScrollListener = null
    unbindSizeObservers()
    lastProgrammaticTop = -1
  })

  return {
    atBottom,
    pendingNewCount,
    showScrollToBottomButton,
    pendingNewLabel,
    isAtBottom,
    scrollToBottom,
    syncAtBottomFromScroll,
    onNewItemsAppended,
    stickToBottomIfPinned,
    onScrollToBottomClick,
    lockToBottom,
    releasePin,
  }
}

