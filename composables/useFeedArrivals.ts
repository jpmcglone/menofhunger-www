import { computed, ref, watch, type Ref } from 'vue'
import type { FeedPost, WsPostsLiveUpdatedPayload } from '~/types/api'

/** Buffer remote arrivals so the reader's current row never moves. */
export function useFeedArrivals(options: {
  posts: Ref<FeedPost[]>
  viewerId: Ref<string | undefined>
  filter: Ref<string>
  context: Ref<string>
  isReading: () => boolean
  prepend: (post: FeedPost) => void
}) {
  const pending = ref<FeedPost[]>([])
  const authors = computed(() => {
    const seen = new Set<string>()
    return pending.value.map(post => post.author).filter(author => {
      if (seen.has(author.id)) return false
      seen.add(author.id)
      return true
    }).slice(0, 3)
  })

  function eligible(post: FeedPost) {
    return Boolean(post.id && !post.deletedAt && !post.communityGroupId && !post.parentId
      && post.visibility !== 'onlyMe' && post.author.id !== options.viewerId.value
      && (options.filter.value === 'all' || post.visibility === options.filter.value))
  }

  function receive(post: FeedPost) {
    if (!eligible(post) || options.posts.value.some(item => item.id === post.id)) return
    const index = pending.value.findIndex(item => item.id === post.id)
    if (index >= 0) { pending.value[index] = post; return }
    if (options.isReading() || pending.value.length) pending.value.unshift(post)
    else options.prepend(post)
  }

  function applyUpdate(payload: WsPostsLiveUpdatedPayload) {
    pending.value = pending.value.map(post => post.id === payload.postId
      ? { ...post, ...payload.patch } : post).filter(eligible)
  }

  function reveal() {
    const batch = pending.value
    pending.value = []
    // prepend reverses a batch; iterate oldest first so the newest remains on top.
    for (const post of batch.slice().reverse()) {
      if (eligible(post)) options.prepend(post)
    }
  }

  function clear() { pending.value = [] }
  watch([options.context, options.viewerId], clear, { flush: 'sync' })
  watch(() => options.posts.value.map(post => post.id), ids => {
    const existing = new Set(ids)
    pending.value = pending.value.filter(post => !existing.has(post.id))
  })
  return { pending, authors, receive, applyUpdate, reveal, clear }
}
