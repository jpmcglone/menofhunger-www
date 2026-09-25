import type { FeedPost } from '~/types/api'

/** Board URL for a kind=board post (thread root or comment), or null for regular posts. */
export function boardPostHref(post: Pick<FeedPost, 'id' | 'kind' | 'parentId' | 'boardRootId'>): string | null {
  if (post.kind !== 'board') return null
  const rootId = post.boardRootId || post.id
  if (post.parentId && rootId !== post.id) return `/b/${encodeURIComponent(rootId)}/c/${encodeURIComponent(post.id)}`
  return `/b/${encodeURIComponent(rootId)}`
}
