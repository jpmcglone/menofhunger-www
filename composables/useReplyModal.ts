import type { FeedPost } from '~/types/api'

export type ReplyPostedPayload = { id: string; post?: FeedPost }

export function useReplyModal() {
  const open = useState<boolean>('reply-modal-open', () => false)
  const parentPost = useState<FeedPost | null>('reply-modal-parent-post', () => null)
  const onReplyPostedCallback = useState<((payload: ReplyPostedPayload) => void) | null>(
    'reply-modal-on-reply-posted',
    () => null,
  )

  function show(post: FeedPost) {
    parentPost.value = post
    open.value = true
  }

  function hide() {
    open.value = false
    parentPost.value = null
  }

  function registerOnReplyPosted(cb: (payload: ReplyPostedPayload) => void) {
    onReplyPostedCallback.value = cb
  }

  function unregisterOnReplyPosted() {
    onReplyPostedCallback.value = null
  }

  return {
    open,
    parentPost,
    show,
    hide,
    onReplyPostedCallback,
    registerOnReplyPosted,
    unregisterOnReplyPosted,
  }
}
