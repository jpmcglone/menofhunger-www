import { ref, computed, type Ref } from 'vue'

export const BOTTOM_THRESHOLD = 24

// ─── Debug tracing ────────────────────────────────────────────────────────────
// Set to true locally to trace every scroll mutation in the browser console.
// Each line is prefixed [chat-scroll] so you can filter in devtools.
const DEBUG = true

function dbg(msg: string, extra?: Record<string, unknown>) {
  if (!DEBUG) return
  const parts = [`[chat-scroll] ${msg}`]
  if (extra) parts.push(JSON.stringify(extra))
  console.warn(parts.join(' '))
}

export interface UseChatScrollOptions {
  messagesScroller: Ref<HTMLElement | null>
  selectedChatKey: Ref<string | null>
  selectedConversationId: Ref<string | null>
  prefersReducedMotion: Ref<boolean>
  onUpdateStickyDivider?: () => void
  onReachedBottom?: (conversationId: string) => void
  onScrollerMountedReady?: () => void
}

/**
 * Chat scrolling: the thread always opens on the newest message.
 *
 * There is deliberately no per-conversation scroll-offset restore. A cache like
 * that has to be written while the thread is still growing (images decode after
 * first paint), so it records a mid-load offset, replays it on the next open,
 * and pins `atBottom` to false — which then blocks the ResizeObserver from ever
 * correcting. The wrong position feeds itself. Every mainstream chat client
 * opens on the latest message; do the same and the whole class of bug is gone.
 *
 * Bottom anchoring is one invariant: while `atBottom` is true, the scroller is
 * pinned to the bottom on every size change. Only a real user scroll clears it.
 */
