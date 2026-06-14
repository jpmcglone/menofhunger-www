import type { ScheduledPost } from '~/types/api'
import type { ScheduledCallback } from '~/composables/presence/types'
import { getApiErrorMessage } from '~/utils/api-error'

/**
 * Manages the list of scheduled posts for the current user.
 * Fetches from GET /posts/scheduled and subscribes to realtime events
 * so the list updates when the cron publishes or fails a post.
 */
export function useScheduledPosts() {
  const { apiFetch, apiFetchData } = useApiClient()
  const toast = useAppToast()
  const scheduledCount = useScheduledPostsCount()

  const items = ref<ScheduledPost[]>([])
  const nextCursor = ref<string | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)

  async function fetchScheduled(opts: { reset?: boolean } = {}) {
    loading.value = true
    error.value = null
    try {
      const cursor = opts.reset ? null : (nextCursor.value ?? null)
      const res = await apiFetch<ScheduledPost[]>('/posts/scheduled', {
        query: {
          ...(cursor ? { cursor } : {}),
          limit: 30,
        },
      })
      if (opts.reset) {
        items.value = res.data ?? []
      } else {
        items.value = [...items.value, ...(res.data ?? [])]
      }
      nextCursor.value = res.pagination?.nextCursor ?? null
      // When the full set is loaded (no more pages), reconcile the shared badge count.
      if (!nextCursor.value) scheduledCount.set(items.value.length)
    } catch (e: unknown) {
      error.value = getApiErrorMessage(e) ?? 'Failed to load scheduled posts.'
    } finally {
      loading.value = false
    }
  }

  async function loadMore() {
    if (!nextCursor.value || loading.value) return
    await fetchScheduled({ reset: false })
  }

  async function deleteScheduled(id: string) {
    await apiFetchData(`/posts/scheduled/${encodeURIComponent(id)}`, { method: 'DELETE' })
    items.value = items.value.filter((p) => p.id !== id)
    scheduledCount.decrement()
  }

  function patchItem(id: string, patch: Partial<ScheduledPost>) {
    items.value = items.value.map((p) => (p.id === id ? { ...p, ...patch } : p))
  }

  function removeItem(id: string) {
    items.value = items.value.filter((p) => p.id !== id)
  }

  // ─── Realtime subscriptions ───────────────────────────────────────────────

  const { addScheduledCallback, removeScheduledCallback } = usePresence()

  const scheduledCb: ScheduledCallback = {
    onPublished: (payload) => {
      removeItem(payload.scheduledId)
      toast.push({
        title: 'Post published',
        message: 'A scheduled post went live.',
        tone: 'success',
        to: `/posts/${payload.post.id}`,
        durationMs: 4000,
      })
    },
    onFailed: (payload) => {
      patchItem(payload.scheduledId, { scheduledError: payload.error })
      toast.push({
        title: 'Scheduled post failed',
        message: payload.error ?? 'Something went wrong.',
        tone: 'error',
        durationMs: 5000,
      })
    },
  }

  onMounted(() => {
    addScheduledCallback(scheduledCb)
    fetchScheduled({ reset: true })
  })

  onActivated(() => {
    fetchScheduled({ reset: true })
  })

  onBeforeUnmount(() => {
    removeScheduledCallback(scheduledCb)
  })

  return {
    items,
    nextCursor,
    loading,
    error,
    fetchScheduled,
    loadMore,
    deleteScheduled,
    patchItem,
    removeItem,
  }
}
