import type { Ref } from 'vue'
import type { FeedPost } from '~/types/api'

export function useProfilePinnedPost(options: {
  normalizedUsername: Ref<string>
  effectivePinnedPostId: Ref<string | null>
  profilePosts: Ref<FeedPost[]>
}) {
  const { effectivePinnedPostId, profilePosts } = options
  const { apiFetchData } = useApiClient()

  const pinnedPostKey = computed(() => `profile-pinned-post:${options.normalizedUsername.value}:${effectivePinnedPostId.value ?? ''}`)

  const {
    data: pinnedPostData,
    refresh: refreshPinnedPost,
  } = useLazyAsyncData(
    () => pinnedPostKey.value,
    async () => {
      const id = effectivePinnedPostId.value
      if (!id) return null
      try {
        return await apiFetchData<FeedPost>(
          `/posts/${encodeURIComponent(id)}`,
          { method: 'GET' }
        )
      } catch {
        return null
      }
    },
    { server: false, watch: [pinnedPostKey] }
  )

  const pinnedPost = computed(() => pinnedPostData.value ?? null)

  const pinnedPostForDisplay = computed(() => {
    const p = pinnedPost.value
    if (!p) return null
    if (!p.parent) return p
    const { parent: _parent, ...rest } = p
    return { ...rest } as FeedPost
  })

  const pinnedReplyToUsername = computed(() => {
    const p = pinnedPost.value
    const username = p?.parent?.author?.username
    return typeof username === 'string' && username.trim() ? username.trim() : null
  })

  // If the pinned post is already in the feed, show it immediately (no wait for refetch).
  watch(
    effectivePinnedPostId,
    (pid) => {
      if (!pid) {
        pinnedPostData.value = null
        return
      }
      const list = profilePosts.value ?? []
      const post = list.find((p) => p.id === pid)
      if (post) pinnedPostData.value = post
    },
    { immediate: true }
  )

  return {
    pinnedPost,
    pinnedPostForDisplay,
    pinnedReplyToUsername,
    pinnedPostData,
    refreshPinnedPost,
  }
}