export function useChatScroll(opts: UseChatScrollOptions) {
  const {
    messagesScroller,
    selectedChatKey,
    selectedConversationId,
    prefersReducedMotion,
    onUpdateStickyDivider,
    onReachedBottom,
    onScrollerMountedReady,
  } = opts

  const atBottom = ref(true)
  const isAutoScrollingToBottom = ref(false)

  let autoScrollToBottomTimer: ReturnType<typeof setTimeout> | null = null
  let ro: ResizeObserver | null = null
  let rafHandle: number | null = null

  /**
   * The scrollTop we last wrote ourselves, or -1 if the last movement was not
   * ours. Content can grow between our write and the scroll event's rAF, which
   * makes our own pin measure as "scrolled away from bottom". Comparing against
   * this lets us tell "the content grew under a stationary scroller" apart from
   * "the user scrolled up", so our own pin can never clear `atBottom`.
   */
  let lastProgrammaticTop = -1

  // ─── Computed ─────────────────────────────────────────────────────────────

  const showScrollToBottomButton = computed(() =>
    Boolean(selectedChatKey.value) && !atBottom.value && !isAutoScrollingToBottom.value,
  )

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function normalizeChatKey(key: string | null | undefined): string | null {
    const k = (key ?? '').trim()
    return k ? k : null
  }

  function isAtBottom(): boolean {
    const el = messagesScroller.value
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_THRESHOLD
  }

  /** Instant pin to the bottom, recorded so the scroll event is attributed to us. */
  function pinToBottom(el: HTMLElement) {
    el.scrollTop = el.scrollHeight
    lastProgrammaticTop = el.scrollTop
  }

  function scrollToBottom(behavior: ScrollBehavior = 'auto', reason = 'unknown') {
    const el = messagesScroller.value
    if (!el) return
    let b = behavior
    if (b === 'smooth' && (prefersReducedMotion.value || typeof window === 'undefined')) b = 'auto'
    dbg(`scrollToBottom via "${reason}"`, {
      scrollTop: el.scrollTop,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      behavior: b,
    })
    if (b === 'auto') {
      pinToBottom(el)
      atBottom.value = true
      return
    }
    el.scrollTo({ top: el.scrollHeight, behavior: b })
  }

  function setAtBottomState(next: boolean) {
    atBottom.value = next
    if (next && isAutoScrollingToBottom.value) {
      isAutoScrollingToBottom.value = false
      if (autoScrollToBottomTimer) { clearTimeout(autoScrollToBottomTimer); autoScrollToBottomTimer = null }
    }
  }

  function refreshAtBottomFromScroller(): boolean {
    const el = messagesScroller.value
    const bottom = isAtBottom()

    // The scroller has not moved since our own pin, so a "not at bottom"
    // reading can only mean the content grew beneath it. Stay pinned and let
    // the ResizeObserver land us on the new bottom.
    if (!bottom && el && el.scrollTop === lastProgrammaticTop) {
      dbg('scroll event ignored (our own pin, content grew under it)', {
        scrollTop: el.scrollTop,
        scrollHeight: el.scrollHeight,
      })
      onUpdateStickyDivider?.()
      return atBottom.value
    }

    lastProgrammaticTop = -1
    const prev = atBottom.value
    atBottom.value = bottom
    if (bottom && !prev) {
      const convoId = selectedConversationId.value
      if (convoId) onReachedBottom?.(convoId)
    }
    onUpdateStickyDivider?.()
    return bottom
  }

  function stickToBottom(scrollOpts?: {
    behavior?: ScrollBehavior
    ifNearBottom?: boolean
    userInitiated?: boolean
    reason?: string
  }) {
    if (!import.meta.client) return false
    const { behavior = 'auto', ifNearBottom = false, userInitiated = false, reason = 'stickToBottom' } = scrollOpts ?? {}

    if (ifNearBottom && !atBottom.value && !isAtBottom()) {
      dbg(`stickToBottom skipped (ifNearBottom + not near bottom) via "${reason}"`)
      return false
    }
    if (userInitiated && behavior === 'smooth') {
      isAutoScrollingToBottom.value = true
      if (autoScrollToBottomTimer) clearTimeout(autoScrollToBottomTimer)
      autoScrollToBottomTimer = setTimeout(() => {
        autoScrollToBottomTimer = null
        isAutoScrollingToBottom.value = false
      }, 1400)
    }

    scrollToBottom(behavior, reason)
    return true
  }

  // ─── Scroll handler (rAF-coalesced) ───────────────────────────────────────

  function onMessagesScroll() {
    if (rafHandle !== null) return
    rafHandle = requestAnimationFrame(() => {
      rafHandle = null
      refreshAtBottomFromScroller()
    })
  }

  // ─── ResizeObserver: one rule — if at bottom, stay there ──────────────────
  //
  // Observes both the scroller viewport (catches keyboard open / composer grow)
  // and the content element (catches new messages, late-loading images). Safari
  // has no `overflow-anchor` support, so we need this in both cases.

  function observe(scroller: HTMLElement) {
    if (typeof ResizeObserver === 'undefined') return
    ro?.disconnect()
    const contentEl = scroller.firstElementChild as HTMLElement | null
    ro = new ResizeObserver((entries) => {
      if (messagesScroller.value !== scroller) return
      const target = entries[0]?.target
      const label = target === scroller ? 'scroller-viewport' : 'content-element'
      if (atBottom.value) {
        dbg(`ResizeObserver fired (${label}) — re-pinning to bottom`, {
          scrollTop: scroller.scrollTop,
          scrollHeight: scroller.scrollHeight,
          clientHeight: scroller.clientHeight,
          contentRect: entries[0] ? `${Math.round(entries[0].contentRect.height)}px` : '?',
        })
        pinToBottom(scroller)
      } else {
        dbg(`ResizeObserver fired (${label}) — NOT at bottom, skipping`, {
          scrollTop: scroller.scrollTop,
          scrollHeight: scroller.scrollHeight,
        })
      }
    })
    ro.observe(scroller)
    if (contentEl) ro.observe(contentEl)
  }

  // ─── Mount ────────────────────────────────────────────────────────────────

  /**
   * Snap a freshly-mounted scroller to the newest message.
   *
   * `hasJumpTarget` is the one exception: the thread was opened from a search
   * result or reply link, so `useChatThread.scrollToJumpTarget()` owns the
   * final position and we must not fight it.
   */
  function onMessagesScrollerMounted(
    scroller: HTMLElement,
    chatKey: string | null | undefined,
    mountOpts?: { hasJumpTarget?: boolean },
  ) {
    if (mountOpts?.hasJumpTarget) {
      dbg('onMessagesScrollerMounted — jump target, deferring to scrollToJumpTarget', { chatKey })
      atBottom.value = false
      lastProgrammaticTop = -1
      observe(scroller)
      onScrollerMountedReady?.()
      return
    }

    dbg('onMessagesScrollerMounted (sync)', {
      chatKey,
      scrollHeight: scroller.scrollHeight,
      clientHeight: scroller.clientHeight,
    })
    pinToBottom(scroller)
    atBottom.value = true
    observe(scroller)

    requestAnimationFrame(() => {
      if (messagesScroller.value !== scroller) return
      dbg('onMessagesScrollerMounted (rAF)', {
        chatKey,
        scrollHeight: scroller.scrollHeight,
        clientHeight: scroller.clientHeight,
      })
      pinToBottom(scroller)
      // Asserted, not measured: images decoding after this frame will grow the
      // content, and the ResizeObserver needs atBottom to still be true so it
      // can follow that growth down.
      atBottom.value = true
      onUpdateStickyDivider?.()
      const normalizedKey = normalizeChatKey(chatKey)
      if (normalizedKey && selectedConversationId.value === normalizedKey) {
        onReachedBottom?.(normalizedKey)
      }
      onScrollerMountedReady?.()
    })
  }

  // ─── Teardown ─────────────────────────────────────────────────────────────

  function teardown() {
    ro?.disconnect()
    ro = null
    lastProgrammaticTop = -1
    if (rafHandle !== null) { cancelAnimationFrame(rafHandle); rafHandle = null }
    if (autoScrollToBottomTimer) { clearTimeout(autoScrollToBottomTimer); autoScrollToBottomTimer = null }
  }

  return {
    atBottom,
    isAutoScrollingToBottom,
    showScrollToBottomButton,
    normalizeChatKey,
    isAtBottom,
    scrollToBottom,
    stickToBottom,
    setAtBottomState,
    refreshAtBottomFromScroller,
    onMessagesScrollerMounted,
    onMessagesScroll,
    teardown,
  }
}
