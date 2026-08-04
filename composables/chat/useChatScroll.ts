import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { userColorTier } from '~/utils/user-tier'
import { useScrollPill } from '~/composables/useScrollPill'
import type { AuthUser } from '~/composables/useAuth'

export const BOTTOM_THRESHOLD = 24
/**
 * A gesture within this window counts as the user driving the scroll, which is
 * the only thing allowed to release the bottom anchor.
 */
const USER_GESTURE_WINDOW_MS = 2000

export interface UseChatScrollOptions {
  messagesScroller: Ref<HTMLElement | null>
  selectedChatKey: Ref<string | null>
  selectedConversationId: Ref<string | null>
  prefersReducedMotion: Ref<boolean>
  me: ComputedRef<AuthUser | null> | Ref<AuthUser | null>
  /** Called after scroll state updates; use to re-compute sticky date dividers. */
  onUpdateStickyDivider?: () => void
  /** Called when user first reaches the bottom (was not at bottom before). */
  onReachedBottom?: (conversationId: string, hadPending: boolean) => void
  /** Called to enable per-row message enter animations after mount. */
  onScrollerMountedReady?: () => void
}

export function useChatScroll(opts: UseChatScrollOptions) {
  const {
    messagesScroller,
    selectedChatKey,
    selectedConversationId,
    prefersReducedMotion,
    me,
    onUpdateStickyDivider,
    onReachedBottom,
    onScrollerMountedReady,
  } = opts

  // ─── Scroll state ────────────────────────────────────────────────────────────

  const atBottom = ref(true)
  const isAutoScrollingToBottom = ref(false)

  /**
   * Whether the view is anchored to the newest message.
   *
   * This is an *intent*, deliberately not derived from the measured scroll
   * position. The message list is virtualized: rows mount at an estimated
   * height and are remeasured over the following frames, so right after a chat
   * opens the measured position is unreliable and frequently reads as "not at
   * the bottom" purely because the content grew underneath us. Deriving the
   * anchor from that measurement is what stranded chats mid-history — once the
   * position drifted, the thing meant to recover it had already concluded the
   * user was reading history and gave up.
   *
   * So: while this is true, any content growth re-pins to the bottom, which is
   * what makes content appear to grow upward. Only a real user gesture clears it.
   */
  const pinnedToBottom = ref(true)
  let lastUserGestureAt = 0

  const scrollTopByChatKey = new Map<string, number>()
  let autoScrollToBottomTimer: ReturnType<typeof setTimeout> | null = null
  let bottomAnchorRo: ResizeObserver | null = null
  let scrollerSizeRo: ResizeObserver | null = null
  let observedScrollerContentEl: HTMLElement | null = null
  let lastMeasuredScrollHeight = 0
  let lastScrollerClientHeight = 0

  // ─── Computed ────────────────────────────────────────────────────────────────

  const scrollPillColor = computed(() => {
    const tier = userColorTier(me.value as any)
    if (tier === 'organization') return 'var(--moh-org)'
    if (tier === 'premium') return 'var(--moh-premium)'
    if (tier === 'verified') return 'var(--moh-verified)'
    return 'rgba(148, 163, 184, 0.9)'
  })

  // `hadPending` must be sampled by the caller before `atBottom` updates. Scroll
  // work is coalesced per frame, so stash it here and let the frame consume it.
  let coalescedHadPending = false

  const pill = useScrollPill({
    scroller: messagesScroller,
    color: scrollPillColor,
    onFrame: () => {
      const hadPending = coalescedHadPending
      coalescedHadPending = false
      const wasAtBottom = atBottom.value
      const bottom = refreshAtBottomFromScroller()
      if (bottom) {
        const convoId = selectedConversationId.value
        if (!wasAtBottom && convoId) onReachedBottom?.(convoId, hadPending)
      }
      // Only a user gesture moves the anchor. Programmatic scrolls and the
      // reflow from virtualized rows being remeasured must not release it,
      // otherwise remeasurement during open would unpin us immediately.
      if (Date.now() - lastUserGestureAt < USER_GESTURE_WINDOW_MS) {
        pinnedToBottom.value = bottom
      }
      onUpdateStickyDivider?.()
    },
  })

  const showScrollToBottomButton = computed(() =>
    Boolean(selectedChatKey.value) && !atBottom.value && !isAutoScrollingToBottom.value,
  )

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function normalizeChatKey(key: string | null | undefined): string | null {
    const k = (key ?? '').trim()
    return k ? k : null
  }

  function isAtBottom(): boolean {
    const el = messagesScroller.value
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_THRESHOLD
  }

  function scrollToBottom(behavior: ScrollBehavior = 'auto') {
    const el = messagesScroller.value
    if (!el) return
    let b = behavior
    if (b === 'smooth' && (prefersReducedMotion.value || typeof window === 'undefined')) b = 'auto'
    el.scrollTo({ top: el.scrollHeight, behavior: b })
  }

  function clearAutoScrollToBottomState() {
    isAutoScrollingToBottom.value = false
    if (autoScrollToBottomTimer) {
      clearTimeout(autoScrollToBottomTimer)
      autoScrollToBottomTimer = null
    }
  }

  function beginAutoScrollToBottomState() {
    isAutoScrollingToBottom.value = true
    if (autoScrollToBottomTimer) clearTimeout(autoScrollToBottomTimer)
    autoScrollToBottomTimer = setTimeout(() => {
      autoScrollToBottomTimer = null
      isAutoScrollingToBottom.value = false
    }, 1400)
  }

  function setAtBottomState(next: boolean) {
    atBottom.value = next
    if (next && isAutoScrollingToBottom.value) clearAutoScrollToBottomState()
  }

  function cacheScrollTopForChatKey(key: string | null | undefined, top: number) {
    const normalized = normalizeChatKey(key)
    if (!normalized) return
    scrollTopByChatKey.set(normalized, Math.max(0, Math.floor(top)))
  }

  function cacheCurrentChatScrollPosition() {
    const scroller = messagesScroller.value
    if (!scroller) return
    cacheScrollTopForChatKey(selectedChatKey.value, scroller.scrollTop)
  }

  function getCachedScrollTopForChatKey(key: string | null | undefined): number | null {
    const normalized = normalizeChatKey(key)
    if (!normalized) return null
    const cached = scrollTopByChatKey.get(normalized)
    return typeof cached === 'number' && Number.isFinite(cached) ? cached : null
  }

  function refreshAtBottomFromScroller() {
    const bottom = isAtBottom()
    setAtBottomState(bottom)
    cacheCurrentChatScrollPosition()
    return bottom
  }

  function stickToBottom(scrollOpts?: {
    behavior?: ScrollBehavior
    ifNearBottom?: boolean
    includeExtraFrame?: boolean
    userInitiated?: boolean
  }) {
    if (!import.meta.client) return false
    const {
      behavior = 'auto',
      ifNearBottom = false,
      includeExtraFrame = false,
      userInitiated = false,
    } = scrollOpts ?? {}

    if (ifNearBottom && !atBottom.value && !isAtBottom()) return false
    if (userInitiated && behavior === 'smooth') beginAutoScrollToBottomState()

    // Any deliberate jump to the bottom re-establishes the anchor, so content
    // that reflows afterwards keeps the newest message in view.
    pinnedToBottom.value = true
    scrollToBottom(behavior)
    requestAnimationFrame(() => {
      if (includeExtraFrame) {
        scrollToBottom('auto')
        requestAnimationFrame(() => {
          scrollToBottom('auto')
          refreshAtBottomFromScroller()
          pill.measure()
        })
        return
      }
      refreshAtBottomFromScroller()
      pill.measure()
    })
    return true
  }

  function markUserScrollIntent() {
    if (!import.meta.client) return
    // Opens the window in which the resulting scroll position is allowed to
    // move the anchor. Where they land is resolved by the next scroll frame.
    lastUserGestureAt = Date.now()
    if (isAutoScrollingToBottom.value) clearAutoScrollToBottomState()
    pill.markUserScrollIntent()
  }

  function getScrollerContentEl(scroller: HTMLElement): HTMLElement | null {
    return (scroller.firstElementChild as HTMLElement | null) ?? null
  }

  /**
   * Re-pin to the bottom whenever content grows while anchored.
   *
   * Runs inside the ResizeObserver callback, which fires after layout but before
   * paint, so the correction lands in the same frame as the growth. The user
   * never sees an intermediate position — the content simply appears to extend
   * upward while the newest message stays put.
   */
  function maybeStickToBottomOnContentGrowth(scroller: HTMLElement) {
    const contentEl = getScrollerContentEl(scroller)
    if (!contentEl) return

    const previousHeight = lastMeasuredScrollHeight
    const nowHeight = scroller.scrollHeight

    // Keep the baseline in sync on both growth and shrink so future growth checks
    // remain accurate even when content reflows in both directions.
    lastMeasuredScrollHeight = nowHeight

    if (nowHeight <= previousHeight) return
    if (!pinnedToBottom.value) return

    // Only move the scroller. The resulting scroll event drives `atBottom` and
    // the not-at-bottom -> at-bottom transition that marks the chat read; setting
    // it here would swallow that edge and leave the conversation unread.
    scroller.scrollTop = nowHeight
  }

  function observeScrollerForBottomAnchoring(scroller: HTMLElement) {
    const contentEl = getScrollerContentEl(scroller)
    if (!contentEl) return

    if (observedScrollerContentEl === contentEl) return

    bottomAnchorRo?.disconnect()
    scrollerSizeRo?.disconnect()
    observedScrollerContentEl = contentEl
    lastMeasuredScrollHeight = scroller.scrollHeight
    lastScrollerClientHeight = scroller.clientHeight

    if (typeof ResizeObserver === 'undefined') return

    // Watch message content growth (new messages added, images load, etc.).
    bottomAnchorRo = new ResizeObserver(() => {
      if (messagesScroller.value === scroller) {
        maybeStickToBottomOnContentGrowth(scroller)
      }
    })
    bottomAnchorRo.observe(contentEl)

    // Watch the scroller viewport itself. When it shrinks — keyboard opens,
    // composer grows taller as the user types multi-line — the visible area
    // decreases without any content change, so the content observer never fires.
    // If the user was pinned to the bottom, re-anchor so the latest message
    // stays visible.
    scrollerSizeRo = new ResizeObserver(() => {
      if (messagesScroller.value !== scroller) return
      const currentHeight = scroller.clientHeight
      const shrank = currentHeight < lastScrollerClientHeight
      lastScrollerClientHeight = currentHeight
      if (shrank && pinnedToBottom.value) {
        scroller.scrollTop = scroller.scrollHeight
      }
    })
    scrollerSizeRo.observe(scroller)
  }

  function onMessagesScrollerMounted(scroller: HTMLElement, chatKey: string | null | undefined) {
    const cachedTop = getCachedScrollTopForChatKey(chatKey)
    const maxTopNow = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
    const targetTop = cachedTop != null ? Math.min(cachedTop, maxTopNow) : scroller.scrollHeight
    scroller.scrollTop = targetTop
    observeScrollerForBottomAnchoring(scroller)
    requestAnimationFrame(() => {
      const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
      const nextTop = cachedTop != null ? Math.min(cachedTop, maxTop) : scroller.scrollHeight
      scroller.scrollTop = nextTop
      observeScrollerForBottomAnchoring(scroller)
      onUpdateStickyDivider?.()
      pill.measure()
      const bottom = refreshAtBottomFromScroller()
      if (bottom) {
        const normalizedChatKey = normalizeChatKey(chatKey)
        if (normalizedChatKey && selectedConversationId.value === normalizedChatKey) {
          onReachedBottom?.(normalizedChatKey, false)
        }
      }
      // Anchor when opening at the latest message, or when the restored position
      // was itself the bottom. A restored mid-history position is a deliberate
      // target, so anchoring there would throw the user's place away.
      pinnedToBottom.value = cachedTop == null || bottom
      onScrollerMountedReady?.()
    })
  }

  function onMessagesScroll(opts: { hadPending: boolean }) {
    if (opts.hadPending) coalescedHadPending = true
    pill.onScroll()
  }

  function teardown() {
    bottomAnchorRo?.disconnect()
    bottomAnchorRo = null
    scrollerSizeRo?.disconnect()
    scrollerSizeRo = null
    observedScrollerContentEl = null
    pill.teardown()
    if (autoScrollToBottomTimer) { clearTimeout(autoScrollToBottomTimer); autoScrollToBottomTimer = null }
  }

  return {
    // State
    atBottom,
    isAutoScrollingToBottom,
    scrollPillTopPx: pill.topPx,
    scrollPillHeightPx: pill.heightPx,
    scrollPillVisible: pill.visible,
    // Computed
    scrollPillNeeded: pill.needed,
    scrollPillColor,
    scrollPillThumbStyle: pill.thumbStyle,
    showScrollToBottomButton,
    // Cache helpers
    cacheScrollTopForChatKey,
    cacheCurrentChatScrollPosition,
    getCachedScrollTopForChatKey,
    normalizeChatKey,
    // Scroll actions
    isAtBottom,
    scrollToBottom,
    stickToBottom,
    setAtBottomState,
    refreshAtBottomFromScroller,
    markUserScrollIntent,
    kickScrollPillVisibility: pill.kickVisibility,
    updateScrollPill: pill.measure,
    // Mount/observer
    observeScrollerForBottomAnchoring,
    onMessagesScrollerMounted,
    onMessagesScroll,
    teardown,
  }
}
