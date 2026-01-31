import type { ProfilePostsFilter } from '~/utils/post-visibility'

export function useHomeFeed() {
  const { user } = useAuth()
  const isAuthed = computed(() => Boolean(user.value?.id))
  const { apiFetchData } = useApiClient()
  const middleScrollerEl = useMiddleScroller()

  const feedFilter = useCookie<ProfilePostsFilter>('moh.feed.filter.v1', {
    default: () => 'all',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
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

  const feedSort = useCookie<'new' | 'trending'>('moh.home.sort.v1', {
    default: () => 'new',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })

  watch(
    feedFilter,
    (v) => {
      if (v === 'all' || v === 'public' || v === 'verifiedOnly' || v === 'premiumOnly') return
      feedFilter.value = 'all'
    },
    { immediate: true },
  )

  watch(
    feedScope,
    (v) => {
      if (v === 'following' || v === 'all') return
      feedScope.value = 'all'
    },
    { immediate: true },
  )

  watch(
    feedSort,
    (v) => {
      if (v === 'new' || v === 'trending') return
      feedSort.value = 'new'
    },
    { immediate: true },
  )

  const followingOnly = computed(() => Boolean(isAuthed.value && feedScope.value === 'following'))

  const { posts, nextCursor, loading, error, refresh, startAutoSoftRefresh, loadMore, addPost, removePost } = usePostsFeed({
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
    void apiFetchData<{ followingCount: number }>('/follows/me/following-count')
      .then((res) => {
        const n = Number((res as { followingCount?: unknown } | null)?.followingCount ?? 0)
        followingCount.value = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0
      })
      .catch(() => {
        followingCount.value = null
      })
      .finally(() => {
        followingCountLoading.value = false
      })
  })

  const viewerIsVerified = computed(() => Boolean(user.value?.verifiedStatus && user.value.verifiedStatus !== 'none'))
  const viewerIsPremium = computed(() => Boolean(user.value?.premium))

  const feedCtaKind = computed<null | 'verify' | 'premium'>(() => {
    if (feedFilter.value === 'verifiedOnly' && !viewerIsVerified.value) return 'verify'
    if (feedFilter.value === 'premiumOnly' && !viewerIsPremium.value) return 'premium'
    return null
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
    feedFilter.value = next
    if (feedCtaKind.value) return
    await preserveMiddleScrollAfter(async () => await refresh())
  }

  async function setFeedSort(next: 'new' | 'trending') {
    feedSort.value = next
    if (feedCtaKind.value) return
    await preserveMiddleScrollAfter(async () => await refresh())
  }

  watch(
    () => feedScope.value,
    () => {
      if (feedCtaKind.value) return
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
    removePost,
    followingCount,
    showFollowingEmptyState,
    viewerIsVerified,
    viewerIsPremium,
    feedCtaKind,
    setFeedFilter,
    setFeedSort,
  }
}
