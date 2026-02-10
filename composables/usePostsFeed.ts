import type { FeedPost, GetPostsData, CreatePostData, PostMediaKind, PostMediaSource, PostVisibility } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { useCursorFeed } from '~/composables/useCursorFeed'
import { useMiddleScroller } from '~/composables/useMiddleScroller'
import { usePostCountBumps } from '~/composables/usePostCountBumps'
import type { PostsCallback } from '~/composables/usePresence'

type FeedFilter = 'all' | 'public' | PostVisibility
type FeedSort = 'new' | 'trending'

export type PostsFeedDisplayItem =
  | { kind: 'post'; post: FeedPost }
  | { kind: 'ad'; key: string }

export function usePostsFeed(options: { visibility?: Ref<FeedFilter>; followingOnly?: Ref<boolean>; sort?: Ref<FeedSort>; showAds?: Ref<boolean> } = {}) {
  const { apiFetch, apiFetchData } = useApiClient()
  const middleScrollerEl = useMiddleScroller()
  const { clearBumpsForPostIds } = usePostCountBumps()
  const loadingIndicator = useLoadingIndicator()
  const { user: me } = useAuth()
  const { addPostsCallback, removePostsCallback } = usePresence()
  const boostState = useBoostState()

  const visibility = options.visibility ?? ref<FeedFilter>('all')
  const followingOnly = options.followingOnly ?? ref(false)
  const sort = options.sort ?? ref<FeedSort>('new')
  const showAds = options.showAds ?? computed(() => true)
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

  // Realtime: patch post interaction counts in-place for visible feeds.
  const postsCb: PostsCallback = {
    onInteraction: (payload) => {
      const postId = String(payload?.postId ?? '').trim()
      if (!postId) return
      const kind = payload?.kind
      const active = Boolean(payload?.active)
      const actorId = String(payload?.actorUserId ?? '').trim()
      const isMe = Boolean(actorId && actorId === me.value?.id)

      const patchOne = (p: FeedPost): FeedPost => {
        const next: FeedPost = { ...p }
        if (next.id === postId) {
          if (kind === 'boost' && typeof payload?.boostCount === 'number') {
            next.boostCount = Math.max(0, Math.floor(payload.boostCount))
            if (isMe) next.viewerHasBoosted = active
            if (isMe) boostState.set(postId, { viewerHasBoosted: active, boostCount: next.boostCount })
          }
          if (kind === 'bookmark' && typeof payload?.bookmarkCount === 'number') {
            next.bookmarkCount = Math.max(0, Math.floor(payload.bookmarkCount))
            if (isMe) next.viewerHasBookmarked = active
          }
        }
        if (next.parent) {
          next.parent = patchOne(next.parent)
        }
        return next
      }

      // Only update if we actually have the post in this feed.
      // Note: post might appear deep in a parent chain, so check recursively.
      const containsId = (p: FeedPost | undefined, id: string): boolean => {
        let cur: FeedPost | undefined = p
        while (cur) {
          if (cur.id === id) return true
          cur = cur.parent
        }
        return false
      }
      if (!posts.value.some((p) => containsId(p, postId))) return
      posts.value = posts.value.map(patchOne)
    },
  }
  if (import.meta.client) {
    onMounted(() => addPostsCallback(postsCb))
    onBeforeUnmount(() => removePostsCallback(postsCb))
  }

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

  const displayItems = computed<PostsFeedDisplayItem[]>(() => {
    const out: PostsFeedDisplayItem[] = []
    let rootPostCount = 0
    for (const p of displayPosts.value) {
      out.push({ kind: 'post', post: p })

      if (!showAds.value) continue

      // Only count root posts (no parent). Never count replies/comments.
      const isRootPost = !String(p.parentId ?? '').trim()
      if (!isRootPost) continue

      rootPostCount += 1
      if (rootPostCount % 10 !== 0) continue

      // Insert only *between* feed rows (never inside a thread).
      const rootId = rootIdFor(p)
      out.push({ kind: 'ad', key: `ad-after-${rootId || p.id}` })
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
    try {
      await feedRefresh()
      lastHardRefreshMs.value = Date.now()
    } finally {
      // Ensure the indicator always finishes (even on errors/throws).
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
    try {
      await feedLoadMore()
    } finally {
      // Ensure the indicator always finishes (even on errors/throws).
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
    displayItems,
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
