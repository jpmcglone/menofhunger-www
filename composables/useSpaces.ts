import type { Space } from '~/types/api'

const SPACES_LIST_KEY = 'spaces-list'
const SPACES_LOADING_KEY = 'spaces-loading'
const SPACES_LOADED_ONCE_KEY = 'spaces-loaded-once'

export function useSpaces() {
  const { apiFetchData } = useApiClient()
  const spaces = useState<Space[]>(SPACES_LIST_KEY, () => [])
  const loading = useState<boolean>(SPACES_LOADING_KEY, () => false)
  const loadedOnce = useState<boolean>(SPACES_LOADED_ONCE_KEY, () => false)

  async function loadSpaces() {
    if (loading.value) return
    loading.value = true
    try {
      const remote = await apiFetchData<Space[]>('/spaces', { method: 'GET' })
      spaces.value = Array.isArray(remote) ? remote : []
    } catch {
      spaces.value = spaces.value ?? []
    } finally {
      loading.value = false
      loadedOnce.value = true
    }
  }

  function hydrateSpaces(list: Space[] | null | undefined) {
    spaces.value = Array.isArray(list) ? list : []
    loadedOnce.value = true
    loading.value = false
  }

  const byId = computed(() => new Map((spaces.value ?? []).map((s) => [s.id, s])))

  function getById(spaceIdRaw: string | null | undefined): Space | null {
    const id = String(spaceIdRaw ?? '').trim()
    if (!id) return null
    return byId.value.get(id) ?? null
  }

  function upsertSpace(space: Space) {
    const idx = spaces.value.findIndex((s) => s.id === space.id)
    if (idx >= 0) {
      spaces.value[idx] = space
    } else {
      spaces.value.push(space)
    }
  }

  async function fetchSpaceByUsername(username: string): Promise<Space | null> {
    try {
      return await apiFetchData<Space>(`/spaces/by-username/${encodeURIComponent(username)}`, { method: 'GET' })
    } catch {
      return null
    }
  }

  return {
    spaces: readonly(spaces),
    loading: readonly(loading),
    loadedOnce: readonly(loadedOnce),
    loadSpaces,
    hydrateSpaces,
    upsertSpace,
    getById,
    fetchSpaceByUsername,
  }
}
