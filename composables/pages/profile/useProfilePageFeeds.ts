import type { FollowRelationship } from '~/types/api'
import type { ProfilePostsFilter } from '~/utils/post-visibility'
import { visibilityTagClasses } from '~/utils/post-visibility'
import type { UserPostsFilter } from '~/composables/useUserPosts'
import type { useProfilePageRoute, useProfilePageProfile } from './useProfilePage'

/**
 * Posts, replies, articles, and media feeds; the pinned post; follow summary and
 * relationship; block state.
 */
export function useProfilePageFeeds(ctx: ReturnType<typeof useProfilePageRoute> & ReturnType<typeof useProfilePageProfile>) {
  const { normalizedUsername, authUser, refetchMe, profile, notFound, isSelf, effectivePinnedPostId, showAds, profileFilter, profileSort, activeProfileTab, effectiveProfileCtaKind, tabActivated } = ctx

  // ─── Posts-only feed (top-level, no replies) ──────────────────────────────────
  const {
    displayItems: postsOnlyItems,
    collapsedSiblingReplyCountFor: postsOnlyCollapsedSiblingReplyCountFor,
    counts: postsOnlyCounts,
    loading: postsOnlyLoading,
    loadingMore: postsOnlyLoadingMore,
    error: postsOnlyError,
    hasLoadedOnce: postsOnlyHasLoadedOnce,
    nextCursor: postsOnlyNextCursor,
    loadMore: postsOnlyLoadMore,
    removePost: postsOnlyRemovePost,
    replacePost: postsOnlyReplacePost,
    prependPost: postsOnlyPrependPost,
  } = useUserPosts(normalizedUsername, {
    enabled: computed(() => !notFound.value),
    showAds,
    cookieKeyPrefix: 'moh.profile.posts.topLevel',
    topLevelOnly: true,
    externalFilter: profileFilter as Ref<UserPostsFilter>,
    externalSort: profileSort,
    includeRestricted: true,
    realtime: true,
  })

  // ─── Replies feed (all posts including replies) ───────────────────────────────
  const repliesEnabled = computed(() => !notFound.value && tabActivated.replies)
  const {
    posts: profilePosts,
    displayItems: profileDisplayItems,
    collapsedSiblingReplyCountFor: profileCollapsedSiblingReplyCountFor,
    loading: profileLoading,
    loadingMore: profileLoadingMore,
    error: profileError,
    hasLoadedOnce: profileHasLoadedOnce,
    nextCursor: profileNextCursor,
    loadMore: profileLoadMore,
    removePost: profileRemovePost,
    replacePost: profileReplacePost,
    prependPost: profilePrependPost,
  } = useUserPosts(normalizedUsername, {
    enabled: repliesEnabled,
    showAds,
    cookieKeyPrefix: 'moh.profile.posts.withReplies',
    externalFilter: profileFilter as Ref<UserPostsFilter>,
    externalSort: profileSort,
    includeRestricted: true,
    realtime: true,
  })

  // ─── Articles feed ────────────────────────────────────────────────────────────
  const articlesEnabled = computed(() => !notFound.value && tabActivated.articles)
  const profileArticlesFeed = useArticleFeed({
    authorUsername: normalizedUsername,
    sort: profileSort,
    visibility: profileFilter as Ref<ProfilePostsFilter>,
    enabled: articlesEnabled,
    includeRestricted: true,
  })

  // ─── Media feed ───────────────────────────────────────────────────────────────
  const mediaEnabled = computed(() => !notFound.value && tabActivated.media)
  const mediaVisibilityFilter = computed<ProfilePostsFilter>(() => 'all')
  const profileMediaFeed = useUserMedia(normalizedUsername, {
    enabled: mediaEnabled,
    visibility: mediaVisibilityFilter,
    sort: profileSort,
    includeRestricted: true,
  })
  const postsOnlyInitialLoading = computed(
    () => !postsOnlyHasLoadedOnce.value && !postsOnlyError.value && postsOnlyItems.value.length === 0,
  )
  const repliesInitialLoading = computed(
    () => !profileHasLoadedOnce.value && !profileError.value && itemsWithoutPinned.value.length === 0 && !pinnedPostForDisplay.value,
  )
  const articlesInitialLoading = computed(
    () => !profileArticlesFeed.hasLoadedOnce.value && !profileArticlesFeed.error.value && profileArticlesFeed.articles.value.length === 0,
  )
  const mediaInitialLoading = computed(
    () => !profileMediaFeed.hasLoadedOnce.value && !profileMediaFeed.error.value && profileMediaFeed.items.value.length === 0,
  )

  function onProfilePostEdited(payload: { id: string; post: import('~/types/api').FeedPost }) {
    profileReplacePost(payload.post)
    postsOnlyReplacePost(payload.post)
  }

  const {
    pinnedPostForDisplay,
    pinnedReplyToUsername,
    refreshPinnedPost,
  } = useProfilePinnedPost({
    normalizedUsername,
    effectivePinnedPostId,
    profilePosts,
    activeFilter: profileFilter as Ref<ProfilePostsFilter>,
  })
  const showPinnedPost = computed(() => activeProfileTab.value !== 'media' && !effectiveProfileCtaKind.value && Boolean(pinnedPostForDisplay.value))
  const visiblePinnedPostId = computed(() => pinnedPostForDisplay.value?.id ?? null)

  const itemsWithoutPinned = computed(() => {
    const list = profileDisplayItems.value ?? []
    const pid = visiblePinnedPostId.value
    if (!pid) return list
    return list.filter((item) => item.kind !== 'post' || item.post.id !== pid)
  })

  function pinnedBadgeClasses(visibility: import('~/types/api').PostVisibility): string {
    const tag = visibilityTagClasses(visibility)
    if (tag) return tag
    return 'border border-gray-400/50 bg-gray-800/70 text-white dark:border-gray-500/50 dark:bg-gray-200/20 dark:text-gray-100'
  }

  const { apiFetchData } = useApiClient()
  async function onPinnedPostDeleted(id: string) {
    if (effectivePinnedPostId.value !== id) return
    try {
      await apiFetchData<{ pinnedPostId: null }>('/users/me/pinned-post', { method: 'DELETE' })
      await refetchMe()
    } catch {
      // ignore
    }
    refreshPinnedPost()
    profileRemovePost(id)
  }

  const {
    data: followSummaryData,
    refresh: refreshFollowSummary,
  } = useAsyncData(() => `follow-summary:${normalizedUsername.value}`, async () => {
    if (notFound.value) return null
    return await apiFetchData<import('~/types/api').FollowSummaryResponse>(
      `/follows/summary/${encodeURIComponent(normalizedUsername.value)}`,
      { method: 'GET' }
    )
  }, { server: false, watch: [normalizedUsername] })

  watch(
    () => authUser.value?.id ?? null,
    () => void refreshFollowSummary(),
    { flush: 'post' }
  )

  const followSummary = computed(() => followSummaryData.value ?? null)
  const followRelationship = computed<FollowRelationship | null>(() => {
    const s = followSummary.value
    if (!s) return null
    return {
      viewerFollowsUser: s.viewerFollowsUser,
      userFollowsViewer: s.userFollowsViewer,
      viewerPostNotificationsEnabled: s.viewerPostNotificationsEnabled,
      viewerNotificationPreference: s.viewerNotificationPreference,
    }
  })

  const relationshipTagLabel = computed(() => {
    if (isSelf.value) return null
    const s = followSummary.value
    if (!s) return null
    if (s.userFollowsViewer && s.viewerFollowsUser) return 'You follow each other'
    if (s.userFollowsViewer) return 'Follows you'
    return null
  })

  const followState = useFollowState()
  watch(
    [() => profile.value?.id, followRelationship],
    ([id, rel]) => {
      if (!id || !rel) return
      followState.set(id, rel)
    },
    { immediate: true }
  )

  const blockState = useBlockState()
  const toast = useAppToast()

  // Block status from the profile API response (viewer-specific).
  const viewerHasBlockedProfile = computed(() =>
    Boolean(profile.value?.viewerHasBlockedUser) || blockState.isBlockedByMe(profile.value?.id ?? ''),
  )
  const profileHasBlockedViewer = computed(() => Boolean(profile.value?.userHasBlockedViewer))
  const isBlockedWithProfile = computed(() => viewerHasBlockedProfile.value || profileHasBlockedViewer.value)
  const profileBlockHandle = computed(() => {
    const u = profile.value?.username
    return u ? `@${u}` : 'this user'
  })

  const { run: runBlock, pending: blockingProfile } = useAsyncAction()
  const { confirm } = useAppConfirm()

  async function openBannerUnblockConfirm() {
    const ok = await confirm({
      header: `Unblock ${profileBlockHandle.value}?`,
      message: "They'll be able to see your posts and engage with them again.",
      confirmLabel: 'Unblock',
      confirmSeverity: 'primary',
    })
    if (!ok || blockingProfile.value || !profile.value?.id) return
    const profileId = profile.value.id
    await runBlock(async () => {
      await blockState.unblockUser(profileId)
      toast.push({ title: `${profileBlockHandle.value} unblocked`, message: 'You can now engage with their posts.', tone: 'success', durationMs: 3000 })
    }, { error: 'Failed to unblock.' })
  }

  const showFollowCounts = computed(() => {
    if (!profile.value?.id) return false
    if (!followSummary.value) return false
    return isSelf.value || followSummary.value.canView
  })

  return {
    postsOnlyItems,
    postsOnlyCollapsedSiblingReplyCountFor,
    postsOnlyCounts,
    postsOnlyLoading,
    postsOnlyLoadingMore,
    postsOnlyError,
    postsOnlyHasLoadedOnce,
    postsOnlyNextCursor,
    postsOnlyLoadMore,
    postsOnlyRemovePost,
    postsOnlyReplacePost,
    postsOnlyPrependPost,
    profilePosts,
    profileCollapsedSiblingReplyCountFor,
    profileLoading,
    profileLoadingMore,
    profileError,
    profileHasLoadedOnce,
    profileNextCursor,
    profileLoadMore,
    profileRemovePost,
    profilePrependPost,
    profileArticlesFeed,
    profileMediaFeed,
    postsOnlyInitialLoading,
    repliesInitialLoading,
    articlesInitialLoading,
    mediaInitialLoading,
    onProfilePostEdited,
    pinnedPostForDisplay,
    pinnedReplyToUsername,
    showPinnedPost,
    itemsWithoutPinned,
    pinnedBadgeClasses,
    onPinnedPostDeleted,
    followSummaryData,
    refreshFollowSummary,
    followSummary,
    followRelationship,
    relationshipTagLabel,
    viewerHasBlockedProfile,
    isBlockedWithProfile,
    profileBlockHandle,
    blockingProfile,
    openBannerUnblockConfirm,
    showFollowCounts,
  }
}
