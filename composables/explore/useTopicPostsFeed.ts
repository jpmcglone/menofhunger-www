import type { Ref } from 'vue'
import type { FeedPost } from '~/types/api'
import { useCursorFeed } from '~/composables/useCursorFeed'

/** Posts for one topic (`/topics/:topic/posts`), refetched whenever the topic changes. */
export function useTopicPostsFeed(topic: Readonly<Ref<string>>) {
  const feed = useCursorFeed<FeedPost>({
    stateKey: 'explore-topic-posts',
    stateMode: 'local',
    clearOnError: true,
    buildRequest: (cursor) => (topic.value
      ? { path: `/topics/${encodeURIComponent(topic.value)}/posts`, query: cursor ? { limit: '30', cursor } : { limit: '30' } }
      : null),
    defaultErrorMessage: 'Failed to load topic posts.',
    loadMoreErrorMessage: 'Failed to load topic posts.',
  })

  return {
    posts: feed.items,
    loading: feed.loading,
    loadingMore: feed.loadingMore,
    error: feed.error,
    hasMore: feed.hasMore,
    initialLoading: useInitialLoading(feed.loading, () => feed.items.value.length > 0, feed.error),
    refresh: () => feed.refresh(),
    loadMore: feed.loadMore,
    clear: feed.reset,
  }
}
