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
 * The API decides whether a report counts (unique once; total again after 30s).
 * Client only skips re-POSTing the same post within 30s to avoid network spam.
 */

const FLUSH_INTERVAL_MS = 4_000
const REREPORT_INTERVAL_MS = 30_000
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
/** postId → last enqueue time. Re-report allowed after REREPORT_INTERVAL_MS. */
const sessionReportedAt = new Map<string, number>()
/** postIds already used for an optimistic groups-badge decrement this session. */
const optimisticGroupBadgeApplied = new Set<string>()
/**
 * Post IDs the authenticated viewer has viewed this session (local-only, additive).
 * Intentionally not backed by storage — initializes empty on every page load so SSR
 * and client hydration produce identical markup. Immune to postCache.clear() resets.
 */
const locallyViewedPostIds = new Set<string>()
let applyAcksFn: ((acks: import('~/types/api').PostViewAck[]) => void) | null = null

function canReport(id: string, now = Date.now()): boolean {
  const last = sessionReportedAt.get(id)
  return last == null || now - last >= REREPORT_INTERVAL_MS
}

function enqueuePosts(ids: string[]): string[] {
  const added: string[] = []
  const now = Date.now()
  for (const id of ids) {
    if (!canReport(id, now)) continue
    sessionReportedAt.set(id, now)
    if (!pendingPostIds.has(id)) added.push(id)
    pendingPostIds.add(id)
  }
  return added
}

async function flushPending(
  apiFetchData: (url: string, opts: Record<string, unknown>) => Promise<unknown>,
  opts: {
    isAuthed: boolean
    anonId: string | null
    source: string
  },
) {
  if (!import.meta.client) return
  if (pendingPostIds.size === 0) return
  // Guests must send anon_id. Logged-in viewers still send it when present so
  // identities can merge, but they can flush on the session cookie alone.
  if (!opts.isAuthed && !opts.anonId) return

  const ids = [...pendingPostIds].slice(0, BATCH_MAX)
  for (const id of ids) pendingPostIds.delete(id)

  try {
    const acks = await apiFetchData('/posts/views', {
      method: 'POST',
      keepalive: true,
      mohUnauthorized: 'ignore',
      body: {
        postIds: ids,
        source: opts.source,
        ...(opts.anonId ? { anon_id: opts.anonId } : {}),
      },
    }) as import('~/types/api').PostViewAck[] | undefined
    if (Array.isArray(acks)) applyAcksFn?.(acks)
  } catch {
    // Keep the batch queued so the 4s timer retries. sessionReportedAt already
    // blocks a second enqueue, so losing pending here meant "scroll away and
    // back" could never record the permalink target.
    for (const id of ids) pendingPostIds.add(id)
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
  const postCache = usePostCache()

  function applyAcks(acks: import('~/types/api').PostViewAck[]) {
    for (const ack of acks) {
      const current = postCache.get({ id: ack.id } as import('~/types/api').FeedPost)
      const delta: Partial<import('~/types/api').FeedPost> = {}
      if (ack.uniqueCounted) {
        delta.viewerCount = Math.max(current.viewerCount ?? 0, ack.viewerCount)
        delta.viewerHasViewed = true
      }
      if (ack.totalCounted) {
        delta.totalViewCount = Math.max(current.totalViewCount ?? current.viewerCount ?? 0, ack.totalViewCount)
      }
      if (Object.keys(delta).length > 0) postCache.patch(ack.id, delta)
    }
  }

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

  applyAcksFn = applyAcks

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
      /**
       * Nested app scrollers (home, check-ins, profile, …) must pass the middle
       * pane. Viewport-root misses rows that are clipped by `overflow-y-auto`.
       */
      root?: Element | null
    },
  ): () => void {
    if (!import.meta.client || !el) return () => {}
    if (opts?.canTrack === false) return () => {}
    const ids = (Array.isArray(postIds) ? postIds : [postIds]).filter(Boolean)
    if (ids.length === 0) return () => {}

    let dwellTimer: ReturnType<typeof setTimeout> | null = null
    // Nested overflow panes must be the observer root. If that node is not an
    // ancestor (layout ref not ready, teleported row), viewport-root still counts.
    const requestedRoot = opts?.root ?? null
    const root =
      requestedRoot instanceof Element && requestedRoot.contains(el)
        ? requestedRoot
        : null

    const observer = new IntersectionObserver(
      (entries) => {
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
              const pendingIds = ids.filter((id) => canReport(id))
              if (pendingIds.length === 0) return
              const added = enqueuePosts(pendingIds)

              // Mark locally viewed so the person icon lights up immediately.
              if (isAuthed.value) {
                for (const id of pendingIds) locallyViewedPostIds.add(id)
              }

              const groupMap = opts?.groupIdByPostId
              if (groupMap && isAuthed.value) {
                for (const id of added.length ? added : pendingIds) {
                  const gid = groupMap[id]
                  if (!gid) continue
                  optimisticDecrementGroupBadge(gid, id, setGroupsUnread, groupsUnread.value)
                }
              }
            }, VISIBILITY_DWELL_MS)
          }
        } else {
          if (dwellTimer) {
            clearTimeout(dwellTimer)
            dwellTimer = null
          }
        }
      },
      { threshold: OBSERVER_THRESHOLDS, root },
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
    if (!import.meta.client) return
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
   * Seed the local eye-icon set from feed payload. Does not skip network —
   * already-viewed posts still report once this page load so lastSeenAt moves.
   */
  function noteAlreadyViewed(postIds: string | string[]): void {
    const ids = (Array.isArray(postIds) ? postIds : [postIds]).filter(Boolean)
    if (!isAuthed.value) return
    for (const id of ids) locallyViewedPostIds.add(id)
  }

  return { observe, markEngaged, flush, hasViewedLocally, noteAlreadyViewed }
}
