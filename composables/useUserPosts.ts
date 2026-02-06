import type { ApiPagination, FeedPost } from '~/types/api'
import { useCursorFeed } from '~/composables/useCursorFeed'
import { usePostCountBumps } from '~/composables/usePostCountBumps'
import { useFeedFilters, type FeedVisibilityFilter } from '~/composables/useFeedFilters'

export type UserPostsFilter = FeedVisibilityFilter

type PostCounts = NonNullable<ApiPagination['counts']>

export type UserPostsDisplayItem =
  | { kind: 'post'; post: FeedPost }
  | { kind: 'ad'; key: string }

const EMPTY_COUNTS: PostCounts = {
  all: 0,
  public: 0,
  verifiedOnly: 0,
  premiumOnly: 0,
}

export function useUserPosts(
  usernameLower: Ref<string>,
  opts: {
    enabled?: Ref<boolean>
    defaultToNewestAndAll?: boolean
    /** When false, do not insert in-feed ad items. */
    showAds?: Ref<boolean>
    /** When set, use separate cookie keys (e.g. for permalink "more from author" so it doesn't share state with profile). */
    cookieKeyPrefix?: string
  } = {},
) {
  const { clearBumpsForPostIds } = usePostCountBumps()
  const enabled = opts.enabled ?? computed(() => true)
  const showAds = opts.showAds ?? computed(() => true)
  const prefix = opts.cookieKeyPrefix ?? 'moh.profile.posts'

  const { filter, sort, viewerIsVerified, viewerIsPremium, ctaKind } = useFeedFilters({ cookieKeyPrefix: prefix })

  if (opts.defaultToNewestAndAll) {
    filter.value = 'all'
    sort.value = 'new'
  }

  const postsKey = `user-posts-list:${prefix}:${usernameLower.value}`
  const counts = ref<PostCounts>(EMPTY_COUNTS)
  const hasLoadedOnce = ref(false)

  const feed = useCursorFeed<FeedPost>({
    stateKey: postsKey,
    buildRequest: (cursor) => ({
      path: `/posts/user/${encodeURIComponent(usernameLower.value)}`,
      query: { limit: 30, visibility: filter.value, sort: sort.value, ...(cursor ? { cursor } : {}) },
    }),
    defaultErrorMessage: 'Failed to load posts.',
    onDataLoaded: (data) => clearBumpsForPostIds(data.map((p) => p.id)),
    onResponse: (res) => {
      counts.value = res.pagination?.counts ?? counts.value
      hasLoadedOnce.value = true
    },
  })

  const posts = feed.items
  const { loading, error, refresh, loadMore } = feed

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

  const displayItems = computed<UserPostsDisplayItem[]>(() => {
    const out: UserPostsDisplayItem[] = []
    let rootPostCount = 0
    for (const p of displayPosts.value) {
      out.push({ kind: 'post', post: p })

      if (!showAds.value) continue

      const isRootPost = !String(p.parentId ?? '').trim()
      if (!isRootPost) continue

      rootPostCount += 1
      if (rootPostCount % 10 !== 0) continue

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

  async function fetch(nextFilter: UserPostsFilter, nextSort: 'new' | 'trending') {
    if (!enabled.value) {
      posts.value = []
      feed.nextCursor.value = null
      feed.error.value = null
      return
    }
    if (feed.loading.value) return
    feed.error.value = null

    if (nextFilter === 'verifiedOnly' && !viewerIsVerified.value) {
      posts.value = []
      return
    }
    if (nextFilter === 'premiumOnly' && !viewerIsPremium.value) {
      posts.value = []
      return
    }

    filter.value = nextFilter
    sort.value = nextSort
    await refresh()
  }

  async function setFilter(next: UserPostsFilter) {
    filter.value = next
    await fetch(next, sort.value)
  }

  async function setSort(next: 'new' | 'trending') {
    sort.value = next
    await fetch(filter.value, next)
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

  if (!enabled.value) {
    posts.value = []
    feed.nextCursor.value = null
    counts.value = EMPTY_COUNTS
    feed.error.value = null
  }

  watch(
    usernameLower,
    () => {
      filter.value = 'all'
      sort.value = 'new'
      void fetch('all', 'new')
    },
    { flush: 'post' }
  )

  watch(
    enabled,
    (on) => {
      if (!on) {
        posts.value = []
        feed.nextCursor.value = null
        feed.error.value = null
        return
      }
      if (!import.meta.client) return
      void fetch(filter.value, sort.value)
    },
    { flush: 'post', immediate: true }
  )

  onMounted(() => {
    if (import.meta.client && enabled.value && posts.value.length === 0) {
      void fetch(filter.value, sort.value)
    }
  })

  return {
    filter,
    sort,
    posts,
    displayPosts,
    displayItems,
    collapsedSiblingReplyCountFor,
    replyCountForParentId,
    counts,
    loading: feed.loading,
    error: feed.error,
    hasLoadedOnce,
    viewerIsVerified,
    viewerIsPremium,
    ctaKind,
    setFilter,
    setSort,
    removePost,
  }
}
