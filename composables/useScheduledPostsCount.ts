import type { ScheduledPost } from '~/types/api'
import type { ScheduledCallback } from '~/composables/presence/types'

// Guards the single app-lifetime realtime subscription + initial fetch so that
// calling this composable from multiple components doesn't double-subscribe.
let _wired = false

/**
 * Shared, lightweight count of the current user's scheduled posts.
 * Backed by `useState` so the composer badge, the picker link, and anything
 * else stay in sync. The max queue is 25, so the list endpoint (limit 50)
 * always returns the full set — `count` is just its length.
 */
export function useScheduledPostsCount() {
  const count = useState<number>('scheduled-posts-count', () => 0)
  const loaded = useState<boolean>('scheduled-posts-count-loaded', () => false)
  const { apiFetch } = useApiClient()
  const { isAuthed, isPremium } = useAuth()

  async function refresh() {
    if (!import.meta.client) return
    if (!isAuthed.value || !isPremium.value) {
      count.value = 0
      loaded.value = true
      return
    }
    try {
      const res = await apiFetch<ScheduledPost[]>('/posts/scheduled', { query: { limit: 50 } })
      count.value = (res.data ?? []).length
      loaded.value = true
    } catch {
      // Non-fatal: leave the last known count in place.
    }
  }

  function set(n: number) {
    count.value = Math.max(0, n)
  }

  function increment() {
    count.value = count.value + 1
  }

  function decrement() {
    count.value = Math.max(0, count.value - 1)
  }

  // Wire the global realtime subscription + initial fetch exactly once on the client.
  if (import.meta.client && !_wired) {
    _wired = true
    const { addScheduledCallback } = usePresence()
    const cb: ScheduledCallback = {
      // When a post publishes it leaves the queue — re-fetch authoritatively.
      onPublished: () => {
        refresh()
      },
      // Failures stay queued (still counted); no change needed.
      onFailed: () => {},
    }
    addScheduledCallback(cb)
    refresh()
  }

  return { count, loaded, refresh, set, increment, decrement }
}
