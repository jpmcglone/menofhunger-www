import type { FollowRelationship } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { runOptimisticRequest } from '~/utils/optimistic-request'

type FollowStateMap = Record<string, FollowRelationship>

export function useFollowState() {
  const { apiFetchData } = useApiClient()
  const { invalidateUserPreviewCache } = useUserPreview()

  const state = useState<FollowStateMap>('follow-state', () => ({}))
  const inflight = useState<Record<string, boolean>>('follow-inflight', () => ({}))
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
    await runOptimisticRequest<{ prev: FollowRelationship | null }, { success: true; viewerFollowsUser: true }>({
      key: `follow:${userId}`,
      inflight,
      apply: () => {
        const prev = get(userId)
        upsert(userId, { viewerFollowsUser: true })
        return { prev }
      },
      request: async () => {
        return await apiFetchData<{ success: true; viewerFollowsUser: true }>(`/follows/${encodeURIComponent(username)}`, {
          method: 'POST'
        })
      },
      rollback: (snapshot, e) => {
        if (snapshot.prev) {
          set(userId, snapshot.prev)
        } else {
          upsert(userId, { viewerFollowsUser: false })
        }
        error.value = getApiErrorMessage(e) || 'Failed to follow.'
      }
    })
    invalidateUserPreviewCache(username)
  }

  async function unfollow(params: { userId: string; username: string }) {
    error.value = null
    const { userId, username } = params
    await runOptimisticRequest<{ prev: FollowRelationship | null }, { success: true; viewerFollowsUser: false }>({
      key: `follow:${userId}`,
      inflight,
      apply: () => {
        const prev = get(userId)
        upsert(userId, { viewerFollowsUser: false })
        return { prev }
      },
      request: async () => {
        return await apiFetchData<{ success: true; viewerFollowsUser: false }>(`/follows/${encodeURIComponent(username)}`, {
          method: 'DELETE'
        })
      },
      rollback: (snapshot, e) => {
        if (snapshot.prev) {
          set(userId, snapshot.prev)
        } else {
          upsert(userId, { viewerFollowsUser: true })
        }
        error.value = getApiErrorMessage(e) || 'Failed to unfollow.'
      }
    })
    invalidateUserPreviewCache(username)
  }

  return { state, inflight, error, get, set, upsert, ingest, follow, unfollow }
}

