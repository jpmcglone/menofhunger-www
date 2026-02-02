import type { ApiPagination, FeedPost, GetUserPostsData } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { usePostCountBumps } from '~/composables/usePostCountBumps'

export type UserPostsFilter = 'all' | 'public' | 'verifiedOnly' | 'premiumOnly'

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
  const { user: authUser } = useAuth()
  const { clearBumpsForPostIds } = usePostCountBumps()
  const enabled = opts.enabled ?? computed(() => true)
  const prefix = opts.cookieKeyPrefix ?? 'moh.profile.posts'

  const filter = useCookie<UserPostsFilter>(`${prefix}.filter.v1`, {
    default: () => 'all',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  const sort = useCookie<'new' | 'trending'>(`${prefix}.sort.v1`, {
    default: () => 'new',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })

  // When visiting a profile, always default to Newest order and All visibility.
  if (opts.defaultToNewestAndAll) {
    filter.value = 'all'
    sort.value = 'new'
  }
  // Use shared state keyed by username so SSR/hydration and client navigation see the same list.
  const postsKey = `user-posts-list:${prefix}:${usernameLower.value}`
  const postsState = useState<FeedPost[]>(postsKey, () => [])
  // Local ref for display so template reactivity is reliable; kept in sync with postsState.
  const posts = ref<FeedPost[]>([...postsState.value])
  const counts = ref<PostCounts>(EMPTY_COUNTS)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const hasLoadedOnce = ref(false)

  // #region agent log
  const _log = (location: string, message: string, data: Record<string, unknown>, hypothesisId: string) => {
    if (typeof globalThis.fetch !== 'undefined') {
      globalThis.fetch('http://127.0.0.1:7242/ingest/49a04c9a-7793-45e2-935d-a6adda90157a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location, message, data: { ...data, username: usernameLower.value }, timestamp: Date.now(), sessionId: 'debug-profile-posts', hypothesisId }) }).catch(() => {})
    }
  }
  // #endregion

  const viewerIsVerified = computed(() => Boolean(authUser.value?.verifiedStatus && authUser.value.verifiedStatus !== 'none'))
  const viewerIsPremium = computed(() => Boolean(authUser.value?.premium))

  const ctaKind = computed<null | 'verify' | 'premium'>(() => {
    if (filter.value === 'verifiedOnly' && !viewerIsVerified.value) return 'verify'
    if (filter.value === 'premiumOnly' && !viewerIsPremium.value) return 'premium'
    return null
  })

  // Clamp cookies to allowed values (SSR-safe).
  watch(
    filter,
    (v) => {
      if (v === 'all' || v === 'public' || v === 'verifiedOnly' || v === 'premiumOnly') return
      filter.value = 'all'
    },
    { immediate: true },
  )
  watch(
    sort,
    (v) => {
      if (v === 'new' || v === 'trending') return
      sort.value = 'new'
    },
    { immediate: true },
  )

  async function fetch(nextFilter: UserPostsFilter, nextSort: 'new' | 'trending') {
    // #region agent log
    _log('useUserPosts.ts:fetch:entry', 'fetch() called', { nextFilter, nextSort, enabled: enabled.value, client: import.meta.client }, 'H1,H5')
    // #endregion
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
      // #region agent log
      _log('useUserPosts.ts:fetch:beforeApi', 'before apiFetch', { username: usernameLower.value }, 'H2')
      // #endregion
      const res = await apiFetch<GetUserPostsData>(
        `/posts/user/${encodeURIComponent(usernameLower.value)}`,
        { method: 'GET', query: { limit: 30, visibility: nextFilter, sort: nextSort } }
      )
      // #region agent log
      _log('useUserPosts.ts:fetch:afterApi', 'after apiFetch', { isArray: Array.isArray(res?.data), dataLen: Array.isArray(res?.data) ? res.data.length : -1, resKeys: res ? Object.keys(res) : [] }, 'H2')
      // #endregion
      const data = res.data ?? []
      posts.value = data
      postsState.value = data
      counts.value = res.pagination?.counts ?? counts.value
      clearBumpsForPostIds(data.map((p) => p.id))
      // #region agent log
      _log('useUserPosts.ts:fetch:afterAssign', 'after assign', { postsLength: posts.value.length, loading: loading.value, error: error.value, ctaKind: ctaKind.value, postsKey }, 'H3,H4')
      // #endregion
    } catch (e: unknown) {
      error.value = getApiErrorMessage(e) || 'Failed to load posts.'
      // #region agent log
      _log('useUserPosts.ts:fetch:catch', 'fetch error', { errMsg: getApiErrorMessage(e) || String(e) }, 'H2')
      // #endregion
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
      // #region agent log
      _log('useUserPosts.ts:enabledWatch', 'enabled watch', { on, client: import.meta.client }, 'H1,H5')
      // #endregion
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
    // #region agent log
    const willFetch = import.meta.client && enabled.value && posts.value.length === 0
    _log('useUserPosts.ts:onMounted', 'onMounted', { client: import.meta.client, enabled: enabled.value, postsLength: posts.value.length, willFetch }, 'H1,H5')
    // #endregion
    if (import.meta.client && enabled.value && posts.value.length === 0) {
      void fetch(filter.value, sort.value)
    }
  })

  return { filter, sort, posts, counts, loading, error, hasLoadedOnce, viewerIsVerified, viewerIsPremium, ctaKind, setFilter, setSort, removePost }
}

