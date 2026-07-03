import type { FeedPost, PostAuthor } from '~/types/api'
import { mergeReplyAuthorPreviews, uniqueReplyAuthorsFromPosts } from '~/utils/thread-reply-authors'

/**
 * Client-only display shape: a `FeedPost` plus the ancestor ids (if any) that
 * were independently returned elsewhere on the same feed page and must stay
 * visible when `FeedPostRow` collapses this post's ancestor chain. Not part of
 * the API contract — never add this to `types/api-contracts.gen.ts`.
 */
export type FeedThreadDisplayPost = FeedPost & { pinnedAncestorIds?: string[] }

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

function mergeThreadCollapsedAuthors(
  existing: PostAuthor[] | undefined,
  extraPosts: FeedPost[],
): PostAuthor[] | undefined {
  const previews = mergeReplyAuthorPreviews(
    existing?.map((author) => ({
      id: author.id,
      username: author.username,
      name: author.name,
      avatarUrl: author.avatarUrl,
      isOrganization: author.isOrganization,
    })),
    uniqueReplyAuthorsFromPosts(extraPosts),
  )
  if (!previews.length) return existing
  const byId = new Map<string, PostAuthor>()
  for (const author of existing ?? []) byId.set(author.id, author)
  for (const post of extraPosts) {
    if (post.author?.id) byId.set(post.author.id, post.author)
  }
  return previews
    .map((preview) => byId.get(preview.id) ?? ({
      ...preview,
      premium: false,
      premiumPlus: false,
      stewardBadgeEnabled: false,
      verifiedStatus: 'none' as const,
      orgAffiliations: [],
    }))
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
 *
 * An absorbed row that IS an ancestor of the kept primary (the feed independently
 * surfaced that post — e.g. it ranked highly on its own) is recorded in
 * `pinnedAncestorIds` instead of bumping the collapsed count, so `FeedPostRow` keeps
 * it visible rather than folding it into a collapsed connector.
 */
export function mergeFeedThreadsForDisplay(raw: FeedPost[]): FeedThreadDisplayPost[] {
  if (!raw.length) return raw

  const byRoot = new Map<string, FeedPost[]>()
  for (const p of raw) {
    const root = rootIdOf(p)
    const group = byRoot.get(root) ?? []
    group.push(p)
    byRoot.set(root, group)
  }

  const absorbed = new Set<string>()
  const overrides = new Map<string, FeedThreadDisplayPost>()

  for (const [, group] of byRoot) {
    if (group.length <= 1) continue

    const primary = group.reduce((a, b) =>
      chainLength(a) >= chainLength(b) ? a : b,
    )
    const primaryIds = chainIds(primary)

    let extraCollapsed = 0
    const pinnedAncestorIds: string[] = []
    for (const item of group) {
      if (item.id === primary.id) continue
      absorbed.add(item.id)
      if (primaryIds.has(item.id)) {
        pinnedAncestorIds.push(item.id)
      } else {
        extraCollapsed++
      }
    }

    if (extraCollapsed > 0 || pinnedAncestorIds.length > 0) {
      const absorbedSiblingPosts = group.filter(
        (item) => item.id !== primary.id && !primaryIds.has(item.id),
      )
      overrides.set(primary.id, {
        ...primary,
        threadCollapsedCount: (primary.threadCollapsedCount ?? 0) + extraCollapsed,
        threadCollapsedAuthors: mergeThreadCollapsedAuthors(
          primary.threadCollapsedAuthors,
          absorbedSiblingPosts,
        ),
        ...(pinnedAncestorIds.length > 0 ? { pinnedAncestorIds } : {}),
      })
    }
  }

  return raw
    .filter((p) => !absorbed.has(p.id))
    .map((p) => overrides.get(p.id) ?? p)
}

/** Collapsed sibling count stamped by feed dedupe (API + client merge). Not commentCount. */
export function collapsedSiblingReplyCountForPost(post: FeedPost): number {
  return Math.max(0, Math.floor(post.threadCollapsedCount ?? 0))
}
