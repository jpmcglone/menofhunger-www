/**
 * Tracks which posts the logged-in user has seen and reports them to the API.
 *
 * Scroll-based views: attach an IntersectionObserver per post element.
 * A post is considered "viewed" when it stays visible for ≥1 continuous second —
 * either ≥50% of the row is on screen, or (for posts taller than the viewport
 * allows) at least VISIBLE_PX_FALLBACK pixels of it are on screen.
 *
 * Engagement-based views (boost, bookmark, comment): call markEngaged(postId)
 * directly — these are flushed immediately rather than batched.
 *
 * Group posts: optimistic groups-badge decrement on dwell; network flush stays
 * on the shared batch timer (not one POST per group post).
 *
 * After the first successful enqueue for a post this session, the observer
 * disconnects so scroll bounce cannot re-POST / re-trigger mark-read.
 */

const FLUSH_INTERVAL_MS = 4_000
const VISIBILITY_THRESHOLD = 0.5
const VISIBILITY_DWELL_MS = 1_000
/**
 * Tall-post fallback: a post taller than the viewport can never reach
 * VISIBILITY_THRESHOLD on screen at once, so it also counts as viewable once at
 * least this many CSS pixels are continuously visible (mirrors the MRC
 * large-creative viewability exception). Keeps long posts from being undercounted.
 */
const VISIBLE_PX_FALLBACK = 400
/** Fine-grained thresholds so the observer fires often enough to evaluate the pixel fallback while scrolling. */
const OBSERVER_THRESHOLDS = [0, 0.5, 1]
const BATCH_MAX = 50

// Module-level singleton so the tracker is shared across all PostRow instances
// on the same page without double-counting or double-flushing.
let flushTimer: ReturnType<typeof setInterval> | null = null
const pendingPostIds = new Set<string>()
/**
 * Session-level "already reported / enqueued" set. Once a post is here we never
 * enqueue it again this page load (observers disconnect after first dwell).
 */
const sessionReportedPostIds = new Set<string>()
/** postIds already used for an optimistic groups-badge decrement this session. */
const optimisticGroupBadgeApplied = new Set<string>()
/**
 * Post IDs the authenticated viewer has viewed this session (local-only, additive).
 * Intentionally not backed by storage — initializes empty on every page load so SSR
 * and client hydration produce identical markup. Immune to postCache.clear() resets.
 */
const locallyViewedPostIds = new Set<string>()

function enqueuePosts(ids: string[]): string[] {
  const added: string[] = []
  for (const id of ids) {
    if (sessionReportedPostIds.has(id)) continue
    sessionReportedPostIds.add(id)
    if (!pendingPostIds.has(id)) added.push(id)
    pendingPostIds.add(id)
  }
  return added
}

async function flushPending(
  apiFetchData: (url: string, opts: Record<string, unknown>) => Promise<unknown>,
  opts: { isAuthed: boolean; anonId: string | null; source: string },
) {
  if (pendingPostIds.size === 0) return
  if (!opts.isAuthed && !opts.anonId) return

  const ids = [...pendingPostIds].slice(0, BATCH_MAX)
  for (const id of ids) pendingPostIds.delete(id)

  try {
    await apiFetchData('/posts/views', {
      method: 'POST',
      body: {
        postIds: ids,
        source: opts.source,
        ...(opts.anonId ? { anon_id: opts.anonId } : {}),
      },
    })
  } catch {
    // Fire-and-forget: silently ignore errors (network hiccups, 204 etc.)
  }
}

/**
 * Optimistically decrement groups unread for a single group post view.
 * Socket `groups:unreadChanged` remains authoritative and will overwrite shortly.
 */
function optimisticDecrementGroupBadge(
  groupId: string,
  postId: string,
  setGroupsUnread: (data: { total?: number; byGroupId?: Record<string, number> }) => void,
  groupsUnread: { total: number; byGroupId: Record<string, number> },
) {
  if (!groupId || !postId) return
  if (optimisticGroupBadgeApplied.has(postId)) return
  const current = groupsUnread.byGroupId[groupId] ?? 0
  if (current <= 0) return
  optimisticGroupBadgeApplied.add(postId)
  const byGroupId = { ...groupsUnread.byGroupId }
  const next = current - 1
  if (next <= 0) delete byGroupId[groupId]
  else byGroupId[groupId] = next
  setGroupsUnread({ total: Math.max(0, groupsUnread.total - 1), byGroupId })
}

