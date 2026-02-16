import type {
  FeedPost,
  FollowListUser,
  GetFollowRecommendationsData,
  GetTopicCategoriesData,
  GetFollowedTopicsData,
  GetNewestUsersData,
  GetPostsData,
  GetPresenceOnlineData,
  OnlineUser,
  TopicCategory,
  Topic,
} from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

export function useExploreRecommendations(options?: { enabled?: Ref<boolean>, isAuthed?: Ref<boolean> }) {
  const { apiFetch } = useApiClient()
  const { user: authUser } = useAuth()

  const enabled = options?.enabled ?? ref(true)
  const isAuthed = options?.isAuthed ?? ref(false)

  const featuredPosts = ref<FeedPost[]>([])
  const categories = ref<TopicCategory[]>([])
  const followedTopics = ref<Topic[]>([])
  const onlineUsers = ref<OnlineUser[]>([])

  const recommendedUsers = ref<FollowListUser[]>([])
  const newestUsers = ref<FollowListUser[]>([])
  const trendingPosts = ref<FeedPost[]>([])

  const loading = ref(false)
  const error = ref<string | null>(null)

  function removeUserById(userId: string) {
    const id = (userId ?? '').trim()
    if (!id) return
    recommendedUsers.value = recommendedUsers.value.filter((u) => u.id !== id)
    newestUsers.value = newestUsers.value.filter((u) => u.id !== id)
    trendingPosts.value = trendingPosts.value.filter((p) => p.author?.id !== id)
    onlineUsers.value = onlineUsers.value.filter((u) => u.id !== id)
  }

  async function refresh() {
    if (!enabled.value) return
    loading.value = true
    error.value = null

    try {
      const baseCalls = await Promise.allSettled([
        // Over-fetch so we can still show up to 3 after excluding the viewer's own posts.
        apiFetch<GetPostsData>('/posts', { method: 'GET', query: { limit: 6, sort: 'featured', visibility: 'all' } }),
        apiFetch<GetTopicCategoriesData>('/topics/categories', { method: 'GET', query: { limit: 20 } }),
        apiFetch<GetPresenceOnlineData>('/presence/online', { method: 'GET' }),
        ...(isAuthed.value ? [apiFetch<GetFollowedTopicsData>('/topics/followed', { method: 'GET', query: { limit: 50 } })] : []),
      ])

      const featuredRes = baseCalls[0].status === 'fulfilled' ? baseCalls[0].value : null
      const categoriesRes = baseCalls[1].status === 'fulfilled' ? baseCalls[1].value : null
      const onlineRes = baseCalls[2].status === 'fulfilled' ? baseCalls[2].value : null
      const followedTopicsRes =
        isAuthed.value && baseCalls[3] && baseCalls[3].status === 'fulfilled' ? baseCalls[3].value : null

      const viewerId = String(authUser.value?.id ?? '').trim()
      const featuredRaw = ((featuredRes?.data ?? []) as FeedPost[]) ?? []
      const featuredFiltered = viewerId ? featuredRaw.filter((p) => p.author?.id !== viewerId) : featuredRaw
      featuredPosts.value = featuredFiltered.slice(0, 3)
      categories.value = ((categoriesRes?.data ?? []) as TopicCategory[]) ?? []
      onlineUsers.value = ((onlineRes?.data ?? []) as OnlineUser[]) ?? []
      followedTopics.value = isAuthed.value ? (((followedTopicsRes?.data ?? []) as Topic[]) ?? []) : []

      if (isAuthed.value) {
        const recRes = await apiFetch<GetFollowRecommendationsData>('/follows/recommendations', {
          method: 'GET',
          query: { limit: 16 },
        })
        const rec = (recRes.data ?? []) as GetFollowRecommendationsData
        recommendedUsers.value = rec

        const authorIds = rec.map((u) => u.id).filter(Boolean).slice(0, 30)

        const [postsRes, newestRes] = await Promise.all([
          authorIds.length
            ? apiFetch<GetPostsData>('/posts', {
                method: 'GET',
                query: {
                  limit: 16,
                  sort: 'trending',
                  authorIds: authorIds.join(','),
                  visibility: 'all',
                },
              })
            : Promise.resolve(null),
          apiFetch<GetNewestUsersData>('/users/newest', {
            method: 'GET',
            query: { limit: 16 },
          }),
        ])

        trendingPosts.value = ((postsRes?.data ?? []) as FeedPost[]) ?? []
        newestUsers.value = (newestRes.data ?? []) as GetNewestUsersData
      } else {
        recommendedUsers.value = []
        newestUsers.value = []
        trendingPosts.value = []
      }
    } catch (e: unknown) {
      // Explore discovery should be soft-fail: show empty sections if calls fail (auth, etc).
      error.value = getApiErrorMessage(e) || 'Failed to load Explore recommendations.'
      featuredPosts.value = []
      categories.value = []
      onlineUsers.value = []
      followedTopics.value = []
      recommendedUsers.value = []
      newestUsers.value = []
      trendingPosts.value = []
    } finally {
      loading.value = false
    }
  }

  watch(
    enabled,
    (on) => {
      if (on) void refresh()
    },
    { immediate: true },
  )

  return {
    featuredPosts,
    categories,
    followedTopics,
    onlineUsers,
    recommendedUsers,
    newestUsers,
    trendingPosts,
    loading,
    error,
    refresh,
    removeUserById,
  }
}

