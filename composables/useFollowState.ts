import type { FollowRelationship } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { runOptimisticRequest } from '~/utils/optimistic-request'
import type { FollowsCallback } from '~/composables/usePresence'

type FollowStateMap = Record<string, FollowRelationship>

export function useFollowState() {
  const { apiFetchData } = useApiClient()
  const { invalidateUserPreviewCache } = useUserPreview()
  const { user: me } = useAuth()
  const { addFollowsCallback, removeFollowsCallback } = usePresence()

  const state = useState<FollowStateMap>('follow-state', () => ({}))
  const inflight = useState<Record<string, boolean>>('follow-inflight', () => ({}))
  const error = useState<string | null>('follow-state-error', () => null)

  // Realtime: cross-tab/device sync for follow/unfollow (self only).
  const wsRefCount = useState<number>('follow-state-ws-refcount', () => 0)
  const wsCbRef = useState<FollowsCallback | null>('follow-state-ws-cb', () => null)
  if (import.meta.client) {
    wsRefCount.value += 1

    if (!wsCbRef.value) {
      const cb: FollowsCallback = {
        onChanged: (payload) => {
          const actorId = payload?.actorUserId ?? null
          const targetId = payload?.targetUserId ?? null
          if (!actorId || !targetId) return
          if (actorId !== me.value?.id) return
          upsert(targetId, { viewerFollowsUser: Boolean(payload.viewerFollowsUser) })
        },
      }
      wsCbRef.value = cb
      addFollowsCallback(cb)
    }

    onScopeDispose(() => {
      wsRefCount.value = Math.max(0, wsRefCount.value - 1)
      if (wsRefCount.value !== 0) return
      const cb = wsCbRef.value
      if (!cb) return
      removeFollowsCallback(cb)
      wsCbRef.value = null
    })
  }

  function get(userId: string | null | undefined): FollowRelationship | null {
    if (!userId) return null
    return state.value[userId] ?? null
  }

  function set(userId: string, rel: FollowRelationship) {
    state.value = { ...state.value, [userId]: rel }
  }

  function upsert(userId: string, partial: Partial<FollowRelationship>) {
    const prev = state.value[userId] ?? { viewerFollowsUser: false, userFollowsViewer: false, viewerPostNotificationsEnabled: false }
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
        // Bell defaults OFF for normal follows.
        upsert(userId, { viewerFollowsUser: true, viewerPostNotificationsEnabled: false })
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
        // Unfollow: clear bell.
        upsert(userId, { viewerFollowsUser: false, viewerPostNotificationsEnabled: false })
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

  async function setPostNotificationsEnabled(params: { userId: string; username: string; enabled: boolean }) {
    error.value = null
    const { userId, username, enabled } = params
    await runOptimisticRequest<{ prev: FollowRelationship | null }, { enabled: boolean }>({
      key: `follow-bell:${userId}`,
      inflight,
      apply: () => {
        const prev = get(userId)
        upsert(userId, { viewerPostNotificationsEnabled: Boolean(enabled) })
        return { prev }
      },
      request: async () => {
        return await apiFetchData<{ enabled: boolean }>(
          `/follows/${encodeURIComponent(username)}/post-notifications`,
          { method: 'PATCH', body: { enabled: Boolean(enabled) } },
        )
      },
      rollback: (snapshot, e) => {
        if (snapshot.prev) set(userId, snapshot.prev)
        else upsert(userId, { viewerPostNotificationsEnabled: false })
        error.value = getApiErrorMessage(e) || 'Failed to update post notifications.'
      },
    })
    invalidateUserPreviewCache(username)
  }

  return { state, inflight, error, get, set, upsert, ingest, follow, unfollow, setPostNotificationsEnabled }
}

