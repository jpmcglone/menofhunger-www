import type {
  Article,
  CommunityGroupShell,
  FeedPost,
  FollowListUser,
  GetExploreData,
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
  const trendingArticles = ref<Article[]>([])
  const exploreGroups = ref<CommunityGroupShell[]>([])
  const trendingHashtags = ref<Array<{ value: string; label: string; usageCount: number }>>([])
  const topUsers = ref<FollowListUser[]>([])

  const loading = ref(false)
  const hasLoadedOnce = ref(false)
  const error = ref<string | null>(null)

  function removeUserById(userId: string) {
    const id = (userId ?? '').trim()
    if (!id) return
    recommendedUsers.value = recommendedUsers.value.filter((u) => u.id !== id)
    newestUsers.value = newestUsers.value.filter((u) => u.id !== id)
    trendingPosts.value = trendingPosts.value.filter((p) => p.author?.id !== id)
    onlineUsers.value = onlineUsers.value.filter((u) => u.id !== id)
    topUsers.value = topUsers.value.filter((u) => u.id !== id)
  }

  async function refresh() {
    if (!enabled.value) return
    loading.value = true
    error.value = null

    try {
      // One aggregate call replaces 5–6 parallel individual calls.
      const [exploreRes, onlineRes] = await Promise.allSettled([
        apiFetch<GetExploreData>('/explore', { method: 'GET' }),
        apiFetch<GetPresenceOnlineData>('/presence/online', { method: 'GET' }),
      ])

      const explore = exploreRes.status === 'fulfilled' ? exploreRes.value?.data : null
      const online = onlineRes.status === 'fulfilled' ? onlineRes.value : null

      const viewerId = String(authUser.value?.id ?? '').trim()
      const featuredRaw = (explore?.featured ?? []) as FeedPost[]
      const featuredFiltered = viewerId ? featuredRaw.filter((p) => p.author?.id !== viewerId) : featuredRaw
      featuredPosts.value = featuredFiltered.slice(0, 3)
      categories.value = (explore?.categories ?? []) as TopicCategory[]
      trendingArticles.value = ((explore?.trendingArticles ?? []) as Article[]).slice(0, 4)
      // Groups: API returns `{ data: [], pagination: {...} }` envelope from listExploreSpotlight.
      const groupsPayload = explore?.groups as any
      exploreGroups.value = Array.isArray(groupsPayload?.data) ? groupsPayload.data : []
      trendingHashtags.value = explore?.trendingHashtags ?? []
      topUsers.value = (explore?.topUsers ?? []) as FollowListUser[]
      onlineUsers.value = ((online?.data ?? []) as OnlineUser[])
      followedTopics.value = isAuthed.value ? ((explore?.followedTopics ?? []) as Topic[]) : []
      recommendedUsers.value = isAuthed.value ? ((explore?.recommendations ?? []) as FollowListUser[]) : []
      newestUsers.value = isAuthed.value ? ((explore?.newestUsers ?? []) as FollowListUser[]) : []

      // Trending posts from recommended users: still fetched separately since it
      // requires the recommendation IDs first (sequential dependency).
      if (isAuthed.value && recommendedUsers.value.length > 0) {
        const authorIds = recommendedUsers.value.map((u) => u.id).filter(Boolean).slice(0, 30)
        try {
          const postsRes = await apiFetch<{ data: FeedPost[] }>('/posts', {
            method: 'GET',
            query: {
              limit: 16,
              sort: 'trending',
              authorIds: authorIds.join(','),
              visibility: 'all',
            },
          })
          trendingPosts.value = Array.isArray(postsRes?.data) ? (postsRes.data as FeedPost[]) : []
        } catch {
          trendingPosts.value = []
        }
      } else {
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
      trendingArticles.value = []
      exploreGroups.value = []
      trendingHashtags.value = []
      topUsers.value = []
    } finally {
      loading.value = false
      hasLoadedOnce.value = true
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
    trendingArticles,
    exploreGroups,
    trendingHashtags,
    topUsers,
    loading,
    hasLoadedOnce,
    error,
    refresh,
    removeUserById,
  }
}
