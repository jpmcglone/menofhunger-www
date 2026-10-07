import type { CommunityGroupShell } from '~/types/api'
import { useGroupMedia } from '~/composables/useGroupMedia'
import { applyCommunityGroupJoin, communityGroupJoinToast } from '~/utils/community-group-preview'
import { getApiErrorMessage } from '~/utils/api-error'
import { siteConfig } from '~/config/site'
import type { useGroupPageRoute, useGroupPageShell, GroupTabKey } from './useGroupPage'

/**
 * Tab routing, the posts, replies, and media feeds, the lightbox, SEO, and join,
 * leave, and invite flows.
 */
export function useGroupPageFeed(ctx: ReturnType<typeof useGroupPageRoute> & ReturnType<typeof useGroupPageShell>) {
  const { route, apiFetchData, invalidateMyGroups, isAuthed, isVerified, setPendingGroupJoin, pendingGroupSlug, pushToast, slug, hasInviteAttribution, currentPathname, shell, shellError, loadShell, appHeader, joinBusy, leaveBusy, cancelBusy, isMember, isPendingApproval, groupFeedEnabled, groupSort, baseGroupPath, activeGroupTab, tabActivated, scrollFeedToTop, groupUnderlineReady, updateGroupUnderline } = ctx

  function pushGroupPath(path: string) {
    const qs: Record<string, string> = {}
    if (import.meta.client) {
      new URLSearchParams(location.search).forEach((value, key) => { qs[key] = value })
    }
    currentPathname.value = path
    if (!import.meta.client) return
    const search = new URLSearchParams(qs)
    const newUrl = search.toString() ? `${path}?${search}` : path
    const state = {
      ...history.state,
      back: history.state?.current ?? null,
      current: newUrl,
      forward: null,
    }
    history.pushState(state, '', newUrl)
  }

  function setGroupTab(key: GroupTabKey) {
    if (activeGroupTab.value === key) return
    const path = key === 'posts' ? baseGroupPath.value : `${baseGroupPath.value}/${key}`
    pushGroupPath(path)
    scrollFeedToTop()
  }

  onMounted(() => nextTick(() => {
    updateGroupUnderline()
    requestAnimationFrame(() => { groupUnderlineReady.value = true })
  }))

  // ─── Posts feed (top-level only) ──────────────────────────────────────────────
  const {
    posts: postsFeedPosts,
    displayItems: postsFeedDisplayItems,
    collapsedSiblingReplyCountFor: postsFeedCollapsedSiblingReplyCountFor,
    nextCursor: postsFeedNextCursor,
    loading: postsFeedLoading,
    initialLoading: postsFeedInitialLoading,
    loadingMore: postsFeedLoadingMore,
    error: postsFeedError,
    refresh: postsFeedRefresh,
    softRefreshNewer: postsFeedSoftRefreshNewer,
    startAutoSoftRefresh: postsFeedStartAutoSoftRefresh,
    loadMore: postsFeedLoadMore,
    removePost: postsFeedRemovePost,
    replacePost: postsFeedReplacePost,
    addReply: postsFeedAddReply,
    prependOptimisticPost: postsFeedPrependOptimistic,
    replaceOptimistic: postsFeedReplaceOptimistic,
    markOptimisticFailed: postsFeedMarkOptimisticFailed,
    markOptimisticPosting: postsFeedMarkOptimisticPosting,
    removeOptimistic: postsFeedRemoveOptimistic,
  } = usePostsFeed({
    feedStateKey: 'group-wall-feed-top-level',
    cursorFeedStateMode: 'local',
    localInsertsStateKey: 'group-wall-feed-top-level-inserts',
    communityGroupId: computed(() => shell.value?.id ?? null),
    enabled: computed(() => groupFeedEnabled.value && tabActivated.posts),
    sort: groupSort,
    visibility: ref('all'),
    followingOnly: ref(false),
    showAds: ref(false),
    topLevelOnly: ref(true),
  })

  // ─── Replies feed (all posts including replies) ────────────────────────────────
  const {
    posts: repliesFeedPosts,
    displayItems: repliesFeedDisplayItems,
    collapsedSiblingReplyCountFor: repliesFeedCollapsedSiblingReplyCountFor,
    nextCursor: repliesFeedNextCursor,
    loading: repliesFeedLoading,
    initialLoading: repliesFeedInitialLoading,
    loadingMore: repliesFeedLoadingMore,
    error: repliesFeedError,
    refresh: repliesFeedRefresh,
    softRefreshNewer: repliesFeedSoftRefreshNewer,
    startAutoSoftRefresh: repliesFeedStartAutoSoftRefresh,
    loadMore: repliesFeedLoadMore,
    removePost: repliesFeedRemovePost,
    replacePost: repliesFeedReplacePost,
    addReply: repliesFeedAddReply,
    prependOptimisticPost: repliesFeedPrependOptimistic,
    replaceOptimistic: repliesFeedReplaceOptimistic,
    markOptimisticFailed: repliesFeedMarkOptimisticFailed,
    markOptimisticPosting: repliesFeedMarkOptimisticPosting,
    removeOptimistic: repliesFeedRemoveOptimistic,
  } = usePostsFeed({
    feedStateKey: 'group-wall-feed-with-replies',
    cursorFeedStateMode: 'local',
    localInsertsStateKey: 'group-wall-feed-replies-inserts',
    communityGroupId: computed(() => shell.value?.id ?? null),
    enabled: computed(() => groupFeedEnabled.value && tabActivated.replies),
    sort: groupSort,
    visibility: ref('all'),
    followingOnly: ref(false),
    showAds: ref(false),
  })

  // ─── Media feed ───────────────────────────────────────────────────────────────
  const mediaFeed = useGroupMedia(slug, {
    enabled: computed(() => groupFeedEnabled.value && tabActivated.media),
    sort: groupSort,
  })

  // ─── Lightbox ─────────────────────────────────────────────────────────────────
  const viewer = useImageLightbox()
  const { openFromEvent } = viewer
  const hideBannerThumb = computed(() => viewer.visible.value && viewer.kind.value === 'banner')
  const hideAvatarThumb = computed(() => viewer.visible.value && viewer.kind.value === 'avatar')
  const hideAvatarDuringBanner = computed(() => viewer.visible.value && viewer.kind.value === 'banner')

  const editOpen = ref(false)
  const inviteOpen = ref(false)

  function onOpenGroupImage(payload: {
    event: MouseEvent
    url: string
    title: string
    kind: 'avatar' | 'banner'
    originRect?: { left: number; top: number; width: number; height: number }
  }) {
    if (payload.kind === 'avatar') {
      void openFromEvent(payload.event, payload.url, payload.title, payload.kind, {
        avatarBorderRadius: '8%',
        originRect: payload.originRect,
      })
      return
    }
    void openFromEvent(payload.event, payload.url, payload.title, payload.kind, {
      originRect: payload.originRect,
    })
  }

  async function onGroupShellUpdated(_next: CommunityGroupShell) {
    await loadShell()
  }

  // ─── SEO ──────────────────────────────────────────────────────────────────────
  const seo = computed(() => groupSeo(shell.value))

  usePageSeo({
    title: computed(() => seo.value?.title ?? 'Group'),
    description: computed(() => seo.value?.description ?? siteConfig.meta.description),
    image: computed(() => seo.value?.image),
    imageAlt: computed(() => seo.value?.imageAlt),
    imageWidth: computed(() => seo.value?.imageWidth),
    imageHeight: computed(() => seo.value?.imageHeight),
    twitterCard: computed(() => seo.value?.twitterCard),
    canonicalPath: computed(() => seo.value?.canonicalPath ?? `/g/${slug.value}`),
    ogType: 'website',
    noindex: computed(() => !shell.value),
    jsonLdGraph: computed(() => seo.value?.jsonLdGraph),
  })

  watch(
    [shell, shellError],
    ([s, err]) => {
      if (s) {
        appHeader.value = groupHeader(s)
        return
      }
      if (err) {
        appHeader.value = { title: 'Group', icon: 'tabler:users' }
        return
      }
      appHeader.value = { title: 'Group', icon: 'tabler:users' }
    },
    { immediate: true },
  )

  // ─── Join / leave / cancel ────────────────────────────────────────────────────
  async function doJoin() {
    const s = shell.value
    if (!s || joinBusy.value) return
    joinBusy.value = true
    try {
      const result = await apiFetchData<{ ok: boolean; status: 'active' | 'pending' }>(
        `/groups/${encodeURIComponent(s.id)}/join`,
        { method: 'POST', body: {} },
      )
      const status = result?.status === 'pending' ? 'pending' : 'active'
      invalidateMyGroups()
      try {
        await loadShell()
      } catch { /* join already committed; keep the local patch */ }
      const next = shell.value ?? s
      shell.value = applyCommunityGroupJoin(next, status)
      if (status === 'active') {
        try { await postsFeedRefresh() } catch { /* composer/header already flipped */ }
      }
      pushToast(communityGroupJoinToast(status, s.name))
    } catch (e: unknown) {
      pushToast({
        title: 'Could not join',
        message: getApiErrorMessage(e) || 'Try again.',
        tone: 'error',
        durationMs: 4500,
      })
    } finally {
      joinBusy.value = false
    }
  }

  // Emailed invite links carry `?invite=<id>`. The link itself changes nothing; once the right,
  // verified member is signed in, the page accepts the invite (a POST from the signed-in session).
  const inviteId = computed(() => {
    const raw = Array.isArray(route.query.invite) ? route.query.invite[0] : route.query.invite
    return String(raw ?? '').trim() || null
  })
  const inviteAttempted = ref(false)
  const { acceptInvite } = useGroupInvites()
  async function maybeAcceptEmailedInvite() {
    const id = inviteId.value
    if (!import.meta.client || !id || inviteAttempted.value) return
    if (!shell.value || !isAuthed.value || !isVerified.value) return
    inviteAttempted.value = true
    autoJoinAttempted.value = true
    setPendingGroupJoin(null)
    const { invite: _drop, ...rest } = route.query
    try {
      if (!isMember.value) {
        await acceptInvite(id)
        pushToast({ title: `Welcome to ${shell.value.name}`, message: 'You joined the group.', tone: 'success', durationMs: 3500 })
      }
    } catch (e: unknown) {
      pushToast({
        title: 'Invite unavailable',
        message: getApiErrorMessage(e) || 'This invite is no longer valid.',
        tone: 'error',
        durationMs: 4500,
      })
    }
    await navigateTo({ path: route.path, query: rest }, { replace: true })
    await loadShell()
  }

  const autoJoinAttempted = ref(false)
  async function maybeAutoJoinFromInvite() {
    if (!import.meta.client || autoJoinAttempted.value) return
    if (!shell.value || !isAuthed.value || !isVerified.value || isMember.value) return
    if (isPendingApproval.value) return
    const pendingMatches = pendingGroupSlug.value && pendingGroupSlug.value === slug.value
    if (!pendingMatches && !hasInviteAttribution.value) return
    autoJoinAttempted.value = true
    setPendingGroupJoin(null)
    // Same POST /join as the button: open groups become members, approval groups stay pending.
    await doJoin()
  }

  watch(
    () => [shell.value?.id, isAuthed.value, isVerified.value, isMember.value] as const,
    () => { void maybeAcceptEmailedInvite().then(() => maybeAutoJoinFromInvite()) },
    { immediate: true },
  )

  async function doLeave() {
    const s = shell.value
    if (!s || leaveBusy.value) return
    leaveBusy.value = true
    try {
      await apiFetchData(`/groups/${encodeURIComponent(s.id)}/leave`, { method: 'POST', body: {} })
      invalidateMyGroups()
      postsFeedPosts.value = []
      postsFeedNextCursor.value = null
      repliesFeedPosts.value = []
      repliesFeedNextCursor.value = null
      await loadShell()
    } catch (e: unknown) {
      console.error(getApiErrorMessage(e) || 'Could not leave.')
    } finally {
      leaveBusy.value = false
    }
  }

  async function doCancelRequest() {
    const s = shell.value
    if (!s || cancelBusy.value) return
    cancelBusy.value = true
    try {
      await apiFetchData(`/groups/${encodeURIComponent(s.id)}/cancel-request`, { method: 'POST', body: {} })
      await loadShell()
    } catch (e: unknown) {
      console.error(getApiErrorMessage(e) || 'Could not cancel request.')
    } finally {
      cancelBusy.value = false
    }
  }

  return {
    setGroupTab,
    postsFeedPosts,
    postsFeedDisplayItems,
    postsFeedCollapsedSiblingReplyCountFor,
    postsFeedNextCursor,
    postsFeedLoading,
    postsFeedInitialLoading,
    postsFeedLoadingMore,
    postsFeedError,
    postsFeedRefresh,
    postsFeedSoftRefreshNewer,
    postsFeedStartAutoSoftRefresh,
    postsFeedLoadMore,
    postsFeedRemovePost,
    postsFeedReplacePost,
    postsFeedAddReply,
    postsFeedPrependOptimistic,
    postsFeedReplaceOptimistic,
    postsFeedMarkOptimisticFailed,
    postsFeedMarkOptimisticPosting,
    postsFeedRemoveOptimistic,
    repliesFeedPosts,
    repliesFeedDisplayItems,
    repliesFeedCollapsedSiblingReplyCountFor,
    repliesFeedNextCursor,
    repliesFeedLoading,
    repliesFeedInitialLoading,
    repliesFeedLoadingMore,
    repliesFeedError,
    repliesFeedRefresh,
    repliesFeedSoftRefreshNewer,
    repliesFeedStartAutoSoftRefresh,
    repliesFeedLoadMore,
    repliesFeedRemovePost,
    repliesFeedReplacePost,
    repliesFeedAddReply,
    repliesFeedPrependOptimistic,
    repliesFeedReplaceOptimistic,
    repliesFeedMarkOptimisticFailed,
    repliesFeedMarkOptimisticPosting,
    repliesFeedRemoveOptimistic,
    mediaFeed,
    hideBannerThumb,
    hideAvatarThumb,
    hideAvatarDuringBanner,
    editOpen,
    inviteOpen,
    onOpenGroupImage,
    onGroupShellUpdated,
    doJoin,
    doLeave,
    doCancelRequest,
  }
}
