/**
 * Global post-cache plugin.
 *
 * Registers a single PostsCallback that patches usePostCache whenever a
 * liveUpdated or interaction event arrives from the server. This is the one
 * canonical patch point for post content — no matter how many feeds are mounted,
 * the cache is updated exactly once per event and PostRow reads fresh data from it.
 *
 * Only deletions and ordering/insertion changes are handled per-feed in their
 * own callbacks; content patches (counts, body, flags) all flow through here.
 */
import { applyLiveUpdatedPatch, applyInteractionPatch } from '~/utils/feed-patch'

export default defineNuxtPlugin(() => {
  const { addPostsCallback, removePostsCallback } = usePresence()
  const postCache = usePostCache()
  const boostState = useBoostState()
  const { clearBumpsForPostIds } = usePostCountBumps()
  const { user: authUser } = useAuth()

  const globalCacheCb = {
    onLiveUpdated: (payload: import('~/types/api').WsPostsLiveUpdatedPayload) => {
      const postId = String(payload?.postId ?? '').trim()
      if (!postId) return
      const patch = payload?.patch ?? {}
      // Extract only the fields the canonical allowlist covers.
      const delta: Partial<import('~/types/api').FeedPost> = {}
      if (typeof patch.body === 'string') delta.body = patch.body
      if (patch.editedAt !== undefined) delta.editedAt = patch.editedAt
      if (typeof patch.editCount === 'number') delta.editCount = patch.editCount
      if (patch.deletedAt !== undefined) delta.deletedAt = patch.deletedAt
      if (typeof patch.commentCount === 'number') {
        delta.commentCount = patch.commentCount
        // Clear optimistic bumps now that the server has confirmed the real count.
        clearBumpsForPostIds([postId])
      }
      if (typeof patch.viewerCount === 'number') delta.viewerCount = patch.viewerCount
      // boost / bookmark / repost counts are also fanned out via this event so
      // every viewer of the post (not just actor + author) sees them update.
      // The actor's `viewerHasBoosted` / `viewerHasBookmarked` flags continue
      // to flow through `onInteraction` below.
      if (typeof patch.boostCount === 'number') {
        delta.boostCount = Math.max(0, Math.floor(patch.boostCount))
      }
      if (typeof patch.bookmarkCount === 'number') {
        delta.bookmarkCount = Math.max(0, Math.floor(patch.bookmarkCount))
      }
      if (typeof patch.repostCount === 'number') {
        delta.repostCount = Math.max(0, Math.floor(patch.repostCount))
      }
      postCache.patch(postId, delta)
    },
    onInteraction: (payload: import('~/types/api').WsPostsInteractionPayload) => {
      const postId = String(payload?.postId ?? '').trim()
      if (!postId) return
      const actorId = String(payload?.actorUserId ?? '').trim()
      const isMe = Boolean(actorId && actorId === authUser.value?.id)
      const delta: Partial<import('~/types/api').FeedPost> = {}
      if (payload.kind === 'boost' && typeof payload.boostCount === 'number') {
        delta.boostCount = Math.max(0, Math.floor(payload.boostCount))
        if (isMe) {
          delta.viewerHasBoosted = Boolean(payload.active)
          // Keep useBoostState state machine in sync so rollback/optimistic logic
          // has an accurate server-confirmed baseline.
          boostState.set(postId, {
            viewerHasBoosted: Boolean(payload.active),
            boostCount: delta.boostCount,
          })
        }
      }
      if (payload.kind === 'bookmark' && typeof payload.bookmarkCount === 'number') {
        delta.bookmarkCount = Math.max(0, Math.floor(payload.bookmarkCount))
        if (isMe) delta.viewerHasBookmarked = Boolean(payload.active)
      }
      postCache.patch(postId, delta)
    },
  }

  addPostsCallback(globalCacheCb)

  // Clean up if the plugin is ever torn down (hot-reload safe).
  if (import.meta.hot) {
    import.meta.hot.dispose(() => removePostsCallback(globalCacheCb))
  }
})
