import type { FeedPost, PostVisibility } from '~/types/api'

export type FeedFilter = 'all' | 'public' | PostVisibility
export type FeedSort = 'new' | 'trending'

export function normalizeAuthorIds(ids: string[] | null | undefined): string[] | null {
  if (!ids) return null
  const cleaned = ids.map((id) => (id ?? '').trim()).filter(Boolean)
  return cleaned.length > 0 ? cleaned.slice(0, 50) : null
}

export function postAndParentChainIds(post: FeedPost): string[] {
  const ids: string[] = []
  let node: FeedPost | undefined = post
  while (node) {
    if (node.id) ids.push(node.id)
    if (node.parent) {
      node = node.parent
      continue
    }
    if (node.parentId) ids.push(node.parentId)
    break
  }
  return ids
}

export function postsFeedListQuery(opts: {
  visibility: FeedFilter
  followingOnly: boolean
  sort: FeedSort
  forYou?: boolean
  cursor: string | null
  groupsHub?: boolean
  communityGroupId?: string | null
  authorIds?: string[] | null
  mediaOnly?: boolean
  limit?: number
  topLevelOnly?: boolean
  /** Filter posts by author's US state code (e.g. "VA"). Phase 0 API contract. */
  authorLocationState?: string | null
  /** Cursor-less For You pull-to-refresh: skip page-1 cache and apply refresh jitter. */
  refresh?: boolean
}): Record<string, string | number | boolean | undefined> {
  const gid = (opts.communityGroupId ?? '').trim()
  const groupScoped = Boolean(opts.groupsHub || gid)
  const authorIds = normalizeAuthorIds(opts.authorIds)
  // For You is a personalized re-rank of trending. It overrides sort and ignores `followingOnly`
  // (the algorithm has its own follow-graph signal). Group-scoped feeds aren't affected.
  const isForYou = Boolean(opts.forYou && !groupScoped)
  return {
    limit: opts.limit ?? 30,
    collapseByRoot: opts.mediaOnly ? false : true,
    collapseMode: 'root',
    prefer: 'reply',
    collapseMaxPerRoot: 2,
    ...(groupScoped
      ? {
          ...(opts.groupsHub ? { groupsHub: true } : {}),
          ...(gid ? { communityGroupId: gid } : {}),
          visibility: 'all',
          ...(opts.topLevelOnly ? { topLevelOnly: true } : {}),
        }
      : {
          visibility: opts.visibility,
          ...(!isForYou && opts.followingOnly ? { followingOnly: true } : {}),
          ...(authorIds ? { authorIds: authorIds.join(',') } : {}),
          ...(opts.topLevelOnly ? { topLevelOnly: true } : {}),
        }),
    ...(opts.mediaOnly ? { mediaOnly: true } : {}),
    ...(isForYou ? { sort: 'forYou' } : opts.sort === 'trending' ? { sort: 'trending' } : {}),
    ...(opts.cursor ? { cursor: opts.cursor } : {}),
    ...(opts.authorLocationState ? { authorLocationState: opts.authorLocationState } : {}),
    ...(isForYou && opts.refresh && !opts.cursor ? { refresh: true } : {}),
  }
}
