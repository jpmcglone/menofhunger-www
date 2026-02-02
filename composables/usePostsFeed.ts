import type { FeedPost, GetPostsData, CreatePostData, PostMediaKind, PostMediaSource, PostVisibility } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { useMiddleScroller } from '~/composables/useMiddleScroller'
import { usePostCountBumps } from '~/composables/usePostCountBumps'

type FeedFilter = 'all' | 'public' | PostVisibility
type FeedSort = 'new' | 'trending'

export function usePostsFeed(options: { visibility?: Ref<FeedFilter>; followingOnly?: Ref<boolean>; sort?: Ref<FeedSort> } = {}) {
  const { apiFetch, apiFetchData } = useApiClient()
  const middleScrollerEl = useMiddleScroller()
  const { clearBumpsForPostIds } = usePostCountBumps()
  const loadingIndicator = useLoadingIndicator()

  const posts = useState<FeedPost[]>('posts-feed', () => [])
  const nextCursor = useState<string | null>('posts-feed-next-cursor', () => null)
  const loading = useState<boolean>('posts-feed-loading', () => false)
  const error = useState<string | null>('posts-feed-error', () => null)
  const lastHardRefreshMs = useState<number>('posts-feed-last-hard-refresh-ms', () => 0)
  const visibility = options.visibility ?? ref<FeedFilter>('all')
  const followingOnly = options.followingOnly ?? ref(false)
  const sort = options.sort ?? ref<FeedSort>('new')

  // Refetch when visibility, sort, or scope (All/Following) change so the feed list updates.
  // Parent (e.g. useHomeFeed) may also call refresh(); refresh() no-ops when already loading.
  watch(
    [visibility, sort, followingOnly],
    () => {
      if (!import.meta.client) return
      void refresh()
    },
    { flush: 'post', immediate: false }
  )

  type RefreshOverrides = { visibility?: FeedFilter; sort?: FeedSort } | void

  async function refresh(overrides?: RefreshOverrides) {
    if (loading.value) return
    loading.value = true
    error.value = null
    loadingIndicator.start()
    const vis = overrides?.visibility ?? visibility.value
    const sortVal = overrides?.sort ?? sort.value
    try {
      const res = await apiFetch<GetPostsData>('/posts', {
        method: 'GET',
        query: {
          limit: 30,
          visibility: vis,
          ...(followingOnly.value ? { followingOnly: true } : {}),
          ...(sortVal === 'trending' ? { sort: 'trending' } : {}),
        }
      })
      const data = res.data ?? []
      posts.value = data.length ? [...data] : []
      nextCursor.value = res.pagination?.nextCursor ?? null
      lastHardRefreshMs.value = Date.now()
      clearBumpsForPostIds(data.map((p) => p.id))
    } catch (e: unknown) {
      error.value = getApiErrorMessage(e) || 'Failed to load posts.'
    } finally {
      loading.value = false
      loadingIndicator.finish()
    }
  }

  function pickAnchor(scroller: HTMLElement): { postId: string; offsetTop: number } | null {
    const items = Array.from(scroller.querySelectorAll<HTMLElement>('[data-post-id]'))
    if (!items.length) return null
    const scRect = scroller.getBoundingClientRect()
    // Choose the first element that intersects the viewport of the scroller.
    for (const el of items) {
      const r = el.getBoundingClientRect()
      if (r.bottom <= scRect.top + 1) continue
      if (r.top >= scRect.bottom - 1) continue
      const id = (el.dataset.postId ?? '').trim()
      if (!id) continue
      return { postId: id, offsetTop: r.top - scRect.top }
    }
    // Fallback to first row.
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

  async function softRefreshNewer(opts?: { scroller?: HTMLElement | null }) {
    if (!import.meta.client) return
    if (loading.value) return
    const scroller = opts?.scroller ?? middleScrollerEl.value
    if (!scroller) return

    const existing = posts.value
    const headId = existing[0]?.id ?? null
    if (!headId) return

    const anchor = pickAnchor(scroller)

    try {
      const res = await apiFetch<GetPostsData>('/posts', {
        method: 'GET',
        query: {
          limit: 30,
          visibility: visibility.value,
          ...(followingOnly.value ? { followingOnly: true } : {}),
          ...(sort.value === 'trending' ? { sort: 'trending' } : {}),
        },
      })
      const fresh = res.data ?? []
      if (!fresh.length) return

      const idx = fresh.findIndex((p: FeedPost) => p.id === headId)
      const candidates = idx >= 0 ? fresh.slice(0, idx) : fresh
      if (!candidates.length) return

      const seen = new Set(existing.map((p: FeedPost) => p.id))
      const newOnes = candidates.filter((p: FeedPost) => !seen.has(p.id))
      if (!newOnes.length) return

      posts.value = [...newOnes, ...existing]
      if (anchor) await restoreAnchor(scroller, anchor)
    } catch {
      // Soft refresh should be silent; avoid disrupting the feed.
    }
  }

  function startAutoSoftRefresh(opts?: { everyMs?: number }) {
    if (!import.meta.client) return
    const everyMs = Math.max(5_000, Math.floor(opts?.everyMs ?? 10_000))
    let timer: number | null = null
    const start = () => {
      if (timer != null) return
      timer = window.setInterval(() => {
        if (document.visibilityState !== 'visible') return
        // Only do this if we've had at least one hard refresh (initial load).
        if (!lastHardRefreshMs.value) return
        void softRefreshNewer()
      }, everyMs)
    }
    const stop = () => {
      if (timer == null) return
      window.clearInterval(timer)
      timer = null
    }
    start()
    onBeforeUnmount(() => stop())
  }

  async function loadMore() {
    if (loading.value) return
    if (!nextCursor.value) return
    loading.value = true
    error.value = null
    loadingIndicator.start()
    try {
      const res = await apiFetch<GetPostsData>('/posts', {
        method: 'GET',
        query: {
          limit: 30,
          cursor: nextCursor.value,
          visibility: visibility.value,
          ...(followingOnly.value ? { followingOnly: true } : {}),
          ...(sort.value === 'trending' ? { sort: 'trending' } : {}),
        }
      })
      const more = res.data ?? []
      posts.value = [...posts.value, ...more]
      nextCursor.value = res.pagination?.nextCursor ?? null
      clearBumpsForPostIds(more.map((p) => p.id))
    } catch (e: unknown) {
      error.value = getApiErrorMessage(e) || 'Failed to load more posts.'
    } finally {
      loading.value = false
      loadingIndicator.finish()
    }
  }

  async function addPost(
    body: string,
    visibility: PostVisibility,
    media?: Array<{
      source: PostMediaSource
      kind: PostMediaKind
      r2Key?: string
      url?: string
      mp4Url?: string | null
      width?: number | null
      height?: number | null
    }> | null,
  ): Promise<FeedPost | null> {
    const trimmed = (body ?? '').trim()
    const hasMedia = Boolean(media?.length)
    if (!trimmed && !hasMedia) return null

    try {
      const post = await apiFetchData<CreatePostData>('/posts', {
        method: 'POST',
        body: {
          body: trimmed || '',
          visibility,
          ...(media?.length ? { media } : {}),
        }
      })

      // Newest-first: prepend so the new post shows immediately. "Only me" posts never appear in any feeds.
      if (post.visibility !== 'onlyMe') {
        posts.value = [post, ...posts.value]
        await nextTick()
      }
      return post
    } catch (e: unknown) {
      error.value = getApiErrorMessage(e) || 'Failed to post.'
      throw e
    }
  }

  function removePost(id: string) {
    const pid = (id ?? '').trim()
    if (!pid) return
    posts.value = posts.value.filter((p) => p.id !== pid)
  }

  /**
   * Insert a reply into the feed under its parent. Replaces the parent with the reply
   * (reply has parent set, so FeedPostRow shows the chain).
   */
  function addReply(parentId: string, replyPost: FeedPost, parentPostFromFeed: FeedPost) {
    const pid = (parentId ?? '').trim()
    if (!pid) return
    const idx = posts.value.findIndex((p) => p.id === pid)
    if (idx < 0) return
    const replyWithParent: FeedPost = { ...replyPost, parent: parentPostFromFeed }
    posts.value = [...posts.value.slice(0, idx), replyWithParent, ...posts.value.slice(idx + 1)]
  }

  return { posts, nextCursor, loading, error, refresh, softRefreshNewer, startAutoSoftRefresh, loadMore, addPost, addReply, removePost }
}

