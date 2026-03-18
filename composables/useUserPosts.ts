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
    /** When true, only return top-level posts (no replies). */
    topLevelOnly?: boolean
    /** When provided, uses these refs for filter/sort instead of cookie-persisted state. */
    externalFilter?: Ref<UserPostsFilter>
    externalSort?: Ref<'new' | 'trending'>
    /** When true, include posts of all visibility tiers; restricted posts are returned with viewerCanAccess=false. */
    includeRestricted?: boolean
  } = {},
) {
  const { user: me, isVerified: authIsVerified, isPremium: authIsPremium } = useAuth()
  const { clearBumpsForPostIds } = usePostCountBumps()
  const enabled = opts.enabled ?? computed(() => true)
  const showAds = opts.showAds ?? computed(() => true)
  const prefix = opts.cookieKeyPrefix ?? 'moh.profile.posts'

  const internalFilters = opts.externalFilter ? null : useFeedFilters({ cookieKeyPrefix: prefix })
  const filter: Ref<UserPostsFilter> = opts.externalFilter ?? internalFilters!.filter
  const sort: Ref<'new' | 'trending'> = opts.externalSort ?? internalFilters!.sort
  const viewerIsVerified = internalFilters?.viewerIsVerified ?? authIsVerified
  const viewerIsPremium = internalFilters?.viewerIsPremium ?? authIsPremium
  const ctaKind = computed<null | 'verify' | 'premium'>(() => {
    if (filter.value === 'verifiedOnly' && !viewerIsVerified.value) return 'verify'
    if (filter.value === 'premiumOnly' && !viewerIsPremium.value) return 'premium'
    return null
  })

  if (!opts.externalFilter && opts.defaultToNewestAndAll) {
    filter.value = 'all'
    sort.value = 'new'
  }

  const postsKey = computed(() => `user-posts-list:${prefix}:${usernameLower.value}`)
  const counts = ref<PostCounts>(EMPTY_COUNTS)
  const hasLoadedOnce = ref(false)
  const lastFetchKey = ref<string>('')
  let fetchPromise: Promise<void> | null = null
  let inFlightFetchKey = ''

  function fetchKeyFor(nextFilter: UserPostsFilter, nextSort: 'new' | 'trending'): string {
    return [
      usernameLower.value,
      nextFilter,
      nextSort,
      opts.topLevelOnly ? '1' : '0',
      opts.includeRestricted ? '1' : '0',
    ].join('|')
  }

  const feedRef = shallowRef(useCursorFeed<FeedPost>({
    stateKey: postsKey.value,
    buildRequest: (cursor) => ({
      path: `/posts/user/${encodeURIComponent(usernameLower.value)}`,
      query: {
        limit: 30,
        collapseByRoot: true,
        collapseMode: 'root',
        prefer: 'root',
        visibility: filter.value,
        sort: sort.value,
        ...(opts.topLevelOnly ? { topLevelOnly: true } : {}),
        ...(opts.includeRestricted ? { includeRestricted: true } : {}),
        ...(cursor ? { cursor } : {}),
      },
    }),
    defaultErrorMessage: 'Failed to load posts.',
    onDataLoaded: (data) => clearBumpsForPostIds(data.map((p) => p.id)),
    onResponse: (res) => {
      counts.value = res.pagination?.counts ?? counts.value
      hasLoadedOnce.value = true
    },
  }))

  const posts = computed<FeedPost[]>({
    get: () => feedRef.value.items.value,
    set: (v) => {
      feedRef.value.items.value = v
    },
  })
  const nextCursor = computed<string | null>({
    get: () => feedRef.value.nextCursor.value,
    set: (v) => {
      feedRef.value.nextCursor.value = v
    },
  })
  const loading = computed(() => feedRef.value.loading.value)
  const loadingMore = computed(() => feedRef.value.loadingMore.value)
  const error = computed<string | null>({
    get: () => feedRef.value.error.value,
    set: (v) => {
      feedRef.value.error.value = v
    },
  })

  async function refresh() {
    return await feedRef.value.refresh()
  }

  async function loadMore() {
    if (!enabled.value) return
    if (loading.value || loadingMore.value) return
    const key = fetchKeyFor(filter.value, sort.value)
    // Pagination is only valid for the currently loaded filter/sort dataset.
    if (!lastFetchKey.value || lastFetchKey.value !== key) {
      await fetch(filter.value, sort.value)
      return
    }
    return await feedRef.value.loadMore()
  }

  const displayPosts = computed(() => posts.value)

  function collapsedSiblingReplyCountFor(post: FeedPost): number {
    return Math.max(0, post.commentCount ?? 0)
  }

  const displayItems = computed<UserPostsDisplayItem[]>(() => {
    const out: UserPostsDisplayItem[] = []
    let rootPostCount = 0
    for (const p of posts.value) {
      out.push({ kind: 'post', post: p })

      if (!showAds.value) continue

      const isRootPost = !String(p.parentId ?? '').trim()
      if (!isRootPost) continue

      rootPostCount += 1
      if (rootPostCount % 10 !== 0) continue

      out.push({ kind: 'ad', key: `ad-after-${p.id}` })
    }
    return out
  })

  async function fetch(nextFilter: UserPostsFilter, nextSort: 'new' | 'trending') {
    const fetchKey = fetchKeyFor(nextFilter, nextSort)
    if (fetchPromise && inFlightFetchKey === fetchKey) {
      return await fetchPromise
    }
    if (!enabled.value) {
      posts.value = []
      nextCursor.value = null
      error.value = null
      lastFetchKey.value = ''
      return
    }
    if (!loading.value && hasLoadedOnce.value && posts.value.length > 0 && lastFetchKey.value === fetchKey) {
      return
    }
    error.value = null

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
    inFlightFetchKey = fetchKey
    const task = (async () => {
      await refresh()
      lastFetchKey.value = fetchKey
    })()
    fetchPromise = task
    try {
      await task
    } finally {
      if (fetchPromise === task) fetchPromise = null
      if (inFlightFetchKey === fetchKey) inFlightFetchKey = ''
    }
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

    const myId = me.value?.id ?? null
    const isMyPost = (() => {
      if (!myId) return true
      const find = (p: FeedPost | undefined): FeedPost | null => {
        let cur: FeedPost | undefined = p
        while (cur) {
          if (cur.id === pid) return cur
          cur = cur.parent
        }
        return null
      }
      for (const p of posts.value) {
        const hit = find(p)
        if (hit) return hit.author?.id === myId
      }
      return true
    })()

    if (isMyPost) {
      const containsId = (p: FeedPost | undefined, targetId: string): boolean => {
        let cur: FeedPost | undefined = p
        while (cur) {
          if (cur.id === targetId) return true
          cur = cur.parent
        }
        return false
      }
      posts.value = posts.value.filter((p) => !containsId(p, pid))
      return
    }

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

  function replacePost(updated: FeedPost) {
    const pid = (updated?.id ?? '').trim()
    if (!pid) return

    const replaceInChain = (node: FeedPost): FeedPost => {
      const nextParent = node.parent ? replaceInChain(node.parent) : undefined
      const base = nextParent !== node.parent ? { ...node, parent: nextParent } : node
      if (base.id === pid) return { ...updated }
      return base
    }
    posts.value = posts.value.map(replaceInChain)
  }

  if (!enabled.value) {
    posts.value = []
    nextCursor.value = null
    counts.value = EMPTY_COUNTS
    error.value = null
    lastFetchKey.value = ''
  }

  watch(
    usernameLower,
    () => {
      // IMPORTANT: ensure state keys follow username changes (route reuse /u/a -> /u/b).
      feedRef.value = useCursorFeed<FeedPost>({
        stateKey: postsKey.value,
        buildRequest: (cursor) => ({
          path: `/posts/user/${encodeURIComponent(usernameLower.value)}`,
          query: {
            limit: 30,
            collapseByRoot: true,
            collapseMode: 'root',
            prefer: 'root',
            visibility: filter.value,
            sort: sort.value,
            ...(opts.topLevelOnly ? { topLevelOnly: true } : {}),
            ...(opts.includeRestricted ? { includeRestricted: true } : {}),
            ...(cursor ? { cursor } : {}),
          },
        }),
        defaultErrorMessage: 'Failed to load posts.',
        onDataLoaded: (data) => clearBumpsForPostIds(data.map((p) => p.id)),
        onResponse: (res) => {
          counts.value = res.pagination?.counts ?? counts.value
          hasLoadedOnce.value = true
        },
      })
      lastFetchKey.value = ''
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
        nextCursor.value = null
        error.value = null
        lastFetchKey.value = ''
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

  // Auto-reload when external filter/sort change
  if (opts.externalFilter) {
    watch(opts.externalFilter, (next) => {
      if (!enabled.value) return
      void fetch(next, sort.value)
    }, { flush: 'post' })
  }
  if (opts.externalSort) {
    watch(opts.externalSort, (next) => {
      if (!enabled.value) return
      void fetch(filter.value, next)
    }, { flush: 'post' })
  }

  return {
    filter,
    sort,
    posts,
    displayPosts,
    displayItems,
    collapsedSiblingReplyCountFor,
    counts,
    loading,
    loadingMore,
    error,
    hasLoadedOnce,
    nextCursor,
    loadMore,
    viewerIsVerified,
    viewerIsPremium,
    ctaKind,
    setFilter,
    setSort,
    removePost,
    replacePost,
  }
}
