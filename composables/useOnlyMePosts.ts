import type { FeedPost, GetPostsData } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { usePostCountBumps } from '~/composables/usePostCountBumps'

export function useOnlyMePosts() {
  const { apiFetch } = useApiClient()
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
      const res = await apiFetch<GetPostsData>('/posts/me/only-me', {
        method: 'GET',
        query: { limit: 30 },
      })
      posts.value = res.data ?? []
      nextCursor.value = res.pagination?.nextCursor ?? null
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
      const res = await apiFetch<GetPostsData>('/posts/me/only-me', {
        method: 'GET',
        query: { limit: 30, cursor: nextCursor.value },
      })
      posts.value = [...posts.value, ...(res.data ?? [])]
      nextCursor.value = res.pagination?.nextCursor ?? null
      clearBumpsForPostIds((res.data ?? []).map((p) => p.id))
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

  function prependPost(post: FeedPost) {
    if (!post?.id) return
    posts.value = [post, ...posts.value]
  }

  return { posts, nextCursor, loading, error, refresh, loadMore, removePost, prependPost }
}

