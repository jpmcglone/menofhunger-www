import type { Ref } from 'vue'
import type { FeedPost, GetCategoryTopicsData, Topic } from '~/types/api'
import { useCursorFeed } from '~/composables/useCursorFeed'
import { useApiClient } from '~/composables/useApiClient'

/** Posts and child topics for one topic category (`/topics/categories/:category/*`). */
export function useCategoryPostsFeed(category: Readonly<Ref<string>>) {
  const { apiFetch } = useApiClient()
  const feed = useCursorFeed<FeedPost>({
    stateKey: 'explore-category-posts',
    stateMode: 'local',
    clearOnError: true,
    buildRequest: (cursor) => (category.value
      ? { path: `/topics/categories/${encodeURIComponent(category.value)}/posts`, query: cursor ? { limit: '30', cursor } : { limit: '30' } }
      : null),
    defaultErrorMessage: 'Failed to load category posts.',
    loadMoreErrorMessage: 'Failed to load category posts.',
  })

  const topics = ref<Topic[]>([])
  const topicsLoading = ref(false)

  async function fetchTopics() {
    const c = category.value
    if (!c || topicsLoading.value) return
    topicsLoading.value = true
    try {
      const res = await apiFetch<GetCategoryTopicsData>(`/topics/categories/${encodeURIComponent(c)}/topics`, { method: 'GET' })
      topics.value = (res.data ?? []) as Topic[]
    } catch {
      topics.value = []
    } finally {
      topicsLoading.value = false
    }
  }

  function clear() {
    feed.reset()
    topics.value = []
  }

  return {
    posts: feed.items,
    topics,
    loading: feed.loading,
    loadingMore: feed.loadingMore,
    error: feed.error,
    hasMore: feed.hasMore,
    initialLoading: useInitialLoading(feed.loading, () => feed.items.value.length > 0, feed.error),
    refresh: () => Promise.all([fetchTopics(), feed.refresh()]).then(() => undefined),
    loadMore: feed.loadMore,
    clear,
  }
}
