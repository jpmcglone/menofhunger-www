import { useDocumentVisibility } from '@vueuse/core'
import { postBodyHasVideoEmbed } from '~/utils/link-utils'
import type { useHomePageFeed } from './useHomePage'

/**
 * Post edits, the only-me composer card, realtime feed arrivals and polling,
 * pending composer posts, and newly posted video highlighting.
 */
export function useHomePageArrivals(ctx: ReturnType<typeof useHomePageFeed>) {
  const { loadMoreSentinelEl, openComposer, isAuthed, authUser, isPageAccount, didAttempt, groupsNudgeDismissed, myGroupsCount, refreshMyGroupsCount, middleScrollerRef, newlyPostedVideoPostId, feedScope, feedFilter, feedSort, forYou, posts, nextCursor, loading, error, refresh, loadMore, addReply, replacePost, prependOptimisticPost, replaceOptimistic, markOptimisticFailed, markOptimisticPosting, removeOptimistic, viewerIsVerified, homeTabReturnGate, updateFeedReadingPosition, scrollFeedToTop, initialFeedLoadStarted, initialFeedResolved, markInitialFeedResolved } = ctx

  let newlyPostedVideoPostTimer: ReturnType<typeof setTimeout> | null = null

  function onFeedPostEdited(payload: { id: string; post: import('~/types/api').FeedPost }) {
    replacePost(payload.post)
  }

  // Lazy-load more posts when sentinel nears bottom of scroll area
  useLoadMoreObserver(loadMoreSentinelEl, middleScrollerRef, computed(() => Boolean(nextCursor.value)), loadMore)
  onBeforeUnmount(() => {
    if (newlyPostedVideoPostTimer) {
      clearTimeout(newlyPostedVideoPostTimer)
      newlyPostedVideoPostTimer = null
    }
  })

  const showOnlyMeHomeComposerCard = computed(
    () => didAttempt.value && isAuthed.value && !viewerIsVerified.value,
  )

  watchEffect(() => {
    if (initialFeedResolved.value) return
    if (posts.value.length > 0 || Boolean(error.value)) {
      markInitialFeedResolved()
      return
    }
    if (loading.value) {
      initialFeedLoadStarted.value = true
      return
    }
    if (initialFeedLoadStarted.value && !loading.value) {
      // First request completed with an empty feed (no error).
      markInitialFeedResolved()
    }
  })

  watch(
    [isAuthed, isPageAccount, initialFeedResolved, groupsNudgeDismissed],
    ([authed, pageAccount, feedResolved, dismissed]) => {
      if (!authed || pageAccount) {
        myGroupsCount.value = null
        return
      }
      if (feedResolved && !dismissed && myGroupsCount.value === null) {
        void refreshMyGroupsCount()
      }
    },
    { immediate: true },
  )

  const showMainLoader = computed(() => !initialFeedResolved.value && !error.value && posts.value.length === 0)

  function openOnlyMeComposer() {
    openComposer?.('onlyMe')
  }

  const replyModal = useReplyModal()
  const { addPostsCallback, removePostsCallback, subscribePosts, unsubscribePosts } = usePresence()
  const { prependToHomeFeed } = useHomeFeedPrepend()

  const feedArrivals = useFeedArrivals({
    posts,
    viewerId: computed(() => authUser.value?.id),
    filter: feedFilter,
    context: computed(() => `${feedScope.value}:${feedSort.value}:${feedFilter.value}`),
    prepend: prependToHomeFeed,
  })
  let pendingPostSubscriptions = new Set<string>()
  const arrivalsActive = ref(false)
  watch([() => feedArrivals.pending.value.map(post => post.id), arrivalsActive], ([ids, active]) => {
    const next = new Set(active ? ids : [])
    subscribePosts([...next].filter(id => !pendingPostSubscriptions.has(id)))
    unsubscribePosts([...pendingPostSubscriptions].filter(id => !next.has(id)))
    pendingPostSubscriptions = next
  })
  onBeforeUnmount(() => unsubscribePosts([...pendingPostSubscriptions]))
  const actionSounds = useActionSounds()
  function revealFeedArrivals() {
    if (!feedArrivals.pending.value.length) return
    void actionSounds.play('feed-reveal')
    feedArrivals.reveal()
    scrollFeedToTop()
  }
  const feedNewPostCb = {
    onFeedNewPost: (payload: import('~/types/api').WsFeedNewPostPayload) => {
      if (payload?.post) feedArrivals.receive(payload.post)
    },
    onLiveUpdated: feedArrivals.applyUpdate,
  }
  // A completed refresh supersedes only the arrivals that existed when it began.
  let arrivalsBeforeRefresh = new Set<string>()
  let arrivalRefreshStartedAt = Date.now()
  watch(loading, (active) => {
    if (active) {
      arrivalRefreshStartedAt = Date.now()
      arrivalsBeforeRefresh = new Set(feedArrivals.pending.value.map(post => post.id))
    }
    else if (!error.value) {
      feedArrivals.advanceBoundary(arrivalRefreshStartedAt)
      feedArrivals.pending.value = feedArrivals.pending.value.filter(post => !arrivalsBeforeRefresh.has(post.id))
    }
  })

  let unregisterReplyPending: null | (() => void) = null
  const { apiFetchData: fetchArrivalPosts } = useApiClient()
  const pageVisibility = useDocumentVisibility()
  const arrivalPolling = useFeedArrivalPolling({
    active: computed(() => arrivalsActive.value && pageVisibility.value === 'visible' && isAuthed.value && feedArrivals.pending.value.length < 60 && !loading.value),
    periodic: computed(() => forYou.value && feedArrivals.pending.value.length < 60),
    context: computed(() => `${authUser.value?.id}:${feedScope.value}:${feedSort.value}:${feedFilter.value}`),
    fetch: signal => fetchArrivalPosts<import('~/types/api').FeedPost[]>('/posts', {
      query: { limit: 20, sort: forYou.value ? 'forYou' : feedSort.value, visibility: feedFilter.value,
        followingOnly: feedScope.value === 'following', topLevelOnly: true },
      signal, mohRetry: false,
    }),
    receive: posts => { feedArrivals.receiveBatch(posts); homeTabReturnGate.markSuccess() },
  })
  function catchUpHomeFeed() {
    if (!posts.value.length) { void refresh().then(() => homeTabReturnGate.markSuccess()); return }
    if (homeTabReturnGate.shouldRefresh()) void arrivalPolling.check()
  }
  watch(pageVisibility, value => { if (value === 'visible' && arrivalsActive.value) catchUpHomeFeed() })
  onActivated(() => {
    if (!import.meta.client) return
    arrivalsActive.value = true
    catchUpHomeFeed()
    void nextTick(updateFeedReadingPosition)
    // Realtime and HTTP arrivals share the same explicit-reveal queue.
    addPostsCallback(feedNewPostCb)
    // Optimistic replies: when the reply modal forwards a pending submit, slot
    // the optimistic row into the parent's position via `addReply` and let
    // pendingPosts handle the network call + retry/discard surface.
    const pendingCb = (payload: import('~/composables/useReplyModal').ReplyPendingPayload) => {
      addReply(payload.parentPost.id, payload.optimisticPost, payload.parentPost)
      pendingPosts.submit({
        localId: payload.localId,
        optimisticPost: payload.optimisticPost,
        perform: payload.perform,
        callbacks: {
          insert: () => {},
          replace: (lid, real) => replaceOptimistic(lid, real),
          markFailed: (lid, msg) => markOptimisticFailed(lid, msg),
          markPosting: (lid) => markOptimisticPosting(lid),
          remove: (lid) => removeOptimistic(lid),
        },
      })
    }
    unregisterReplyPending = replyModal.registerOnReplyPending(pendingCb)
  })
  onDeactivated(() => {
    arrivalsActive.value = false
    removePostsCallback(feedNewPostCb)
    unregisterReplyPending?.()
    unregisterReplyPending = null
  })

  const pendingPosts = usePendingPostsManager()

  function flashNewlyPostedVideo(post: import('~/types/api').FeedPost) {
    if (!postBodyHasVideoEmbed(post.body ?? '', Boolean(post.media?.length))) return
    newlyPostedVideoPostId.value = post.id
    if (!import.meta.client) return
    if (newlyPostedVideoPostTimer) clearTimeout(newlyPostedVideoPostTimer)
    newlyPostedVideoPostTimer = setTimeout(() => {
      newlyPostedVideoPostId.value = null
      newlyPostedVideoPostTimer = null
    }, 800)
  }

  function onComposerPending(payload: {
    localId: string
    optimisticPost: import('~/types/api').FeedPost
    perform: () => Promise<import('~/types/api').FeedPost | { id: string } | null | undefined>
  }) {
    pendingPosts.submit({
      localId: payload.localId,
      optimisticPost: payload.optimisticPost,
      perform: payload.perform,
      callbacks: {
        insert: (p) => prependOptimisticPost(p),
        replace: (lid, real) => {
          replaceOptimistic(lid, real)
          flashNewlyPostedVideo(real)
        },
        markFailed: (lid, msg) => markOptimisticFailed(lid, msg),
        markPosting: (lid) => markOptimisticPosting(lid),
        remove: (lid) => removeOptimistic(lid),
      },
    })
  }

  return {
    onFeedPostEdited,
    showOnlyMeHomeComposerCard,
    showMainLoader,
    openOnlyMeComposer,
    feedArrivals,
    revealFeedArrivals,
    onComposerPending,
  }
}
