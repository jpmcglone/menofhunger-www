import { useEventListener } from '@vueuse/core'
import type { PostVisibility, CheckinAllowedVisibility } from '~/types/api'
import type { ComponentPublicInstance } from 'vue'
import type { PostsFeedDisplayItem } from '~/composables/usePostsFeed'
import type { FeedThreadDisplayPost } from '~/utils/merge-feed-threads-for-display'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { pickCheckinPrompt } from '~/utils/checkin-prompts'
import { MOH_HOME_COMPOSER_IN_VIEW_KEY, MOH_OPEN_COMPOSER_KEY, MOH_FOCUS_HOME_COMPOSER_KEY } from '~/utils/injection-keys'
import { useMiddleScroller } from '~/composables/useMiddleScroller'
import { useHomePageArrivals } from './useHomePageArrivals'

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
  const { load: loadMyGroups } = useMyGroups()
  const groupsNudgeDismissed = useCookie('moh.groups-nudge.dismissed', {
    default: () => '',
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })
  /** null = membership unknown. Never treat the default empty list as “0 groups”. */
  const myGroupsCount = ref<number | null>(null)

  async function refreshMyGroupsCount() {
    if (!isAuthed.value || isPageAccount.value || groupsNudgeDismissed.value) {
      myGroupsCount.value = null
      return
    }
    try {
      const groups = await loadMyGroups()
      if (!isAuthed.value || isPageAccount.value || groupsNudgeDismissed.value) {
        myGroupsCount.value = null
        return
      }
      myGroupsCount.value = groups.length
    } catch {
      myGroupsCount.value = null
    }
  }

  const showGroupsOnboardingNudge = computed(() => {
    if (!isAuthed.value || isPageAccount.value) return false
    if (groupsNudgeDismissed.value) return false
    if (myGroupsCount.value === null) return false
    return myGroupsCount.value === 0
  })

  function dismissGroupsNudge() {
    groupsNudgeDismissed.value = '1'
  }

  const { dayKey: etDayKey } = useEasternMidnightRollover()

  const { state: checkinState, loading: checkinLoading, error: checkinError, refresh: refreshCheckin, create: createCheckin } = useDailyCheckin()
  const { isOpen: checkinWindowOpen } = useCheckinWindow()

  const checkinAllowedVisibilities = computed<CheckinAllowedVisibility[]>(() => {
    const allowed = checkinState.value?.allowedVisibilities ?? []
    return Array.isArray(allowed) ? allowed : []
  })

  const fallbackCheckinAllowedVisibilities = computed<CheckinAllowedVisibility[]>(() => {
    // Product rule: ONLY verified (and above) can check in. Answer always posts as
    // verifiedOnly (locked in the modal); premiumOnly is not offered for check-ins.
    if (!viewerIsVerified.value) return []
    return ['verifiedOnly']
  })

  const effectiveCheckinAllowedVisibilities = computed<CheckinAllowedVisibility[]>(() => {
    const fromApi = checkinAllowedVisibilities.value.filter((v) => v === 'verifiedOnly')
    return fromApi.length ? fromApi : fallbackCheckinAllowedVisibilities.value
  })

  // True only when the user has completed today's check-in.
  // This intentionally ignores "any post today" so the check-in prompt remains visible
  // until a real check-in is submitted.
  const hasCheckedInToday = computed(() => {
    if (!hydrated.value) return false
    return Boolean(checkinState.value?.hasCheckedInToday)
  })

  // Gates whether either daily-check-in row (unanswered or answered) is allowed to render.
  // Goal: avoid a SSR/CSR flash where the unanswered row shows for a moment, then
  // collapses into the quiet line once the auth + check-in state finally resolves.
  //
  // Truthy when:
  //   - SSR has finished and the client has mounted (hydrated), AND
  //   - Either the user is unauthenticated (full hero is the obvious answer), OR
  //     the check-in state has loaded (success), OR
  //     the initial fetch has settled (even on error) — so the page is never
  //     left blank when the API is slow or fails. In the error case we show the
  //     unanswered row in a degraded "no crew / no streak" mode; that's always better
  //     than showing nothing.
  //
  // While false (still fetching), both <AppFeedDailyCheckinHero> instances are
  // v-if'd off so SSR produces nothing and there is no wrong-variant flash.
  const heroResolved = computed(() => {
    if (!hydrated.value) return false
    if (isPageAccount.value) return false
    if (!isAuthed.value) return true
    // Stay hidden while the initial fetch is in-flight to avoid flashing the wrong variant.
    if (checkinLoading.value) return false
    return checkinState.value !== null
  })

  // Show the check-in prompt when user is eligible and hasn't posted today.
  const showCheckinPromptBar = computed(() => {
    if (!isAuthed.value || isPageAccount.value || !canAccessCheckins.value) return false
    if (feedCtaKind.value || !checkinWindowOpen.value) return false
    if (!checkinState.value) return false
    if (checkinState.value.hasCheckedInToday) return false
    if (!effectiveCheckinAllowedVisibilities.value.length) return false
    return true
  })

  const checkinPromptText = computed(() => {
    const p = (checkinState.value?.prompt ?? '').trim()
    if (p) return p
    // API unavailable — derive today's question deterministically client-side
    // so the hero always shows the real prompt rather than generic placeholder text.
    return pickCheckinPrompt().prompt
  })

  // Use fallback text until after hydration so server and client match (checkinState can differ on SSR vs client).
  const hydrated = ref(false)
  const displayCheckinPromptText = computed(() => (hydrated.value ? checkinPromptText.value : 'Write a check-in…'))
  const displayCheckinStreak = computed(() => (hydrated.value ? (checkinState.value?.checkinStreakDays ?? 0) : 0))

  const middleScrollerRef = useMiddleScroller()

  onMounted(() => {
    if (!import.meta.client) return
    hydrated.value = true

    // Deep-link from the check-in reminder push notification: open the composer immediately,
    // then strip the param so back-navigation / refresh doesn't re-open it.
    const route = useRoute()
    if (route.query.checkin === '1') {
      history.replaceState(null, '', location.pathname)
      // Wait a tick for openComposer injection and checkinState to settle.
      if (canAccessCheckins.value) nextTick(() => { openCheckinComposer() })
    }

    // Initial scroll margin + ResizeObserver to update it when header height changes
    computeFeedScrollMargin()
    scrollMarginObserver = new ResizeObserver(computeFeedScrollMargin)
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

  // ── Feed virtualizer ───────────────────────────────────────────────────────────
  // Mirrors the chat list pattern (ChatMessageList.vue). Only ~OVERSCAN+visible
  // rows are mounted at any time; off-screen rows are unmounted. The outer div
  // is height-stable (feedTotalSize px); each row is absolutely positioned.
  //
  // scrollMargin = distance from the middle scroller's top to the feed list
  // container's top. This accounts for the variable-height header stack above
  // the feed (composer, check-in hero, welcome card, etc.). It's recomputed
  // via ResizeObserver whenever the header resizes and via watchEffect whenever
  // reactive state that drives header height changes.

  const FEED_ESTIMATED_ROW_PX = 280
  const FEED_OVERSCAN = 3

  const feedVirtualListContainerEl = ref<HTMLElement | null>(null)
  const feedListScrollMargin = ref(0)

  function computeFeedScrollMargin() {
    const container = feedVirtualListContainerEl.value
    const scroller = middleScrollerRef.value
    if (!container || !scroller) {
      feedListScrollMargin.value = 0
      return
    }
    const scrollerRect = scroller.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    // Distance from scroll-container's content start to the list container top.
    const offset = containerRect.top - scrollerRect.top + scroller.scrollTop
    feedListScrollMargin.value = Math.max(0, Math.floor(offset))
  }

  let scrollMarginObserver: ResizeObserver | null = null

  const initialFeedLoadStarted = ref(false)
  const {
    initialFeedResolved,
    markInitialFeedResolved,
  } = useHomeLoadState()

  // Recompute when anything that changes header height changes reactively
  // (check-in hero visible/collapsed, composer mounted/unmounted, etc.).
  watchEffect(async () => {
    const _deps = [
      hasCheckedInToday.value,
      heroResolved.value,
      isAuthed.value,
      feedCtaKind.value,
      initialFeedResolved.value,
    ]
    if (!import.meta.client) return
    await nextTick()
    computeFeedScrollMargin()
  })

  const feedVirtualizer = useVirtualizer({
    get count() { return activeHomeFeedDisplayItems.value.length },
    getScrollElement: () => middleScrollerRef.value ?? null,
    estimateSize: () => FEED_ESTIMATED_ROW_PX,
    overscan: FEED_OVERSCAN,
    get scrollMargin() { return feedListScrollMargin.value },
    getItemKey: (index) => {
      const item = activeHomeFeedDisplayItems.value[index]
      if (!item) return index
      return item.kind === 'ad' ? item.key : (item.post._localId ?? item.post.id)
    },
  })

  const feedVirtualItems = computed(() => feedVirtualizer.value.getVirtualItems())
  const feedTotalSize = computed(() => feedVirtualizer.value.getTotalSize())

  function measureFeedRow(el: Element | ComponentPublicInstance | null) {
    if (!el || !(el instanceof Element)) return
    // TanStack Virtual reads `data-index` off the measured node. A ref can fire
    // on a detached/replaced node during a mid-setup crash; skip those.
    if (!el.hasAttribute('data-index')) return
    feedVirtualizer.value.measureElement(el)
  }

  // Drive realtime subscriptions from visible virtualizer rows instead of DOM scan.
  watch(feedVirtualItems, (items) => {
    const visibleIds = items
      .map(row => {
        const item = activeHomeFeedDisplayItems.value[row.index]
        return item?.kind === 'post' ? item.post.id : null
      })
      .filter((id): id is string => Boolean(id))
    notifyVisibleRowIds(visibleIds)
  })

  watch(
    [isAuthed, canAccessCheckins, etDayKey],
    ([authed, canAccess]) => {
      // Unverified users never hit /checkins/today (it 403s); they see the
      // verify-CTA hero instead.
      if (!authed || !canAccess) {
        checkinState.value = null
        return
      }
      void refreshCheckin()
    },
    { immediate: true },
  )

  // When the ET day rolls over, refresh check-in state so the hero shows today's prompt.
  watch(etDayKey, () => {
    if (canAccessCheckins.value) void refreshCheckin()
  })

  /**
   * Last submitted check-in body for the hero's "you answered today" echo. Cleared on
   * day rollover so it doesn't bleed into tomorrow's prompt state.
   */
  const lastCheckinBody = ref<string | null>(null)
  watch(etDayKey, () => { lastCheckinBody.value = null })

  async function createCheckinViaComposer(
    snapshot: { prompt: string; dayKey: string },
    body: string,
    _visibility: PostVisibility,
    _media?: unknown[] | null,
    _poll?: unknown,
  ): Promise<{ id: string } | import('~/types/api').FeedPost | null> {
    const trimmed = body.trim()
    if (!trimmed) return null
    // Answer always posts verifiedOnly; modal locks that and leaves the session
    // composer preference untouched.
    const res = await createCheckin({ body: trimmed, visibility: 'verifiedOnly', ...snapshot })
    lastCheckinBody.value = trimmed
    posts.value = [res.post, ...posts.value.filter((p) => p.id !== res.post.id)]
    return res.post
  }

  /** Eligibility gate for the hero's primary action — verified users only (or premium). */
  const canAnswerCheckin = computed(() => checkinWindowOpen.value && effectiveCheckinAllowedVisibilities.value.length > 0)

  /** Hero prompt — falls back to a generic phrasing during SSR / initial load. */
  const checkinHeroPrompt = computed(() => displayCheckinPromptText.value)

  function goToLoginForCheckin() {
    void navigateTo('/login')
  }

  function openCheckinComposer() {
    const current = checkinState.value
    if (!current?.prompt) return
    const snapshot = { prompt: current.prompt, dayKey: current.dayKey }
    if (!checkinWindowOpen.value) return
    if (!canAccessCheckins.value) return
    if (!openComposer) return
    if (!effectiveCheckinAllowedVisibilities.value.length) return
    openComposer({
      checkinPrompt: snapshot.prompt,
      allowedVisibilities: ['verifiedOnly'],
      disableMedia: true,
      createPost: (body, visibility) => createCheckinViaComposer(snapshot, body, visibility),
    })
  }

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
    checkinState,
    hasCheckedInToday,
    heroResolved,
    showCheckinPromptBar,
    displayCheckinPromptText,
    displayCheckinStreak,
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
    feedVirtualListContainerEl,
    feedListScrollMargin,
    initialFeedLoadStarted,
    initialFeedResolved,
    markInitialFeedResolved,
    feedVirtualItems,
    feedTotalSize,
    measureFeedRow,
    lastCheckinBody,
    canAnswerCheckin,
    checkinHeroPrompt,
    goToLoginForCheckin,
    openCheckinComposer,
  }
}

export type HomePageContext = ReturnType<typeof useHomePage>
