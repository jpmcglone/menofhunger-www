import type {
  FeedPost,
  FollowListUser,
  GetFollowRecommendationsData,
  GetNewestUsersData,
  GetPostsData,
  GetPresenceOnlineData,
  GetTopicsData,
  OnlineUser,
  Topic,
} from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

export function useExploreRecommendations(options?: { enabled?: Ref<boolean>, isAuthed?: Ref<boolean> }) {
  const { apiFetch } = useApiClient()

  const enabled = options?.enabled ?? ref(true)
  const isAuthed = options?.isAuthed ?? ref(false)

  const featuredPosts = ref<FeedPost[]>([])
  const topics = ref<Topic[]>([])
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
        apiFetch<GetPostsData>('/posts', { method: 'GET', query: { limit: 3, sort: 'featured', visibility: 'all' } }),
        apiFetch<GetTopicsData>('/topics', { method: 'GET', query: { limit: 50 } }),
        apiFetch<GetPresenceOnlineData>('/presence/online', { method: 'GET' }),
      ])

      const featuredRes = baseCalls[0].status === 'fulfilled' ? baseCalls[0].value : null
      const topicsRes = baseCalls[1].status === 'fulfilled' ? baseCalls[1].value : null
      const onlineRes = baseCalls[2].status === 'fulfilled' ? baseCalls[2].value : null

      featuredPosts.value = (((featuredRes?.data ?? []) as FeedPost[]) ?? []).slice(0, 3)
      topics.value = ((topicsRes?.data ?? []) as Topic[]) ?? []
      onlineUsers.value = ((onlineRes?.data ?? []) as OnlineUser[]) ?? []

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
      topics.value = []
      onlineUsers.value = []
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
    topics,
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

