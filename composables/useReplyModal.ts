import type { FeedPost } from '~/types/api'

export type ReplyPostedPayload = { id: string; post?: FeedPost }

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

  return {
    open,
    parentPost,
    extraMentionUsernames,
    show,
    hide,
    onReplyPostedCallbacks,
    registerOnReplyPosted,
    unregisterOnReplyPosted,
  }
}
