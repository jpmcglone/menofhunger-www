import type { FeedPost } from '~/types/api'

/**
 * Board URL for a kind=board post (thread root or comment), or null for regular posts.
 * Article-sourced Board posts open on the Board; the title/link opens the article.
 */
export function boardPostHref(post: Pick<FeedPost, 'id' | 'kind' | 'parentId' | 'boardRootId'> & { article?: { id: string } | null }): string | null {
  if (post.kind !== 'board') return null
  const rootId = post.boardRootId || post.id
  if (post.parentId && rootId !== post.id) return `/b/${encodeURIComponent(rootId)}/c/${encodeURIComponent(post.id)}`
  return `/b/${encodeURIComponent(rootId)}`
}
