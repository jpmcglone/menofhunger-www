import type { FeedPost } from '~/types/api'
import { upsertLocalFeedInsert, type LocalFeedInsert } from '~/composables/posts-feed/local-inserts'
import { settleCrosspostPending } from '~/utils/feed-patch'

/**
 * Lightweight composable for prepending a post to the home feed from any context
 * (e.g. the global modal composer in app.vue). Uses the same shared useState keys
 * as usePostsFeed so localInserts survive the next hard refresh (keepalive + onActivated).
 */
export function useHomeFeedPrepend() {
  const { subscribePosts } = usePresence()
  const posts = useState<FeedPost[]>('posts-feed', () => [])
  const localInserts = useState<LocalFeedInsert[]>('posts-feed-local-inserts', () => [])

  function prependToHomeFeed(post: FeedPost) {
    const id = (post?.id ?? '').trim()
    if (!id) return
    if (!posts.value.some((p) => (p.id ?? '').trim() === id)) {
      posts.value = [post, ...posts.value]
    }
    localInserts.value = upsertLocalFeedInsert(localInserts.value, { kind: 'prepend', post })
  }

  // ── Optimistic helpers shared with usePostsFeed ──────────────────────────
  // Mirror the helpers in usePostsFeed so callers from a non-page context
  // (e.g. the global modal composer in app.vue) can manage optimistic rows
  // in the home feed.

  function findIdx(localId: string): number {
    return posts.value.findIndex((p) => (p._localId ?? '') === localId)
  }

  function prependOptimisticToHomeFeed(post: FeedPost) {
    if (!post?._localId) return
    posts.value = [post, ...posts.value]
  }

  function replaceOptimisticInHomeFeed(localId: string, realPost: FeedPost) {
    const idx = findIdx(localId)
    if (idx < 0) {
      // Not present (different feed instance) — fall back to a normal prepend
      // so the user still sees their post once it lands.
      prependToHomeFeed(realPost)
      return
    }
    const existing = posts.value[idx]
    const merged: FeedPost = {
      ...realPost,
      _localId: existing?._localId ?? localId,
      _pending: undefined,
      _pendingError: undefined,
      _crosspostPending: settleCrosspostPending(
        realPost._crosspostPending ?? existing?._crosspostPending,
        realPost,
      ),
    }
    const next = posts.value.slice()
    next[idx] = merged
    posts.value = next
    if (merged.id) subscribePosts([merged.id])
    if (realPost.visibility !== 'onlyMe') {
      localInserts.value = upsertLocalFeedInsert(localInserts.value, { kind: 'prepend', post: realPost })
    }
  }

  function markOptimisticFailedInHomeFeed(localId: string, errorMessage: string) {
    const idx = findIdx(localId)
    if (idx < 0) return
    const next = posts.value.slice()
    next[idx] = { ...next[idx]!, _pending: 'failed', _pendingError: errorMessage }
    posts.value = next
  }

  function markOptimisticPostingInHomeFeed(localId: string) {
    const idx = findIdx(localId)
    if (idx < 0) return
    const next = posts.value.slice()
    next[idx] = { ...next[idx]!, _pending: 'posting', _pendingError: null }
    posts.value = next
  }

  function removeOptimisticFromHomeFeed(localId: string) {
    const idx = findIdx(localId)
    if (idx < 0) return
    posts.value = posts.value.filter((_, i) => i !== idx)
  }

  return {
    prependToHomeFeed,
    prependOptimisticToHomeFeed,
    replaceOptimisticInHomeFeed,
    markOptimisticFailedInHomeFeed,
    markOptimisticPostingInHomeFeed,
    removeOptimisticFromHomeFeed,
  }
}

/**
 * Global hook so the modal composer in `layouts/app.vue` can prepend newly created posts
 * to the profile feed when the viewer is viewing their own profile.
 *
 * The profile page (`pages/u/[username]/index.vue`) registers a callback via `registerProfilePrepend`
 * when `isSelf` is true and cleans up when it deactivates. `layouts/app.vue` calls
 * `prependToProfileFeed(post)` after every successful post creation.
 */
export function useProfileFeedPrepend() {
  type PrependCb = (post: FeedPost) => void
  const callbacks = useState<Set<PrependCb>>('profile-feed-prepend-cbs', () => new Set())

  function prependToProfileFeed(post: FeedPost) {
    const id = (post?.id ?? '').trim()
    if (!id) return
    for (const cb of callbacks.value) {
      try { cb(post) } catch { /* ignore */ }
    }
  }

  function registerProfilePrepend(cb: PrependCb): () => void {
    callbacks.value.add(cb)
    return () => callbacks.value.delete(cb)
  }

  return { prependToProfileFeed, registerProfilePrepend }
}
