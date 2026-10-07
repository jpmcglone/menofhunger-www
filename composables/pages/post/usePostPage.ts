import type { FeedPost } from '~/types/api'
import type { usePostPermalink } from '~/composables/usePostPermalink'
import { boardPostHref } from '~/utils/board-links'
import { xAdvancedPublishingSupported } from '~/utils/crosspost'
import { feedPostThreadGroupDisplayName } from '~/utils/community-group-preview'
import { uniqueReplyAuthorsFromPosts } from '~/utils/thread-reply-authors'
import { usePostComments } from '~/composables/usePostComments'
import { usePostDiscoverMore } from '~/composables/usePostDiscoverMore'
import { useThreadParticipants } from '~/composables/useThreadParticipants'
import { userColorTier, userTierTextClass } from '~/utils/user-tier'
import { usePostPageThread } from './usePostPageThread'
import { usePostPageMeta } from './usePostPageMeta'
import type { InjectionKey } from 'vue'

/**
 * Script state for `/p/:id`, shared with the permalink sections through
 * `usePostPageContext()`.
 */
export function usePostPage(routeState: ReturnType<typeof usePostPageRoute>, postState: ReturnType<typeof usePostPagePost>) {
  const conversation = usePostPageConversation({ ...routeState, ...postState })
  const thread = usePostPageThread({ ...routeState, ...postState, ...conversation })
  const meta = usePostPageMeta({ ...routeState, ...postState, ...conversation, ...thread })
  const ctx = { ...routeState, ...postState, ...conversation, ...thread, ...meta }
  provide(POST_PAGE_CONTEXT, ctx)
  return ctx
}

/**
 * Route, API client, the quotes feed, and auth. Runs before the page awaits the post.
 */
export function usePostPageRoute() {
  const route = useRoute()
  const requestURL = useRequestURL()
  const postId = computed(() => String(route.params.id || '').trim())
  const { apiFetchData } = useApiClient()
  const { invalidate: invalidateMyGroups } = useMyGroups()
  const { push: pushToast } = useAppToast()
  const highlightedPostRef = ref<HTMLElement | null>(null)

  // ─── Quotes section ───────────────────────────────────────────────────────────
  const quotesOpen = ref(false)
  const quotesFeed = useCursorFeed<FeedPost>({
    stateKey: 'post-quotes',
    stateMode: 'local',
    buildRequest: (cursor) => (postId.value
      ? { path: `/posts/${encodeURIComponent(postId.value)}/quotes`, query: cursor ? { cursor, limit: 20 } : { limit: 20 } }
      : null),
    getItemId: (p) => p.id,
  })
  const { items: quotePosts, nextCursor: quotesNextCursor, loadMore: loadMoreQuotes } = quotesFeed
  const quotesLoading = computed(() => quotesFeed.loading.value || quotesFeed.loadingMore.value)

  watch(quotesOpen, (val) => {
    if (val && !quotePosts.value.length) void quotesFeed.refresh()
  })
  watch(postId, () => {
    quotesFeed.reset()
    if (quotesOpen.value) void quotesFeed.refresh()
  })

  const { user, ensureLoaded, isAuthed, isVerified: viewerIsVerified, isPremium: viewerIsPremium } = useAuth()
  if (import.meta.client) {
    void ensureLoaded()
  }

  return {
    route,
    requestURL,
    postId,
    apiFetchData,
    invalidateMyGroups,
    pushToast,
    highlightedPostRef,
    quotesOpen,
    quotePosts,
    quotesNextCursor,
    loadMoreQuotes,
    quotesLoading,
    user,
    isAuthed,
    viewerIsVerified,
    viewerIsPremium,
  }
}

/**
 * The loaded permalink post, X publishing review, journey readiness, and the
 * Board redirect target. Runs before the page awaits the Board redirect.
 */
