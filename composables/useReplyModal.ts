import type { FeedPost } from '~/types/api'

export function useReplyModal() {
  const open = useState<boolean>('reply-modal-open', () => false)
  const parentPost = useState<FeedPost | null>('reply-modal-parent-post', () => null)

  function show(post: FeedPost) {
    parentPost.value = post
    open.value = true
  }

  function hide() {
    open.value = false
    parentPost.value = null
  }

  return { open, parentPost, show, hide }
}
