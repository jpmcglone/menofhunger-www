import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { userColorTier } from '~/utils/user-tier'
import type { AuthUser } from '~/composables/useAuth'

export const BOTTOM_THRESHOLD = 24
const USER_SCROLL_GRACE_MS = 2000

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
  const scrollPillTopPx = ref(0)
  const scrollPillHeightPx = ref(0)
  const scrollPillVisible = ref(false)

  const scrollTopByChatKey = new Map<string, number>()
  let scrollPillHideTimer: ReturnType<typeof setTimeout> | null = null
  let autoScrollToBottomTimer: ReturnType<typeof setTimeout> | null = null
  let lastUserScrollIntentAt = 0
  let bottomAnchorRo: ResizeObserver | null = null
  let observedScrollerContentEl: HTMLElement | null = null
  let lastMeasuredScrollHeight = 0

  // ─── Computed ────────────────────────────────────────────────────────────────

  const scrollPillNeeded = computed(() => {
    const el = messagesScroller.value
    if (!el) return false
    return el.scrollHeight > el.clientHeight + 1
  })

  const scrollPillColor = computed(() => {
    const tier = userColorTier(me.value as any)
    if (tier === 'organization') return 'var(--moh-org)'
    if (tier === 'premium') return 'var(--moh-premium)'
    if (tier === 'verified') return 'var(--moh-verified)'
    return 'rgba(148, 163, 184, 0.9)'
  })

  const scrollPillThumbStyle = computed<Record<string, string>>(() => {
    const h = Math.max(0, Math.floor(scrollPillHeightPx.value))
    const y = Math.max(0, Math.floor(scrollPillTopPx.value))
    return {
      height: `${h}px`,
      transform: `translateY(${y}px)`,
      background: scrollPillColor.value,
    }
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

  function updateScrollPill() {
    const el = messagesScroller.value
    if (!el) return
    const insetPx = 8
    const trackH = Math.max(0, el.clientHeight - insetPx * 2)
    const scrollable = Math.max(1, el.scrollHeight - el.clientHeight)
    if (trackH <= 0 || el.scrollHeight <= el.clientHeight + 1) {
      scrollPillHeightPx.value = 0
      scrollPillTopPx.value = 0
      scrollPillVisible.value = false
      return
    }
    const ratio = el.clientHeight / el.scrollHeight
    const minThumb = 18
    const thumbH = Math.min(trackH, Math.max(minThumb, Math.floor(trackH * ratio)))
    const maxTop = Math.max(0, trackH - thumbH)
    const scrollRatio = el.scrollTop / scrollable
    scrollPillHeightPx.value = thumbH
    scrollPillTopPx.value = Math.floor(maxTop * scrollRatio)
  }

  function kickScrollPillVisibility() {
    if (!scrollPillNeeded.value) {
      scrollPillVisible.value = false
      return
    }
    scrollPillVisible.value = true
    if (scrollPillHideTimer) clearTimeout(scrollPillHideTimer)
    scrollPillHideTimer = setTimeout(() => {
      scrollPillHideTimer = null
      scrollPillVisible.value = false
    }, 1200)
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

    scrollToBottom(behavior)
    requestAnimationFrame(() => {
      if (includeExtraFrame) {
        scrollToBottom('auto')
        requestAnimationFrame(() => {
          scrollToBottom('auto')
          refreshAtBottomFromScroller()
          updateScrollPill()
        })
        return
      }
      refreshAtBottomFromScroller()
      updateScrollPill()
    })
    return true
  }

  function markUserScrollIntent() {
    if (!import.meta.client) return
    if (isAutoScrollingToBottom.value) clearAutoScrollToBottomState()
    lastUserScrollIntentAt = Date.now()
    kickScrollPillVisibility()
  }

  function getScrollerContentEl(scroller: HTMLElement): HTMLElement | null {
    return (scroller.firstElementChild as HTMLElement | null) ?? null
  }

  function maybeStickToBottomOnContentGrowth(scroller: HTMLElement) {
    const contentEl = getScrollerContentEl(scroller)
    if (!contentEl || !atBottom.value) return
    const nowHeight = scroller.scrollHeight
    if (nowHeight <= lastMeasuredScrollHeight) return
    lastMeasuredScrollHeight = nowHeight
    stickToBottom({ behavior: 'auto' })
  }

  function observeScrollerForBottomAnchoring(scroller: HTMLElement) {
    const contentEl = getScrollerContentEl(scroller)
    if (!contentEl) return

    if (observedScrollerContentEl === contentEl) return

    bottomAnchorRo?.disconnect()
    observedScrollerContentEl = contentEl
    lastMeasuredScrollHeight = scroller.scrollHeight

    if (typeof ResizeObserver === 'undefined') return

    bottomAnchorRo = new ResizeObserver(() => {
      if (messagesScroller.value === scroller) {
        maybeStickToBottomOnContentGrowth(scroller)
      }
    })
    bottomAnchorRo.observe(contentEl)
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
      updateScrollPill()
      const bottom = refreshAtBottomFromScroller()
      if (bottom) {
        const normalizedChatKey = normalizeChatKey(chatKey)
        if (normalizedChatKey && selectedConversationId.value === normalizedChatKey) {
          onReachedBottom?.(normalizedChatKey, false)
        }
      }
      onScrollerMountedReady?.()
    })
  }

  function onMessagesScroll(opts: { hadPending: boolean }) {
    const wasAtBottom = atBottom.value
    const bottom = refreshAtBottomFromScroller()
    if (bottom) {
      const convoId = selectedConversationId.value
      if (!wasAtBottom && convoId) {
        onReachedBottom?.(convoId, opts.hadPending)
      }
    }
    onUpdateStickyDivider?.()
    updateScrollPill()
    if (import.meta.client && Date.now() - lastUserScrollIntentAt < USER_SCROLL_GRACE_MS) {
      kickScrollPillVisibility()
    }
  }

  function teardown() {
    bottomAnchorRo?.disconnect()
    bottomAnchorRo = null
    observedScrollerContentEl = null
    if (scrollPillHideTimer) { clearTimeout(scrollPillHideTimer); scrollPillHideTimer = null }
    if (autoScrollToBottomTimer) { clearTimeout(autoScrollToBottomTimer); autoScrollToBottomTimer = null }
  }

  return {
    // State
    atBottom,
    isAutoScrollingToBottom,
    scrollPillTopPx,
    scrollPillHeightPx,
    scrollPillVisible,
    // Computed
    scrollPillNeeded,
    scrollPillColor,
    scrollPillThumbStyle,
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
    kickScrollPillVisibility,
    updateScrollPill,
    // Mount/observer
    observeScrollerForBottomAnchoring,
    onMessagesScrollerMounted,
    onMessagesScroll,
    teardown,
  }
}
