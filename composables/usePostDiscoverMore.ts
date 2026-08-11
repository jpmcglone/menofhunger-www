import type { Ref } from 'vue'
import type { FeedPost } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

function newDiscoverShuffleSeed(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Lazy end-of-thread "Discover more" — fetches only when `arm()` is called
 * (typically from an IntersectionObserver near the end of replies).
 * Further pages load via `loadMore()` (scroll sentinel), using a stable shuffle seed.
 */
export function usePostDiscoverMore(options: { postId: Ref<string> }) {
  const { postId } = options
  const { apiFetch } = useApiClient()

  const posts = ref<FeedPost[]>([])
  const nextCursor = ref<string | null>(null)
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref<string | null>(null)
  let armedForId: string | null = null
  let shuffleSeed: string | null = null

  async function fetchPage(cursor: string | null) {
    const id = postId.value.trim()
    if (!id || loading.value) return
    if (!shuffleSeed) shuffleSeed = newDiscoverShuffleSeed()
    loading.value = true
    error.value = null
    try {
      const params = new URLSearchParams({ limit: '8', seed: shuffleSeed })
      if (cursor) params.set('cursor', cursor)
      const res = await apiFetch<FeedPost[]>(
        `/posts/${encodeURIComponent(id)}/discover-more?${params.toString()}`,
        { method: 'GET' },
      )
      const list = res.data ?? []
      if (cursor === null) {
        posts.value = list
      } else {
        posts.value = [...posts.value, ...list]
      }
      nextCursor.value = res.pagination?.nextCursor ?? null
      loaded.value = true
    } catch (e) {
      error.value = getApiErrorMessage(e) || 'Failed to load recommendations.'
      if (cursor === null) {
        posts.value = []
        nextCursor.value = null
        loaded.value = true
      }
    } finally {
      loading.value = false
    }
  }

  /** First fetch for the current post (idempotent per post id). */
  function arm() {
    const id = postId.value.trim()
    if (!id) return
    if (armedForId === id && loaded.value) return
    armedForId = id
    void fetchPage(null)
  }

  function loadMore() {
    if (!nextCursor.value || loading.value) return
    void fetchPage(nextCursor.value)
  }

  function reset() {
    posts.value = []
    nextCursor.value = null
    loading.value = false
    loaded.value = false
    error.value = null
    armedForId = null
    shuffleSeed = null
  }

  watch(postId, () => {
    reset()
  })

  const showSection = computed(() => !loaded.value || posts.value.length > 0 || loading.value)

  return {
    posts,
    nextCursor,
    loading,
    loaded,
    error,
    showSection,
    arm,
    loadMore,
    reset,
  }
}
