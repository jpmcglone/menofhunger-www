import type { FeedPost, GetUserPostsResponse } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { usePostCountBumps } from '~/composables/usePostCountBumps'

export type UserPostsFilter = 'all' | 'public' | 'verifiedOnly' | 'premiumOnly'

type PostCounts = NonNullable<GetUserPostsResponse['counts']>

const EMPTY_COUNTS: PostCounts = {
  all: 0,
  public: 0,
  verifiedOnly: 0,
  premiumOnly: 0,
}

export async function useUserPosts(
  usernameLower: Ref<string>,
  opts: {
    enabled?: Ref<boolean>
    defaultToNewestAndAll?: boolean
    /** When set, use separate cookie keys (e.g. for permalink "more from author" so it doesn't share state with profile). */
    cookieKeyPrefix?: string
  } = {},
) {
  const { apiFetchData } = useApiClient()
  const { user: authUser } = useAuth()
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
  const posts = ref<FeedPost[]>([])
  const counts = ref<PostCounts>(EMPTY_COUNTS)
  const loading = ref(false)
  const error = ref<string | null>(null)

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
    if (!enabled.value) {
      posts.value = []
      error.value = null
      return
    }
    if (loading.value) return
    error.value = null

    if (nextFilter === 'verifiedOnly' && !viewerIsVerified.value) {
      posts.value = []
      return
    }
    if (nextFilter === 'premiumOnly' && !viewerIsPremium.value) {
      posts.value = []
      return
    }

    loading.value = true
    try {
      const res = await apiFetchData<GetUserPostsResponse>(
        `/posts/user/${encodeURIComponent(usernameLower.value)}`,
        { method: 'GET', query: { limit: 30, visibility: nextFilter, sort: nextSort } }
      )
      posts.value = res.posts
      counts.value = res.counts ?? counts.value
      clearBumpsForPostIds(res.posts.map((p) => p.id))
    } catch (e: unknown) {
      error.value = getApiErrorMessage(e) || 'Failed to load posts.'
    } finally {
      loading.value = false
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
  }

  // Initial SSR-friendly load (All)
  if (enabled.value) {
    const { data: initial, error: initialErr } = await useAsyncData(
      () => `user-posts:${prefix}:${usernameLower.value}`,
      async () => {
        return await apiFetchData<GetUserPostsResponse>(
          `/posts/user/${encodeURIComponent(usernameLower.value)}`,
          { method: 'GET', query: { limit: 30, visibility: filter.value, sort: sort.value } }
        )
      }
    )

    posts.value = initial.value?.posts ?? []
    counts.value = initial.value?.counts ?? EMPTY_COUNTS
    error.value = initialErr.value ? (getApiErrorMessage(initialErr.value) || 'Failed to load posts.') : null
  } else {
    posts.value = []
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
        error.value = null
        return
      }
      void fetch(filter.value, sort.value)
    },
    { flush: 'post' }
  )

  return { filter, sort, posts, counts, loading, error, viewerIsVerified, viewerIsPremium, ctaKind, setFilter, setSort, removePost }
}

