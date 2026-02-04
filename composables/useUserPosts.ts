import type { ApiPagination, FeedPost } from '~/types/api'
import { useCursorFeed } from '~/composables/useCursorFeed'
import { usePostCountBumps } from '~/composables/usePostCountBumps'
import { useFeedFilters, type FeedVisibilityFilter } from '~/composables/useFeedFilters'

export type UserPostsFilter = FeedVisibilityFilter

type PostCounts = NonNullable<ApiPagination['counts']>

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
    /** When set, use separate cookie keys (e.g. for permalink "more from author" so it doesn't share state with profile). */
    cookieKeyPrefix?: string
  } = {},
) {
  const { clearBumpsForPostIds } = usePostCountBumps()
  const enabled = opts.enabled ?? computed(() => true)
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
    posts.value = posts.value.filter((p) => p.id !== pid)
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
