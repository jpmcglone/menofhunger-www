import type { FeedPost, GetPostsData, CreatePostData, PostMediaKind, PostMediaSource, PostVisibility } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { useCursorFeed } from '~/composables/useCursorFeed'
import { useMiddleScroller } from '~/composables/useMiddleScroller'
import { usePostCountBumps } from '~/composables/usePostCountBumps'

type FeedFilter = 'all' | 'public' | PostVisibility
type FeedSort = 'new' | 'trending'

export function usePostsFeed(options: { visibility?: Ref<FeedFilter>; followingOnly?: Ref<boolean>; sort?: Ref<FeedSort> } = {}) {
  const { apiFetch, apiFetchData } = useApiClient()
  const middleScrollerEl = useMiddleScroller()
  const { clearBumpsForPostIds } = usePostCountBumps()
  const loadingIndicator = useLoadingIndicator()

  const visibility = options.visibility ?? ref<FeedFilter>('all')
  const followingOnly = options.followingOnly ?? ref(false)
  const sort = options.sort ?? ref<FeedSort>('new')
  const lastHardRefreshMs = useState<number>('posts-feed-last-hard-refresh-ms', () => 0)

  const feed = useCursorFeed<FeedPost>({
    stateKey: 'posts-feed',
    buildRequest: (cursor) => ({
      path: '/posts',
      query: {
        limit: 30,
        visibility: visibility.value,
        ...(followingOnly.value ? { followingOnly: true } : {}),
        ...(sort.value === 'trending' ? { sort: 'trending' } : {}),
        ...(cursor ? { cursor } : {}),
      },
    }),
    defaultErrorMessage: 'Failed to load posts.',
    loadMoreErrorMessage: 'Failed to load more posts.',
    onDataLoaded: (data) => clearBumpsForPostIds(data.map((p) => p.id)),
  })

  const posts = feed.items
  const { nextCursor, loading, error, refresh: feedRefresh, loadMore: feedLoadMore } = feed

  function rootIdFor(p: FeedPost): string {
    let cur: FeedPost | undefined = p
    while (cur?.parent) cur = cur.parent
    return (cur?.id ?? p.id ?? '').trim()
  }

  const replyCountByRootId = computed(() => {
    const totals = new Map<string, number>()
    for (const p of posts.value) {
      // Count reply items (not root posts) by thread root.
      const isReply = Boolean((p.parentId ?? '').trim())
      if (!isReply) continue
      const rootId = rootIdFor(p)
      if (!rootId) continue
      totals.set(rootId, (totals.get(rootId) ?? 0) + 1)
    }
    return totals
  })

  const replyCountByParentId = computed(() => {
    const totals = new Map<string, number>()
    for (const p of posts.value) {
      const pid = (p.parentId ?? '').trim()
      if (!pid) continue
      totals.set(pid, (totals.get(pid) ?? 0) + 1)
    }
    return totals
  })

  function replyCountForParentId(parentId: string): number {
    const pid = (parentId ?? '').trim()
    if (!pid) return 0
    return replyCountByParentId.value.get(pid) ?? 0
  }

  const displayPosts = computed(() => {
    const seenRootIds = new Set<string>()
    const out: FeedPost[] = []
    for (const p of posts.value) {
      const rootId = rootIdFor(p)
      if (!rootId) continue
      if (seenRootIds.has(rootId)) continue
      seenRootIds.add(rootId)
      out.push(p)
    }
    return out
  })

  function collapsedSiblingReplyCountFor(post: FeedPost): number {
    const rootId = rootIdFor(post)
    if (!rootId) return 0
    const totalReplies = replyCountByRootId.value.get(rootId) ?? 0
    const visibleReplyCount = Boolean((post.parentId ?? '').trim()) ? 1 : 0
    return Math.max(0, totalReplies - visibleReplyCount)
  }

  type RefreshOverrides = { visibility?: FeedFilter; sort?: FeedSort } | void

  async function refresh(overrides?: RefreshOverrides) {
    if (loading.value) return
    if (overrides?.visibility !== undefined) visibility.value = overrides.visibility
    if (overrides?.sort !== undefined) sort.value = overrides.sort
    loadingIndicator.start()
    await feedRefresh()
    lastHardRefreshMs.value = Date.now()
    queueMicrotask(() => loadingIndicator.finish())
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
    onBeforeUnmount(() => stop())
  }

  async function loadMore() {
    if (loading.value) return
    if (!nextCursor.value) return
    loadingIndicator.start()
    await feedLoadMore()
    loadingIndicator.finish()
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

      if (post.visibility !== 'onlyMe') {
        posts.value = [post, ...posts.value]
        await nextTick()
      }
      return post
    } catch (e: unknown) {
      feed.error.value = getApiErrorMessage(e) || 'Failed to post.'
      throw e
    }
  }

  function removePost(id: string) {
    const pid = (id ?? '').trim()
    if (!pid) return
    const tombstone = (p: FeedPost): FeedPost => ({
      ...p,
      deletedAt: new Date().toISOString(),
      body: '',
      media: [],
      mentions: [],
    })
    const chainHasId = (p: FeedPost | undefined, targetId: string): boolean => {
      let cur = p?.parent
      while (cur) {
        if (cur.id === targetId) return true
        cur = cur.parent
      }
      return false
    }
    const hasChildInSection = posts.value.some((p) => chainHasId(p, pid))

    posts.value = posts.value
      .map((p) => {
        const updateChain = (node: FeedPost): FeedPost => {
          const updatedParent = node.parent ? updateChain(node.parent) : undefined
          let next = updatedParent !== node.parent ? { ...node, parent: updatedParent } : node
          if (node.id === pid) next = tombstone(next)
          return next
        }
        const next = updateChain(p)
        if (next.id === pid && !hasChildInSection) return null
        return next
      })
      .filter((p): p is FeedPost => Boolean(p))
  }

  function addReply(parentId: string, replyPost: FeedPost, parentPostFromFeed: FeedPost) {
    const pid = (parentId ?? '').trim()
    if (!pid) return
    const idx = posts.value.findIndex((p) => p.id === pid)
    if (idx < 0) return
    const replyWithParent: FeedPost = { ...replyPost, parent: parentPostFromFeed }
    posts.value = [...posts.value.slice(0, idx), replyWithParent, ...posts.value.slice(idx + 1)]
  }

  return {
    posts,
    displayPosts,
    collapsedSiblingReplyCountFor,
    replyCountForParentId,
    nextCursor,
    loading,
    error,
    refresh,
    softRefreshNewer,
    startAutoSoftRefresh,
    loadMore,
    addPost,
    addReply,
    removePost,
  }
}
