import type { CommunityGroupShell, FeedPost, Topic } from '~/types/api'
import { applyCommunityGroupJoin, communityGroupJoinToast } from '~/utils/community-group-preview'
import type { PostsCallback } from '~/composables/usePresence'
import { useExploreSearch } from '~/composables/explore/useExploreSearch'
import { useTopicPostsFeed } from '~/composables/explore/useTopicPostsFeed'
import { useCategoryPostsFeed } from '~/composables/explore/useCategoryPostsFeed'
import type { useExplorePageDiscover } from './useExplorePage'
import type { useExplorePageCheckin } from './useExplorePageCheckin'

/**
 * Debounced search and its route sync, realtime post rows, topic and category feeds,
 * and page lifecycle. The mount hooks register after the rest of setup, ahead of
 * `useCheckinWindow()`, so hook order matches the original page; the check-in
 * composer gates that read the window follow it.
 */
export function useExplorePageSearch(ctx: ReturnType<typeof useExplorePageDiscover> & ReturnType<typeof useExplorePageCheckin>) {
  const { route, router, apiFetchData, invalidateMyGroups, isAuthed, canAccessCheckins, toast, openComposer, searchInputRef, hydrated, onGlobalKeyDown, addOnlineFeedCallback, removeOnlineFeedCallback, subscribeOnlineFeed, unsubscribeOnlineFeed, addPostsCallback, removePostsCallback, subscribePosts, unsubscribePosts, onlineFeedCb, normalizeQueryParam, getRouteQ, searchQuery, searchQueryTrimmed, isSearching, searchActive, searchTab, activeTopic, activeCategory, featuredPosts, categories, trendingPosts, exploreGroups, refreshDiscover, joinExploreGroupId, checkinState, hasCheckedInToday, checkinAllowedVisibilities, onVisibilityChange, createCheckinViaComposer, topicLabelByValue } = ctx

  const DEBOUNCE_MS = 400
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let isUpdatingRouteFromInput = false

  function clearSearchResults() {
    exploreSearch.clear()
  }

  function clearSearch() { searchQuery.value = ''; clearSearchResults(); searchInputRef.value?.focus() }

  function cancelSearch() {
    searchActive.value = false
    searchQuery.value = ''
    clearSearchResults()
    searchInputRef.value?.blur()
    void router.replace({ query: { ...route.query, q: undefined, tab: undefined } })
  }

  async function joinExploreGroup(g: CommunityGroupShell) {
    if (!isAuthed.value || joinExploreGroupId.value) return
    const id = (g?.id ?? '').trim()
    if (!id) return
    joinExploreGroupId.value = id
    try {
      const result = await apiFetchData<{ ok: boolean; status: 'active' | 'pending' }>(
        `/groups/${encodeURIComponent(id)}/join`,
        { method: 'POST', body: {} },
      )
      const status = result?.status === 'pending' ? 'pending' : 'active'
      exploreGroups.value = exploreGroups.value.map((row) =>
        row.id === id ? applyCommunityGroupJoin(row, status) : row,
      )
      searchGroups.value = searchGroups.value.map((row) =>
        row.id === id ? applyCommunityGroupJoin(row, status) : row,
      )
      invalidateMyGroups()
      toast.push(communityGroupJoinToast(status, g.name))
      void refreshDiscover()
      if (isSearching.value) void exploreSearch.search()
    } catch (e: unknown) {
      toast.pushError(e, 'Could not join group.')
    } finally {
      joinExploreGroupId.value = null
    }
  }

  function setRouteQueryQ(nextQ: string) {
    const trimmed = nextQ.trim()
    const current = getRouteQ()
    if (trimmed === current) return

    const nextQuery: Record<string, any> = { ...route.query }
    if (trimmed) nextQuery.q = trimmed
    else { delete nextQuery.q; delete nextQuery.tab }

    isUpdatingRouteFromInput = true
    Promise.resolve(router.replace({ path: route.path, query: nextQuery }))
      .catch(() => {
        // ignore: route updates should never break typing
      })
      .finally(() => {
        isUpdatingRouteFromInput = false
      })
  }

  function flushDebounceAndSearch(submittedQuery?: string) {
    if (debounceTimer != null) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    // Use the explicitly submitted query (from the typeahead row click) if provided.
    const q = (submittedQuery ?? searchQueryTrimmed.value).trim()
    if (q) searchQuery.value = q
    if (q.length >= 2) {
      setRouteQueryQ(q)
    } else {
      setRouteQueryQ(q)
      clearSearchResults()
    }
  }

  function selectTopic(topic: string) {
    const t = String(topic ?? '').trim()
    if (!t) return
    // Topic click: set a dedicated topic mode so we fetch topic-specific posts (not generic search).
    const nextQuery: Record<string, any> = { ...route.query }
    delete nextQuery.q
    // If the user is explicitly selecting a topic (not coming from category view),
    // drop category so the UI doesn't stay "pinned" to an unrelated category.
    if (!activeCategory.value) delete nextQuery.category
    nextQuery.topic = t
    // Use push so browser Back returns to Explore (not previous page).
    Promise.resolve(router.push({ path: route.path, query: nextQuery })).catch(() => {})
  }

  function selectCategory(category: string, source?: string) {
    const c = String(category ?? '').trim()
    if (!c) return
    if (source) {
      useNuxtApp().$posthog?.capture('explore_category_selected', { category: c, source })
    }
    const nextQuery: Record<string, any> = { ...route.query }
    delete nextQuery.q
    delete nextQuery.topic
    nextQuery.category = c
    Promise.resolve(router.push({ path: route.path, query: nextQuery })).catch(() => {})
  }

  function scheduleDebouncedSearch() {
    if (debounceTimer != null) clearTimeout(debounceTimer)
    debounceTimer = null
    const trimmed = searchQueryTrimmed.value
    if (trimmed.length >= 2) {
      debounceTimer = setTimeout(() => {
        debounceTimer = null
        setRouteQueryQ(trimmed)
      }, DEBOUNCE_MS)
    } else {
      setRouteQueryQ(trimmed)
      clearSearchResults()
    }
  }

  const committedSearchQuery = computed(() => getRouteQ())
  const exploreSearch = useExploreSearch({ query: committedSearchQuery, tab: searchTab })
  const {
    users,
    articles,
    posts,
    groups: searchGroups,
    loading,
    loadingMore,
    error: searchError,
    searchedOnce,
    source: activeSearchSource,
    tagSuggestions,
    gatedResultCount,
    hasMore,
    loadMore,
  } = exploreSearch

  function onSearchPostDeleted(id: string) {
    // Immediately remove from search results so the list feels responsive.
    exploreSearch.removePost(id)
  }

  function onSearchPostEdited(payload: { id: string; post: import('~/types/api').FeedPost }) {
    exploreSearch.replacePost(payload?.id, payload.post)
  }

  function chainIdsForPost(post: FeedPost): string[] {
    const ids: string[] = []
    let p: FeedPost | undefined = post
    while (p?.id) {
      ids.push(p.id)
      p = p.parent
    }
    return ids
  }

  function removePostFromExploreLists(postId: string) {
    const pid = String(postId ?? '').trim()
    if (!pid) return
    posts.value = posts.value.filter((p) => p.id !== pid)
    topicPosts.value = topicPosts.value.filter((p) => p.id !== pid)
    categoryPosts.value = categoryPosts.value.filter((p) => p.id !== pid)
    featuredPosts.value = featuredPosts.value.filter((p) => p.id !== pid)
    trendingPosts.value = trendingPosts.value.filter((p) => p.id !== pid)
  }

  const exploreSubscribedPostIds = ref<string[]>([])

  const explorePostsCb: PostsCallback = {
    onLiveUpdated: (payload) => {
      const postId = String(payload?.postId ?? '').trim()
      if (!postId) return
      if (payload?.patch?.deletedAt) {
        removePostFromExploreLists(postId)
      }
    },
  }

  function collectExplorePostIds(): string[] {
    const ids = new Set<string>()
    for (const p of [
      ...posts.value,
      ...topicPosts.value,
      ...categoryPosts.value,
      ...featuredPosts.value,
      ...trendingPosts.value,
    ]) {
      for (const id of chainIdsForPost(p)) ids.add(id)
    }
    return [...ids]
  }

  function syncExplorePostSubscriptions() {
    const next = collectExplorePostIds()
    const prevSet = new Set(exploreSubscribedPostIds.value)
    const nextSet = new Set(next)
    const toSub = next.filter((id) => !prevSet.has(id))
    const toUnsub = exploreSubscribedPostIds.value.filter((id) => !nextSet.has(id))
    if (toUnsub.length) unsubscribePosts(toUnsub)
    if (toSub.length) subscribePosts(toSub)
    exploreSubscribedPostIds.value = next
  }

  watch(
    () => route.query.q,
    (q) => {
      const trimmed = normalizeQueryParam(q)
      // Only sync route -> input when the user didn't just type it.
      // This keeps the input stable while results update under it.
      if (!isUpdatingRouteFromInput && trimmed !== searchQueryTrimmed.value) {
        searchQuery.value = trimmed
      }

      if (trimmed.length >= 2) {
        activeSearchSource.value = isUpdatingRouteFromInput ? 'explore' : 'external'
        void exploreSearch.search()
      } else {
        clearSearchResults()
      }
    },
    { immediate: true },
  )

  watch(searchQuery, () => {
    const trimmed = searchQueryTrimmed.value
    if (trimmed !== getRouteQ()) {
      clearSearchResults()
      loading.value = trimmed.length >= 2
      scheduleDebouncedSearch()
    }
  })

  // Topic feed (uses API endpoint specifically for topics)
  const topicFeed = useTopicPostsFeed(activeTopic)
  const {
    posts: topicPosts,
    loading: topicLoading,
    loadingMore: topicLoadingMore,
    error: topicError,
    hasMore: topicHasMore,
    initialLoading: topicLoadingInitial,
    loadMore: loadMoreTopic,
  } = topicFeed

  function clearTopic() {
    const nextQuery: Record<string, any> = { ...route.query }
    delete nextQuery.topic
    // Use push so browser Back returns to topic view if desired.
    Promise.resolve(router.push({ path: route.path, query: nextQuery })).catch(() => {})
  }

  // Category feed (uses API endpoint specifically for categories)
  const categoryFeed = useCategoryPostsFeed(activeCategory)
  const {
    posts: categoryPosts,
    topics: categoryTopics,
    loading: categoryLoading,
    loadingMore: categoryLoadingMore,
    error: categoryError,
    hasMore: categoryHasMore,
    initialLoading: categoryLoadingInitial,
    loadMore: loadMoreCategory,
  } = categoryFeed

  watch(
    [posts, topicPosts, categoryPosts, featuredPosts, trendingPosts],
    () => syncExplorePostSubscriptions(),
    { deep: true },
  )

  const activeCategoryLabel = computed(() => {
    const key = activeCategory.value
    if (!key) return null
    const row = (categories.value ?? []).find((c) => c.category === key)
    return row?.label ?? null
  })

  const categoryTopicsUi = computed(() => {
    const raw = (categoryTopics.value ?? []) as Topic[]
    return raw
      .filter((t) => (t.postCount ?? 0) > 0)
      .sort((a, b) => (b.postCount ?? 0) - (a.postCount ?? 0) || (b.score ?? 0) - (a.score ?? 0) || a.topic.localeCompare(b.topic))
      .slice(0, 24)
      .map((t) => ({
        value: t.topic,
        label: topicLabelByValue.value.get(t.topic) ?? t.topic,
      }))
  })

  function clearCategory() {
    const nextQuery: Record<string, any> = { ...route.query }
    delete nextQuery.category
    Promise.resolve(router.push({ path: route.path, query: nextQuery })).catch(() => {})
  }

  function selectTopicInCategory(topic: string) {
    const t = String(topic ?? '').trim()
    if (!t) return
    const nextQuery: Record<string, any> = { ...route.query }
    delete nextQuery.q
    nextQuery.topic = t
    // Keep category pinned for breadcrumb/back behavior.
    if (!nextQuery.category && activeCategory.value) nextQuery.category = activeCategory.value
    Promise.resolve(router.push({ path: route.path, query: nextQuery })).catch(() => {})
  }

  watch(
    () => route.query.topic,
    (t) => {
      const topic = normalizeQueryParam(t)
      if (!topic) {
        topicFeed.clear()
        return
      }
      // Clear search UI when switching to topic mode
      if (searchQuery.value) searchQuery.value = ''
      clearSearchResults()
      void topicFeed.refresh()
    },
    { immediate: true },
  )

  watch(
    () => route.query.category,
    (cRaw) => {
      const c = normalizeQueryParam(cRaw)
      if (!c) {
        categoryFeed.clear()
        return
      }
      // Clear search UI when switching to category mode
      if (searchQuery.value) searchQuery.value = ''
      clearSearchResults()
      void categoryFeed.refresh()
    },
    { immediate: true },
  )

  onMounted(() => {
    hydrated.value = true
    window.addEventListener('keydown', onGlobalKeyDown)
    document.addEventListener('visibilitychange', onVisibilityChange)
    addOnlineFeedCallback(onlineFeedCb)
    subscribeOnlineFeed()
    addPostsCallback(explorePostsCb)
    syncExplorePostSubscriptions()
  })

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onGlobalKeyDown)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    removeOnlineFeedCallback(onlineFeedCb)
    unsubscribeOnlineFeed()
    removePostsCallback(explorePostsCb)
    if (exploreSubscribedPostIds.value.length) unsubscribePosts(exploreSubscribedPostIds.value)
    exploreSearch.cancel()
    if (debounceTimer != null) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  })

  const { isOpen: checkinWindowOpen } = useCheckinWindow()

  const canOpenCheckinComposer = computed(() => checkinWindowOpen.value && Boolean(openComposer) && checkinAllowedVisibilities.value.length > 0)

  function openCheckinComposer() {
    const current = checkinState.value
    if (!current?.prompt) return
    const snapshot = { prompt: current.prompt, dayKey: current.dayKey }
    if (!checkinWindowOpen.value) return
    if (!canOpenCheckinComposer.value) return
    openComposer?.({
      checkinPrompt: snapshot.prompt,
      allowedVisibilities: ['verifiedOnly'],
      disableMedia: true,
      createPost: (body, visibility) => createCheckinViaComposer(snapshot, body, visibility),
    })
  }

  function goToCheckinsFeed() {
    void navigateTo('/check-ins/trending')
  }

  const canShowSearchCheckinHint = computed(
    () => Boolean(canAccessCheckins.value && checkinState.value && (hasCheckedInToday.value || canOpenCheckinComposer.value)),
  )

  return {
    committedSearchQuery,
    clearSearch,
    cancelSearch,
    joinExploreGroup,
    flushDebounceAndSearch,
    selectTopic,
    selectCategory,
    exploreSearch,
    users,
    articles,
    posts,
    searchGroups,
    loading,
    loadingMore,
    searchError,
    searchedOnce,
    tagSuggestions,
    gatedResultCount,
    hasMore,
    loadMore,
    onSearchPostDeleted,
    onSearchPostEdited,
    topicPosts,
    topicLoading,
    topicLoadingMore,
    topicError,
    topicHasMore,
    topicLoadingInitial,
    loadMoreTopic,
    clearTopic,
    categoryPosts,
    categoryLoading,
    categoryLoadingMore,
    categoryError,
    categoryHasMore,
    categoryLoadingInitial,
    loadMoreCategory,
    activeCategoryLabel,
    categoryTopicsUi,
    clearCategory,
    selectTopicInCategory,
    openCheckinComposer,
    goToCheckinsFeed,
    canShowSearchCheckinHint,
  }
}
