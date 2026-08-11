import type { Space } from '~/types/api'
import { sortLobbySpaces } from '~/utils/spacesLobbySort'

const SPACES_LIST_KEY = 'spaces-list'
const SPACES_LOADING_KEY = 'spaces-loading'
const SPACES_LOADED_ONCE_KEY = 'spaces-loaded-once'

export function useSpaces() {
  const { apiFetchData } = useApiClient()
  const { user } = useAuth()
  const spaces = useState<Space[]>(SPACES_LIST_KEY, () => [])
  const loading = useState<boolean>(SPACES_LOADING_KEY, () => false)
  const loadedOnce = useState<boolean>(SPACES_LOADED_ONCE_KEY, () => false)

  function applySorted(list: Space[]) {
    spaces.value = sortLobbySpaces(list, user.value?.id ?? null)
  }

  async function loadSpaces() {
    if (loading.value) return
    loading.value = true
    try {
      const remote = await apiFetchData<Space[]>('/spaces', { method: 'GET' })
      applySorted(Array.isArray(remote) ? remote : [])
    } catch {
      spaces.value = spaces.value ?? []
    } finally {
      loading.value = false
      loadedOnce.value = true
    }
  }

  function hydrateSpaces(list: Space[] | null | undefined) {
    applySorted(Array.isArray(list) ? list : [])
    loadedOnce.value = true
    loading.value = false
  }

  const byId = computed(() => new Map((spaces.value ?? []).map((s) => [s.id, s])))

  function getById(spaceIdRaw: string | null | undefined): Space | null {
    const id = String(spaceIdRaw ?? '').trim()
    if (!id) return null
    return byId.value.get(id) ?? null
  }

  function getByOwnerUsername(usernameRaw: string | null | undefined): Space | null {
    const username = String(usernameRaw ?? '').trim().toLowerCase()
    if (!username) return null
    return (spaces.value ?? []).find((s) => (s.owner?.username ?? '').toLowerCase() === username) ?? null
  }

  function upsertSpace(space: Space) {
    const next = [...spaces.value]
    const idx = next.findIndex((s) => s.id === space.id)
    if (idx >= 0) next[idx] = space
    else next.push(space)
    applySorted(next)
  }

  async function fetchSpaceById(id: string): Promise<Space | null> {
    try {
      const space = await apiFetchData<Space>(`/spaces/${encodeURIComponent(id)}`, { method: 'GET' })
      if (space) upsertSpace(space)
      return space
    } catch {
      return null
    }
  }

  async function fetchSpaceByUsername(username: string): Promise<Space | null> {
    try {
      const space = await apiFetchData<Space>(`/spaces/by-username/${encodeURIComponent(username)}`, { method: 'GET' })
      if (space) upsertSpace(space)
      return space
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
    getByOwnerUsername,
    fetchSpaceById,
    fetchSpaceByUsername,
  }
}
