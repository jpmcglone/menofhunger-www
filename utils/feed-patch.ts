/**
 * Shared helpers for real-time patching of FeedPost trees.
 *
 * Posts can carry a nested `.parent` chain (e.g. a reply row that embeds its parent
 * for context display). These utilities walk the full chain so that a patch targeting
 * any node in the chain is applied correctly — even when the target is not the
 * top-level entry in a feed array.
 *
 * applyLiveUpdatedPatch and applyInteractionPatch are the canonical field allowlists
 * for realtime events. Every handler (feed, profile, permalink, global cache) calls
 * these — no more duplicated inline field lists.
 */
import type { FeedPost, WsPostsInteractionPayload, WsPostsLiveUpdatedPayload } from '~/types/api'

/** Returns true if `post` or any ancestor in its `.parent` chain has `id === targetId`. */
export function containsPostId(post: FeedPost | undefined, targetId: string): boolean {
  let cur = post
  while (cur) {
    if (cur.id === targetId) return true
    cur = cur.parent
  }
  return false
}

/**
 * Recursively applies `patchPost` to `post` and every `.parent` node in the chain.
 *
 * Returns a new (shallow-cloned) object only at levels where a change occurred;
 * unchanged nodes are returned by reference, avoiding unnecessary reactive updates.
 */
export function patchPostChain(
  post: FeedPost,
  patchPost: (p: FeedPost) => FeedPost,
): FeedPost {
  const next = patchPost(post)
  if (!post.parent) return next
  const patchedParent = patchPostChain(post.parent, patchPost)
  if (patchedParent === post.parent && next === post) return post
  return { ...next, parent: patchedParent }
}

/**
 * Collects all post IDs in a post's full `.parent` chain (including the post itself).
 * Useful for computing the full set of socket subscriptions a feed entry needs.
 */
export function collectChainIds(post: FeedPost): string[] {
  const ids: string[] = []
  let cur: FeedPost | undefined = post
  while (cur) {
    if (cur.id) ids.push(cur.id)
    cur = cur.parent
  }
  return ids
}

/**
 * Applies a `liveUpdated` server patch to a single post node.
 *
 * Returns the same reference if `post.id !== postId` (no change).
 * This is the canonical field allowlist for live-edit/count updates.
 * Wrap with `patchPostChain` to apply through the full `.parent` chain.
 *
 * Note: `clearBumpsForPostIds` is a side effect the caller must handle
 * separately when `patch.commentCount` is present.
 */
export function applyLiveUpdatedPatch(
  post: FeedPost,
  postId: string,
  patch: WsPostsLiveUpdatedPayload['patch'],
): FeedPost {
  if (post.id !== postId) return post
  const next = { ...post }
  if (typeof patch.body === 'string') next.body = patch.body
  if (patch.editedAt !== undefined) next.editedAt = patch.editedAt
  if (typeof patch.editCount === 'number') next.editCount = patch.editCount
  if (patch.deletedAt !== undefined) next.deletedAt = patch.deletedAt
  if (typeof patch.commentCount === 'number') next.commentCount = patch.commentCount
  if (typeof patch.viewerCount === 'number') next.viewerCount = patch.viewerCount
  return next
}

/**
 * Applies an `interaction` (boost / bookmark) event to a single post node.
 *
 * Returns the same reference if `post.id !== postId` (no change).
 * This is the canonical field allowlist for interaction updates.
 * Wrap with `patchPostChain` to apply through the full `.parent` chain.
 */
export function applyInteractionPatch(
  post: FeedPost,
  postId: string,
  payload: WsPostsInteractionPayload,
  isMe: boolean,
): FeedPost {
  if (post.id !== postId) return post
  const next = { ...post }
  if (payload.kind === 'boost' && typeof payload.boostCount === 'number') {
    next.boostCount = Math.max(0, Math.floor(payload.boostCount))
    if (isMe) next.viewerHasBoosted = Boolean(payload.active)
  }
  if (payload.kind === 'bookmark' && typeof payload.bookmarkCount === 'number') {
    next.bookmarkCount = Math.max(0, Math.floor(payload.bookmarkCount))
    if (isMe) next.viewerHasBookmarked = Boolean(payload.active)
  }
  return next
}
