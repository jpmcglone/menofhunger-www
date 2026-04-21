import type { FeedPost } from '~/types/api'

export type ReplyPostedPayload = { id: string; post?: FeedPost }

/**
 * Payload fired the moment the user clicks "Reply" — before the network call
 * has resolved. Consumers wire `optimisticPost` into their feed (e.g. via
 * `addReply`) and run `perform` through `usePendingPostsManager` so the row
 * shows immediately and gets replaced with the real post when it lands.
 *
 * `parentPost` is the post being replied to (already enriched on the
 * optimistic post as `optimisticPost.parent`); it's exposed separately so
 * consumers can look up where to slot the reply without unwrapping.
 */
export type ReplyPendingPayload = {
  localId: string
  optimisticPost: FeedPost
  parentPost: FeedPost
  perform: () => Promise<FeedPost | { id: string } | null | undefined>
}

export function useReplyModal() {
  const open = useState<boolean>('reply-modal-open', () => false)
  const parentPost = useState<FeedPost | null>('reply-modal-parent-post', () => null)
  /**
   * Extra usernames to prepend to the "Replying to" list and mention context.
   * Used when replying to a flat repost: the reposter's username is added here
   * while parentPost is set to the original post.
   */
  const extraMentionUsernames = useState<string[]>('reply-modal-extra-mentions', () => [])
  const onReplyPostedCallbacks = useState<Array<(payload: ReplyPostedPayload) => void>>(
    'reply-modal-on-reply-posted',
    () => [],
  )
  const onReplyPendingCallbacks = useState<Array<(payload: ReplyPendingPayload) => void>>(
    'reply-modal-on-reply-pending',
    () => [],
  )

  function show(post: FeedPost, extras: string[] = []) {
    parentPost.value = post
    extraMentionUsernames.value = extras
    open.value = true
  }

  function hide() {
    open.value = false
    parentPost.value = null
    extraMentionUsernames.value = []
  }

  function registerOnReplyPosted(cb: (payload: ReplyPostedPayload) => void) {
    if (onReplyPostedCallbacks.value.includes(cb)) return () => unregisterOnReplyPosted(cb)
    onReplyPostedCallbacks.value = [...onReplyPostedCallbacks.value, cb]
    return () => unregisterOnReplyPosted(cb)
  }

  function unregisterOnReplyPosted(cb?: (payload: ReplyPostedPayload) => void) {
    if (!cb) {
      onReplyPostedCallbacks.value = []
      return
    }
    onReplyPostedCallbacks.value = onReplyPostedCallbacks.value.filter((x) => x !== cb)
  }

  function registerOnReplyPending(cb: (payload: ReplyPendingPayload) => void) {
    if (onReplyPendingCallbacks.value.includes(cb)) return () => unregisterOnReplyPending(cb)
    onReplyPendingCallbacks.value = [...onReplyPendingCallbacks.value, cb]
    return () => unregisterOnReplyPending(cb)
  }

  function unregisterOnReplyPending(cb?: (payload: ReplyPendingPayload) => void) {
    if (!cb) {
      onReplyPendingCallbacks.value = []
      return
    }
    onReplyPendingCallbacks.value = onReplyPendingCallbacks.value.filter((x) => x !== cb)
  }

  return {
    open,
    parentPost,
    extraMentionUsernames,
    show,
    hide,
    onReplyPostedCallbacks,
    registerOnReplyPosted,
    unregisterOnReplyPosted,
    onReplyPendingCallbacks,
    registerOnReplyPending,
    unregisterOnReplyPending,
  }
}