export function usePostPagePost(ctx: ReturnType<typeof usePostPageRoute>, permalink: Awaited<ReturnType<typeof usePostPermalink>>) {
  const { postId, user } = ctx

  const {
    post,
    data,
    errorText,
    accessHint,
    isDeleted,
    isOnlyMe,
    apiErrorStatus,
    refreshPost,
  } = permalink

  const xIntegration = useXIntegration()
  function ownPublicPostKey(): string | null {
    const current = post.value
    if (!current || current.author.id !== user.value?.id || current.deletedAt || current.visibility !== 'public') return null
    return `${user.value?.id}:${current.id}`
  }
  const canReviewXPublication = computed(() => ownPublicPostKey() !== null && xAdvancedPublishingSupported(xIntegration.status.value?.capabilities))
  watch(ownPublicPostKey, (key) => { if (key && import.meta.client) void xIntegration.refresh() }, { immediate: true })

  useJourneyReady('post_detail_ready', () => Boolean(post.value || accessHint.value), {
    context: () => postId.value,
    failed: () => Boolean(errorText.value && !accessHint.value),
    source: () => accessHint.value ? 'access' : 'network',
  })

  // Board posts live on the Board; old /p links, pushes, and shares land on the thread.
  const boardRedirect = post.value ? boardPostHref(post.value) : null

  return {
    post,
    data,
    errorText,
    accessHint,
    isDeleted,
    isOnlyMe,
    apiErrorStatus,
    refreshPost,
    canReviewXPublication,
    boardRedirect,
  }
}

/**
 * Read marks and view reporting, reply context, comments, the conversation gate,
 * and Discover more.
 */
