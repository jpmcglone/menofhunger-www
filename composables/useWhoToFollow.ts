import type { FollowListUser, GetFollowRecommendationsData } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { LIFE_ARENAS } from '~/config/arenas'

const WHO_TO_FOLLOW_TTL_MS = 10 * 60 * 1000

function makeRecommendationSeed(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function useWhoToFollow(options?: { enabled?: Ref<boolean>; defaultLimit?: number }) {
  const { apiFetch } = useApiClient()
  const { user } = useAuth()

  const enabled = options?.enabled ?? ref(true)
  const defaultLimit = Math.max(1, Math.min(50, Math.floor(options?.defaultLimit ?? 6)))

  const users = ref<FollowListUser[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const cache = useState<Record<string, { expiresAt: number; users: FollowListUser[] }>>('who-to-follow-cache', () => ({}))

  const isAuthed = computed(() => Boolean(user.value?.id))

  function cacheKey(limit: number): string {
    return `${user.value?.id ?? 'anon'}:${limit}`
  }

  async function refresh(opts?: { limit?: number; force?: boolean }) {
    if (!enabled.value) return
    const limit = Math.max(1, Math.min(50, Math.floor(opts?.limit ?? defaultLimit)))
    const key = cacheKey(limit)
    const hit = cache.value[key]
    if (!opts?.force && hit && hit.expiresAt > Date.now()) {
      users.value = hit.users
      error.value = null
      return
    }

    loading.value = true
    error.value = null
    try {
      const path = isAuthed.value ? '/follows/recommendations' : '/follows/top-users'
      const query: Record<string, number | string> = { limit }
      if (opts?.force && isAuthed.value) query.seed = makeRecommendationSeed()
      const res = await apiFetch<GetFollowRecommendationsData>(path, {
        method: 'GET',
        query,
        mohCache: { ttlMs: WHO_TO_FOLLOW_TTL_MS, staleWhileRevalidateMs: WHO_TO_FOLLOW_TTL_MS },
      })
      const next = (res.data ?? []) as GetFollowRecommendationsData
      users.value = next
      cache.value = { ...cache.value, [key]: { expiresAt: Date.now() + WHO_TO_FOLLOW_TTL_MS, users: next } }
    } catch (e: unknown) {
      error.value = getApiErrorMessage(e) || 'Failed to load suggestions.'
      users.value = []
    } finally {
      loading.value = false
    }
  }

  // Auto-refresh when enabled + authed.
  watch(
    [enabled, isAuthed],
    ([on, authed]) => {
      if (!on) return
      if (import.meta.client) {
        window.setTimeout(() => {
          if (enabled.value && isAuthed.value === authed) void refresh({ limit: defaultLimit })
        }, 250)
      } else {
        void refresh({ limit: defaultLimit })
      }
    },
    { immediate: true },
  )

  function removeUserById(userId: string) {
    const id = (userId ?? '').trim()
    if (!id) return
    users.value = users.value.filter((u) => u.id !== id)
  }

  return {
    users,
    loading,
    error,
    refresh,
    removeUserById,
  }
}

/**
 * Fetches follow suggestions weighted by shared arena/interest overlap with the viewer.
 * Only fires when the viewer is authenticated and has at least one interest set.
 */
export function useArenaFollowSuggestions(options?: { limit?: number }) {
  const { apiFetch } = useApiClient()
  const { user } = useAuth()

  const limit = Math.max(1, Math.min(20, Math.floor(options?.limit ?? 6)))

  const users = ref<FollowListUser[]>([])
  const arenaLabel = ref<string>('')
  const loading = ref(false)
  const error = ref<string | null>(null)

  const viewerInterests = computed<string[]>(() => user.value?.interests ?? [])
  const isAuthed = computed(() => Boolean(user.value?.id))

  async function refresh() {
    if (!isAuthed.value || viewerInterests.value.length === 0) return

    // Pick the single most-represented arena for the section label.
    let bestArena = LIFE_ARENAS[0]
    let bestCount = 0
    for (const arena of LIFE_ARENAS) {
      const count = arena.featuredInterests.filter((k) => viewerInterests.value.includes(k)).length
      if (count > bestCount) {
        bestCount = count
        bestArena = arena
      }
    }
    arenaLabel.value = bestArena?.label ?? ''

    loading.value = true
    error.value = null
    try {
      const interestsParam = viewerInterests.value.join(',')
      const res = await apiFetch<GetFollowRecommendationsData>('/follows/recommendations', {
        method: 'GET',
        query: { limit, interests: interestsParam },
      })
      users.value = (res.data ?? []) as GetFollowRecommendationsData
    } catch (e: unknown) {
      error.value = getApiErrorMessage(e) || 'Failed to load arena suggestions.'
      users.value = []
    } finally {
      loading.value = false
    }
  }

  watch(
    [isAuthed, viewerInterests],
    ([authed]) => {
      if (authed) void refresh()
    },
    { immediate: true, deep: true },
  )

  function removeUserById(userId: string) {
    const id = (userId ?? '').trim()
    if (!id) return
    users.value = users.value.filter((u) => u.id !== id)
  }

  return { users, arenaLabel, loading, error, refresh, removeUserById }
}
