import type { FeedPost } from '~/types/api'

/**
 * Board URL for a kind=board post (thread root or comment), or null for regular posts.
 * Article Board posts open the article, where their discussion lives.
 */
export function boardPostHref(post: Pick<FeedPost, 'id' | 'kind' | 'parentId' | 'boardRootId'> & { article?: { id: string } | null }): string | null {
  if (post.kind !== 'board') return null
  if (!post.parentId && post.article?.id) return `/a/${encodeURIComponent(post.article.id)}`
  const rootId = post.boardRootId || post.id
  if (post.parentId && rootId !== post.id) return `/b/${encodeURIComponent(rootId)}/c/${encodeURIComponent(post.id)}`
  return `/b/${encodeURIComponent(rootId)}`
}
