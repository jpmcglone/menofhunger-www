/**
 * Tracks article views and reports them to the API.
 *
 * A view is counted only when the reader has scrolled far enough to see a
 * sentinel element (placed ~halfway through the article body) AND the sentinel
 * has been visible for at least DWELL_MS milliseconds.  This matches industry
 * practice (Medium, Substack, etc.) and avoids counting "drive-by" page loads.
 *
 * The API endpoint is idempotent, so duplicate calls are harmless.
 */

const DWELL_MS = 2_000
/** Don't re-send the same article within this window. */
const DEDUPE_WINDOW_MS = 60_000

const recentlySent = new Map<string, number>()

export function useArticleViewTracker() {
  const { apiFetchData } = useApiClient()
  const { isAuthed } = useAuth()

  async function flush(articleId: string) {
    if (!isAuthed.value) return
    const id = (articleId ?? '').trim()
    if (!id) return

    const now = Date.now()
    const last = recentlySent.get(id)
    if (last != null && now - last < DEDUPE_WINDOW_MS) return

    try {
      await apiFetchData('/articles/views', {
        method: 'POST',
        body: { articleIds: [id] },
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
  function observe(articleId: string, el: HTMLElement | null): () => void {
    if (!import.meta.client || !el) return () => {}
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
              void flush(id)
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

  return { observe }
}
