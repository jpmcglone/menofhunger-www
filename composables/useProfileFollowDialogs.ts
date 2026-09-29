import type { Ref } from 'vue'
import type { FollowListUser, GetFollowsListData } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

export function useProfileFollowDialogs(normalizedUsername: Ref<string>) {
  const { apiFetch } = useApiClient()
  const followState = useFollowState()

  const followersOpen = ref(false)
  const followers = ref<FollowListUser[]>([])
  const followersNextCursor = ref<string | null>(null)
  const followersLoading = ref(false)
  const followersError = ref<string | null>(null)

  const followingOpen = ref(false)
  const following = ref<FollowListUser[]>([])
  const followingNextCursor = ref<string | null>(null)
  const followingLoading = ref(false)
  const followingError = ref<string | null>(null)

  // Organizations only: members who represent the org ("Affiliates").
  const affiliatesOpen = ref(false)
  const affiliates = ref<FollowListUser[]>([])
  const affiliatesNextCursor = ref<string | null>(null)
  const affiliatesLoading = ref(false)
  const affiliatesError = ref<string | null>(null)

  async function loadFollowers(reset = false) {
    if (followersLoading.value) return
    followersLoading.value = true
    followersError.value = null
    try {
      const cursor = reset ? null : followersNextCursor.value
      const res = await apiFetch<GetFollowsListData>(
        `/follows/${encodeURIComponent(normalizedUsername.value)}/followers`,
        { method: 'GET', query: { limit: 30, ...(cursor ? { cursor } : {}) } }
      )
      const users = res.data ?? []
      followState.ingest(users)
      if (reset) followers.value = users
      else followers.value = [...followers.value, ...users]
      followersNextCursor.value = res.pagination?.nextCursor ?? null
    } catch (e: unknown) {
      followersError.value = getApiErrorMessage(e) || 'Failed to load followers.'
    } finally {
      followersLoading.value = false
    }
  }

  async function loadFollowing(reset = false) {
    if (followingLoading.value) return
    followingLoading.value = true
    followingError.value = null
    try {
      const cursor = reset ? null : followingNextCursor.value
      const res = await apiFetch<GetFollowsListData>(
        `/follows/${encodeURIComponent(normalizedUsername.value)}/following`,
        { method: 'GET', query: { limit: 30, ...(cursor ? { cursor } : {}) } }
      )
      const users = res.data ?? []
      followState.ingest(users)
      if (reset) following.value = users
      else following.value = [...following.value, ...users]
      followingNextCursor.value = res.pagination?.nextCursor ?? null
    } catch (e: unknown) {
      followingError.value = getApiErrorMessage(e) || 'Failed to load following.'
    } finally {
      followingLoading.value = false
    }
  }

  async function loadAffiliates(reset = false) {
    if (affiliatesLoading.value) return
    affiliatesLoading.value = true
    affiliatesError.value = null
    try {
      const cursor = reset ? null : affiliatesNextCursor.value
      const res = await apiFetch<GetFollowsListData>(
        `/users/${encodeURIComponent(normalizedUsername.value)}/affiliates`,
        { method: 'GET', query: { limit: 30, ...(cursor ? { cursor } : {}) } }
      )
      const users = res.data ?? []
      followState.ingest(users)
      if (reset) affiliates.value = users
      else affiliates.value = [...affiliates.value, ...users]
      affiliatesNextCursor.value = res.pagination?.nextCursor ?? null
    } catch (e: unknown) {
      affiliatesError.value = getApiErrorMessage(e) || 'Failed to load affiliates.'
    } finally {
      affiliatesLoading.value = false
    }
  }

  function openFollowers() {
    followersOpen.value = true
    if (followers.value.length === 0) void loadFollowers(true)
  }

  function openFollowing() {
    followingOpen.value = true
    if (following.value.length === 0) void loadFollowing(true)
  }

  function openAffiliates() {
    affiliatesOpen.value = true
    if (affiliates.value.length === 0) void loadAffiliates(true)
  }

  function loadMoreFollowers() {
    if (!followersNextCursor.value) return
    void loadFollowers(false)
  }

  function loadMoreFollowing() {
    if (!followingNextCursor.value) return
    void loadFollowing(false)
  }

  function loadMoreAffiliates() {
    if (!affiliatesNextCursor.value) return
    void loadAffiliates(false)
  }

  return {
    affiliatesOpen,
    affiliates,
    affiliatesNextCursor,
    affiliatesLoading,
    affiliatesError,
    openAffiliates,
    loadMoreAffiliates,
    followersOpen,
    followers,
    followersNextCursor,
    followersLoading,
    followersError,
    followingOpen,
    following,
    followingNextCursor,
    followingLoading,
    followingError,
    openFollowers,
    openFollowing,
    loadMoreFollowers,
    loadMoreFollowing,
  }
}
