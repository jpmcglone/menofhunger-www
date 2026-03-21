import type { FeedPost } from '~/types/api'

function chainLength(p: FeedPost): number {
  let n = 0
  let c: FeedPost | undefined = p
  while (c) {
    n++
    c = c.parent
  }
  return n
}

function rootIdOf(p: FeedPost): string {
  let c: FeedPost | undefined = p
  while (c?.parent) c = c.parent
  return c?.id ?? p.id
}

function chainIds(p: FeedPost): Set<string> {
  const ids = new Set<string>()
  let c: FeedPost | undefined = p
  while (c) {
    ids.add(c.id)
    c = c.parent
  }
  return ids
}

/**
 * Merges feed rows that share the same thread root: keep one primary row per root
 * (deepest chain; tie → first in feed order), absorb the rest, and bump
 * `threadCollapsedCount` for absorbed sibling branches.
 */
export function mergeFeedThreadsForDisplay(raw: FeedPost[]): FeedPost[] {
  if (!raw.length) return raw

  const byRoot = new Map<string, FeedPost[]>()
  for (const p of raw) {
    const root = rootIdOf(p)
    const group = byRoot.get(root) ?? []
    group.push(p)
    byRoot.set(root, group)
  }

  const absorbed = new Set<string>()
  const overrides = new Map<string, FeedPost>()

  for (const [, group] of byRoot) {
    if (group.length <= 1) continue

    const primary = group.reduce((a, b) =>
      chainLength(a) >= chainLength(b) ? a : b,
    )
    const primaryIds = chainIds(primary)

    let extraCollapsed = 0
    for (const item of group) {
      if (item.id === primary.id) continue
      absorbed.add(item.id)
      if (!primaryIds.has(item.id)) {
        extraCollapsed++
      }
    }

    if (extraCollapsed > 0) {
      overrides.set(primary.id, {
        ...primary,
        threadCollapsedCount: (primary.threadCollapsedCount ?? 0) + extraCollapsed,
      })
    }
  }

  return raw
    .filter((p) => !absorbed.has(p.id))
    .map((p) => overrides.get(p.id) ?? p)
}

export function collapsedSiblingReplyCountForPost(post: FeedPost): number {
  if ((post.threadCollapsedCount ?? 0) > 0) return post.threadCollapsedCount!
  return Math.max(0, post.commentCount ?? 0)
}
