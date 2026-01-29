import type { CreatePostResponse, FeedPost, GetPostsResponse, PostMediaKind, PostMediaSource, PostVisibility } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

type FeedFilter = 'all' | 'public' | PostVisibility
type FeedSort = 'new' | 'trending'

export function usePostsFeed(options: { visibility?: Ref<FeedFilter>; followingOnly?: Ref<boolean>; sort?: Ref<FeedSort> } = {}) {
  const { apiFetchData } = useApiClient()

  const posts = useState<FeedPost[]>('posts-feed', () => [])
  const nextCursor = useState<string | null>('posts-feed-next-cursor', () => null)
  const loading = useState<boolean>('posts-feed-loading', () => false)
  const error = useState<string | null>('posts-feed-error', () => null)
  const visibility = options.visibility ?? ref<FeedFilter>('all')
  const followingOnly = options.followingOnly ?? ref(false)
  const sort = options.sort ?? ref<FeedSort>('new')

  async function refresh() {
    if (loading.value) return
    loading.value = true
    error.value = null
    try {
      const res = await apiFetchData<GetPostsResponse>('/posts', {
        method: 'GET',
        query: {
          limit: 30,
          visibility: visibility.value,
          ...(followingOnly.value ? { followingOnly: true } : {}),
          ...(sort.value === 'trending' ? { sort: 'trending' } : {}),
        }
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
        query: {
          limit: 30,
          cursor: nextCursor.value,
          visibility: visibility.value,
          ...(followingOnly.value ? { followingOnly: true } : {}),
          ...(sort.value === 'trending' ? { sort: 'trending' } : {}),
        }
      })
      posts.value = [...posts.value, ...res.posts]
      nextCursor.value = res.nextCursor
    } catch (e: unknown) {
      error.value = getApiErrorMessage(e) || 'Failed to load more posts.'
    } finally {
      loading.value = false
    }
  }

  async function addPost(
    body: string,
    visibility: PostVisibility,
    media?: Array<{
      source: PostMediaSource
      kind: PostMediaKind
      r2Key?: string
      url?: string
      mp4Url?: string | null
      width?: number | null
      height?: number | null
    }> | null,
  ): Promise<FeedPost | null> {
    const trimmed = body.trim()
    if (!trimmed) return null

    try {
      const res = await apiFetchData<CreatePostResponse>('/posts', {
        method: 'POST',
        body: {
          body: trimmed,
          visibility,
          ...(media?.length ? { media } : {}),
        }
      })

      // Newest-first: prepend. "Only me" posts never appear in any feeds.
      if (res.post.visibility !== 'onlyMe') {
        posts.value = [res.post, ...posts.value]
      }
      return res.post
    } catch (e: unknown) {
      error.value = getApiErrorMessage(e) || 'Failed to post.'
      throw e
    }
  }

  function removePost(id: string) {
    const pid = (id ?? '').trim()
    if (!pid) return
    posts.value = posts.value.filter((p) => p.id !== pid)
  }

  return { posts, nextCursor, loading, error, refresh, loadMore, addPost, removePost }
}

