/**
 * In-memory bumps for post counts (e.g. comment count) so the UI updates
 * immediately when the user posts a comment, before the next feed refetch.
 * Cleared when feeds set posts from API so we don't double-count.
 * useState must be called inside the composable so it runs in Nuxt context (setup/plugin).
 */
export function usePostCountBumps() {
  const commentCountBumps = useState<Record<string, number>>('post-count-bumps-comment', () => ({}))

  function getCommentCountBump(postId: string): number {
    return commentCountBumps.value[postId] ?? 0
  }

  function bumpCommentCount(postId: string): void {
    if (!postId) return
    const next = { ...commentCountBumps.value }
    next[postId] = (next[postId] ?? 0) + 1
    commentCountBumps.value = next
  }

  function clearBumpsForPostIds(ids: string[]): void {
    if (!ids.length) return
    const set = new Set(ids)
    const next = { ...commentCountBumps.value }
    let changed = false
    for (const id of Object.keys(next)) {
      if (set.has(id)) {
        delete next[id]
        changed = true
      }
    }
    if (changed) commentCountBumps.value = next
  }

  return { getCommentCountBump, bumpCommentCount, clearBumpsForPostIds }
}
