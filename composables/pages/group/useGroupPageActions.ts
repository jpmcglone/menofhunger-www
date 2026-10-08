import { usePresenceCallback } from '~/composables/presence/usePresenceCallback'
import type { FeedPost } from '~/types/api'
import { useLoadMoreObserver } from '~/composables/useLoadMoreObserver'
import { useMiddleScroller } from '~/composables/useMiddleScroller'
import type { GroupFeedCallback } from '~/composables/usePresence'
import { MOH_GROUP_COMPOSER_KEY } from '~/utils/injection-keys'
import type { useGroupPageRoute, useGroupPageShell } from './useGroupPage'
import type { useGroupPageFeed } from './useGroupPageFeed'

/**
 * Optimistic composer posts, composer injection, load-more sentinels, reply
 * handling, auto soft-refresh, realtime group posts, new activity, and lifecycle.
 */
export function useGroupPageActions(ctx: ReturnType<typeof useGroupPageRoute> & ReturnType<typeof useGroupPageShell> & ReturnType<typeof useGroupPageFeed>) {
  const { route, apiFetchData, authUser, markReadBySubject, setPendingGroupJoin, slug, hasInviteAttribution, shell, appHeader, isMember, canReadFeed, groupFeedEnabled, groupSort, setGroupTab, postsFeedPosts, postsFeedNextCursor, postsFeedLoading, postsFeedError, postsFeedRefresh, postsFeedSoftRefreshNewer, postsFeedStartAutoSoftRefresh, postsFeedLoadMore, postsFeedReplacePost, postsFeedAddReply, postsFeedPrependOptimistic, postsFeedReplaceOptimistic, postsFeedMarkOptimisticFailed, postsFeedMarkOptimisticPosting, postsFeedRemoveOptimistic, repliesFeedPosts, repliesFeedNextCursor, repliesFeedRefresh, repliesFeedSoftRefreshNewer, repliesFeedStartAutoSoftRefresh, repliesFeedLoadMore, repliesFeedReplacePost, repliesFeedAddReply, repliesFeedPrependOptimistic, repliesFeedReplaceOptimistic, repliesFeedMarkOptimisticFailed, repliesFeedMarkOptimisticPosting, repliesFeedRemoveOptimistic, mediaFeed } = ctx

  // ─── Composer pending (optimistic) ────────────────────────────────────────────
  const pendingPosts = usePendingPostsManager()

  function onGroupComposerPending(payload: {
    localId: string
    optimisticPost: FeedPost
    perform: () => Promise<FeedPost | { id: string } | null | undefined>
  }) {
    pendingPosts.submit({
      localId: payload.localId,
      optimisticPost: payload.optimisticPost,
      perform: payload.perform,
      callbacks: {
        insert: (p) => {
          postsFeedPrependOptimistic(p)
          repliesFeedPrependOptimistic(p)
        },
        replace: (lid, real) => {
          postsFeedReplaceOptimistic(lid, real)
          repliesFeedReplaceOptimistic(lid, real)
        },
        markFailed: (lid, msg) => {
          postsFeedMarkOptimisticFailed(lid, msg)
          repliesFeedMarkOptimisticFailed(lid, msg)
        },
        markPosting: (lid) => {
          postsFeedMarkOptimisticPosting(lid)
          repliesFeedMarkOptimisticPosting(lid)
        },
        remove: (lid) => {
          postsFeedRemoveOptimistic(lid)
          repliesFeedRemoveOptimistic(lid)
        },
      },
    })
  }

  // ─── Composer injection for global layout ─────────────────────────────────────
  const groupComposerRef = inject(MOH_GROUP_COMPOSER_KEY, ref(null))
  watch(
    [shell, isMember],
    () => {
      const s = shell.value
      if (!s || !isMember.value) {
        groupComposerRef.value = null
        return
      }
      groupComposerRef.value = {
        groupId: s.id,
        groupName: s.name,
        onComposerPending: onGroupComposerPending,
      }
    },
    { immediate: true },
  )
  onDeactivated(() => { groupComposerRef.value = null })
  onBeforeUnmount(() => { groupComposerRef.value = null })

  // ─── Edit handlers ────────────────────────────────────────────────────────────
  function onPostsTabEdited(payload: { id: string; post: FeedPost }) {
    postsFeedReplacePost(payload.post)
  }

  function onRepliesTabEdited(payload: { id: string; post: FeedPost }) {
    repliesFeedReplacePost(payload.post)
  }

  async function onGroupPinChanged() {
    await postsFeedRefresh()
    await repliesFeedRefresh()
  }

  // ─── Load-more sentinels ──────────────────────────────────────────────────────
  const postsLoadMoreSentinelEl = ref<HTMLElement | null>(null)
  const repliesLoadMoreSentinelEl = ref<HTMLElement | null>(null)
  const mediaLoadMoreSentinelEl = ref<HTMLElement | null>(null)
  const middleScrollerRef = useMiddleScroller()

  useLoadMoreObserver(
    postsLoadMoreSentinelEl,
    middleScrollerRef,
    computed(() => Boolean(canReadFeed.value && postsFeedNextCursor.value)),
    () => void postsFeedLoadMore(),
  )
  useLoadMoreObserver(
    repliesLoadMoreSentinelEl,
    middleScrollerRef,
    computed(() => Boolean(canReadFeed.value && repliesFeedNextCursor.value)),
    () => void repliesFeedLoadMore(),
  )
  useLoadMoreObserver(
    mediaLoadMoreSentinelEl,
    middleScrollerRef,
    computed(() => Boolean(canReadFeed.value && mediaFeed.nextCursor.value)),
    () => void mediaFeed.loadMore(),
  )

  // ─── Reply pending handler ────────────────────────────────────────────────────
  const replyModal = useReplyModal()
  let unregisterReplyPending: null | (() => void) = null

  function registerReplyPostedHandler() {
    if (!import.meta.client || unregisterReplyPending) return
    const pendingCb = (payload: import('~/composables/useReplyModal').ReplyPendingPayload) => {
      // Replies go into both feeds
      postsFeedAddReply(payload.parentPost.id, payload.optimisticPost, payload.parentPost)
      repliesFeedAddReply(payload.parentPost.id, payload.optimisticPost, payload.parentPost)
      pendingPosts.submit({
        localId: payload.localId,
        optimisticPost: payload.optimisticPost,
        perform: payload.perform,
        callbacks: {
          insert: () => {},
          replace: (lid, real) => {
            postsFeedReplaceOptimistic(lid, real)
            repliesFeedReplaceOptimistic(lid, real)
          },
          markFailed: (lid, msg) => {
            postsFeedMarkOptimisticFailed(lid, msg)
            repliesFeedMarkOptimisticFailed(lid, msg)
          },
          markPosting: (lid) => {
            postsFeedMarkOptimisticPosting(lid)
            repliesFeedMarkOptimisticPosting(lid)
          },
          remove: (lid) => {
            postsFeedRemoveOptimistic(lid)
            repliesFeedRemoveOptimistic(lid)
          },
        },
      })
    }
    unregisterReplyPending = replyModal.registerOnReplyPending(pendingCb)
  }

  function unregisterReplyPostedHandler() {
    unregisterReplyPending?.()
    unregisterReplyPending = null
  }

  // ─── Auto soft-refresh ────────────────────────────────────────────────────────
  let stopAutoSoftRefreshPosts: null | (() => void) = null
  let stopAutoSoftRefreshReplies: null | (() => void) = null

  function startGroupFeedAutoRefresh() {
    if (!stopAutoSoftRefreshPosts) {
      stopAutoSoftRefreshPosts = postsFeedStartAutoSoftRefresh({ everyMs: 12_000 }) ?? null
    }
    if (!stopAutoSoftRefreshReplies) {
      stopAutoSoftRefreshReplies = repliesFeedStartAutoSoftRefresh({ everyMs: 12_000 }) ?? null
    }
  }

  function stopGroupFeedAutoRefresh() {
    stopAutoSoftRefreshPosts?.()
    stopAutoSoftRefreshPosts = null
    stopAutoSoftRefreshReplies?.()
    stopAutoSoftRefreshReplies = null
  }

  // ─── Realtime: live group posts over websocket ────────────────────────────────
  // The 12s soft-refresh above is the backstop; sockets make new posts/reposts appear
  // instantly. HTTP fetch on mount/activate is the on-load sync (per realtime-first).
  const { subscribeGroups, unsubscribeGroups } = usePresence()

  function prependLiveGroupPost(post: FeedPost) {
    if (!post?.id) return
    // group:newPost only carries top-level posts and reposts — both belong in the
    // Posts feed and the Replies feed. Dedupe by id so soft-refresh overlap doesn't double up.
    if (!postsFeedPosts.value.some((p) => p.id === post.id)) {
      postsFeedPosts.value = [post, ...postsFeedPosts.value]
    }
    if (!repliesFeedPosts.value.some((p) => p.id === post.id)) {
      repliesFeedPosts.value = [post, ...repliesFeedPosts.value]
    }
  }

  const groupFeedCb: GroupFeedCallback = {
    onNewPost: (payload) => {
      if (!payload?.post) return
      if (payload.groupId !== shell.value?.id) return
      // Skip the actor's own posts — they're already in the feed via optimistic pending
      // (mirrors home feed, where emitFeedNewPost excludes the author).
      const authorId = payload.post.author?.id ?? null
      const viewerId = authUser.value?.id ?? null
      if (authorId && viewerId && authorId === viewerId) return
      prependLiveGroupPost(payload.post)
      focusedNewActivity.value = false
      void loadGroupActivity()
    },
  }

  let groupRealtimeActive = false
  let subscribedGroupId: string | null = null

  function syncGroupRealtimeSubscription() {
    if (!import.meta.client || !groupRealtimeActive) return
    const gid = groupFeedEnabled.value ? (shell.value?.id ?? null) : null
    if (subscribedGroupId === gid) return
    if (subscribedGroupId) unsubscribeGroups([subscribedGroupId])
    subscribedGroupId = gid
    if (gid) subscribeGroups([gid])
  }

  const groupFeedRealtime = usePresenceCallback('GroupFeed', groupFeedCb, { manual: true })
  function startGroupRealtime() {
    if (!import.meta.client) return
    groupRealtimeActive = true
    groupFeedRealtime.register()
    syncGroupRealtimeSubscription()
  }

  function stopGroupRealtime() {
    if (!import.meta.client) return
    groupRealtimeActive = false
    groupFeedRealtime.unregister()
    if (subscribedGroupId) {
      unsubscribeGroups([subscribedGroupId])
      subscribedGroupId = null
    }
  }

  // Re-target the room when the group id resolves or the viewer's read access changes.
  watch([groupFeedEnabled, () => shell.value?.id], () => syncGroupRealtimeSubscription())

  // Snapshot before acknowledging the visit; arrivals after this timestamp stay new.
  const groupActivity = ref<import('~/types/api').GroupActivity | null>(null)
  const activityError = ref<string | null>(null)
  const focusedNewActivity = ref(false)
  const newActivityAnchor = ref<HTMLElement | null>(null)
  const firstNewPostAnchor = ref<HTMLElement[]>([])
  const pinnedGroupPost = computed(() => postsFeedPosts.value.find(post => post.pinnedInGroupAt))
  const firstNewPostId = computed(() => postsFeedPosts.value.find(post => groupActivity.value?.newPostIds.includes(post.id))?.id)
  const acknowledgedActivity = new Set<string>()
  async function loadGroupActivity() {
    const groupId = shell.value?.id
    if (!groupId || !isMember.value) return
    activityError.value = null
    try {
      const snapshot = await apiFetchData<import('~/types/api').GroupActivity>(`/groups/${encodeURIComponent(groupId)}/activity`)
      if (shell.value?.id !== groupId) return
      groupActivity.value = snapshot
      if (!postsFeedLoading.value && !postsFeedError.value && postsFeedPosts.value.length) await acknowledgeGroupActivity(snapshot)
    } catch { activityError.value = 'Couldn’t check new activity.' }
  }
  async function viewNewActivity() {
    if (!groupActivity.value || focusedNewActivity.value) return
    const snapshot = groupActivity.value
    groupSort.value = 'new'
    setGroupTab('posts')
    await postsFeedRefresh()
    if (postsFeedError.value || shell.value?.id !== snapshot.groupId) return
    focusedNewActivity.value = true
    await nextTick()
    const anchor = firstNewPostAnchor.value[0] ?? newActivityAnchor.value
    anchor?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    await acknowledgeGroupActivity(snapshot)
  }
  async function acknowledgeGroupActivity(snapshot: import('~/types/api').GroupActivity) {
    if (acknowledgedActivity.has(snapshot.through)) return
    acknowledgedActivity.add(snapshot.through)
    try {
      await apiFetchData(`/notifications/groups/${encodeURIComponent(snapshot.groupId)}/mark-delivered`, { method: 'POST', body: { through: snapshot.through } })
    } catch { acknowledgedActivity.delete(snapshot.through); activityError.value = 'Couldn’t update your activity status. Try again.' }
  }
  watch([postsFeedLoading, () => postsFeedPosts.value.length], () => {
    if (!postsFeedLoading.value && !postsFeedError.value && postsFeedPosts.value.length && groupActivity.value) void acknowledgeGroupActivity(groupActivity.value)
  })
  watch(() => shell.value?.id, () => {
    groupActivity.value = null; focusedNewActivity.value = false
    if (import.meta.client && isMember.value) {
      void loadGroupActivity()
      void markReadBySubject({ group_id: shell.value!.id })
    }
  }, { immediate: true })

  // ─── Lifecycle ────────────────────────────────────────────────────────────────
  onMounted(() => {
    if (!import.meta.client) return
    if (hasInviteAttribution.value && slug.value) {
      setPendingGroupJoin(slug.value)
    }
    if (groupFeedEnabled.value && !postsFeedPosts.value.length) {
      void postsFeedRefresh()
    }
    registerReplyPostedHandler()
    startGroupFeedAutoRefresh()
    startGroupRealtime()
  })

  onActivated(() => {
    if (!import.meta.client) return
    registerReplyPostedHandler()
    startGroupFeedAutoRefresh()
    startGroupRealtime()
    if (postsFeedPosts.value.length > 0) {
      setTimeout(() => void postsFeedSoftRefreshNewer(), 300)
    } else if (groupFeedEnabled.value) {
      void postsFeedRefresh()
    }
    if (repliesFeedPosts.value.length > 0) {
      setTimeout(() => void repliesFeedSoftRefreshNewer(), 300)
    }
  })

  onDeactivated(() => {
    unregisterReplyPostedHandler()
    stopGroupFeedAutoRefresh()
    stopGroupRealtime()
  })

  onBeforeUnmount(() => {
    unregisterReplyPostedHandler()
    stopGroupFeedAutoRefresh()
    stopGroupRealtime()
    if (!isGroupRoute(route.path) && appHeader.value?.title === (shell.value?.name || 'Group')) appHeader.value = null
  })

  return {
    onPostsTabEdited,
    onRepliesTabEdited,
    onGroupPinChanged,
    postsLoadMoreSentinelEl,
    repliesLoadMoreSentinelEl,
    mediaLoadMoreSentinelEl,
    groupActivity,
    activityError,
    focusedNewActivity,
    newActivityAnchor,
    firstNewPostAnchor,
    pinnedGroupPost,
    firstNewPostId,
    loadGroupActivity,
    viewNewActivity,
  }
}
