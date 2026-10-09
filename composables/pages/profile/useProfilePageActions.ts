import { usePresenceCallback } from '~/composables/presence/usePresenceCallback'
import type { PublicProfile } from '~/composables/usePublicProfile'
import type { ProfilePostsFilter } from '~/utils/post-visibility'
import { settleCrosspostPending } from '~/utils/feed-patch'
import type { useProfilePageRoute, useProfilePageProfile, ProfileTabKey } from './useProfilePage'
import type { useProfilePageFeeds } from './useProfilePageFeeds'
import type { WsNotificationsNewPayload } from '~/types/api'

/**
 * Realtime notification and composer wiring, follow lists, load-more observers,
 * feed sort/filter actions, the image lightbox, edit-profile intents, and the app header.
 */
export function useProfilePageActions(ctx: ReturnType<typeof useProfilePageRoute> & ReturnType<typeof useProfilePageProfile> & ReturnType<typeof useProfilePageFeeds>) {
  const { route, normalizedUsername, baseProfilePath, pushProfilePath, isFollowersRoute, isFollowingRoute, isAffiliatesRoute, authUser, refetchMe, data, profile, notFound, appHeader, profileName, onProfileStatPointerDown, usersStore, invalidateUserPreviewCache, isSelf, canEditProfile, profileFilter, profileSort, activeProfileTab, profileTabBarEl, postsOnlyCounts, postsOnlyNextCursor, postsOnlyLoadMore, postsOnlyPrependPost, profilePosts, profileNextCursor, profileLoadMore, profilePrependPost, profileMediaFeed, followSummaryData, refreshFollowSummary, followSummary } = ctx

  // Realtime nudges: if you are already viewing this user's profile and they nudge you,
  // update the local followSummary.nudge immediately so the header shows "Nudge back",
  // then refresh from the API to keep outbound/inbound state consistent.
    const notificationsCb = {
    onNew: (payload: WsNotificationsNewPayload) => {
      const n = payload?.notification ?? null
      if (!n || n.kind !== 'nudge') return
      const actorUsername = (n.actor?.username ?? '').trim().toLowerCase()
      if (!actorUsername) return
      if (actorUsername !== normalizedUsername.value) return
      if (isSelf.value) return

      const s = followSummaryData.value
      if (s) {
        const prev = s.nudge ?? { outboundPending: false, inboundPending: false, inboundNotificationId: null, outboundExpiresAt: null }
        followSummaryData.value = {
          ...s,
          nudge: {
            ...prev,
            inboundPending: true,
            inboundNotificationId: n.id ?? prev.inboundNotificationId ?? null,
          },
        }
      }

      void refreshFollowSummary()
    },
  } as const

  // When the viewer is on their own profile, prepend newly created posts to the posts-only list
  // so new posts appear at the top immediately (same behaviour as home feed).
  const { registerProfilePrepend } = useProfileFeedPrepend()
  let unregisterProfilePrepend: (() => void) | null = null
  let unregisterReplyPending: (() => void) | null = null
  const replyModal = useReplyModal()
  const pendingPosts = usePendingPostsManager()

  // Content patches (counts, body, flags, boost) for posts on this profile are handled
  // globally by plugins/post-cache.client.ts — PostRow reads fresh data from usePostCache.
  // Post-room subscriptions (so the server delivers those events for the posts on
  // screen) are wired by useUserPosts via `realtime: true` above.

  usePresenceCallback('Notifications', notificationsCb)
  if (import.meta.client) {
    onMounted(() => {
      document.addEventListener('pointerdown', onProfileStatPointerDown, { capture: true })
      if (isSelf.value) {
        unregisterProfilePrepend = registerProfilePrepend((post) => {
          if (!post.parentId) {
            // Top-level posts appear in both the Posts tab and the Replies tab.
            postsOnlyPrependPost(post)
          }
          // All posts (top-level and replies) appear in the Replies tab.
          profilePrependPost(post)
        })

        // Handle replies submitted while viewing the Replies tab: insert the optimistic
        // row under the parent post immediately, then swap in the real post on success.
        const replyCb = (payload: import('~/composables/useReplyModal').ReplyPendingPayload) => {
          const replyWithParent: import('~/types/api').FeedPost = {
            ...payload.optimisticPost,
            parent: payload.parentPost,
          }

          // Insert after the parent row if it's visible; otherwise prepend to the top.
          const parentIdx = profilePosts.value.findIndex((p) => p.id === payload.parentPost.id)
          if (parentIdx >= 0) {
            const next = profilePosts.value.slice()
            next.splice(parentIdx + 1, 0, replyWithParent)
            profilePosts.value = next
          } else {
            profilePosts.value = [replyWithParent, ...profilePosts.value]
          }

          pendingPosts.submit({
            localId: payload.localId,
            optimisticPost: replyWithParent,
            perform: payload.perform,
            callbacks: {
              insert: () => {},
              replace: (localId, real) => {
                const idx = profilePosts.value.findIndex((p) => p._localId === localId)
                if (idx < 0) return
                const existing = profilePosts.value[idx]
                const parent = real.parent ?? existing?.parent
                const merged: import('~/types/api').FeedPost = {
                  ...real,
                  parent,
                  // Keep _localId so the v-for :key stays stable across the
                  // optimistic→real swap (no remount, no jitter).
                  _localId: existing?._localId,
                  _pending: undefined,
                  _pendingError: undefined,
                  _crosspostPending: settleCrosspostPending(
                    real._crosspostPending ?? existing?._crosspostPending,
                    real,
                  ),
                }
                const next = profilePosts.value.slice()
                next[idx] = merged
                profilePosts.value = next
              },
              markFailed: (localId, errorMessage) => {
                profilePosts.value = profilePosts.value.map((p) =>
                  p._localId === localId ? { ...p, _pending: 'failed' as const, _pendingError: errorMessage } : p,
                )
              },
              markPosting: (localId) => {
                profilePosts.value = profilePosts.value.map((p) =>
                  p._localId === localId ? { ...p, _pending: 'posting' as const, _pendingError: null } : p,
                )
              },
              remove: (localId) => {
                profilePosts.value = profilePosts.value.filter((p) => p._localId !== localId)
              },
            },
          })
        }
        unregisterReplyPending = replyModal.registerOnReplyPending(replyCb)
      }
    })
    onBeforeUnmount(() => {
      document.removeEventListener('pointerdown', onProfileStatPointerDown, true)
      unregisterProfilePrepend?.()
      unregisterProfilePrepend = null
      unregisterReplyPending?.()
      unregisterReplyPending = null
    })
  }

  function onFollowed() {
    const s = followSummary.value
    if (!s || s.followerCount === null) return
    followSummaryData.value = { ...s, viewerFollowsUser: true, followerCount: s.followerCount + 1 }
  }

  function onUnfollowed() {
    const s = followSummary.value
    if (!s || s.followerCount === null) return
    followSummaryData.value = { ...s, viewerFollowsUser: false, followerCount: Math.max(0, s.followerCount - 1) }
  }

  function onNudgeUpdated(next: import('~/types/api').NudgeState | null) {
    const s = followSummaryData.value
    if (s) {
      followSummaryData.value = { ...s, nudge: next }
    }
    void refreshFollowSummary()
  }

  const {
    followersOpen,
    followers,
    followersNextCursor,
    followersLoading,
    followersError,
    followingOpen,
    following,
    followingNextCursor,
    followingLoading,
    followingError,
    openFollowers,
    openFollowing,
    loadMoreFollowers,
    loadMoreFollowing,
    affiliatesOpen,
    affiliates,
    affiliatesNextCursor,
    affiliatesLoading,
    affiliatesError,
    openAffiliates,
    loadMoreAffiliates,
  } = useProfileFollowDialogs(normalizedUsername)

  function goToFollowers() {
    pushProfilePath(`${baseProfilePath.value}/followers`)
  }
  function goToFollowing() {
    pushProfilePath(`${baseProfilePath.value}/following`)
  }
  function goToAffiliates() {
    pushProfilePath(`${baseProfilePath.value}/affiliates`)
  }

  // Route-driven modal state:
  // - Visiting /u/:username/followers or /following opens the correct modal immediately.
  // - Closing the modal navigates back to /u/:username.
  watch(
    [isFollowersRoute, isFollowingRoute, isAffiliatesRoute],
    ([followersRoute, followingRoute, affiliatesRoute]) => {
      if (followersRoute) {
        followingOpen.value = false
        affiliatesOpen.value = false
        openFollowers()
        return
      }
      if (followingRoute) {
        followersOpen.value = false
        affiliatesOpen.value = false
        openFollowing()
        return
      }
      if (affiliatesRoute) {
        followersOpen.value = false
        followingOpen.value = false
        openAffiliates()
        return
      }
      // Base route: ensure all three are closed.
      followersOpen.value = false
      followingOpen.value = false
      affiliatesOpen.value = false
    },
    { immediate: true },
  )

  watch(
    followersOpen,
    (open) => {
      if (open) return
      if (isFollowersRoute.value) pushProfilePath(baseProfilePath.value)
    },
  )
  watch(
    followingOpen,
    (open) => {
      if (open) return
      if (isFollowingRoute.value) pushProfilePath(baseProfilePath.value)
    },
  )
  watch(
    affiliatesOpen,
    (open) => {
      if (open) return
      if (isAffiliatesRoute.value) pushProfilePath(baseProfilePath.value)
    },
  )

  const middleScrollerEl = useMiddleScroller()
  const profileLoadMoreSentinelEl = ref<HTMLElement | null>(null)
  const postsOnlyLoadMoreSentinelEl = ref<HTMLElement | null>(null)
  const mediaLoadMoreSentinelEl = ref<HTMLElement | null>(null)

  useLoadMoreObserver(profileLoadMoreSentinelEl, middleScrollerEl, computed(() => Boolean(profileNextCursor.value)), profileLoadMore)
  useLoadMoreObserver(postsOnlyLoadMoreSentinelEl, middleScrollerEl, computed(() => Boolean(postsOnlyNextCursor.value)), postsOnlyLoadMore)
  useLoadMoreObserver(mediaLoadMoreSentinelEl, middleScrollerEl, computed(() => Boolean(profileMediaFeed.nextCursor.value)), profileMediaFeed.loadMore)

  const profileFeedContentEl = ref<HTMLElement | null>(null)
  const { scrollToTop: scrollFeedToTop } = useFeedScrollToTop(profileFeedContentEl, profileTabBarEl)

  function setProfileTab(key: ProfileTabKey) {
    if (activeProfileTab.value === key) return
    const path = key === 'posts' ? baseProfilePath.value : `${baseProfilePath.value}/${key}`
    pushProfilePath(path)
    scrollFeedToTop()
  }

  function onUserPostsSortChange(next: 'new' | 'trending') {
    profileSort.value = next
    scrollFeedToTop()
  }

  function onUserPostsFilterChange(next: ProfilePostsFilter) {
    // onlyMe is not a valid feed filter; treat it as 'all'
    profileFilter.value = next === 'onlyMe' ? 'all' : (next as 'all' | 'public' | 'verifiedOnly' | 'premiumOnly')
    scrollFeedToTop()
  }

  const profileAvatarUrl = computed(() => profile.value?.avatarUrl ?? null)
  const profileBannerUrl = computed(() => profile.value?.bannerUrl ?? null)

  const viewer = useImageLightbox()
  const { openFromEvent } = viewer
  const hideBannerThumb = computed(() => viewer.visible.value && viewer.kind.value === 'banner')
  const hideAvatarThumb = computed(() => viewer.visible.value && viewer.kind.value === 'avatar')
  const hideAvatarDuringBanner = computed(() => viewer.visible.value && viewer.kind.value === 'banner')

  const editOpen = ref(false)
  const followSuggestionsOpen = ref(false)
  const pendingEditProfile = useState('pending-edit-profile', () => false)
  const consumedEditIntent = ref(false)
  const presentingEditProfile = ref(false)

  watch(
    () => [route.query.edit, pendingEditProfile.value, canEditProfile.value] as const,
    async ([edit, pending, canEdit]) => {
      if (consumedEditIntent.value || presentingEditProfile.value || !canEdit) return
      if (edit !== '1' && !pending) return
      presentingEditProfile.value = true
      try {
        if (isSelf.value) await refetchMe()
        await refreshNuxtData(`public-profile:${normalizedUsername.value}`)
        consumedEditIntent.value = true
        pendingEditProfile.value = false
        if (edit === '1' && import.meta.client) {
          const url = new URL(location.href)
          url.searchParams.delete('edit')
          history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`)
        }
        editOpen.value = true
      } finally {
        presentingEditProfile.value = false
      }
    },
    { immediate: true },
  )

  function onOpenProfileImage(payload: {
    event: MouseEvent
    url: string
    title: string
    kind: 'avatar' | 'banner'
    isOrganization?: boolean
    originRect?: { left: number; top: number; width: number; height: number }
  }) {
    if (payload.kind === 'avatar') {
      void openFromEvent(payload.event, payload.url, payload.title, payload.kind, {
        avatarBorderRadius: payload.isOrganization ? '16%' : '9999px',
        avatarVideo: profile.value?.avatarVideo,
        originRect: payload.originRect,
      })
      return
    }
    void openFromEvent(payload.event, payload.url, payload.title, payload.kind, {
      originRect: payload.originRect,
    })
  }

  function patchPublicProfile(patch: Partial<Pick<
    PublicProfile,
    'name' | 'bio' | 'avatarUrl' | 'avatarVideo' | 'bannerUrl' | 'locationZip' | 'locationDisplay' | 'locationCity' | 'locationCounty' | 'locationState' | 'locationCountry'
  >>) {
    if (!data.value) return
    data.value = { ...(data.value as PublicProfile), ...patch }
    const profileId = profile.value?.id ?? authUser.value?.id ?? null
    if (profileId) {
      usersStore.upsert({
        id: profileId,
        username: profile.value?.username ?? authUser.value?.username ?? null,
        name: (patch.name ?? profile.value?.name ?? authUser.value?.name) ?? null,
        bio: (patch.bio ?? profile.value?.bio ?? authUser.value?.bio) ?? null,
        avatarUrl: profile.value?.avatarUrl ?? null,
        avatarVideo: profile.value?.avatarVideo ?? null,
        bannerUrl: profile.value?.bannerUrl ?? null,
        premium: profile.value?.premium ?? authUser.value?.premium,
        premiumPlus: profile.value?.premiumPlus ?? authUser.value?.premiumPlus,
        verifiedStatus: profile.value?.verifiedStatus ?? authUser.value?.verifiedStatus,
        pinnedPostId: profile.value?.pinnedPostId ?? authUser.value?.pinnedPostId ?? null,
      })
    }
    const currentUsername = normalizedUsername.value
    if (currentUsername) invalidateUserPreviewCache(currentUsername)
  }

  // When viewing our own profile, keep the cached PublicProfile tier fields in sync
  // with the live auth user so badges and the tab-color reflect upgrades/verification
  // without requiring a page reload.
  watch(
    [isSelf, () => authUser.value?.premium, () => authUser.value?.premiumPlus, () => authUser.value?.verifiedStatus],
    ([self, premium, premiumPlus, verifiedStatus]) => {
      if (!self || !data.value) return
      const current = data.value as PublicProfile
      if (
        current.premium === premium &&
        current.premiumPlus === premiumPlus &&
        current.verifiedStatus === verifiedStatus
      ) return
      data.value = {
        ...current,
        premium: premium ?? false,
        premiumPlus: premiumPlus ?? false,
        verifiedStatus: (verifiedStatus ?? 'none') as 'none' | 'identity' | 'manual',
      }
    },
    { immediate: true },
  )

  watch(
    [notFound, profileName, () => profile.value?.verifiedStatus, () => profile.value?.premium, () => postsOnlyCounts.value.all],
    ([nf, name, status, premium, count]) => {
      if (nf) {
        appHeader.value = { title: 'Account not found', verifiedStatus: null, premium: null, postCount: null }
        return
      }
      appHeader.value = {
        title: name,
        verifiedStatus: status ?? null,
        premium: premium ?? null,
        postCount: typeof count === 'number' ? count : null,
      }
    },
    { immediate: true }
  )

  function reloadPage() {
    if (import.meta.client) globalThis.location?.reload()
  }

  onBeforeUnmount(() => {
    if (appHeader.value?.title === profileName.value) appHeader.value = null
  })

  return {
    onFollowed,
    onUnfollowed,
    onNudgeUpdated,
    followersOpen,
    followers,
    followersNextCursor,
    followersLoading,
    followersError,
    followingOpen,
    following,
    followingNextCursor,
    followingLoading,
    followingError,
    loadMoreFollowers,
    loadMoreFollowing,
    affiliatesOpen,
    affiliates,
    affiliatesNextCursor,
    affiliatesLoading,
    affiliatesError,
    loadMoreAffiliates,
    goToFollowers,
    goToFollowing,
    goToAffiliates,
    profileLoadMoreSentinelEl,
    postsOnlyLoadMoreSentinelEl,
    mediaLoadMoreSentinelEl,
    profileFeedContentEl,
    setProfileTab,
    onUserPostsSortChange,
    onUserPostsFilterChange,
    profileAvatarUrl,
    profileBannerUrl,
    hideBannerThumb,
    hideAvatarThumb,
    hideAvatarDuringBanner,
    editOpen,
    followSuggestionsOpen,
    onOpenProfileImage,
    patchPublicProfile,
    reloadPage,
  }
}
