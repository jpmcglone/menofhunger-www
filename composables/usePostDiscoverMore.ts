import type { Ref } from 'vue'
import type { FeedPost } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

export const POST_DISCOVER_RAIL_INITIAL_COUNT = 6

function newDiscoverShuffleSeed(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Lazy "Discover more" for a post — fetches only when `arm()` is called
 * (from an IntersectionObserver near the end of replies, or by the wide-screen rail).
 * Further pages load via `loadMore()`, using a stable shuffle seed.
 *
 * One instance is shared by the below-replies list and the right rail, so resizing
 * between the two keeps results, pagination, and the shuffle seed without refetching.
 */
export function usePostDiscoverMore(options: { postId: Ref<string>; viewerId?: Ref<string | null | undefined> }) {
  const { postId, viewerId } = options
  const { apiFetch } = useApiClient()

  const posts = ref<FeedPost[]>([])
  const nextCursor = ref<string | null>(null)
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref<string | null>(null)
  /** The rail shows a short list until "Show more" expands it. */
  const railExpanded = ref(false)
  let armedForId: string | null = null
  let shuffleSeed: string | null = null
  let generation = 0

  async function fetchPage(cursor: string | null) {
    const id = postId.value.trim()
    if (!id || loading.value) return
    if (!shuffleSeed) shuffleSeed = newDiscoverShuffleSeed()
    const myGeneration = generation
    loading.value = true
    error.value = null
    try {
      const params = new URLSearchParams({ limit: '8', seed: shuffleSeed })
      if (cursor) params.set('cursor', cursor)
      const res = await apiFetch<FeedPost[]>(
        `/posts/${encodeURIComponent(id)}/discover-more?${params.toString()}`,
        { method: 'GET' },
      )
      if (myGeneration !== generation) return
      const list = res.data ?? []
      if (cursor === null) {
        posts.value = list
      } else {
        const seen = new Set(posts.value.map((p) => p.id))
        posts.value = [...posts.value, ...list.filter((p) => !seen.has(p.id))]
      }
      nextCursor.value = res.pagination?.nextCursor ?? null
      loaded.value = true
    } catch (e) {
      if (myGeneration !== generation) return
      error.value = getApiErrorMessage(e) || 'Failed to load recommendations.'
      if (cursor === null) {
        posts.value = []
        nextCursor.value = null
        loaded.value = true
      }
    } finally {
      if (myGeneration === generation) loading.value = false
    }
  }

  /** First fetch for the current post (idempotent per post id). */
  function arm() {
    const id = postId.value.trim()
    if (!id) return
    if (armedForId === id && (loaded.value || loading.value)) return
    armedForId = id
    void fetchPage(null)
  }

  function loadMore() {
    if (!nextCursor.value || loading.value) return
    void fetchPage(nextCursor.value)
  }

  /** Re-run a failed first page, keeping the same shuffle seed. */
  function retry() {
    if (loading.value) return
    if (posts.value.length === 0) {
      loaded.value = false
      armedForId = null
      arm()
      return
    }
    loadMore()
  }

  function removePost(id: string) {
    if (!posts.value.some((p) => p.id === id)) return
    posts.value = posts.value.filter((p) => p.id !== id)
  }

  function removeByAuthor(authorId: string) {
    if (!posts.value.some((p) => p.author?.id === authorId)) return
    posts.value = posts.value.filter((p) => p.author?.id !== authorId)
  }

  function patchPost(id: string, patch: Partial<FeedPost>) {
    const idx = posts.value.findIndex((p) => p.id === id)
    if (idx < 0) return
    const next = posts.value.slice()
    next[idx] = { ...next[idx]!, ...patch }
    posts.value = next
  }

  /** Reveal the remaining first-page results, then request further pages as needed. */
  function showMoreInRail() {
    railExpanded.value = true
    if (nextCursor.value) loadMore()
  }

  function reset() {
    generation += 1
    posts.value = []
    nextCursor.value = null
    loading.value = false
    loaded.value = false
    error.value = null
    armedForId = null
    shuffleSeed = null
    railExpanded.value = false
  }

  watch([postId, () => viewerId?.value ?? null], () => {
    reset()
  })

  const showSection = computed(() => !loaded.value || posts.value.length > 0 || loading.value)
  const railPosts = computed(() =>
    railExpanded.value ? posts.value : posts.value.slice(0, POST_DISCOVER_RAIL_INITIAL_COUNT),
  )
  const railHasMore = computed(() =>
    railExpanded.value ? Boolean(nextCursor.value) : posts.value.length > POST_DISCOVER_RAIL_INITIAL_COUNT || Boolean(nextCursor.value),
  )

  return {
    posts,
    nextCursor,
    loading,
    loaded,
    error,
    showSection,
    railPosts,
    railHasMore,
    arm,
    loadMore,
    retry,
    removePost,
    removeByAuthor,
    patchPost,
    showMoreInRail,
    reset,
  }
}

export type PostDiscoverMoreState = ReturnType<typeof usePostDiscoverMore>
