import type { FollowRelationship } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

type FollowStateMap = Record<string, FollowRelationship>

export function useFollowState() {
  const { apiFetchData } = useApiClient()

  const state = useState<FollowStateMap>('follow-state', () => ({}))
  const error = useState<string | null>('follow-state-error', () => null)

  function get(userId: string | null | undefined): FollowRelationship | null {
    if (!userId) return null
    return state.value[userId] ?? null
  }

  function set(userId: string, rel: FollowRelationship) {
    state.value = { ...state.value, [userId]: rel }
  }

  function upsert(userId: string, partial: Partial<FollowRelationship>) {
    const prev = state.value[userId] ?? { viewerFollowsUser: false, userFollowsViewer: false }
    set(userId, { ...prev, ...partial })
  }

  function ingest(users: Array<{ id: string; relationship: FollowRelationship }>) {
    const next = { ...state.value }
    for (const u of users) next[u.id] = u.relationship
    state.value = next
  }

  async function follow(params: { userId: string; username: string }) {
    error.value = null
    const { userId, username } = params
    // Optimistic.
    upsert(userId, { viewerFollowsUser: true })
    try {
      await apiFetchData<{ success: true; viewerFollowsUser: true }>(`/follows/${encodeURIComponent(username)}`, {
        method: 'POST'
      })
    } catch (e: unknown) {
      // Revert.
      upsert(userId, { viewerFollowsUser: false })
      error.value = getApiErrorMessage(e) || 'Failed to follow.'
      throw e
    }
  }

  async function unfollow(params: { userId: string; username: string }) {
    error.value = null
    const { userId, username } = params
    // Optimistic.
    upsert(userId, { viewerFollowsUser: false })
    try {
      await apiFetchData<{ success: true; viewerFollowsUser: false }>(`/follows/${encodeURIComponent(username)}`, {
        method: 'DELETE'
      })
    } catch (e: unknown) {
      // Revert.
      upsert(userId, { viewerFollowsUser: true })
      error.value = getApiErrorMessage(e) || 'Failed to unfollow.'
      throw e
    }
  }

  return { state, error, get, set, upsert, ingest, follow, unfollow }
}

