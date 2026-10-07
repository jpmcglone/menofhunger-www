import type { Ref } from 'vue'
import type { FeedPost, GetPostsData } from '~/types/api'
import type { CursorFeed } from '~/composables/useCursorFeed'
import type { LocalFeedInsert } from '~/composables/posts-feed/local-inserts'
import { normalizeAuthorIds, postsFeedListQuery, type FeedFilter, type FeedSort } from '~/composables/posts-feed/query'
import type { UsePostsFeedOptions } from '~/composables/usePostsFeed'

/**
 * Fetch side of a posts feed: deduped hard refresh keyed by the request signature, silent
 * "newer posts" soft refresh with scroll anchoring, and loadMore that refreshes instead when
 * the filter signature changed since the loaded page.
 */
export function usePostsFeedFetch(ctx: {
  options: UsePostsFeedOptions
  feed: CursorFeed<FeedPost>
  visibility: Ref<FeedFilter>
  followingOnly: Ref<boolean>
  sort: Ref<FeedSort>
  forYou: Ref<boolean>
  mediaOnly: Ref<boolean>
  pageLimit: Readonly<Ref<number>>
  localInserts: Ref<LocalFeedInsert[]>
  lastHardRefreshMs: Ref<number>
  lastHardRefreshRequestKey: Ref<string>
  middleScrollerEl: Readonly<Ref<HTMLElement | null>>
}) {
  const {
    options,
    visibility,
    followingOnly,
    sort,
    forYou,
    mediaOnly,
    pageLimit,
    localInserts,
    lastHardRefreshMs,
    lastHardRefreshRequestKey,
    middleScrollerEl,
  } = ctx
  const { items: posts, nextCursor, loading, loadingMore, refresh: feedRefresh, loadMore: feedLoadMore } = ctx.feed
  const { apiFetch } = useApiClient()
  const loadingIndicator = useLoadingIndicator()
  const { flush: flushViews } = usePostViewTracker()
  // Read by the feed's buildRequest so only the cursor-less page of a For You pull sends refresh=true.
  let pendingForYouRefresh = false

  function currentRequestKey(): string {
    const gid = (options.communityGroupId?.value ?? '').trim()
    return JSON.stringify({
      visibility: visibility.value,
      followingOnly: Boolean(followingOnly.value),
      sort: sort.value,
      forYou: Boolean(forYou.value),
      groupsHub: Boolean(options.groupsHub?.value),
      communityGroupId: gid || null,
      authorIds: normalizeAuthorIds(options.authorIds?.value ?? null) ?? null,
      mediaOnly: Boolean(mediaOnly.value),
      limit: pageLimit.value,
      topLevelOnly: Boolean(options.topLevelOnly?.value),
    })
  }

  // Tracks which query signature produced the currently loaded dataset.
  // loadMore only runs when the active filter/sort/scope still matches this key.
  let loadedRequestKey = currentRequestKey()

  let prevVisibility: FeedFilter = visibility.value
  let prevSort: FeedSort = sort.value
  let prevFollowing: boolean = followingOnly.value
  let prevForYou: boolean = forYou.value
  let prevMediaOnly: boolean = mediaOnly.value
  let prevTopLevelOnly: boolean = Boolean(options.topLevelOnly?.value)
  let hardRefreshPromise: Promise<void> | null = null
  let hardRefreshPromiseKey = ''

  async function refresh(opts?: { forYouRefresh?: boolean }) {
    const wantForYouRefresh = Boolean(forYou.value && opts?.forYouRefresh !== false)
    const requestKey = currentRequestKey()
    if (hardRefreshPromise && hardRefreshPromiseKey === requestKey) return await hardRefreshPromise
    if (
      posts.value.length > 0 &&
      lastHardRefreshRequestKey.value === requestKey &&
      Date.now() - lastHardRefreshMs.value < 1_000
    ) {
      return
    }
    if (hardRefreshPromise) await hardRefreshPromise

    const paramsChanged =
      visibility.value !== prevVisibility ||
      sort.value !== prevSort ||
      followingOnly.value !== prevFollowing ||
      forYou.value !== prevForYou ||
      mediaOnly.value !== prevMediaOnly ||
      Boolean(options.topLevelOnly?.value) !== prevTopLevelOnly
    prevVisibility = visibility.value
    prevSort = sort.value
    prevFollowing = followingOnly.value
    prevForYou = forYou.value
    prevMediaOnly = mediaOnly.value
    prevTopLevelOnly = Boolean(options.topLevelOnly?.value)
    if (paramsChanged) localInserts.value = []
    loadingIndicator.start()
    hardRefreshPromiseKey = requestKey
    hardRefreshPromise = (async () => {
      // Flush pending view reports so the server has up-to-date PostView records before
      // re-ranking. Without this the seen-decay score multiplier applies to the next request
      // only after the 4-second batch timer fires, causing the same posts to appear on
      // consecutive refreshes. Non-blocking: a flush failure must not prevent the fetch.
      if (forYou.value && import.meta.client) {
        try { await flushViews() } catch { /* non-blocking */ }
      }
      pendingForYouRefresh = wantForYouRefresh
      try {
        await feedRefresh()
      } finally {
        pendingForYouRefresh = false
      }
      loadedRequestKey = requestKey
      lastHardRefreshRequestKey.value = loadedRequestKey
      lastHardRefreshMs.value = Date.now()
    })()
    try {
      await hardRefreshPromise
    } finally {
      hardRefreshPromise = null
      hardRefreshPromiseKey = ''
      queueMicrotask(() => loadingIndicator.finish())
    }
  }

  function pickAnchor(scroller: HTMLElement): { postId: string; offsetTop: number } | null {
    const items = Array.from(scroller.querySelectorAll<HTMLElement>('[data-post-id]'))
    if (!items.length) return null
    const scRect = scroller.getBoundingClientRect()
    for (const el of items) {
      const r = el.getBoundingClientRect()
      if (r.bottom <= scRect.top + 1) continue
      if (r.top >= scRect.bottom - 1) continue
      const id = (el.dataset.postId ?? '').trim()
      if (!id) continue
      return { postId: id, offsetTop: r.top - scRect.top }
    }
    const first = items[0]
    if (!first) return null
    const id = (first?.dataset.postId ?? '').trim()
    if (!id) return null
    const r = first.getBoundingClientRect()
    return { postId: id, offsetTop: r.top - scRect.top }
  }

  async function restoreAnchor(scroller: HTMLElement, anchor: { postId: string; offsetTop: number }) {
    await nextTick()
    const el = scroller.querySelector<HTMLElement>(`[data-post-id="${CSS.escape(anchor.postId)}"]`)
    if (!el) return
    const scRect = scroller.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    const nextOffsetTop = r.top - scRect.top
    const delta = nextOffsetTop - anchor.offsetTop
    if (!Number.isFinite(delta) || Math.abs(delta) < 0.5) return
    scroller.scrollTop += delta
  }

  let softRefreshPromise: Promise<void> | null = null
  async function softRefreshNewer(opts?: {
    scroller?: HTMLElement | null
    /**
     * Called after new posts are prepended with the count of added items.
     * When provided, replaces the default DOM-based scroll-anchor logic
     * (suitable for virtualizer-backed feeds that compute their own offset).
     */
    onPrepend?: (addedCount: number) => void
  }) {
    if (!import.meta.client) return
    if (softRefreshPromise) return await softRefreshPromise
    if (loading.value || loadingMore.value) return
    if (Date.now() - lastHardRefreshMs.value < 1_500) return
    const scroller = opts?.scroller ?? middleScrollerEl.value
    if (!scroller) return

    softRefreshPromise = (async () => {
      const existing = posts.value
      const headId = existing[0]?.id ?? null
      if (!headId) return

      const anchor = opts?.onPrepend ? null : pickAnchor(scroller)

      try {
        const res = await apiFetch<GetPostsData>('/posts', {
          method: 'GET',
          query: postsFeedListQuery({
            visibility: visibility.value,
            followingOnly: followingOnly.value,
            sort: sort.value,
            forYou: forYou.value,
            cursor: null,
            groupsHub: options.groupsHub?.value,
            communityGroupId: options.communityGroupId?.value ?? null,
            authorIds: options.authorIds?.value ?? null,
            mediaOnly: mediaOnly.value,
            limit: pageLimit.value,
            topLevelOnly: options.topLevelOnly?.value,
            authorLocationState: options.authorLocationState?.value ?? null,
          }),
        })
        const fresh = (res.data ?? []).filter((p: FeedPost) => !p.deletedAt)
        if (!fresh.length) return

        const idx = fresh.findIndex((p: FeedPost) => p.id === headId)
        const candidates = idx >= 0 ? fresh.slice(0, idx) : fresh
        if (!candidates.length) return

        const seen = new Set(existing.map((p: FeedPost) => p.id))
        const newOnes = candidates.filter((p: FeedPost) => !seen.has(p.id))
        if (!newOnes.length) return

        const existingLive = existing.filter((p: FeedPost) => !p.deletedAt)
        posts.value = [...newOnes, ...existingLive]
        if (opts?.onPrepend) {
          opts.onPrepend(newOnes.length)
        } else if (anchor) {
          await restoreAnchor(scroller, anchor)
        }
      } catch {
        // Soft refresh should be silent; avoid disrupting the feed.
      }
    })()

    try {
      await softRefreshPromise
    } finally {
      softRefreshPromise = null
    }
  }

  function startAutoSoftRefresh(opts?: { everyMs?: number }): (() => void) | undefined {
    if (!import.meta.client) return
    const everyMs = Math.max(5_000, Math.floor(opts?.everyMs ?? 10_000))
    let timer: number | null = null
    const start = () => {
      if (timer != null) return
      timer = window.setInterval(() => {
        if (document.visibilityState !== 'visible') return
        if (!lastHardRefreshMs.value) return
        if (Date.now() - lastHardRefreshMs.value < everyMs) return
        void softRefreshNewer()
      }, everyMs)
    }
    const stop = () => {
      if (timer == null) return
      window.clearInterval(timer)
      timer = null
    }
    start()
    return stop
  }

  async function loadMore() {
    if (loading.value || loadingMore.value) return
    if (!nextCursor.value) return
    // If feed params changed, this is not a true "load more" request.
    // Refresh first so we replace the dataset under the new filter signature.
    if (currentRequestKey() !== loadedRequestKey) {
      await refresh()
      return
    }
    loadingIndicator.start()
    try {
      await feedLoadMore()
    } finally {
      // Ensure the indicator always finishes (even on errors/throws).
      loadingIndicator.finish()
    }
  }

  return {
    currentRequestKey,
    isForYouRefreshPending: () => pendingForYouRefresh,
    refresh,
    softRefreshNewer,
    startAutoSoftRefresh,
    loadMore,
  }
}
