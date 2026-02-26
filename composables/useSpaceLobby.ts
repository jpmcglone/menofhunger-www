import type { SpaceLobbyCounts, SpaceMember } from '~/types/api'

const SELECTED_SPACE_ID_KEY = 'selected-space-id'
const SPACE_MEMBERS_KEY = 'space-members'
const SPACE_LOBBY_COUNTS_KEY = 'space-lobby-counts'

export function useSpaceLobby() {
  const { ensureLoaded, user } = useAuth()
  const presence = usePresence()
  const { spaces, loadSpaces, getById } = useSpaces()
  const { apiFetchData } = useApiClient()

  const selectedSpaceId = useState<string | null>(SELECTED_SPACE_ID_KEY, () => null)
  const members = useState<SpaceMember[]>(SPACE_MEMBERS_KEY, () => [])
  const lobbyCounts = useState<SpaceLobbyCounts>(SPACE_LOBBY_COUNTS_KEY, () => ({ countsBySpaceId: {} }))

  const currentSpace = computed(() => getById(selectedSpaceId.value))

  const spacesCb = {
    onMembers: (payload: { spaceId: string; members: SpaceMember[] }) => {
      if (!payload?.spaceId) return
      if (payload.spaceId !== selectedSpaceId.value) return
      const nextMembers = (payload.members ?? []) as SpaceMember[]
      const prevIds = new Set(members.value.map((m) => m.id))
      const nextIds = new Set(nextMembers.map((m) => m.id))
      const toRemove = [...prevIds].filter((id) => !nextIds.has(id))
      const toAdd = [...nextIds].filter((id) => !prevIds.has(id))
      if (toRemove.length) presence.removeInterest(toRemove)
      if (toAdd.length) presence.addInterest(toAdd)
      presence.setCurrentSpaceForUsers(
        nextMembers.map((m) => m.id),
        payload.spaceId,
      )
      members.value = nextMembers
    },
    onLobbyCounts: (payload: SpaceLobbyCounts) => {
      const countsBySpaceId = payload?.countsBySpaceId ?? {}
      lobbyCounts.value = { countsBySpaceId }
    },
  }

  /**
   * Fetch current lobby counts over HTTP (instant, no socket needed) and register
   * the presence callback so real-time WebSocket pushes keep the counts live.
   * Safe to call from any layout/page — duplicate registrations are harmless because
   * all instances write to the same shared `lobbyCounts` state.
   */
  async function loadLobbyCounts() {
    if (!import.meta.client) return
    // Register the callback immediately so we handle the `spaces:lobbyCounts` event
    // that the server emits to every socket right after connection.
    presence.addSpacesCallback(spacesCb as any)
    // Fetch the current snapshot over HTTP — no socket required, works on first render.
    try {
      const data = await apiFetchData<SpaceLobbyCounts>('/spaces/lobby-counts', { method: 'GET' })
      if (data?.countsBySpaceId) lobbyCounts.value = { countsBySpaceId: data.countsBySpaceId }
    } catch {
      // best-effort; real-time socket updates will correct any stale state
    }
  }

  async function select(spaceIdRaw: string) {
    const spaceId = String(spaceIdRaw ?? '').trim()
    if (!spaceId) return
    if ((spaces.value?.length ?? 0) === 0) {
      await loadSpaces()
    }
    await ensureLoaded()
    if (!user.value?.id) return

    selectedSpaceId.value = spaceId
    // Seed the current user's own space into presence tracking so their avatar
    // shows the gradient ring when others (or they themselves) see it in the feed.
    presence.setCurrentSpaceForUsers([user.value.id], spaceId)
    presence.connect()
    await presence.whenSocketConnected(10_000)
    presence.addSpacesCallback(spacesCb as any)
    presence.emitSpacesJoin(spaceId)
  }

  function leave() {
    const memberIds = members.value.map((m) => m.id)
    if (memberIds.length) presence.removeInterest(memberIds)
    // Clear the current user's own space from presence tracking.
    if (user.value?.id) {
      presence.setCurrentSpaceForUsers([user.value.id], null)
    }
    selectedSpaceId.value = null
    members.value = []
    if (!import.meta.client) return
    presence.emitSpacesLeave()
  }

  async function subscribeLobbyCounts() {
    if (!import.meta.client) return
    await ensureLoaded()
    if (!user.value?.id) return
    presence.connect()
    await presence.whenSocketConnected(10_000)
    presence.addSpacesCallback(spacesCb as any)
    presence.emitSpacesLobbiesSubscribe()
  }

  function unsubscribeLobbyCounts() {
    if (!import.meta.client) return
    presence.emitSpacesLobbiesUnsubscribe()
  }

  function lobbyCountForSpace(spaceIdRaw: string): number {
    const id = String(spaceIdRaw ?? '').trim()
    if (!id) return 0
    return Math.max(0, Math.floor(Number(lobbyCounts.value?.countsBySpaceId?.[id] ?? 0) || 0))
  }

  return {
    selectedSpaceId,
    currentSpace,
    members: readonly(members),
    lobbyCounts: readonly(lobbyCounts),
    lobbyCountForSpace,
    select,
    leave,
    loadLobbyCounts,
    subscribeLobbyCounts,
    unsubscribeLobbyCounts,
  }
}

