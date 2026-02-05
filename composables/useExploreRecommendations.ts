import type { FeedPost, FollowListUser, GetFollowRecommendationsData, GetNewestUsersData, GetPostsData } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

export function useExploreRecommendations(options?: { enabled?: Ref<boolean> }) {
  const { apiFetch } = useApiClient()

  const enabled = options?.enabled ?? ref(true)

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
  }

  async function refresh() {
    if (!enabled.value) return
    loading.value = true
    error.value = null

    try {
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
    } catch (e: unknown) {
      // Explore discovery should be soft-fail: show empty sections if calls fail (auth, etc).
      error.value = getApiErrorMessage(e) || 'Failed to load Explore recommendations.'
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
    recommendedUsers,
    newestUsers,
    trendingPosts,
    loading,
    error,
    refresh,
    removeUserById,
  }
}

