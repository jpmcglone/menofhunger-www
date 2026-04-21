import type { FeedPost, PostMedia, PostVisibility, PostAuthor } from '~/types/api'
import type { ComposerMediaItem, ComposerPollPayload } from '~/composables/composer/types'

/**
 * Build an optimistic FeedPost that can be inserted into a feed immediately,
 * before the server has acknowledged the create. The row uses `_localId` for
 * identity until the real server-assigned `id` arrives.
 *
 * Notes:
 *  - Media are mapped from the composer's local items so previews render
 *    against the same blob URLs the user just selected.
 *  - Polls are NOT rendered optimistically yet (server assigns option ids,
 *    expiry, etc.); the row simply omits poll UI until the real post lands.
 */
export function buildOptimisticPost(input: {
  localId: string
  body: string
  visibility: PostVisibility
  media: ComposerMediaItem[]
  poll?: ComposerPollPayload | null
  parentId?: string | null
  communityGroupId?: string | null
  author: PostAuthor
}): FeedPost {
  const optimisticMedia: PostMedia[] = (input.media ?? [])
    .filter(Boolean)
    .map((m, i) => ({
      id: `local_media_${input.localId}_${i}`,
      kind: m.kind,
      source: m.source,
      url: m.url ?? m.previewUrl,
      mp4Url: m.mp4Url ?? null,
      thumbnailUrl: m.previewUrl ?? null,
      width: m.width ?? null,
      height: m.height ?? null,
      durationSeconds: m.durationSeconds ?? null,
      alt: m.altText ?? null,
      deletedAt: null,
    }))

  const post: FeedPost = {
    id: input.localId,
    _localId: input.localId,
    _pending: 'posting',
    _pendingError: null,
    createdAt: new Date().toISOString(),
    body: input.body,
    deletedAt: null,
    visibility: input.visibility,
    boostCount: 0,
    bookmarkCount: 0,
    commentCount: 0,
    repostCount: 0,
    viewerCount: 0,
    media: optimisticMedia,
    parentId: input.parentId ?? null,
    communityGroupId: input.communityGroupId ?? null,
    viewerHasBoosted: false,
    viewerHasBookmarked: false,
    viewerHasReposted: false,
    viewerCanAccess: true,
    author: input.author,
    mentions: [],
  }
  return post
}
