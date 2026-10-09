import type { Ref } from 'vue'
import type { Article } from '~/types/api'

/** Scroll-sentinel and page-dwell view tracking for the article page. */
export function useArticleViewTracking(article: Ref<Article | null | undefined>) {
  // ─── View tracking (scroll-based) ────────────────────────────────────────────
  // A sentinel placed at the article midpoint triggers the view count after the
  // reader has kept it visible for 2 s (dwell threshold).
  const viewSentinelEl = ref<HTMLElement | null>(null)
  const { observe: observeArticleView, trackOnDwell: trackArticleViewOnDwell } = useArticleViewTracker()
  let stopObservingView: (() => void) | null = null

  // Attach scroll observer once the sentinel element is rendered.
  // Guard: never track views for articles the viewer cannot access.
  watch(viewSentinelEl, (el) => {
    stopObservingView?.()
    stopObservingView = null
    if (el && article.value?.id && article.value.viewerCanAccess !== false) {
      stopObservingView = observeArticleView(article.value.id, el)
    }
  })

  // Page-dwell view tracker: counts a view after 5 s on the page even if the
  // reader never scrolls to the end sentinel.  Works for logged-out visitors
  // (anon_id cookie) and logged-in users alike, matching how post feed rows
  // count views when visible in the feed without requiring a full scroll-through.
  let stopDwellTracking: (() => void) | null = null
  watch(
    () => article.value?.id,
    (articleId) => {
      stopDwellTracking?.()
      stopDwellTracking = null
      if (articleId && article.value?.viewerCanAccess !== false) {
        stopDwellTracking = trackArticleViewOnDwell(articleId)
      }
    },
    { immediate: true },
  )

  onUnmounted(() => {
    stopObservingView?.()
    stopObservingView = null
    stopDwellTracking?.()
    stopDwellTracking = null
  })

  return { viewSentinelEl }
}
