import type { FollowListUser, GetFollowRecommendationsData } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { LIFE_ARENAS } from '~/config/arenas'

export function useWhoToFollow(options?: { enabled?: Ref<boolean>; defaultLimit?: number }) {
  const { apiFetch } = useApiClient()
  const { user } = useAuth()

  const enabled = options?.enabled ?? ref(true)
  const defaultLimit = Math.max(1, Math.min(50, Math.floor(options?.defaultLimit ?? 6)))

  const users = ref<FollowListUser[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthed = computed(() => Boolean(user.value?.id))

  async function refresh(opts?: { limit?: number }) {
    if (!enabled.value) return

    loading.value = true
    error.value = null
    try {
      const path = isAuthed.value ? '/follows/recommendations' : '/follows/top-users'
      const res = await apiFetch<GetFollowRecommendationsData>(path, {
        method: 'GET',
        query: { limit: Math.max(1, Math.min(50, Math.floor(opts?.limit ?? defaultLimit))) },
      })
      users.value = (res.data ?? []) as GetFollowRecommendationsData
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
      if (on) void refresh({ limit: defaultLimit })
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
