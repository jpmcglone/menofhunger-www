import { useEventListener } from '@vueuse/core'
import type { PostsFeedDisplayItem } from '~/composables/usePostsFeed'
import type { FeedThreadDisplayPost } from '~/utils/merge-feed-threads-for-display'
import { MOH_HOME_COMPOSER_IN_VIEW_KEY, MOH_OPEN_COMPOSER_KEY, MOH_FOCUS_HOME_COMPOSER_KEY } from '~/utils/injection-keys'
import { useMiddleScroller } from '~/composables/useMiddleScroller'
import { useHomePageArrivals } from './useHomePageArrivals'
import { useHomeCheckin } from './useHomeCheckin'
import { useHomeFeedVirtualizer } from './useHomeFeedVirtualizer'
import { useHomeGroupsNudge } from './useHomeGroupsNudge'

/**
 * Script state for `/home`.
 */
export function useHomePage() {
  const feed = useHomePageFeed()
  const arrivals = useHomePageArrivals(feed)
  return { ...feed, ...arrivals }
}

/**
 * Composer wiring, announcements, groups nudge, daily check-in, the home feed and
 * its filters, pull-to-refresh, and the virtualized feed list.
 */
export function useHomePageFeed() {
  usePageSeo({
    title: 'Home',
    description: 'Your Men of Hunger feed — posts are shown in simple chronological order.',
    canonicalPath: '/home',
    noindex: true,
    ogType: 'website',
    // When sharing /home, always use the Men of Hunger logo (avoid scrapers picking a random in-feed image).
    image: '/images/logo-black-bg-small.png',
  })

  const homeComposerEl = ref<HTMLElement | null>(null)
  const homeComposerRef = ref<{ focus: () => void } | null>(null)
  const loadMoreSentinelEl = ref<HTMLElement | null>(null)
  const homeComposerInViewRef = inject(MOH_HOME_COMPOSER_IN_VIEW_KEY)
  const openComposer = inject(MOH_OPEN_COMPOSER_KEY, null)

  provide(MOH_FOCUS_HOME_COMPOSER_KEY, () => {
    homeComposerRef.value?.focus()
  })
  const { isAuthed, user: authUser, isPageAccount, canAccessCheckins, didAttempt } = useAuth()
  const {
    inlineAnnouncement,
    presentInline,
    onDismiss: onAnnouncementDismiss,
    onCta: onAnnouncementCta,
  } = useAnnouncements()
  watch(inlineAnnouncement, (item) => {
    if (item) presentInline()
  }, { immediate: true })
  const { groupsNudgeDismissed, myGroupsCount, refreshMyGroupsCount, showGroupsOnboardingNudge, dismissGroupsNudge } =
    useHomeGroupsNudge({ isAuthed, isPageAccount })

  // Client-only text and gates wait for hydration so the server markup matches the first client render.
  const hydrated = ref(false)
  const middleScrollerRef = useMiddleScroller()
  let scrollMarginObserver: ResizeObserver | null = null

  onMounted(() => {
    if (!import.meta.client) return
    hydrated.value = true

    // Deep-link from the check-in reminder push notification: open the composer immediately,
    // then strip the param so back-navigation / refresh doesn't re-open it.
    const route = useRoute()
    if (route.query.checkin === '1') {
      history.replaceState(null, '', location.pathname)
      // Wait a tick for openComposer injection and checkinState to settle.
      if (canAccessCheckins.value) nextTick(() => { checkin.openCheckinComposer() })
    }

    // Initial scroll margin + ResizeObserver to update it when header height changes
    virtual.computeFeedScrollMargin()
    scrollMarginObserver = new ResizeObserver(virtual.computeFeedScrollMargin)
    if (homeComposerEl.value) scrollMarginObserver.observe(homeComposerEl.value)

    const el = homeComposerEl.value
    const root = middleScrollerRef.value
    if (!el || !root || !homeComposerInViewRef) return
    const obs = new IntersectionObserver(
      (entries) => {
        const e = entries[0]
        if (e) homeComposerInViewRef.value = e.isIntersecting
      },
      { root, rootMargin: '0px', threshold: 0 },
    )
    obs.observe(el)
    onBeforeUnmount(() => {
      obs.disconnect()
      homeComposerInViewRef.value = false
      scrollMarginObserver?.disconnect()
      scrollMarginObserver = null
    })
  })

  const newlyPostedVideoPostId = ref<string | null>(null)

  const mediaOnlyFeed = computed(() => false)
  const topLevelOnlyFeed = computed(() => false)
  const {
    feedScope,
    feedFilter,
    feedSort,
    forYou,
    posts,
    collapsedSiblingReplyCountFor,
    nextCursor,
    loading,
    loadingMore,
    error,
    refresh,
    notifyVisibleRowIds,
    loadMore,
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
    displayItems,
    setFeedFilter,
    setFeedSort,
    resetFilters,
    onFeedScopeChange,
    hasLoaded,
  } = useHomeFeed({ mediaOnly: mediaOnlyFeed, topLevelOnly: topLevelOnlyFeed })

  const homeOpenedFromCache = posts.value.length > 0
  useJourneyReady('home_ready', () => didAttempt.value && !loading.value && (posts.value.length > 0 || hasLoaded.value), {
    failed: () => Boolean(error.value), source: () => homeOpenedFromCache ? 'cache' : (posts.value.length ? 'network' : 'empty'),
  })

  const homeTabReturnGate = useTabReturnRefreshGate('home')

  const homeFeedContentEl = ref<HTMLElement | null>(null)
  const feedArrivalRowEl = ref<HTMLElement | null>(null)
  const homeFeedHeaderEl = computed(() => feedArrivalRowEl.value?.previousElementSibling as HTMLElement | null)
  const isReadingFeed = ref(false)
  function updateFeedReadingPosition() {
    const root = middleScrollerRef.value
    const row = feedArrivalRowEl.value
    isReadingFeed.value = Boolean(root && row && row.getBoundingClientRect().bottom <= root.getBoundingClientRect().top + (homeFeedHeaderEl.value?.offsetHeight ?? 0))
  }
  useEventListener(middleScrollerRef, 'scroll', updateFeedReadingPosition, { passive: true })
  const { scrollToTop: scrollFeedToTop } = useFeedScrollToTop(homeFeedContentEl, homeFeedHeaderEl)

  function handleFeedScopeChange(scope: Parameters<typeof onFeedScopeChange>[0]) {
    onFeedScopeChange(scope)
    scrollFeedToTop()
  }
  // Re-tapping the already-active scope tab is the "give me something new" gesture.
  function handleFeedScopeReselect() {
    scrollFeedToTop()
    void refresh({ forYouRefresh: Boolean(forYou.value) })
  }

  const HOME_PULL_REFRESH_PX = 72
  let homePullStartY = 0
  let homePullArmed = false

  function onHomePullStart(event: TouchEvent) {
    const scroller = middleScrollerRef.value
    if (!scroller || scroller.scrollTop > 2 || loading.value) return
    homePullStartY = event.touches[0]?.clientY ?? 0
    homePullArmed = true
  }

  function onHomePullEnd(event: TouchEvent) {
    if (!homePullArmed) return
    homePullArmed = false
    const y = event.changedTouches[0]?.clientY ?? homePullStartY
    if (y - homePullStartY < HOME_PULL_REFRESH_PX) return
    void refresh({ forYouRefresh: Boolean(forYou.value) })
  }

  watch(middleScrollerRef, (el, prev) => {
    if (!import.meta.client) return
    prev?.removeEventListener('touchstart', onHomePullStart)
    prev?.removeEventListener('touchend', onHomePullEnd)
    el?.addEventListener('touchstart', onHomePullStart, { passive: true })
    el?.addEventListener('touchend', onHomePullEnd, { passive: true })
  }, { immediate: true })

  onBeforeUnmount(() => {
    const el = middleScrollerRef.value
    el?.removeEventListener('touchstart', onHomePullStart)
    el?.removeEventListener('touchend', onHomePullEnd)
  })
  function handleFeedSortChange(sort: Parameters<typeof setFeedSort>[0]) {
    setFeedSort(sort)
    scrollFeedToTop()
  }
  function handleFeedFilterChange(filter: Parameters<typeof setFeedFilter>[0]) {
    setFeedFilter(filter)
    scrollFeedToTop()
  }
  function handleFeedReset() {
    resetFilters()
    scrollFeedToTop()
  }

  const activeHomeFeedDisplayItems = computed(() => {
    return displayItems.value
  })

  /** Type-safe accessor: returns the post from a feed display item when kind === 'post'. */
  function feedItemPost(item: PostsFeedDisplayItem | undefined): FeedThreadDisplayPost | undefined {
    return item?.kind === 'post' ? item.post : undefined
  }

  const checkin = useHomeCheckin({
    hydrated,
    openComposer,
    feed: { posts, feedCtaKind, viewerIsVerified },
  })
  const virtual = useHomeFeedVirtualizer({
    middleScrollerRef,
    items: activeHomeFeedDisplayItems,
    isAuthed,
    hasCheckedInToday: checkin.hasCheckedInToday,
    heroResolved: checkin.heroResolved,
    feedCtaKind,
    notifyVisibleRowIds,
  })

  return {
    homeComposerEl,
    homeComposerRef,
    loadMoreSentinelEl,
    openComposer,
    isAuthed,
    authUser,
    isPageAccount,
    canAccessCheckins,
    didAttempt,
    inlineAnnouncement,
    onAnnouncementDismiss,
    onAnnouncementCta,
    groupsNudgeDismissed,
    myGroupsCount,
    refreshMyGroupsCount,
    showGroupsOnboardingNudge,
    dismissGroupsNudge,
    middleScrollerRef,
    newlyPostedVideoPostId,
    feedScope,
    feedFilter,
    feedSort,
    forYou,
    posts,
    collapsedSiblingReplyCountFor,
    nextCursor,
    loading,
    loadingMore,
    error,
    refresh,
    loadMore,
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
    homeTabReturnGate,
    homeFeedContentEl,
    feedArrivalRowEl,
    isReadingFeed,
    updateFeedReadingPosition,
    scrollFeedToTop,
    handleFeedScopeChange,
    handleFeedScopeReselect,
    handleFeedSortChange,
    handleFeedFilterChange,
    activeHomeFeedDisplayItems,
    feedItemPost,
    ...checkin,
    ...virtual,
  }
}

export type HomePageContext = ReturnType<typeof useHomePage>
