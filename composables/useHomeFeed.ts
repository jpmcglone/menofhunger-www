import type { ProfilePostsFilter } from '~/utils/post-visibility'
import type { FeedVisibilityFilter } from '~/composables/useFeedFilters'
import type { FeedScope } from '~/composables/useUrlFeedFilters'
import { useUrlFeedFilters } from '~/composables/useUrlFeedFilters'
import { useEasternMidnightRollover } from '~/composables/useEasternMidnightRollover'

const HOME_SCOPE_COOKIE = 'moh.home.scope.v1'

export function useHomeFeed() {
  const { user, isAuthed } = useAuth()
  const { apiFetchData } = useApiClient()
  const middleScrollerEl = useMiddleScroller()
  const route = useRoute()
  const { dayKey } = useEasternMidnightRollover()

  const {
    filter: feedFilter,
    sort: feedSort,
    scope: feedScope,
    viewerIsVerified,
    viewerIsPremium,
    ctaKind: feedCtaKind,
    resetFilters: resetUrlFilters,
  } = useUrlFeedFilters()

  const scopeTabs = computed(() => {
    if (!isAuthed.value) return [{ key: 'all', label: 'All', disabled: false }]
    return [
      { key: 'all', label: 'All', disabled: false },
      { key: 'following', label: 'Following', disabled: false },
      { key: 'forYou', label: 'For You', disabled: false },
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

  // ── Daily-persisted default scope (authed only) ─────────────────────────────
  // The cookie pins the user's last-chosen tab for the rest of the ET day.
  // On a new day (or no cookie), the default snaps back to "For You".
  function readScopeCookie(): { day: string; scope: FeedScope } | null {
    const c = useCookie<string | null>(HOME_SCOPE_COOKIE, { default: () => null }).value
    if (!c) return null
    const idx = c.indexOf(':')
    if (idx <= 0) return null
    const day = c.slice(0, idx)
    const scope = c.slice(idx + 1)
    if (scope !== 'all' && scope !== 'following' && scope !== 'forYou') return null
    return { day, scope }
  }

  function writeScopeCookie(scope: FeedScope) {
    const cookie = useCookie<string | null>(HOME_SCOPE_COOKIE, {
      default: () => null,
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
    })
    cookie.value = `${dayKey.value}:${scope}`
  }

  if (import.meta.client) {
    onMounted(() => {
      if (!isAuthed.value) return
      // Only auto-default when the user didn't explicitly request a scope via the URL.
      const hasUrlScope = typeof route.query.scope === 'string' && route.query.scope.length > 0
      if (hasUrlScope) return
      const cookie = readScopeCookie()
      if (cookie && cookie.day === dayKey.value) {
        if (feedScope.value !== cookie.scope) feedScope.value = cookie.scope
      } else {
        if (feedScope.value !== 'forYou') feedScope.value = 'forYou'
        writeScopeCookie('forYou')
      }
    })

    watch(
      () => [feedScope.value, dayKey.value, isAuthed.value] as const,
      ([scope, _day, authed]) => {
        if (!authed) return
        writeScopeCookie(scope)
      },
    )
  }

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
    await preserveMiddleScrollAfter(async () => { resetUrlFilters() })
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
