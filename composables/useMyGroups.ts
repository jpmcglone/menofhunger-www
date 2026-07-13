import type { CommunityGroupShell } from '~/types/api'

const MY_GROUPS_KEY = 'my-groups:items'
const MY_GROUPS_USER_KEY = 'my-groups:user-id'
const MY_GROUPS_FETCHED_AT_KEY = 'my-groups:fetched-at'
const MY_GROUPS_LOADING_KEY = 'my-groups:loading'
const MY_GROUPS_ERROR_KEY = 'my-groups:error'
const MY_GROUPS_FRESH_MS = 30_000

const inFlightByApp = new WeakMap<object, { userId: string; promise: Promise<CommunityGroupShell[]> }>()

export function useMyGroups() {
  const nuxtApp = useNuxtApp()
  const { user } = useAuth()
  const { apiFetchData } = useApiClient()
  const groups = useState<CommunityGroupShell[]>(MY_GROUPS_KEY, () => [])
  const loadedUserId = useState<string | null>(MY_GROUPS_USER_KEY, () => null)
  const fetchedAt = useState<number>(MY_GROUPS_FETCHED_AT_KEY, () => 0)
  const loading = useState<boolean>(MY_GROUPS_LOADING_KEY, () => false)
  const error = useState<string | null>(MY_GROUPS_ERROR_KEY, () => null)

  function resetForUser(userId: string | null) {
    if (loadedUserId.value === userId) return
    groups.value = []
    fetchedAt.value = 0
    error.value = null
    loadedUserId.value = userId
  }

  async function load(options?: { force?: boolean }): Promise<CommunityGroupShell[]> {
    const userId = user.value?.id ?? null
    resetForUser(userId)
    if (!userId) return []

    const isFresh = Date.now() - fetchedAt.value < MY_GROUPS_FRESH_MS
    if (!options?.force && fetchedAt.value > 0 && isFresh) return groups.value

    const existing = inFlightByApp.get(nuxtApp)
    if (existing?.userId === userId) return await existing.promise

    loading.value = true
    error.value = null
    const request = apiFetchData<CommunityGroupShell[]>('/groups/me')
      .then((data) => {
        if (user.value?.id !== userId) return groups.value
        groups.value = Array.isArray(data) ? data : []
        loadedUserId.value = userId
        fetchedAt.value = Date.now()
        return groups.value
      })
      .catch((cause: unknown) => {
        if (user.value?.id === userId) {
          error.value = getApiErrorMessage(cause) || 'Failed to load your groups.'
        }
        throw cause
      })
      .finally(() => {
        if (inFlightByApp.get(nuxtApp)?.promise === request) {
          inFlightByApp.delete(nuxtApp)
          loading.value = false
        }
      })

    inFlightByApp.set(nuxtApp, { userId, promise: request })
    return await request
  }

  function invalidate() {
    fetchedAt.value = 0
  }

  return {
    groups: readonly(groups),
    loading: readonly(loading),
    error: readonly(error),
    fetchedAt: readonly(fetchedAt),
    load,
    refresh: () => load({ force: true }),
    invalidate,
  }
}