export function usePostPageConversation(ctx: ReturnType<typeof usePostPageRoute> & ReturnType<typeof usePostPagePost>) {
  const { route, postId, user, isAuthed, viewerIsVerified, post, data, isDeleted, isOnlyMe } = ctx

  const { markReadBySubject } = useNotifications()
  watch(
    () => [post.value?.id, user.value?.id] as const,
    ([pid, uid]) => {
      if (pid && uid) markReadBySubject({ post_id: pid })
    },
    { immediate: true },
  )

  // Landing on /p/:id is itself a view of this post (and ancestors if it's a reply).
  // Do not wait for IntersectionObserver or moh-hydrated — feed rows above/below
  // have their own observers, but the permalink target used to miss entirely.
  // Watch the post id, not the object: live count patches clone `data.value` and
  // must not look like a new render. The 30s client/server window still collapses
  // reload / keep-alive spam from the same person.
  const { markEngaged } = usePostViewTracker()
  function reportPermalinkViews(p: FeedPost | null | undefined) {
    if (!import.meta.client || !p?.id) return
    const chainIds: string[] = []
    let cur: FeedPost | undefined = p
    while (cur?.id) {
      if (cur.viewerCanAccess !== false) chainIds.push(cur.id)
      cur = cur.parent
    }
    if (chainIds.length) markEngaged(chainIds)
  }
  watch(
    () => post.value?.id,
    () => { reportPermalinkViews(post.value) },
    { immediate: true },
  )
  onMounted(() => { reportPermalinkViews(post.value) })
  onActivated(() => { reportPermalinkViews(post.value) })

  function onDeleted() {
    if (data.value) {
      data.value = {
        ...data.value,
        deletedAt: new Date().toISOString(),
        body: '',
        media: [],
        mentions: [],
      }
    }
  }

  const routeQuery = computed(() => route.query)
  const showReplyComposer = computed(() => routeQuery.value?.reply === '1' && !isOnlyMe.value && !isDeleted.value)

  // Share dialog: open automatically when ?share=1 is in the URL (e.g. after posting a check-in).
  const shareDialogOpen = ref(false)
  if (import.meta.client) {
    onMounted(() => {
      if (route.query.share === '1' && post.value) {
        shareDialogOpen.value = true
        // Strip the query param so a reload doesn't reopen the dialog.
        const { share: _share, ...rest } = route.query
        history.replaceState(history.state, '', route.path + (Object.keys(rest).length ? `?${new URLSearchParams(rest as Record<string, string>).toString()}` : ''))
      }
    })
  }

  const {
    threadParticipants,
    replyingToDisplay,
    fetchThreadParticipants,
  } = useThreadParticipants({
    post,
    isOnlyMe,
    currentUsername: computed(() => user.value?.username),
  })

  const replyContext = computed(() => {
    if (!post.value || !showReplyComposer.value) return null
    const usernames = threadParticipants.value.map((p) => p.username).filter(Boolean)
    return {
      parentId: post.value.id,
      visibility: post.value.visibility,
      mentionUsernames: usernames,
      groupDisplayName: feedPostThreadGroupDisplayName(post.value),
    }
  })

  function participantLinkClass(p: { id: string; username: string }): string {
    const author = post.value?.author
    if (author?.id === p.id) return userTierTextClass(userColorTier(author), { important: true, fallback: '' })
    return ''
  }

  const {
    comments,
    commentsNextCursor,
    commentsLoading,
    commentsError,
    commentsCounts,
    commentsSort,
    commentCountDisplay,
    loadMoreComments,
    onCommentsSortChange,
    onCommentsFilterReset,
    onCommentDeleted,
    prependComment,
    fetchComments,
  } = usePostComments({
    postId,
    post,
    isOnlyMe,
  })
  const commentsInitialLoading = useInitialLoading(commentsLoading, () => comments.value.length > 0, commentsError)

  /** Guests see 2 public replies then a CTA; unverified authed users get the same tease + verify CTA. */
  const conversationTeaseLimit = 2
  const showConversationGate = computed(() => {
    // isGatedPost is defined below; use viewerCanAccess directly here to avoid TDZ.
    if (isOnlyMe.value || post.value?.viewerCanAccess === false) return false
    if (!isAuthed.value) return true
    return !viewerIsVerified.value
  })

  const replyRedirectPath = computed(() => {
    const base = `/p/${encodeURIComponent(postId.value)}?reply=1`
    const ref = String(route.query.ref ?? '').trim()
    if (!ref) return base
    return `${base}&ref=${encodeURIComponent(ref)}`
  })

  const conversationMoreCount = computed(() =>
    Math.max(0, commentCountDisplay.value - conversationTeaseLimit),
  )
  const conversationTeaseAuthors = computed(() => uniqueReplyAuthorsFromPosts(comments.value))

  const conversationGateTitle = computed(() =>
    isAuthed.value ? 'Verify to join the conversation' : 'Join the conversation',
  )
  const conversationGateSubtitle = computed(() => {
    const n = commentCountDisplay.value
    if (isAuthed.value) {
      return n > 0
        ? `You're in — verify (takes a minute) to reply to these ${n} ${n === 1 ? 'reply' : 'replies'}.`
        : 'Verify your account (takes a minute) to reply on this post.'
    }
    return n > 0
      ? `${n} ${n === 1 ? 'reply' : 'replies'} so far. Sign up free, then verify to weigh in.`
      : 'Sign up free, then verify to leave the first reply.'
  })
  const conversationGatePrimaryLabel = computed(() =>
    isAuthed.value ? 'Get verified' : 'Join free',
  )
  const conversationGatePrimaryTo = computed(() => {
    const redirect = encodeURIComponent(replyRedirectPath.value)
    if (isAuthed.value) {
      return `/settings/verification?redirect=${redirect}`
    }
    return `/login?tab=signup&redirect=${redirect}`
  })
  const conversationGateSecondaryLabel = computed(() => (isAuthed.value ? undefined : 'Log in'))
  const conversationGateSecondaryTo = computed(() => {
    if (isAuthed.value) return undefined
    return `/login?redirect=${encodeURIComponent(replyRedirectPath.value)}`
  })

  // One discovery state serves both the right rail (wide screens) and the list below replies.
  const discoverState = usePostDiscoverMore({ postId, viewerId: computed(() => user.value?.id ?? null) })
  const {
    posts: discoverPosts,
    nextCursor: discoverNextCursor,
    loading: discoverLoading,
    showSection: showDiscoverSection,
    arm: armDiscoverMore,
    loadMore: loadMoreDiscover,
  } = discoverState

  const railCanRecommend = computed(() =>
    Boolean(post.value && post.value.viewerCanAccess !== false && !isDeleted.value && !isOnlyMe.value),
  )
  useRailContextPublisher(() =>
    railCanRecommend.value ? { kind: 'post', id: postId.value, discover: discoverState } : null,
  )
  const { recommendationsDisplayed: railRecommendationsDisplayed } = useRailContext()
  const railShowsDiscover = computed(() => railCanRecommend.value && railRecommendationsDisplayed.value)

  const discoverSentinelEl = ref<HTMLElement | null>(null)
  const discoverMoreSentinelEl = ref<HTMLElement | null>(null)
  let discoverObserver: IntersectionObserver | null = null
  let discoverMoreObserver: IntersectionObserver | null = null

  onMounted(() => {
    if (typeof IntersectionObserver === 'undefined') return
    discoverObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          armDiscoverMore()
        }
      },
      { root: null, rootMargin: '240px 0px', threshold: 0 },
    )
    discoverMoreObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          loadMoreDiscover()
        }
      },
      { root: null, rootMargin: '320px 0px', threshold: 0 },
    )
    watch(
      discoverSentinelEl,
      (el, _prev, onCleanup) => {
        discoverObserver?.disconnect()
        if (el) discoverObserver?.observe(el)
        onCleanup(() => discoverObserver?.disconnect())
      },
      { immediate: true },
    )
    watch(
      discoverMoreSentinelEl,
      (el, _prev, onCleanup) => {
        discoverMoreObserver?.disconnect()
        if (el) discoverMoreObserver?.observe(el)
        onCleanup(() => discoverMoreObserver?.disconnect())
      },
      { immediate: true },
    )
  })

  onBeforeUnmount(() => {
    discoverObserver?.disconnect()
    discoverObserver = null
    discoverMoreObserver?.disconnect()
    discoverMoreObserver = null
  })

  return {
    onDeleted,
    showReplyComposer,
    shareDialogOpen,
    replyingToDisplay,
    fetchThreadParticipants,
    replyContext,
    participantLinkClass,
    comments,
    commentsNextCursor,
    commentsLoading,
    commentsError,
    commentsCounts,
    commentsSort,
    commentCountDisplay,
    loadMoreComments,
    onCommentsSortChange,
    onCommentsFilterReset,
    onCommentDeleted,
    prependComment,
    fetchComments,
    commentsInitialLoading,
    conversationTeaseLimit,
    showConversationGate,
    conversationMoreCount,
    conversationTeaseAuthors,
    conversationGateTitle,
    conversationGateSubtitle,
    conversationGatePrimaryLabel,
    conversationGatePrimaryTo,
    conversationGateSecondaryLabel,
    conversationGateSecondaryTo,
    discoverPosts,
    discoverNextCursor,
    discoverLoading,
    showDiscoverSection,
    railShowsDiscover,
    discoverSentinelEl,
    discoverMoreSentinelEl,
  }
}

export type PostPageContext = ReturnType<typeof usePostPage>

export const POST_PAGE_CONTEXT: InjectionKey<PostPageContext> = Symbol('post-page')

/** Section components of pages/p/[id].vue read the shared context here. */
export function usePostPageContext(): PostPageContext {
  const ctx = inject(POST_PAGE_CONTEXT)
  if (!ctx) throw new Error('usePostPageContext() must be used inside pages/p/[id].vue')
  return ctx
}
