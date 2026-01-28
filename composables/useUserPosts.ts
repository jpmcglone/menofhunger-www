import type { FeedPost, GetUserPostsResponse } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

export type UserPostsFilter = 'all' | 'public' | 'verifiedOnly' | 'premiumOnly'

type PostCounts = NonNullable<GetUserPostsResponse['counts']>

const EMPTY_COUNTS: PostCounts = {
  all: 0,
  public: 0,
  verifiedOnly: 0,
  premiumOnly: 0,
}

export async function useUserPosts(usernameLower: Ref<string>, opts: { enabled?: Ref<boolean> } = {}) {
  const { apiFetchData } = useApiClient()
  const { user: authUser } = useAuth()
  const enabled = opts.enabled ?? computed(() => true)

  const filter = ref<UserPostsFilter>('all')
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

  async function fetch(nextFilter: UserPostsFilter) {
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
        { method: 'GET', query: { limit: 30, visibility: nextFilter } }
      )
      posts.value = res.posts
      counts.value = res.counts ?? counts.value
    } catch (e: unknown) {
      error.value = getApiErrorMessage(e) || 'Failed to load posts.'
    } finally {
      loading.value = false
    }
  }

  function setFilter(next: UserPostsFilter) {
    filter.value = next
    void fetch(next)
  }

  function removePost(id: string) {
    const pid = (id ?? '').trim()
    if (!pid) return
    posts.value = posts.value.filter((p) => p.id !== pid)
  }

  // Initial SSR-friendly load (All)
  if (enabled.value) {
    const { data: initial, error: initialErr } = await useAsyncData(
      () => `profile-posts:${usernameLower.value}`,
      async () => {
        return await apiFetchData<GetUserPostsResponse>(
          `/posts/user/${encodeURIComponent(usernameLower.value)}`,
          { method: 'GET', query: { limit: 30, visibility: 'all' } }
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
      void fetch('all')
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
      void fetch(filter.value)
    },
    { flush: 'post' }
  )

  return { filter, posts, counts, loading, error, viewerIsVerified, viewerIsPremium, ctaKind, setFilter, removePost }
}

