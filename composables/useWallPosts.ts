import type { CreatePostResponse, FeedPost, GetPostsResponse, PostVisibility } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

export function useWallPosts() {
  const { apiFetchData } = useApiClient()

  const posts = useState<FeedPost[]>('wall-posts', () => [])
  const nextCursor = useState<string | null>('wall-posts-next-cursor', () => null)
  const loading = useState<boolean>('wall-posts-loading', () => false)
  const error = useState<string | null>('wall-posts-error', () => null)

  async function refresh() {
    if (loading.value) return
    loading.value = true
    error.value = null
    try {
      const res = await apiFetchData<GetPostsResponse>('/posts', {
        method: 'GET',
        query: { limit: 30 }
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
      const res = await apiFetchData<GetPostsResponse>('/posts', {
        method: 'GET',
        query: { limit: 30, cursor: nextCursor.value }
      })
      posts.value = [...posts.value, ...res.posts]
      nextCursor.value = res.nextCursor
    } catch (e: unknown) {
      error.value = getApiErrorMessage(e) || 'Failed to load more posts.'
    } finally {
      loading.value = false
    }
  }

  async function addPost(body: string, visibility: PostVisibility) {
    const trimmed = body.trim()
    if (!trimmed) return

    try {
      const res = await apiFetchData<CreatePostResponse>('/posts', {
        method: 'POST',
        body: { body: trimmed, visibility }
      })

      // Newest-first: prepend.
      posts.value = [res.post, ...posts.value]
    } catch (e: unknown) {
      error.value = getApiErrorMessage(e) || 'Failed to post.'
      throw e
    }
  }

  return { posts, nextCursor, loading, error, refresh, loadMore, addPost }
}

