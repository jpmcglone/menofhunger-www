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

  const scopeTabs = computed(() => {
    // When signed out, remove the Following toggle entirely.
    if (!isAuthed.value) return [{ key: 'all', label: 'All', disabled: false }]
    return [
      { key: 'following', label: 'Following', disabled: false },
      { key: 'all', label: 'All', disabled: false },
    ]
  })

  watch(
    feedScope,
    (v) => {
      if (v === 'following' || v === 'all') return
      feedScope.value = 'all'
    },
    { immediate: true },
  )

  watch(
    isAuthed,
    (authed) => {
      if (authed) return
      // If a signed-out user had the cookie set to following, force back to all so UI + state match.
      if (feedScope.value === 'following') feedScope.value = 'all'
    },
    { immediate: true },
  )

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
    await preserveMiddleScrollAfter(async () => await refresh({ visibility: safe }))
  }

  async function setFeedSort(next: 'new' | 'trending') {
    await preserveMiddleScrollAfter(async () => await refresh({ sort: next }))
  }

  /** Set both filter and sort to default and refresh once (so reset matches manually selecting All + Newest). */
  async function resetFilters() {
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
    displayPosts,
    displayItems,
    collapsedSiblingReplyCountFor,
    replyCountForParentId,
    nextCursor,
    loading,
    error,
    refresh,
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
  }
}
