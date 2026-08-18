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
  // An absorbed row contributes its own author plus the authors the API already
  // flagged as hidden behind it — both are unreachable once the rows merge.
  const absorbed: PostAuthor[] = []
  for (const post of extraPosts) {
    if (post.author) absorbed.push(post.author)
    for (const author of post.threadCollapsedAuthors ?? []) absorbed.push(author)
  }
  const previews = mergeReplyAuthorPreviews(
    uniqueReplyAuthorsFromPosts((existing ?? []).map((author) => ({ author }))),
    uniqueReplyAuthorsFromPosts(absorbed.map((author) => ({ author }))),
  )
  if (!previews.length) return existing
  const byId = new Map<string, PostAuthor>()
  for (const author of [...(existing ?? []), ...absorbed]) byId.set(author.id, author)
  return previews
    .map((preview) => byId.get(preview.id) ?? ({
      ...preview,
      premium: false,
      premiumPlus: false,
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
 *
 * The invariant behind both branches: `threadCollapsedCount` only ever counts posts
 * that render nowhere in the merged row. Anything the viewer can see in the thread —
 * including an ancestor folded behind the dashed connector, which labels itself — is
 * excluded, on the API side and here.
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
        // This row renders nowhere once merged, so it counts — and so do the
        // replies the API already told *it* were hidden. Those can't double-count
        // the primary's own hidden set: the API only ever returns an anchor plus
        // its ancestors per thread, so an off-chain row here came from a
        // different collapse group with a disjoint set of hidden replies.
        extraCollapsed += 1 + Math.max(0, Math.floor(item.threadCollapsedCount ?? 0))
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
