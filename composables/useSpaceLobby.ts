import type { SpaceLobbyCounts, SpaceMember } from '~/types/api'

const SELECTED_SPACE_ID_KEY = 'selected-space-id'
const SPACE_MEMBERS_KEY = 'space-members'
const SPACE_LOBBY_COUNTS_KEY = 'space-lobby-counts'

export function useSpaceLobby() {
  const { ensureLoaded, user } = useAuth()
  const presence = usePresence()
  const { spaces, loadSpaces, getById } = useSpaces()

  const selectedSpaceId = useState<string | null>(SELECTED_SPACE_ID_KEY, () => null)
  const members = useState<SpaceMember[]>(SPACE_MEMBERS_KEY, () => [])
  const lobbyCounts = useState<SpaceLobbyCounts>(SPACE_LOBBY_COUNTS_KEY, () => ({ countsBySpaceId: {} }))

  const currentSpace = computed(() => getById(selectedSpaceId.value))

  const spacesCb = {
    onMembers: (payload: { spaceId: string; members: SpaceMember[] }) => {
      if (!payload?.spaceId) return
      if (payload.spaceId !== selectedSpaceId.value) return
      members.value = (payload.members ?? []) as SpaceMember[]
    },
    onLobbyCounts: (payload: SpaceLobbyCounts) => {
      const countsBySpaceId = payload?.countsBySpaceId ?? {}
      lobbyCounts.value = { countsBySpaceId }
    },
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
    presence.connect()
    await presence.whenSocketConnected(10_000)
    presence.addSpacesCallback(spacesCb as any)
    presence.emitSpacesJoin(spaceId)
  }

  function leave() {
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
    subscribeLobbyCounts,
    unsubscribeLobbyCounts,
  }
}

