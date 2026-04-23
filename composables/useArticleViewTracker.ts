/**
 * Tracks article views and reports them to the API.
 *
 * Two complementary triggers:
 *  1. Scroll sentinel — fires when a sentinel element (placed at the end of the
 *     article body) has been continuously visible for DWELL_MS ms.
 *  2. Page-dwell trigger (trackOnDwell) — fires after PAGE_DWELL_MS ms of the
 *     article page being open.  This captures readers who don't scroll to the
 *     very end, including logged-out visitors who typically read without
 *     reaching the footer.  Works for both authenticated and anonymous users
 *     (via the moh_anon_view_id cookie).
 *
 * The API endpoint is idempotent, so calling both triggers is harmless.
 */

const DWELL_MS = 2_000
/** Time-on-page threshold before counting as a view (ms). */
const PAGE_DWELL_MS = 5_000
/** Don't re-send the same article within this window. */
const DEDUPE_WINDOW_MS = 60_000

const recentlySent = new Map<string, number>()

export function useArticleViewTracker() {
  const { apiFetchData } = useApiClient()
  const { isAuthed } = useAuth()
  const anonViewId = useAnonViewId()

  async function flush(articleId: string, opts?: { canTrack?: boolean; source?: string }) {
    const id = (articleId ?? '').trim()
    if (!id) return
    if (opts?.canTrack === false) return
    if (!isAuthed.value && !anonViewId.value) return

    const now = Date.now()
    const last = recentlySent.get(id)
    if (last != null && now - last < DEDUPE_WINDOW_MS) return

    try {
      await apiFetchData('/articles/views', {
        method: 'POST',
        body: {
          articleIds: [id],
          source: opts?.source ?? 'article_read_sentinel',
          ...(anonViewId.value ? { anon_id: anonViewId.value } : {}),
        },
      })
      recentlySent.set(id, Date.now())
    } catch {
      // Fire-and-forget
    }
  }

  /**
   * Attach an IntersectionObserver to a sentinel element.
   * The view is counted after the sentinel has been continuously visible
   * for DWELL_MS ms (resets if sentinel leaves viewport before dwell completes).
   *
   * Returns a cleanup function — call it on unmount or when el changes.
   */
  function observe(
    articleId: string,
    el: HTMLElement | null,
    opts?: { canTrack?: boolean; source?: string },
  ): () => void {
    if (!import.meta.client || !el) return () => {}
    if (opts?.canTrack === false) return () => {}
    const id = (articleId ?? '').trim()
    if (!id) return () => {}

    let dwellTimer: ReturnType<typeof setTimeout> | null = null

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return

        if (entry.isIntersecting) {
          if (!dwellTimer) {
            dwellTimer = setTimeout(() => {
              dwellTimer = null
              void flush(id, opts)
            }, DWELL_MS)
          }
        } else {
          if (dwellTimer) {
            clearTimeout(dwellTimer)
            dwellTimer = null
          }
        }
      },
      { threshold: 0 },
    )

    observer.observe(el)

    return () => {
      observer.disconnect()
      if (dwellTimer) {
        clearTimeout(dwellTimer)
        dwellTimer = null
      }
    }
  }

  /**
   * Start a page-dwell timer.  If the user stays on the page for PAGE_DWELL_MS
   * without navigating away, flush a view for the given article.  Captures
   * readers who don't scroll all the way to the scroll sentinel (the common
   * case for logged-out visitors on long articles).
   *
   * Returns a cleanup function — call it on unmount so the timer is cancelled
   * if the user leaves before the dwell threshold.
   */
  function trackOnDwell(
    articleId: string,
    opts?: { canTrack?: boolean },
  ): () => void {
    if (!import.meta.client) return () => {}
    if (opts?.canTrack === false) return () => {}
    const id = (articleId ?? '').trim()
    if (!id) return () => {}

    const timer = setTimeout(() => {
      void flush(id, { ...opts, source: 'article_page_dwell' })
    }, PAGE_DWELL_MS)

    return () => clearTimeout(timer)
  }

  return { observe, trackOnDwell }
}
