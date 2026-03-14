import type { FeedPost } from '~/types/api'
import { useCursorFeed } from '~/composables/useCursorFeed'

export function useNewPostsFeed() {
  const feed = useCursorFeed<FeedPost>({
    stateKey: 'new-posts-feed',
    buildRequest: (cursor) => ({
      path: '/notifications/new-posts',
      query: {
        limit: 30,
        collapseByRoot: true,
        collapseMode: 'parent',
        prefer: 'reply',
        ...(cursor ? { cursor } : {}),
      },
    }),
    defaultErrorMessage: 'Failed to load new posts.',
    loadMoreErrorMessage: 'Failed to load more new posts.',
    getItemId: (post) => post.id,
  })

  const posts = feed.items
  const displayPosts = computed<FeedPost[]>(() => posts.value)

  return {
    posts,
    displayPosts,
    nextCursor: feed.nextCursor,
    loading: feed.loading,
    loadingMore: feed.loadingMore,
    error: feed.error,
    refresh: feed.refresh,
    loadMore: feed.loadMore,
  }
}
