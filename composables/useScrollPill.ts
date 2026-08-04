import { computed, ref, type ComputedRef, type Ref } from 'vue'

/** Overlay track is rendered `top-2 bottom-2`, so 8px inset on each end. */
const TRACK_INSET_PX = 8
const MIN_THUMB_PX = 18
/** How long the pill lingers after the last user-driven scroll. */
const HIDE_DELAY_MS = 1200
/**
 * A `scroll` event landing within this window of a wheel/touch gesture counts as
 * user-driven. Programmatic scrolls (stick-to-bottom, jump-to-message) raise the
 * same event but should not surface the pill.
 */
const USER_SCROLL_GRACE_MS = 2000

export interface UseScrollPillOptions {
  scroller: Ref<HTMLElement | null>
  /** Thumb color, typically derived from the viewer's tier. */
  color: Ref<string> | ComputedRef<string>
  /** Extra work to run inside the same coalesced frame as the measurement. */
  onFrame?: () => void
}

/**
 * Drives the custom overlay scrollbar ("pill") that replaces the hidden native
 * scrollbar in chat surfaces.
 *
 * Every way a scroller can move — wheel, touch drag, touch fling/momentum,
 * keyboard, programmatic `scrollTo`, smooth scrolling, and scroll anchoring
 * during content reflow — raises a `scroll` event, so routing all of them
 * through `onScroll` covers the full set. Size-only changes (content growth,
 * viewport resize) don't raise `scroll`, so callers pair this with a
 * ResizeObserver that calls `measure` directly.
 *
 * Two properties matter for the pill tracking the scroller in real time:
 *
 * 1. Work is coalesced into one `requestAnimationFrame` per frame. `scroll` can
 *    fire more than once per frame for main-thread scrolls, and there is no
 *    point recomputing a position the display won't show.
 * 2. The thumb element must NOT have a CSS transition on `transform`. The
 *    position is rewritten every frame, so a transition would restart on each
 *    write and the thumb would trail the scroll and only settle once it stopped.
 *    Transitioning `height` is fine; that only changes on resize.
 */
export function useScrollPill(opts: UseScrollPillOptions) {
  const { scroller, color, onFrame } = opts

  const topPx = ref(0)
  const heightPx = ref(0)
  const visible = ref(false)
  const needed = ref(false)

  let hideTimer: ReturnType<typeof setTimeout> | null = null
  let lastUserScrollIntentAt = 0
  let frameId = 0

  const thumbStyle = computed<Record<string, string>>(() => ({
    height: `${Math.max(0, Math.floor(heightPx.value))}px`,
    transform: `translateY(${Math.max(0, Math.floor(topPx.value))}px)`,
    background: color.value,
  }))

  /**
   * Recomputes thumb size and offset from the scroller's geometry. Reads are
   * batched up front so nothing interleaves a write between them.
   */
  function measure() {
    const el = scroller.value
    if (!el) return

    const clientHeight = el.clientHeight
    const scrollHeight = el.scrollHeight
    const scrollTop = el.scrollTop

    const trackH = Math.max(0, clientHeight - TRACK_INSET_PX * 2)
    const overflows = scrollHeight > clientHeight + 1
    needed.value = overflows

    if (!overflows || trackH <= 0) {
      heightPx.value = 0
      topPx.value = 0
      visible.value = false
      return
    }

    const thumbH = Math.min(
      trackH,
      Math.max(MIN_THUMB_PX, Math.floor(trackH * (clientHeight / scrollHeight))),
    )
    const scrollable = Math.max(1, scrollHeight - clientHeight)
    heightPx.value = thumbH
    topPx.value = Math.floor(Math.max(0, trackH - thumbH) * (scrollTop / scrollable))
  }

  function kickVisibility() {
    if (!needed.value) {
      visible.value = false
      return
    }
    visible.value = true
    if (hideTimer) clearTimeout(hideTimer)
    hideTimer = setTimeout(() => {
      hideTimer = null
      visible.value = false
    }, HIDE_DELAY_MS)
  }

  /** Bind to wheel/touch so programmatic scrolls can be told apart from user ones. */
  function markUserScrollIntent() {
    if (!import.meta.client) return
    lastUserScrollIntentAt = Date.now()
    kickVisibility()
  }

  function onScroll() {
    if (!import.meta.client) return
    if (frameId) return
    frameId = requestAnimationFrame(() => {
      frameId = 0
      measure()
      onFrame?.()
      if (Date.now() - lastUserScrollIntentAt < USER_SCROLL_GRACE_MS) kickVisibility()
    })
  }

  function teardown() {
    if (frameId) {
      cancelAnimationFrame(frameId)
      frameId = 0
    }
    if (hideTimer) {
      clearTimeout(hideTimer)
      hideTimer = null
    }
  }

  return {
    needed,
    visible,
    topPx,
    heightPx,
    thumbStyle,
    measure,
    onScroll,
    markUserScrollIntent,
    kickVisibility,
    teardown,
  }
}
