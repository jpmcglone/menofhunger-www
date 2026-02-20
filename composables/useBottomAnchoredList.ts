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

  function scrollToBottom(behavior: ScrollBehavior = 'auto') {
    const el = scroller.value
    if (!el) return
    let nextBehavior = behavior
    if (behavior === 'smooth' && typeof window !== 'undefined') {
      const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
      if (prefersReduced) nextBehavior = 'auto'
    }
    el.scrollTo({ top: el.scrollHeight, behavior: nextBehavior })
  }

  function syncAtBottomFromScroll() {
    const bottom = isAtBottom()
    atBottom.value = bottom
    if (bottom) pendingNewCount.value = 0
  }

  function onNewItemsAppended(params?: { count?: number }) {
    const count = Math.max(1, Math.floor(Number(params?.count ?? 1)) || 1)
    const shouldStick = isAtBottom()
    atBottom.value = shouldStick
    if (shouldStick) {
      void nextTick().then(() => {
        // Avoid smooth scrolling here: it can briefly toggle atBottom and flash the button.
        scrollToBottom('auto')
        scheduleAfterFrame(() => scrollToBottom('auto'))
        pendingNewCount.value = 0
      })
    } else {
      pendingNewCount.value += count
    }
  }

  const showScrollToBottomButton = computed(() => !atBottom.value)

  const pendingNewLabel = computed(() => {
    const n = Math.max(0, Math.floor(Number(pendingNewCount.value) || 0))
    if (n > 0) return `${n} new messages`
    return 'Scroll to bottom'
  })

  function onScrollToBottomClick() {
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
      if (!el || typeof el.addEventListener !== 'function') return

      const onScroll = () => syncAtBottomFromScroll()
      el.addEventListener('scroll', onScroll, { passive: true })
      removeScrollListener = () => el.removeEventListener('scroll', onScroll)
      // Initial sync.
      scheduleAfterFrame(() => syncAtBottomFromScroll())
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    if (removeScrollListener) removeScrollListener()
    removeScrollListener = null
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
    onScrollToBottomClick,
  }
}

