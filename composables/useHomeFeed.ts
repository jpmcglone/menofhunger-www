import type { ProfilePostsFilter } from '~/utils/post-visibility'
import type { FeedVisibilityFilter } from '~/composables/useFeedFilters'
import type { FeedScope } from '~/composables/useUrlFeedFilters'
import { useUrlFeedFilters } from '~/composables/useUrlFeedFilters'

const HOME_SCOPE_COOKIE = 'moh.home.scope.v1'
const DEFAULT_HOME_SCOPE: FeedScope = 'forYou'

function normalizeHomeScope(value: unknown): FeedScope {
  const raw = typeof value === 'string' ? value : ''
  // Older cookies were stored as `${dayKey}:${scope}`. Keep the user's last choice
  // while dropping the daily reset behavior.
  const scope = raw.includes(':') ? raw.slice(raw.indexOf(':') + 1) : raw
  if (scope === 'all' || scope === 'following' || scope === 'forYou') return scope
  return DEFAULT_HOME_SCOPE
}

export function useHomeFeed() {
  const { user, isAuthed } = useAuth()
  const { apiFetchData } = useApiClient()
  const middleScrollerEl = useMiddleScroller()
  const route = useRoute()
  const router = useRouter()

  const {
    filter: feedFilter,
    sort: feedSort,
    viewerIsVerified,
    viewerIsPremium,
    ctaKind: feedCtaKind,
    resetFilters: resetUrlFilters,
  } = useUrlFeedFilters()

  const storedFeedScope = useCookie<string | null>(HOME_SCOPE_COOKIE, {
    default: () => DEFAULT_HOME_SCOPE,
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })

  const feedScope = computed<FeedScope>({
    get: () => {
      if (!isAuthed.value) return 'all'
      return normalizeHomeScope(storedFeedScope.value)
    },
    set: (next) => {
      if (!isAuthed.value) return
      storedFeedScope.value = normalizeHomeScope(next)
    },
  })

  const scopeTabs = computed(() => {
    if (!isAuthed.value) return [{ key: 'all', label: 'All', disabled: false }]
    return [
      { key: 'forYou', label: 'For You', disabled: false },
      { key: 'following', label: 'Following', disabled: false },
      { key: 'all', label: 'All', disabled: false },
    ]
  })

  const followingOnly = computed(() => Boolean(isAuthed.value && feedScope.value === 'following'))
  const forYou = computed(() => Boolean(isAuthed.value && feedScope.value === 'forYou'))
  const showAds = computed(() => !user.value?.premium)

  // Signed-out home defaults to trending (instead of the chronological "new") so
  // first-time visitors land on the most engaging content. Once a visitor explicitly
  // picks a sort via the URL/header, we honor it.
  const effectiveSort = computed<'new' | 'trending'>(() => {
    if (isAuthed.value) return feedSort.value
    return route.query.sort ? feedSort.value : 'trending'
  })

  watch(
    storedFeedScope,
    (value) => {
      const normalized = normalizeHomeScope(value)
      if (value !== normalized) storedFeedScope.value = normalized
    },
    { immediate: true },
  )

  onMounted(() => {
    if (!('scope' in route.query)) return
    const query = { ...route.query }
    delete query.scope
    void router.replace({ path: route.path, query })
  })

  const {
    posts,
    displayPosts,
    displayItems,
    collapsedSiblingReplyCountFor,
    nextCursor,
    loading,
    loadingMore,
    error,
    refresh,
    softRefreshNewer,
    loadMore,
    addPost,
    addReply,
    removePost,
    replacePost,
    prependOptimisticPost,
    replaceOptimistic,
    markOptimisticFailed,
    markOptimisticPosting,
    removeOptimistic,
  } = usePostsFeed({
    visibility: feedFilter,
    followingOnly,
    sort: effectiveSort,
    forYou,
    showAds,
  })

  const followingCount = ref<number | null>(null)
  const followingCountLoading = ref(false)
  let followingCountReqId = 0
  const showFollowingEmptyState = computed(
    () => Boolean(followingOnly.value && !loading.value && !error.value && posts.value.length === 0),
  )
  const showForYouEmptyState = computed(
    () => Boolean(forYou.value && !loading.value && !error.value && posts.value.length === 0),
  )
  const showAllEmptyState = computed(
    () => Boolean(!followingOnly.value && !forYou.value && !loading.value && !error.value && posts.value.length === 0),
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
    await preserveMiddleScrollAfter(async () => { feedFilter.value = safe })
  }

  async function setFeedSort(next: 'new' | 'trending') {
    await preserveMiddleScrollAfter(async () => { feedSort.value = next })
  }

  async function resetFilters() {
    // resetUrlFilters patches sort + filter atomically in one router.replace call,
    // avoiding the race condition of two separate setter calls reading stale route.query.
    await preserveMiddleScrollAfter(async () => {
      feedScope.value = DEFAULT_HOME_SCOPE
      resetUrlFilters()
    })
  }

  function onFeedScopeChange(next: FeedScope) {
    feedScope.value = next
    // Scope drives followingOnly + forYou, which usePostsFeed watches and auto-refreshes on change.
  }

  // usePostsFeed already watches visibility/sort/followingOnly and auto-refreshes.
  // We only need to handle user identity changes here (login/logout/account-switch
  // while scope='all' won't change followingOnly, so the param watcher won't fire).
  watch(
    () => user.value?.id ?? null,
    () => { void preserveMiddleScrollAfter(() => refresh()) },
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
    nextCursor,
    loading,
    loadingMore,
    error,
    refresh,
    softRefreshNewer,
    loadMore,
    addPost,
    addReply,
    removePost,
    replacePost,
    prependOptimisticPost,
    replaceOptimistic,
    markOptimisticFailed,
    markOptimisticPosting,
    removeOptimistic,
    followingCount,
    showFollowingEmptyState,
    showForYouEmptyState,
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