export function usePostViewTracker() {
  const { apiFetchData } = useApiClient()
  const { isAuthed } = useAuth()
  const anonViewId = useAnonViewId()
  const { groupsUnread, setGroupsUnread } = usePresence()

  // Start the periodic flush timer once (shared across all callers on this page).
  if (import.meta.client && !flushTimer) {
    flushTimer = setInterval(() => {
      void flushPending(apiFetchData as any, {
        isAuthed: isAuthed.value,
        anonId: anonViewId.value,
        source: 'feed_scroll',
      })
    }, FLUSH_INTERVAL_MS)

    // Flush on tab hide so we don't lose views on navigation/close.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        void flushPending(apiFetchData as any, {
          isAuthed: isAuthed.value,
          anonId: anonViewId.value,
          source: 'feed_scroll',
        })
      }
    }, { once: false })
  }

  /**
   * Attach an IntersectionObserver to a post element.
   * When the element stays visible for ≥1s (≥50% of the row, or ≥VISIBLE_PX_FALLBACK
   * pixels for tall posts) all postIds are added to the batch queue.
   * Returns a cleanup function — call it on unmount or when el changes.
   * Pass multiple postIds to track a thread chain (all enqueued together).
   *
   * When `groupIdByPostId` maps a viewed post to a community group, optimistically
   * decrement that group's unread badge (flush stays batched).
   */
  function observe(
    postIds: string | string[],
    el: HTMLElement | null,
    opts?: {
      canTrack?: boolean
      /** Map of postId → communityGroupId for group-badge optimistic decrement. */
      groupIdByPostId?: Record<string, string>
    },
  ): () => void {
    if (!import.meta.client || !el) return () => {}
    if (opts?.canTrack === false) return () => {}
    const ids = (Array.isArray(postIds) ? postIds : [postIds]).filter(Boolean)
    if (ids.length === 0) return () => {}
    // Already reported this session — no observer work.
    if (ids.every((id) => sessionReportedPostIds.has(id))) return () => {}

    let dwellTimer: ReturnType<typeof setTimeout> | null = null
    let done = false

    const observer = new IntersectionObserver(
      (entries) => {
        if (done) return
        const entry = entries[0]
        if (!entry) return

        // Count as on-screen when at least half the row is visible, OR enough raw
        // pixels are visible (so tall posts that can't fit 50% on screen still count).
        const visibleEnough
          = entry.intersectionRatio >= VISIBILITY_THRESHOLD
          || entry.intersectionRect.height >= VISIBLE_PX_FALLBACK

        if (entry.isIntersecting && visibleEnough) {
          if (!dwellTimer) {
            dwellTimer = setTimeout(() => {
              dwellTimer = null
              const pendingIds = ids.filter((id) => !sessionReportedPostIds.has(id))
              if (pendingIds.length === 0) {
                done = true
                observer.disconnect()
                return
              }
              const added = enqueuePosts(pendingIds)

              // Mark locally viewed so the eye icon lights up immediately, before the
              // batch API call confirms. Gated on isAuthed so anon viewers don't get
              // a state that silently resets on reload.
              if (isAuthed.value) {
                for (const id of pendingIds) locallyViewedPostIds.add(id)
              }

              // Group posts: optimistic badge only — flush rides the shared timer.
              const groupMap = opts?.groupIdByPostId
              if (groupMap && isAuthed.value) {
                for (const id of added.length ? added : pendingIds) {
                  const gid = groupMap[id]
                  if (!gid) continue
                  optimisticDecrementGroupBadge(gid, id, setGroupsUnread, groupsUnread.value)
                }
              }

              // One dwell per session: stop observing so scroll bounce can't re-POST.
              done = true
              observer.disconnect()
            }, VISIBILITY_DWELL_MS)
          }
        } else {
          if (dwellTimer) {
            clearTimeout(dwellTimer)
            dwellTimer = null
          }
        }
      },
      { threshold: OBSERVER_THRESHOLDS },
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
  function markEngaged(postIds: string | string[], opts?: { canTrack?: boolean }): void {
    if (opts?.canTrack === false) return
    const ids = (Array.isArray(postIds) ? postIds : [postIds]).filter(Boolean)
    if (ids.length === 0) return
    enqueuePosts(ids)
    if (isAuthed.value) {
      for (const id of ids) locallyViewedPostIds.add(id)
    }
    void flushPending(apiFetchData as any, {
      isAuthed: isAuthed.value,
      anonId: anonViewId.value,
      source: 'permalink_engaged',
    })
  }

  /**
   * Immediately flush any pending view reports. Call before a hard feed refresh so the
   * server has up-to-date PostView records and seen-decay applies to the very next request.
   */
  async function flush() {
    await flushPending(apiFetchData as any, {
      isAuthed: isAuthed.value,
      anonId: anonViewId.value,
      source: 'feed_scroll',
    })
  }

  /**
   * Returns true if the viewer has viewed this post in the current session
   * (local-only; does not require an API round-trip).
   * Authenticated viewers only — always false for anon.
   */
  function hasViewedLocally(postId: string): boolean {
    return isAuthed.value && locallyViewedPostIds.has(postId)
  }

  /**
   * Seed session "already reported" from feed payload so we never POST for
   * posts the API already marks viewerHasViewed.
   */
  function noteAlreadyViewed(postIds: string | string[]): void {
    const ids = (Array.isArray(postIds) ? postIds : [postIds]).filter(Boolean)
    for (const id of ids) {
      sessionReportedPostIds.add(id)
      if (isAuthed.value) locallyViewedPostIds.add(id)
    }
  }

  return { observe, markEngaged, flush, hasViewedLocally, noteAlreadyViewed }
}
