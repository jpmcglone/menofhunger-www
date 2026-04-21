/**
 * Thin post-cache overlay composable.
 *
 * Stores ONLY the fields that have changed via realtime events (the delta),
 * not full post copies. Feed arrays keep their original data for ordering and
 * pagination; this cache provides the freshest field values at render time.
 *
 * Usage pattern:
 *   - A single global PostsCallback (plugins/post-cache.ts) patches the cache
 *     when liveUpdated / interaction events arrive — one update, everywhere current.
 *   - PostRow calls `usePostCache().get(props.post)` to merge the overlay before render.
 *   - useBoostState writes boost results into the cache via `patch()`.
 *   - Feeds call `clear(ids)` when reloading fresh data from the server so stale
 *     deltas don't persist.
 */
import type { FeedPost } from '~/types/api'

export function usePostCache() {
  // Record<postId, delta> — only overridden fields are stored.
  const cache = useState<Record<string, Partial<FeedPost>>>('post-cache', () => ({}))

  /**
   * Merges `delta` into the cache entry for `id`.
   * Creates a new entry if one doesn't exist yet.
   */
  function patch(id: string, delta: Partial<FeedPost>): void {
    if (!id) return
    cache.value = {
      ...cache.value,
      [id]: { ...(cache.value[id] ?? {}), ...delta },
    }
  }

  /**
   * Returns the post merged with any cached delta.
   * Recursively applies the cache to the `.parent` chain so reply rows always
   * show fresh parent data (e.g. updated commentCount) without walking feed arrays.
   */
  function get(post: FeedPost): FeedPost {
    const delta = cache.value[post.id]
    const merged: FeedPost = delta ? { ...post, ...delta } : post
    if (merged.parent) {
      const patchedParent = get(merged.parent)
      if (patchedParent !== merged.parent) return { ...merged, parent: patchedParent }
    }
    return merged
  }

  /**
   * Removes cache entries for the given ids.
   * Call when a feed reloads fresh data from the server so stale deltas are gone.
   */
  function clear(ids: string[]): void {
    if (!ids.length) return
    const idSet = new Set(ids)
    const next = { ...cache.value }
    let changed = false
    for (const id of Object.keys(next)) {
      if (idSet.has(id)) {
        delete next[id]
        changed = true
      }
    }
    if (changed) cache.value = next
  }

  /**
   * Seeds cache entries from freshly fetched posts.
   * Existing entries are NOT overwritten — the cache delta takes precedence
   * until a feed explicitly calls `clear()`.
   */
  function ingest(posts: FeedPost[]): void {
    const next = { ...cache.value }
    let changed = false
    for (const p of posts) {
      if (!p?.id || next[p.id]) continue
      // Seed only the fields the cache tracks as mutable.
      next[p.id] = {
        body: p.body,
        editedAt: p.editedAt,
        editCount: p.editCount,
        deletedAt: p.deletedAt,
        commentCount: p.commentCount,
        viewerCount: p.viewerCount,
        boostCount: p.boostCount,
        viewerHasBoosted: p.viewerHasBoosted,
        bookmarkCount: p.bookmarkCount,
        viewerHasBookmarked: p.viewerHasBookmarked,
      }
      changed = true
    }
    if (changed) cache.value = next
  }

  return { cache, patch, get, clear, ingest }
}
