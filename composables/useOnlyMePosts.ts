import type { FeedPost, GetPostsResponse } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { usePostCountBumps } from '~/composables/usePostCountBumps'

export function useOnlyMePosts() {
  const { apiFetchData } = useApiClient()
  const { clearBumpsForPostIds } = usePostCountBumps()

  const posts = useState<FeedPost[]>('posts-only-me', () => [])
  const nextCursor = useState<string | null>('posts-only-me-next-cursor', () => null)
  const loading = useState<boolean>('posts-only-me-loading', () => false)
  const error = useState<string | null>('posts-only-me-error', () => null)

  async function refresh() {
    if (loading.value) return
    loading.value = true
    error.value = null
    try {
      const res = await apiFetchData<GetPostsResponse>('/posts/me/only-me', {
        method: 'GET',
        query: { limit: 30 },
      })
      posts.value = res.posts
      nextCursor.value = res.nextCursor
    } catch (e: unknown) {
      error.value = getApiErrorMessage(e) || 'Failed to load posts.'
    } finally {
      loading.value = false
    }
  }

  async function loadMore() {
    if (loading.value) return
    if (!nextCursor.value) return
    loading.value = true
    error.value = null
    try {
      const res = await apiFetchData<GetPostsResponse>('/posts/me/only-me', {
        method: 'GET',
        query: { limit: 30, cursor: nextCursor.value },
      })
      posts.value = [...posts.value, ...res.posts]
      nextCursor.value = res.nextCursor
      clearBumpsForPostIds(res.posts.map((p) => p.id))
    } catch (e: unknown) {
      error.value = getApiErrorMessage(e) || 'Failed to load more posts.'
    } finally {
      loading.value = false
    }
  }

  function removePost(id: string) {
    const pid = (id ?? '').trim()
    if (!pid) return
    posts.value = posts.value.filter((p) => p.id !== pid)
  }

  return { posts, nextCursor, loading, error, refresh, loadMore, removePost }
}

