import type { FeedPost } from '~/types/api'

type CollapseMode = 'root' | 'parent'

export function useFeedThreadDisplay(
  posts: Ref<FeedPost[]>,
  options?: {
    dedupeByRoot?: boolean
    collapseMode?: CollapseMode
  },
) {
  const dedupeByRoot = options?.dedupeByRoot ?? true

  function rootIdFor(p: FeedPost): string {
    let cur: FeedPost | undefined = p
    while (cur?.parent) cur = cur.parent
    return (cur?.id ?? p.id ?? '').trim()
  }

  const displayPosts = computed(() => {
    if (!dedupeByRoot) return posts.value
    const seenRootIds = new Set<string>()
    const out: FeedPost[] = []
    for (const p of posts.value) {
      const rootId = rootIdFor(p)
      if (!rootId) continue
      if (seenRootIds.has(rootId)) continue
      seenRootIds.add(rootId)
      out.push(p)
    }
    return out
  })

  function collapsedSiblingReplyCountFor(post: FeedPost): number {
    if ((post.threadCollapsedCount ?? 0) > 0) return post.threadCollapsedCount!
    return Math.max(0, post.commentCount ?? 0)
  }

  return {
    rootIdFor,
    displayPosts,
    collapsedSiblingReplyCountFor,
  }
}
