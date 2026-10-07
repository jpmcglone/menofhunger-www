import type { FollowListUser } from '~/types/api'
import { MOH_OPEN_COMPOSER_KEY } from '~/utils/injection-keys'
import { useExplorePageCheckin } from './useExplorePageCheckin'
import { useExplorePageSearch } from './useExplorePageSearch'
import type { InjectionKey } from 'vue'

/**
 * Script state for `/explore`, shared with the explore sections through
 * `useExplorePageContext()`.
 */
export function useExplorePage() {
  const discover = useExplorePageDiscover()
  const checkin = useExplorePageCheckin(discover)
  const search = useExplorePageSearch({ ...discover, ...checkin })
  const ctx = { ...discover, ...checkin, ...search }
  provide(EXPLORE_PAGE_CONTEXT, ctx)
  return ctx
}

/**
 * Route, auth, presence, the search box, and the discovery recommendations.
 */
export function useExplorePageDiscover() {
  usePageSeo({
    title: 'Explore',
    description: 'Explore Men of Hunger — trending topics, discovery, and new groups worth joining.',
    canonicalPath: '/explore',
    noindex: true,
    ogType: 'website',
    image: '/images/features/explore-v1.png',
  })

  const route = useRoute()
  const router = useRouter()
  const { apiFetch, apiFetchData } = useApiClient()
  const { invalidate: invalidateMyGroups } = useMyGroups()
  const { isAuthed, user: authUser, patchUser, isPageAccount, canAccessCheckins, didAttempt } = useAuth()
  const toast = useAppToast()
  const openComposer = inject(MOH_OPEN_COMPOSER_KEY, null)
  const { dayKey: etDayKey } = useEasternMidnightRollover()

  const searchInputRef = ref<{ focus: () => void; blur: () => void } | null>(null)
  const hydrated = ref(false)

  function onGlobalKeyDown(e: KeyboardEvent) {
    if (e.key !== '/') return
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
    e.preventDefault()
    searchInputRef.value?.focus()
  }

  // ─── Realtime: presence online feed + post rows ─────────────────────────────
  // Patch onlineUsers in place while the page is open so "Online now" stays
  // current without a manual refresh. Post subscriptions keep search / topic /
  // category / discover rows live via the global post cache.
  const {
    addOnlineFeedCallback,
    removeOnlineFeedCallback,
    subscribeOnlineFeed,
    unsubscribeOnlineFeed,
    addPostsCallback,
    removePostsCallback,
    subscribePosts,
    unsubscribePosts,
  } = usePresence()

  const onlineFeedCb = {
    onOnline: (payload: { userId: string; user?: FollowListUser }) => {
      const u = payload?.user
      if (!u?.id) return
      if (!onlineUsers.value.some((x) => x.id === u.id)) {
        onlineUsers.value = [u as any, ...onlineUsers.value]
      }
    },
    onOffline: (payload: { userId: string }) => {
      const id = payload?.userId
      if (id) onlineUsers.value = onlineUsers.value.filter((x) => x.id !== id)
    },
  }

  function normalizeQueryParam(v: unknown): string {
    return String(v ?? '').trim()
  }

  function getRouteQ(): string {
    return normalizeQueryParam(route.query.q)
  }

  const searchQuery = ref(getRouteQ())
  const searchQueryTrimmed = computed(() => searchQuery.value.trim())
  const isSearching = computed(() => searchQueryTrimmed.value.length >= 2)
  const searchActive = ref(false)
  const searchTabs = [{ key: 'all', label: 'All' }, { key: 'people', label: 'People' }, { key: 'groups', label: 'Groups' }, { key: 'posts', label: 'Posts' }, { key: 'articles', label: 'Articles' }, { key: 'board', label: 'Board' }]
  const searchTab = computed(() => searchTabs.some(t => t.key === route.query.tab) ? String(route.query.tab) : 'all')
  function selectSearchTab(tab: string) {
    void router.replace({ query: { ...route.query, tab: tab === 'all' ? undefined : tab } })
  }
  function beginSearch() { searchActive.value = true }

  const activeTopic = computed(() => normalizeQueryParam(route.query.topic))
  const activeCategory = computed(() => normalizeQueryParam(route.query.category))

  const {
    featuredPosts,
    trendingArticles,
    categories,
    followedTopics,
    onlineUsers,
    recommendedUsers,
    newestUsers,
    trendingPosts,
    exploreGroups,
    trendingHashtags,
    topUsers,
    loading: discoverLoading,
    hasLoadedOnce: discoverHasLoadedOnce,
    error: discoverError,
    refresh: refreshDiscover,
    removeUserById: removeDiscoverUser,
  } = useExploreRecommendations({
    enabled: computed(() => !isSearching.value),
    isAuthed: computed(() => isAuthed.value),
  })
  const discoverInitialLoading = computed(() => !discoverHasLoadedOnce.value && !discoverError.value)

  const joinExploreGroupId = ref<string | null>(null)

  return {
    route,
    router,
    apiFetch,
    apiFetchData,
    invalidateMyGroups,
    isAuthed,
    authUser,
    patchUser,
    isPageAccount,
    canAccessCheckins,
    didAttempt,
    toast,
    openComposer,
    etDayKey,
    searchInputRef,
    hydrated,
    onGlobalKeyDown,
    addOnlineFeedCallback,
    removeOnlineFeedCallback,
    subscribeOnlineFeed,
    unsubscribeOnlineFeed,
    addPostsCallback,
    removePostsCallback,
    subscribePosts,
    unsubscribePosts,
    onlineFeedCb,
    normalizeQueryParam,
    getRouteQ,
    searchQuery,
    searchQueryTrimmed,
    isSearching,
    searchActive,
    searchTabs,
    searchTab,
    selectSearchTab,
    beginSearch,
    activeTopic,
    activeCategory,
    featuredPosts,
    trendingArticles,
    categories,
    followedTopics,
    onlineUsers,
    recommendedUsers,
    newestUsers,
    trendingPosts,
    exploreGroups,
    trendingHashtags,
    topUsers,
    discoverLoading,
    discoverHasLoadedOnce,
    discoverError,
    refreshDiscover,
    removeDiscoverUser,
    discoverInitialLoading,
    joinExploreGroupId,
  }
}

export type ExplorePageContext = ReturnType<typeof useExplorePage>

export const EXPLORE_PAGE_CONTEXT: InjectionKey<ExplorePageContext> = Symbol('explore-page')

/** Section components of pages/explore.vue read the shared context here. */
export function useExplorePageContext(): ExplorePageContext {
  const ctx = inject(EXPLORE_PAGE_CONTEXT)
  if (!ctx) throw new Error('useExplorePageContext() must be used inside pages/explore.vue')
  return ctx
}
