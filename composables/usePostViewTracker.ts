/**
 * Tracks which posts the logged-in user has seen and reports them to the API.
 *
 * Scroll-based views: attach an IntersectionObserver per post element.
 * A post is considered "viewed" when ≥50% of it is visible for ≥1 second.
 *
 * Engagement-based views (boost, bookmark, comment): call markEngaged(postId)
 * directly — these are flushed immediately rather than batched.
 *
 * The API endpoint is idempotent, so duplicate calls are harmless.
 */

const FLUSH_INTERVAL_MS = 2_000
const VISIBILITY_THRESHOLD = 0.5
const VISIBILITY_DWELL_MS = 1_000
const BATCH_MAX = 50
/** Don't re-send the same post within this window (reduces redundant API calls on scroll bounce). */
const DEDUPE_WINDOW_MS = 60_000

// Module-level singleton so the tracker is shared across all PostRow instances
// on the same page without double-counting or double-flushing.
let flushTimer: ReturnType<typeof setInterval> | null = null
const pendingPostIds = new Set<string>()
/** postId -> last sent timestamp; entries older than DEDUPE_WINDOW_MS are skipped when enqueueing. */
const recentlySent = new Map<string, number>()

function enqueuePosts(ids: string[]) {
  const now = Date.now()
  const cutoff = now - DEDUPE_WINDOW_MS
  for (const id of ids) {
    const last = recentlySent.get(id)
    if (last != null && last > cutoff) continue
    pendingPostIds.add(id)
  }
}

async function flushPending(apiFetchData: (url: string, opts: Record<string, unknown>) => Promise<unknown>, isAuthed: boolean) {
  if (!isAuthed || pendingPostIds.size === 0) return

  const ids = [...pendingPostIds].slice(0, BATCH_MAX)
  for (const id of ids) pendingPostIds.delete(id)

  try {
    await apiFetchData('/posts/views', {
      method: 'POST',
      body: { postIds: ids },
    })
    const now = Date.now()
    for (const id of ids) recentlySent.set(id, now)
  } catch {
    // Fire-and-forget: silently ignore errors (network hiccups, 204 etc.)
  }
}

export function usePostViewTracker() {
  const { apiFetchData } = useApiClient()
  const { isAuthed } = useAuth()

  // Start the periodic flush timer once (shared across all callers on this page).
  if (import.meta.client && !flushTimer) {
    flushTimer = setInterval(() => {
      void flushPending(apiFetchData as any, isAuthed.value)
    }, FLUSH_INTERVAL_MS)

    // Flush on tab hide so we don't lose views on navigation/close.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        void flushPending(apiFetchData as any, isAuthed.value)
      }
    }, { once: false })
  }

  /**
   * Attach an IntersectionObserver to a post element.
   * When ≥50% is visible for ≥1s all postIds are added to the batch queue.
   * Returns a cleanup function — call it on unmount or when el changes.
   * Pass multiple postIds to track a thread chain (all enqueued together).
   */
  function observe(postIds: string | string[], el: HTMLElement | null): () => void {
    if (!import.meta.client || !el) return () => {}
    const ids = (Array.isArray(postIds) ? postIds : [postIds]).filter(Boolean)
    if (ids.length === 0) return () => {}

    let dwellTimer: ReturnType<typeof setTimeout> | null = null

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return

        if (entry.isIntersecting && entry.intersectionRatio >= VISIBILITY_THRESHOLD) {
          if (!dwellTimer) {
            dwellTimer = setTimeout(() => {
              enqueuePosts(ids)
              dwellTimer = null
            }, VISIBILITY_DWELL_MS)
          }
        } else {
          if (dwellTimer) {
            clearTimeout(dwellTimer)
            dwellTimer = null
          }
        }
      },
      { threshold: VISIBILITY_THRESHOLD },
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
   * Immediately enqueue and flush post(s). Use for direct permalink visits or
   * boost/bookmark/comment (server-side also records, but this keeps client in sync).
   * Pass multiple IDs when viewing a thread (e.g. /p/:id for a reply).
   */
  function markEngaged(postIds: string | string[]): void {
    if (!isAuthed.value) return
    const ids = (Array.isArray(postIds) ? postIds : [postIds]).filter(Boolean)
    if (ids.length === 0) return
    enqueuePosts(ids)
    void flushPending(apiFetchData as any, isAuthed.value)
  }

  return { observe, markEngaged }
}
