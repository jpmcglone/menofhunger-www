import type { SpaceLobbyCounts, SpaceMember } from '~/types/api'
import type { SpacesCallback } from '~/composables/usePresence'

const SELECTED_SPACE_ID_KEY = 'selected-space-id'
const SPACE_MEMBERS_KEY = 'space-members'
const SPACE_LOBBY_COUNTS_KEY = 'space-lobby-counts'
const SPACES_CB_KEY = 'space-lobby-spaces-cb'
const SPACES_CB_REFS_KEY = 'space-lobby-spaces-cb-refs'

export function useSpaceLobby() {
  const { ensureLoaded, user } = useAuth()
  const presence = usePresence()
  const { spaces, loadSpaces, getById, patchSpace } = useSpaces()
  const { apiFetchData } = useApiClient()

  const selectedSpaceId = useState<string | null>(SELECTED_SPACE_ID_KEY, () => null)
  const members = useState<SpaceMember[]>(SPACE_MEMBERS_KEY, () => [])
  const lobbyCounts = useState<SpaceLobbyCounts>(SPACE_LOBBY_COUNTS_KEY, () => ({ countsBySpaceId: {} }))

  // Singleton callback + refcount: every useSpaceLobby() call used to create a new
  // spacesCb and addSpacesCallback it forever. Sets are keyed by reference, so those
  // orphaned handlers stacked on every space page / AppSpaceRow visit.
  const spacesCbRef = useState<SpacesCallback | null>(SPACES_CB_KEY, () => null)
  const spacesCbRefs = useState<number>(SPACES_CB_REFS_KEY, () => 0)

  const currentSpace = computed(() => getById(selectedSpaceId.value))

  function ensureSpacesCallback() {
    if (!import.meta.client) return
    if (spacesCbRef.value) return

    const spacesCb: SpacesCallback = {
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
      onModeChanged: (payload) => {
        const spaceId = String(payload?.spaceId ?? '').trim()
        if (!spaceId) return
        patchSpace(spaceId, {
          mode: payload.mode,
          watchPartyUrl: payload.watchPartyUrl,
          radioStreamUrl: payload.radioStreamUrl,
        })
      },
      onUpdated: (payload) => {
        const spaceId = String(payload?.spaceId ?? '').trim()
        if (!spaceId || !payload?.patch) return
        patchSpace(spaceId, payload.patch as Partial<import('~/types/api').Space> & { deleted?: boolean })
      },
    }
    spacesCbRef.value = spacesCb
    presence.addSpacesCallback(spacesCb)
  }

  if (import.meta.client) {
    spacesCbRefs.value += 1
    ensureSpacesCallback()
    onScopeDispose(() => {
      spacesCbRefs.value = Math.max(0, spacesCbRefs.value - 1)
      if (spacesCbRefs.value !== 0) return
      const cb = spacesCbRef.value
      if (!cb) return
      presence.removeSpacesCallback(cb)
      spacesCbRef.value = null
    })
  }

  /**
   * Fetch current lobby counts over HTTP (instant, no socket needed) and register
   * the presence callback so real-time WebSocket pushes keep the counts live.
   * Safe to call from any layout/page — registrations share one singleton callback.
   */
  async function loadLobbyCounts() {
    if (!import.meta.client) return
    ensureSpacesCallback()
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

    const prev = selectedSpaceId.value
    if (prev && prev !== spaceId) {
      leave()
    }

    selectedSpaceId.value = spaceId
    presence.setCurrentSpaceForUsers([user.value.id], spaceId)
    presence.connect()
    await presence.whenSocketConnected(10_000)
    ensureSpacesCallback()
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
    ensureSpacesCallback()
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

  const totalLobbyCount = computed(() => {
    const counts = lobbyCounts.value?.countsBySpaceId
    if (!counts) return 0
    let total = 0
    for (const id in counts) {
      total += Math.max(0, Math.floor(Number(counts[id]) || 0))
    }
    return total
  })

  // Re-join the space room whenever the socket reconnects, since Socket.IO creates
  // a new socket on reconnect and the server-side room membership is lost.
  if (import.meta.client) {
    let prevConnected = presence.isSocketConnected.value
    watch(
      () => presence.isSocketConnected.value,
      (connected) => {
        if (connected && !prevConnected && selectedSpaceId.value) {
          presence.emitSpacesJoin(selectedSpaceId.value)
        }
        prevConnected = connected
      },
    )
  }

  return {
    selectedSpaceId,
    currentSpace,
    members: readonly(members),
    lobbyCounts: readonly(lobbyCounts),
    totalLobbyCount,
    lobbyCountForSpace,
    select,
    leave,
    loadLobbyCounts,
    subscribeLobbyCounts,
    unsubscribeLobbyCounts,
  }
}
