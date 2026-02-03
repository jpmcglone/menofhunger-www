import type { ProfilePostsFilter } from '~/utils/post-visibility'
import type { FeedVisibilityFilter } from '~/composables/useFeedFilters'
import { useFeedFilters } from '~/composables/useFeedFilters'

export function useHomeFeed() {
  const { user } = useAuth()
  const isAuthed = computed(() => Boolean(user.value?.id))
  const { apiFetchData } = useApiClient()
  const middleScrollerEl = useMiddleScroller()

  const { filter: feedFilter, sort: feedSort, viewerIsVerified, viewerIsPremium, ctaKind: feedCtaKind } = useFeedFilters({
    filterCookieKey: 'moh.feed.filter.v1',
    sortCookieKey: 'moh.home.sort.v1',
  })

  const feedScope = useCookie<'following' | 'all'>('moh.home.scope.v1', {
    default: () => 'all',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })

  const scopeTabs = computed(() => [
    { key: 'all', label: 'All', disabled: false },
    { key: 'following', label: 'Following', disabled: !isAuthed.value },
  ])

  watch(
    feedScope,
    (v) => {
      if (v === 'following' || v === 'all') return
      feedScope.value = 'all'
    },
    { immediate: true },
  )

  const followingOnly = computed(() => Boolean(isAuthed.value && feedScope.value === 'following'))

  const { posts, nextCursor, loading, error, refresh, startAutoSoftRefresh, loadMore, addPost, addReply, removePost } = usePostsFeed({
    visibility: feedFilter,
    followingOnly,
    sort: feedSort,
  })

  onMounted(() => startAutoSoftRefresh({ everyMs: 10_000 }))

  const followingCount = ref<number | null>(null)
  const followingCountLoading = ref(false)
  const showFollowingEmptyState = computed(
    () => Boolean(followingOnly.value && !loading.value && !error.value && posts.value.length === 0),
  )

  watchEffect(() => {
    if (!import.meta.client) return
    if (!isAuthed.value) return
    if (!showFollowingEmptyState.value) return
    if (followingCount.value !== null) return
    if (followingCountLoading.value) return

    followingCountLoading.value = true
    void apiFetchData<number>('/follows/me/following-count')
      .then((res) => {
        const n = Number(res ?? 0)
        followingCount.value = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0
      })
      .catch(() => {
        followingCount.value = null
      })
      .finally(() => {
        followingCountLoading.value = false
      })
  })

  async function preserveMiddleScrollAfter<T>(fn: () => Promise<T>): Promise<T> {
    if (!import.meta.client) return await fn()
    const scroller = middleScrollerEl.value
    if (!scroller) return await fn()

    const prevTop = scroller.scrollTop
    const res = await fn()
    await nextTick()

    const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
    scroller.scrollTop = Math.min(prevTop, maxTop)
    return res
  }

  async function setFeedFilter(next: ProfilePostsFilter) {
    const safe = next === 'onlyMe' ? 'all' : (next as FeedVisibilityFilter)
    feedFilter.value = safe
    await preserveMiddleScrollAfter(async () => await refresh({ visibility: safe }))
  }

  async function setFeedSort(next: 'new' | 'trending') {
    feedSort.value = next
    await preserveMiddleScrollAfter(async () => await refresh({ sort: next }))
  }

  /** Set both filter and sort to default and refresh once (so reset matches manually selecting All + Newest). */
  async function resetFilters() {
    feedFilter.value = 'all'
    feedSort.value = 'new'
    await preserveMiddleScrollAfter(async () => await refresh({ visibility: 'all', sort: 'new' }))
  }

  watch(
    () => feedScope.value,
    () => {
      void refresh()
    },
    { flush: 'post' },
  )

  watch(
    () => user.value?.id ?? null,
    () => {
      void refresh()
    },
    { flush: 'post' },
  )

  return {
    feedFilter,
    feedScope,
    feedSort,
    scopeTabs,
    posts,
    nextCursor,
    loading,
    error,
    refresh,
    loadMore,
    addPost,
    addReply,
    removePost,
    followingCount,
    showFollowingEmptyState,
    viewerIsVerified,
    viewerIsPremium,
    feedCtaKind,
    setFeedFilter,
    setFeedSort,
    resetFilters,
  }
}
