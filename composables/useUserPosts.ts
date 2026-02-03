import type { ApiPagination, FeedPost, GetUserPostsData } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
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
  const { apiFetch } = useApiClient()
  const { clearBumpsForPostIds } = usePostCountBumps()
  const enabled = opts.enabled ?? computed(() => true)
  const prefix = opts.cookieKeyPrefix ?? 'moh.profile.posts'

  const { filter, sort, viewerIsVerified, viewerIsPremium, ctaKind } = useFeedFilters({ cookieKeyPrefix: prefix })

  // When visiting a profile, always default to Newest order and All visibility.
  if (opts.defaultToNewestAndAll) {
    filter.value = 'all'
    sort.value = 'new'
  }
  // Use shared state keyed by username so SSR/hydration and client navigation see the same list.
  const postsKey = `user-posts-list:${prefix}:${usernameLower.value}`
  const postsState = useState<FeedPost[]>(postsKey, () => [])
  const posts = ref<FeedPost[]>([...postsState.value])
  const counts = ref<PostCounts>(EMPTY_COUNTS)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const hasLoadedOnce = ref(false)

  async function fetch(nextFilter: UserPostsFilter, nextSort: 'new' | 'trending') {
    if (!enabled.value) {
      posts.value = []
      postsState.value = []
      error.value = null
      return
    }
    if (loading.value) return
    error.value = null

    if (nextFilter === 'verifiedOnly' && !viewerIsVerified.value) {
      posts.value = []
      postsState.value = []
      return
    }
    if (nextFilter === 'premiumOnly' && !viewerIsPremium.value) {
      posts.value = []
      postsState.value = []
      return
    }

    loading.value = true
    try {
      const res = await apiFetch<GetUserPostsData>(
        `/posts/user/${encodeURIComponent(usernameLower.value)}`,
        { method: 'GET', query: { limit: 30, visibility: nextFilter, sort: nextSort } }
      )
      const data = res.data ?? []
      posts.value = data
      postsState.value = data
      counts.value = res.pagination?.counts ?? counts.value
      clearBumpsForPostIds(data.map((p) => p.id))
    } catch (e: unknown) {
      error.value = getApiErrorMessage(e) || 'Failed to load posts.'
    } finally {
      loading.value = false
      hasLoadedOnce.value = true
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
    posts.value = posts.value.filter((p) => p.id !== pid)
    postsState.value = posts.value
  }

  // Load posts after the page (client-only). Profile metadata is SSR-only and does not include posts.
  if (!enabled.value) {
    posts.value = []
    postsState.value = []
    counts.value = EMPTY_COUNTS
    error.value = null
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
        postsState.value = []
        error.value = null
        return
      }
      if (!import.meta.client) return
      void fetch(filter.value, sort.value)
    },
    { flush: 'post', immediate: true }
  )

  // Ensure we fetch on the client after mount; the enabled watch may only run during SSR (we return early there).
  onMounted(() => {
    if (import.meta.client && enabled.value && posts.value.length === 0) {
      void fetch(filter.value, sort.value)
    }
  })

  return { filter, sort, posts, counts, loading, error, hasLoadedOnce, viewerIsVerified, viewerIsPremium, ctaKind, setFilter, setSort, removePost }
}

