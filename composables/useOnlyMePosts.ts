import type { FeedPost } from '~/types/api'
import { useCursorFeed } from '~/composables/useCursorFeed'
import { usePostCountBumps } from '~/composables/usePostCountBumps'

export function useOnlyMePosts() {
  const { clearBumpsForPostIds } = usePostCountBumps()
  const feed = useCursorFeed<FeedPost>({
    stateKey: 'posts-only-me',
    buildRequest: (cursor) => ({
      path: '/posts/me/only-me',
      query: { limit: 30, ...(cursor ? { cursor } : {}) },
    }),
    defaultErrorMessage: 'Failed to load posts.',
    loadMoreErrorMessage: 'Failed to load more posts.',
    onDataLoaded: (data) => clearBumpsForPostIds(data.map((p) => p.id)),
  })

  const posts = feed.items
  const { nextCursor, loading, error, refresh, loadMore } = feed

  function removePost(id: string) {
    const pid = (id ?? '').trim()
    if (!pid) return
    posts.value = posts.value.filter((p) => p.id !== pid)
  }

  function prependPost(post: FeedPost) {
    if (!post?.id) return
    posts.value = [post, ...posts.value]
  }

  function replacePost(updated: FeedPost) {
    const pid = (updated?.id ?? '').trim()
    if (!pid) return
    posts.value = posts.value.map((p) => (p.id === pid ? updated : p))
  }

  return { posts, nextCursor, loading, error, refresh, loadMore, removePost, prependPost, replacePost }
}
