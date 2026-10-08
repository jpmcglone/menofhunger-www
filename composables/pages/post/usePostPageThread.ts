import { usePresenceCallback } from '~/composables/presence/usePresenceCallback'
import type { CommunityGroupPreview, FeedPost } from '~/types/api'
import { applyLiveUpdatedPatch } from '~/utils/feed-patch'
import { applyCommunityGroupJoin, communityGroupJoinToast } from '~/utils/community-group-preview'
import { groupAvatarRoundClass as getGroupAvatarRoundClass } from '~/utils/avatar-rounding'
import { getApiErrorMessage } from '~/utils/api-error'
import { useReplyModal } from '~/composables/useReplyModal'
import type { PostsCallback } from '~/composables/usePresence'
import type { usePostPageRoute, usePostPagePost , usePostPageConversation } from './usePostPage'

/**
 * Comment sort scrolling, realtime post updates, reply posting, and the group
 * shell and join action.
 */
export function usePostPageThread(ctx: ReturnType<typeof usePostPageRoute> & ReturnType<typeof usePostPagePost> & ReturnType<typeof usePostPageConversation>) {
  const { postId, apiFetchData, invalidateMyGroups, pushToast, post, data, accessHint, refreshPost, onDeleted, fetchThreadParticipants, replyContext, commentsCounts, onCommentsSortChange, onCommentsFilterReset, onCommentDeleted, prependComment, fetchComments } = ctx

  const commentsFeedTopEl = ref<HTMLElement | null>(null)
  const { scrollToTop: scrollFeedToTop } = useFeedScrollToTop(commentsFeedTopEl)
  async function onCommentsSortChangeWithScroll(next: 'new' | 'trending') {
    await onCommentsSortChange(next)
    scrollFeedToTop()
  }
  async function onCommentsFilterResetWithScroll() {
    await onCommentsFilterReset()
    scrollFeedToTop()
  }

  // Realtime: subscribe to this post while on-screen, and refresh replies when needed.
  // Content patches (counts, body, flags) also flow through the global cache plugin so
  // PostRow always shows the freshest data without needing explicit data.value updates.
  // onLiveUpdated here handles permalink-specific concerns: commentsCounts, comment
  // re-fetching, and deletion.
  const { subscribePosts, unsubscribePosts } = usePresence()
  const postsCb: PostsCallback = {
    onLiveUpdated: (payload) => {
      const pid = String(payload?.postId ?? '').trim()
      if (!pid || pid !== postId.value) return
      const patch = payload?.patch ?? {}
      // Apply the canonical field allowlist to data.value for any template code that
      // reads directly from it (outside of PostRow's cache overlay).
      if (data.value && (data.value as FeedPost).id === pid) {
        data.value = applyLiveUpdatedPatch(data.value as FeedPost, pid, patch) as typeof data.value
      }
      const serverCommentCount = typeof patch?.commentCount === 'number'
        ? Math.max(0, patch.commentCount)
        : null
      if (serverCommentCount != null) {
        if (commentsCounts.value) {
          commentsCounts.value = { ...commentsCounts.value, all: serverCommentCount }
        }
      }
      if (payload?.reason === 'comment_created' || payload?.reason === 'comment_deleted') {
        // If server gave us authoritative count in the patch, avoid immediate hard refetch
        // to reduce count jitter/double-update races right after posting.
        if (serverCommentCount == null) void fetchComments(null)
      }
      if (payload?.reason === 'post_deleted') {
        onDeleted()
      }
    },
    onCommentAdded: (payload) => {
      if (String(payload?.parentPostId ?? '').trim() !== postId.value) return
      if (!payload?.comment) return
      // List-only insert (dedupes by id with the commenter's own HTTP response).
      // The count is reconciled by the paired `liveUpdated` event above, never here.
      prependComment(payload.comment)
    },
    onCommentDeleted: (payload) => {
      if (String(payload?.parentPostId ?? '').trim() !== postId.value) return
      if (!payload?.commentId) return
      onCommentDeleted(payload.commentId)
    },
  }
  if (import.meta.client) {
    function permalinkSubscriptionIds(p: FeedPost | null | undefined): string[] {
      const ids: string[] = []
      let cur: FeedPost | undefined = p ?? undefined
      while (cur?.id) {
        ids.push(cur.id)
        cur = cur.parent
      }
      // Always include the route id even before the post payload lands.
      const routeId = String(postId.value ?? '').trim()
      if (routeId && !ids.includes(routeId)) ids.unshift(routeId)
      return [...new Set(ids)]
    }

    let subscribedPermalinkIds: string[] = []

    function syncPermalinkSubscriptions(nextPost: FeedPost | null | undefined) {
      const next = permalinkSubscriptionIds(nextPost)
      const prevSet = new Set(subscribedPermalinkIds)
      const nextSet = new Set(next)
      const toSub = next.filter((id) => !prevSet.has(id))
      const toUnsub = subscribedPermalinkIds.filter((id) => !nextSet.has(id))
      if (toUnsub.length) unsubscribePosts(toUnsub)
      if (toSub.length) subscribePosts(toSub)
      subscribedPermalinkIds = next
    }

    usePresenceCallback('Posts', postsCb)
    onMounted(() => {
      syncPermalinkSubscriptions(post.value)
    })
    watch(
      () => post.value,
      (p) => {
        syncPermalinkSubscriptions(p)
      },
    )
    watch(
      () => postId.value,
      () => {
        syncPermalinkSubscriptions(post.value)
      },
    )
    onBeforeUnmount(() => {
      if (subscribedPermalinkIds.length) unsubscribePosts(subscribedPermalinkIds)
      subscribedPermalinkIds = []
    })
  }

  async function createComment(
    body: string,
    visibility: import('~/types/api').PostVisibility,
    media: import('~/composables/composer/types').CreateMediaPayload[],
  ): Promise<FeedPost | null> {
    if (!post.value?.id) return null
    const res = await apiFetchData<FeedPost>('/posts', {
      method: 'POST',
      body: {
        body,
        visibility,
        parent_id: post.value.id,
        mentions: replyContext.value?.mentionUsernames,
        media,
      },
    })
    return res ?? null
  }

  const permalinkComposerRef = ref<{ draftText?: string; hasUnsavedContent?: boolean } | null>(null)

  // Typing presence for the inline reply composer on the permalink page.
  const { notifyTyping: notifyPermalinkTyping, stopTyping: stopPermalinkTyping } = usePostTyping(postId)

  watch(
    () => permalinkComposerRef.value?.draftText ?? '',
    (text) => notifyPermalinkTyping(text),
  )

  function onPermalinkReplyPosted(payload: { id: string; post?: FeedPost }) {
    stopPermalinkTyping()
    onReplyPosted(payload)
  }

  function onReplyPosted(payload: { id: string; post?: FeedPost }) {
    // Insert the reply row immediately for instant feedback. We deliberately do NOT
    // touch the reply count here. The count is authoritative-only: the server emits
    // `posts:liveUpdated` (reason `comment_created`) carrying the absolute post-
    // increment count to this post's room, which `onLiveUpdated` above applies to
    // both `commentsCounts.all` and `data.commentCount`. Adding an optimistic +1
    // here is what double-counted (0 → 2) whenever that WS patch arrived first.
    if (payload.post) {
      prependComment(payload.post)
    } else {
      void fetchComments(null)
    }
    void fetchThreadParticipants()
  }

  const replyModal = useReplyModal()
  let unregisterReplyPosted: null | (() => void) = null
  onMounted(() => {
    if (!import.meta.client) return
    const cb = (payload: import('~/composables/useReplyModal').ReplyPostedPayload) => {
      if (payload.post?.parentId === post.value?.id) {
        onReplyPosted(payload)
      }
    }
    unregisterReplyPosted = replyModal.registerOnReplyPosted(cb)
  })
  onBeforeUnmount(() => {
    unregisterReplyPosted?.()
    unregisterReplyPosted = null
  })

  const isRestricted = computed(() => {
    const v = post.value?.visibility
    if (v === 'verifiedOnly' || v === 'premiumOnly' || v === 'onlyMe') return true
    return accessHint.value !== 'none'
  })

  const isGatedPost = computed(() => post.value?.viewerCanAccess === false)

  // "Thin strip" group affiliation for the permalink header. We resolve it from
  // the highlighted post's own groupPreview (the API populates this for any post
  // belonging to a community group, not just gated ones). When the highlighted
  // post is a reply rendered inside AppFeedPostRow, the group still belongs to
  // the highlighted post, not the parent — so we read from `post` directly.
  const postGroupShell = computed<CommunityGroupPreview | null>(() => {
    const gp = post.value?.groupPreview
    if (!gp || !gp.id || !gp.slug) return null
    return gp
  })

  const postGroupAvatarRoundClass = getGroupAvatarRoundClass()

  const postGroupInitials = computed(() => {
    const name = postGroupShell.value?.name?.trim() || ''
    if (!name) return ''
    const parts = name.split(/\s+/).slice(0, 2)
    return parts.map((p) => p.charAt(0).toUpperCase()).join('')
  })

  // Surface the post's group up to the layout so:
  //   - the "Groups" left-nav stays selected while reading a group post
  //   - any other layout-level chrome can react if needed
  // Cleared when the post has no group, the route changes, or we unmount.
  const pageGroupCtx = usePageGroupContext()
  watchEffect(() => {
    const gp = postGroupShell.value
    pageGroupCtx.value = gp
      ? {
          id: gp.id,
          slug: gp.slug,
          name: gp.name,
          avatarImageUrl: gp.avatarImageUrl ?? null,
        }
      : null
  })
  onBeforeUnmount(() => {
    pageGroupCtx.value = null
  })

  const groupJoinBusy = ref(false)

  function patchPostGroupPreview(status: string) {
    const current = data.value
    if (!current?.groupPreview) return
    data.value = {
      ...current,
      groupPreview: applyCommunityGroupJoin(current.groupPreview, status),
    }
  }

  async function joinGroupFromPreview() {
    const gp = post.value?.groupPreview
    if (!gp || groupJoinBusy.value) return
    groupJoinBusy.value = true
    try {
      const result = await apiFetchData<{ ok: boolean; status: 'active' | 'pending' }>(
        `/groups/${encodeURIComponent(gp.id)}/join`,
        { method: 'POST', body: {} },
      )
      const status = result?.status === 'pending' ? 'pending' : 'active'
      patchPostGroupPreview(status)
      invalidateMyGroups()
      pushToast(communityGroupJoinToast(status, gp.name))
      try {
        await refreshPost()
        patchPostGroupPreview(status)
      } catch { /* preview already shows Joined */ }
    } catch (e: unknown) {
      pushToast({
        title: 'Could not join',
        message: getApiErrorMessage(e) || 'Try again.',
        tone: 'error',
        durationMs: 4500,
      })
    } finally {
      groupJoinBusy.value = false
    }
  }

  return {
    commentsFeedTopEl,
    onCommentsSortChangeWithScroll,
    createComment,
    permalinkComposerRef,
    onPermalinkReplyPosted,
    isRestricted,
    isGatedPost,
    postGroupShell,
    postGroupAvatarRoundClass,
    postGroupInitials,
    groupJoinBusy,
    joinGroupFromPreview,
  }
}
