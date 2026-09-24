import { computed, ref, watch, type Ref } from 'vue'
import type { FeedPost, WsPostsLiveUpdatedPayload } from '~/types/api'

/** Buffer remote arrivals so the reader's current row never moves. */
export function useFeedArrivals(options: {
  posts: Ref<FeedPost[]>
  viewerId: Ref<string | undefined>
  filter: Ref<string>
  context: Ref<string>
  prepend: (post: FeedPost) => void
}) {
  const pending = ref<FeedPost[]>([])
  let freshSince = Date.now()
  const authors = computed(() => {
    const seen = new Set<string>()
    return pending.value.map(post => post.author).filter(author => {
      if (seen.has(author.id)) return false
      seen.add(author.id)
      return true
    }).slice(0, 3)
  })

  function eligible(post: FeedPost) {
    return Boolean(Date.parse(post.createdAt) > freshSince && post.id && !post.deletedAt && !post.communityGroupId && !post.parentId
      && post.visibility !== 'onlyMe' && post.author.id !== options.viewerId.value
      && (options.filter.value === 'all' || post.visibility === options.filter.value))
  }

  const loadedIds = computed(() => {
    const ids = new Set<string>()
    for (const post of options.posts.value) {
      let node: FeedPost | undefined = post
      while (node && !ids.has(node.id)) {
        ids.add(node.id)
        if (!node.parent && node.parentId) ids.add(node.parentId)
        node = node.parent
      }
    }
    return ids
  })

  function receive(post: FeedPost) {
    if (!eligible(post) || loadedIds.value.has(post.id)) return
    const index = pending.value.findIndex(item => item.id === post.id)
    if (index >= 0) { pending.value[index] = post; return }
    if (pending.value.length < 60) pending.value.unshift(post)
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

  function receiveBatch(posts: FeedPost[]) {
    // Preserve server recommendation order within each batch.
    const known = new Set([...loadedIds.value, ...pending.value.map(post => post.id)])
    const fresh = posts.filter(post => eligible(post) && !known.has(post.id)).slice(0, 60 - pending.value.length)
    for (const post of fresh.reverse()) receive(post)
  }

  // Unseen recommendations can be old. Only publication after this visit/refresh is an arrival.
  function advanceBoundary(startedAt: number) {
    freshSince = Math.max(freshSince, startedAt)
    pending.value = pending.value.filter(eligible)
  }
  function clear() { pending.value = []; advanceBoundary(Date.now()) }
  watch([options.context, options.viewerId], clear, { flush: 'sync' })
  watch(loadedIds, ids => {
    pending.value = pending.value.filter(post => !ids.has(post.id))
  })
  return { pending, authors, receive, receiveBatch, applyUpdate, reveal, clear, advanceBoundary }
}
