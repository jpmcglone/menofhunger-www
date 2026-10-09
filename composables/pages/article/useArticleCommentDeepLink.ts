import type { Ref } from 'vue'
import type { Article } from '~/types/api'

/** Comment deep links (`#comment-<id>` / `?comment=`): highlight, poll for the node, and scroll to it. */
export function useArticleCommentDeepLink(route: ReturnType<typeof useRoute>, article: Ref<Article | null | undefined>) {
  // ─── Comment deep-link (hash = #comment-<id>) ────────────────────────────────
  const highlightedCommentId = ref<string | null>(null)

  function extractCommentIdFromHash(hash: string): string | null {
    const m = hash.match(/^#?comment-(.+)$/)
    return m?.[1] ?? null
  }

  function commentIdFromRoute(): string | null {
    const fromHash = extractCommentIdFromHash(route.hash)
    if (fromHash) return fromHash
    const q = route.query.comment
    return typeof q === 'string' && q.trim() ? q : null
  }

  /**
   * Scroll the custom middle scroller the minimum amount needed to bring `el`
   * fully into view, with `padding` px of breathing room above and below.
   * If the element is already fully visible, nothing happens.
   */
  function scrollIntoViewIfNeeded(el: HTMLElement, padding = 20) {
    const scroller = document.getElementById('moh-middle-scroller')
    if (!scroller) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      return
    }
    const scrollerRect = scroller.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    const relTop = elRect.top - scrollerRect.top
    const relBottom = elRect.bottom - scrollerRect.top
    const viewHeight = scroller.clientHeight

    if (relTop < padding) {
      scroller.scrollBy({ top: relTop - padding, behavior: 'smooth' })
    } else if (relBottom > viewHeight - padding) {
      scroller.scrollBy({ top: relBottom - viewHeight + padding, behavior: 'smooth' })
    }
  }

  function scrollToComment(commentId: string) {
    const el = document.getElementById(`comment-${commentId}`)
    if (!el) return
    scrollIntoViewIfNeeded(el)
    highlightedCommentId.value = commentId
    setTimeout(() => { highlightedCommentId.value = null }, 4000)
  }


  watch(
    () => route.hash,
    () => {
      const commentId = commentIdFromRoute()
      if (commentId) scrollToComment(commentId)
    },
  )


  // ─── Comment deep-link: poll until the target comment element appears ─────────
  // Start only after the article loads (ensures AppArticleComments is mounted).
  // Uses double-rAF once found so the scroll fires after the layout is stable.
  let deepLinkInterval: ReturnType<typeof setInterval> | null = null

  watch(
    article,
    (art) => {
      if (!art || deepLinkInterval !== null) return
      const commentId = commentIdFromRoute()
      if (!commentId) return

      highlightedCommentId.value = commentId

      const POLL_MS = 150
      const TIMEOUT_MS = 10_000
      let elapsed = 0
      deepLinkInterval = setInterval(() => {
        elapsed += POLL_MS
        const el = document.getElementById(`comment-${commentId}`)
        if (el) {
          clearInterval(deepLinkInterval!)
          deepLinkInterval = null
          // Double rAF: ensures the scroll fires after the browser has painted
          // the newly-added comment nodes and the layout is fully stable.
          requestAnimationFrame(() => requestAnimationFrame(() => scrollToComment(commentId)))
        } else if (elapsed >= TIMEOUT_MS) {
          clearInterval(deepLinkInterval!)
          deepLinkInterval = null
        }
      }, POLL_MS)
    },
    { immediate: true },
  )

  onUnmounted(() => {
    if (deepLinkInterval) {
      clearInterval(deepLinkInterval)
      deepLinkInterval = null
    }
  })

  return { highlightedCommentId, scrollIntoViewIfNeeded, scrollToComment }
}
