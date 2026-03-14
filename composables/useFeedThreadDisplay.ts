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
  const collapseMode = options?.collapseMode ?? 'root'

  function rootIdFor(p: FeedPost): string {
    let cur: FeedPost | undefined = p
    while (cur?.parent) cur = cur.parent
    return (cur?.id ?? p.id ?? '').trim()
  }

  const replyCountByRootId = computed(() => {
    const totals = new Map<string, number>()
    for (const p of posts.value) {
      const isReply = Boolean((p.parentId ?? '').trim())
      if (!isReply) continue
      const rootId = rootIdFor(p)
      if (!rootId) continue
      totals.set(rootId, (totals.get(rootId) ?? 0) + 1)
    }
    return totals
  })

  const replyCountByParentId = computed(() => {
    const totals = new Map<string, number>()
    for (const p of posts.value) {
      const pid = (p.parentId ?? '').trim()
      if (!pid) continue
      totals.set(pid, (totals.get(pid) ?? 0) + 1)
    }
    return totals
  })

  function replyCountForParentId(parentId: string): number {
    const pid = (parentId ?? '').trim()
    if (!pid) return 0
    return replyCountByParentId.value.get(pid) ?? 0
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
    if (collapseMode === 'parent') {
      const parentId = (post.parentId ?? '').trim()
      if (!parentId) return 0
      const siblingReplies = replyCountByParentId.value.get(parentId) ?? 0
      return Math.max(0, siblingReplies - 1)
    }

    const rootId = rootIdFor(post)
    if (!rootId) return 0
    const totalReplies = replyCountByRootId.value.get(rootId) ?? 0
    const visibleReplyCount = Boolean((post.parentId ?? '').trim()) ? 1 : 0
    return Math.max(0, totalReplies - visibleReplyCount)
  }

  return {
    rootIdFor,
    replyCountByRootId,
    replyCountByParentId,
    replyCountForParentId,
    displayPosts,
    collapsedSiblingReplyCountFor,
  }
}
