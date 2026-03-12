import type { ProfilePostsFilter } from '~/utils/post-visibility'
import type { FeedVisibilityFilter } from '~/composables/useFeedFilters'
import { useUrlFeedFilters } from '~/composables/useUrlFeedFilters'

export function useHomeFeed() {
  const { user, isAuthed } = useAuth()
  const { apiFetchData } = useApiClient()
  const middleScrollerEl = useMiddleScroller()

  const {
    filter: feedFilter,
    sort: feedSort,
    scope: feedScope,
    viewerIsVerified,
    viewerIsPremium,
    ctaKind: feedCtaKind,
    resetFilters: _resetFilters,
  } = useUrlFeedFilters()

  const scopeTabs = computed(() => {
    if (!isAuthed.value) return [{ key: 'all', label: 'All', disabled: false }]
    return [
      { key: 'all', label: 'All', disabled: false },
      { key: 'following', label: 'Following', disabled: false },
    ]
  })

  const followingOnly = computed(() => Boolean(isAuthed.value && feedScope.value === 'following'))
  const showAds = computed(() => !user.value?.premium)

  const {
    posts,
    displayPosts,
    displayItems,
    collapsedSiblingReplyCountFor,
    replyCountForParentId,
    nextCursor,
    loading,
    error,
    refresh,
    softRefreshNewer,
    startAutoSoftRefresh,
    loadMore,
    addPost,
    addReply,
    removePost,
    replacePost,
  } = usePostsFeed({
    visibility: feedFilter,
    followingOnly,
    sort: feedSort,
    showAds,
  })

  let stopAutoSoftRefresh: (() => void) | undefined
  onMounted(() => {
    stopAutoSoftRefresh = startAutoSoftRefresh({ everyMs: 10_000 })
  })
  onBeforeUnmount(() => {
    stopAutoSoftRefresh?.()
    stopAutoSoftRefresh = undefined
  })

  const followingCount = ref<number | null>(null)
  const followingCountLoading = ref(false)
  let followingCountReqId = 0
  const showFollowingEmptyState = computed(
    () => Boolean(followingOnly.value && !loading.value && !error.value && posts.value.length === 0),
  )
  const showAllEmptyState = computed(
    () => Boolean(!followingOnly.value && !loading.value && !error.value && posts.value.length === 0),
  )

  watchEffect(() => {
    if (!import.meta.client) return
    if (!isAuthed.value) return
    if (!showFollowingEmptyState.value) return
    if (followingCount.value !== null) return
    if (followingCountLoading.value) return

    followingCountReqId += 1
    const reqId = followingCountReqId
    followingCountLoading.value = true
    void apiFetchData<number>('/follows/me/following-count')
      .then((res) => {
        if (reqId !== followingCountReqId) return
        const n = Number(res ?? 0)
        followingCount.value = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0
      })
      .catch(() => {
        if (reqId !== followingCountReqId) return
        followingCount.value = null
      })
      .finally(() => {
        if (reqId !== followingCountReqId) return
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

  async function resetFilters() {
    _resetFilters()
    await preserveMiddleScrollAfter(async () => await refresh({ visibility: 'all', sort: 'new' }))
  }

  async function onFeedScopeChange(next: 'all' | 'following') {
    feedScope.value = next as 'all' | 'following'
    await preserveMiddleScrollAfter(async () => await refresh())
  }

  // Refresh feed when scope or user identity changes
  watch(
    () => [feedScope.value, user.value?.id ?? null] as const,
    () => { void refresh() },
    { flush: 'post' },
  )

  return {
    feedFilter,
    feedScope,
    feedSort,
    scopeTabs,
    posts,
    displayPosts,
    displayItems,
    collapsedSiblingReplyCountFor,
    replyCountForParentId,
    nextCursor,
    loading,
    error,
    refresh,
    softRefreshNewer,
    loadMore,
    addPost,
    addReply,
    removePost,
    replacePost,
    followingCount,
    showFollowingEmptyState,
    showAllEmptyState,
    viewerIsVerified,
    viewerIsPremium,
    feedCtaKind,
    setFeedFilter,
    setFeedSort,
    resetFilters,
    onFeedScopeChange,
  }
}
