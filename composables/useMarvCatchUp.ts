import type { FeedPost, MarvinCatchUpBodyDto, MarvinCatchUpDto } from '~/types/api'

/**
 * Drives the global "Catch me up" modal: which post Marv should summarize, plus the
 * request lifecycle (idle → loading → result / error).
 *
 * The modal is opened from any post row via `show(post)`. On open we PEEK the server cache
 * (free, no model call): if a summary is already cached for this post + mode + current thread
 * state, it's shown immediately. Otherwise the user must explicitly press "Catch me up", which
 * spends credits. Opening the modal never spends credits on its own.
 *
 * State lives in `useState` so the row trigger and the globally-mounted modal share one
 * source of truth.
 */

// ---------------------------------------------------------------------------
// Persistent "summary is waiting" registry — localStorage, client-only.
//
// Post rows can't peek the server cache (a peek walks the thread with recursive
// CTEs, which is far too expensive to do per row), so the row icon relies on this
// local record of posts we've seen a summary for. Entries are timestamped and
// expire on the same schedule as the server cache, because an icon that promises
// a free summary after the server has dropped it is worse than no icon at all.
// ---------------------------------------------------------------------------
const CAUGHT_UP_KEY = 'moh:marv-caught-up'
const CAUGHT_UP_MAX = 300
/** Must track SUMMARY_CACHE_TTL_SECONDS in the API's marvin-catch-up.service.ts. */
const CAUGHT_UP_TTL_MS = 6 * 60 * 60 * 1000

/** postId → epoch ms when we last saw a summary for it. */
type CaughtUpRecord = Record<string, number>

function readCaughtUp(): CaughtUpRecord {
  if (!import.meta.client) return {}
  try {
    const raw = localStorage.getItem(CAUGHT_UP_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : null
    // Ignore the previous string[] format rather than migrating it: those entries
    // carry no timestamp, so they can't be expiry-checked and would resurrect the
    // false-promise problem this format exists to fix.
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') return {}
    return parsed as CaughtUpRecord
  } catch {
    return {}
  }
}

function writeCaughtUp(record: CaughtUpRecord): void {
  if (!import.meta.client) return
  try {
    // Drop expired entries, then keep the most recent CAUGHT_UP_MAX so this never grows
    // unbounded for someone who reads a lot of threads.
    const cutoff = Date.now() - CAUGHT_UP_TTL_MS
    const kept = Object.entries(record)
      .filter(([, at]) => at > cutoff)
      .sort(([, a], [, b]) => b - a)
      .slice(0, CAUGHT_UP_MAX)
    localStorage.setItem(CAUGHT_UP_KEY, JSON.stringify(Object.fromEntries(kept)))
  } catch {
    // Ignore quota / private-browsing errors.
  }
}

/** Record that this post has a summary (called after any successful peek or run). */
function markPostCaughtUp(postId: string): void {
  const record = readCaughtUp()
  record[postId] = Date.now()
  writeCaughtUp(record)
}

/**
 * True if we've seen a summary for this post recently enough that the server cache should
 * still hold it. Survives reloads; goes false once the server would have dropped the entry.
 */
export function isPostCaughtUp(postId: string): boolean {
  const at = readCaughtUp()[postId]
  return typeof at === 'number' && Date.now() - at < CAUGHT_UP_TTL_MS
}

export function useMarvCatchUp() {
  const { apiFetch } = useApiClient()
  const { preferredMode } = useMarv()

  const open = useState<boolean>('marv-catchup:open', () => false)
  const post = useState<FeedPost | null>('marv-catchup:post', () => null)
  const loading = useState<boolean>('marv-catchup:loading', () => false)
  // True only while checking the cache (free). Distinct from `loading` (a paid generation).
  const peeking = useState<boolean>('marv-catchup:peeking', () => false)
  const result = useState<MarvinCatchUpDto | null>('marv-catchup:result', () => null)
  const errorMessage = useState<string | null>('marv-catchup:error', () => null)
  const errorReason = useState<string | null>('marv-catchup:error-reason', () => null)
  // Default ON: images are included unless the user explicitly opts out.
  const includeImages = useState<boolean>('marv-catchup:includeImages', () => true)

  function show(target: FeedPost) {
    const samePost = post.value?.id === target.id
    post.value = target
    // If we already have a result for this exact post (same session), skip
    // straight to the result state — no need to reset or re-peek.
    if (!samePost || !result.value) {
      result.value = null
      errorMessage.value = null
      errorReason.value = null
      loading.value = false
    }
    open.value = true
    // Auto-PEEK only — never auto-generate. A peek returns the cached summary for free if one
    // exists (so a refresh lands straight on the summary), or null if not (so the user makes
    // the explicit, credit-spending choice). This guarantees opening the modal is always free.
    if (!result.value && !loading.value && !peeking.value) {
      void peek()
    }
  }

  function hide() {
    open.value = false
  }

  function reset() {
    result.value = null
    errorMessage.value = null
    errorReason.value = null
    loading.value = false
  }

  /** Cache-only check: shows the cached summary if present, else leaves the modal idle. Free. */
  async function peek() {
    const target = post.value
    if (!target?.id || loading.value || peeking.value) return
    peeking.value = true
    try {
      const body: MarvinCatchUpBodyDto = { mode: preferredMode.value, cacheOnly: true, includeImages: includeImages.value }
      const res = await apiFetch<MarvinCatchUpDto | null>(`/marvin/catch-up/${target.id}`, {
        method: 'POST',
        body,
        timeout: 20_000,
      })
      if (res?.data) {
        result.value = res.data
        markPostCaughtUp(target.id)
      }
    } catch {
      // A failed peek is silent — fall back to the idle CTA. Nothing was spent.
    } finally {
      peeking.value = false
    }
  }

  async function run(opts?: { refresh?: boolean }) {
    const target = post.value
    if (!target?.id || loading.value) return
    loading.value = true
    errorMessage.value = null
    errorReason.value = null
    try {
      const body: MarvinCatchUpBodyDto = { mode: preferredMode.value, includeImages: includeImages.value }
      // "Regenerate" must bypass the per-(post, mode) cache and recompute a fresh summary.
      if (opts?.refresh) body.refresh = true
      const res = await apiFetch<MarvinCatchUpDto>(`/marvin/catch-up/${target.id}`, {
        method: 'POST',
        body,
        // Smart-mode summaries can take a while; the modal owns the wait UX.
        timeout: 60_000,
      })
      if (res?.data) {
        result.value = res.data
        markPostCaughtUp(target.id)
      }
    } catch (err) {
      const anyErr = err as {
        data?: { meta?: { errors?: Array<{ message?: string; reason?: string }> } }
      }
      const apiError = anyErr?.data?.meta?.errors?.[0]
      errorReason.value = apiError?.reason ?? null
      errorMessage.value =
        apiError?.message ?? (err instanceof Error ? err.message : 'Marv could not summarize this thread.')
    } finally {
      loading.value = false
    }
  }

  /**
   * Toggle image inclusion. Same contract as mode switching: reset and re-peek so
   * a cached summary for the new setting shows instantly and for free; the user
   * must explicitly press "Catch me up" if there's no cached result.
   */
  async function toggleIncludeImages() {
    if (loading.value || peeking.value) return
    includeImages.value = !includeImages.value
    reset()
    await peek()
  }

  return {
    open,
    post,
    loading,
    peeking,
    result,
    errorMessage,
    errorReason,
    includeImages,
    show,
    hide,
    reset,
    peek,
    run,
    toggleIncludeImages,
  }
}
