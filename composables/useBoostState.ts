import type { FeedPost } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { runOptimisticRequest } from '~/utils/optimistic-request'

export type BoostStateEntry = {
  viewerHasBoosted: boolean
  boostCount: number
}

type BoostStateMap = Record<string, BoostStateEntry>

export function useBoostState() {
  const { apiFetchData } = useApiClient()

  const state = useState<BoostStateMap>('boost-state', () => ({}))
  const inflight = useState<Record<string, boolean>>('boost-inflight', () => ({}))
  const error = useState<string | null>('boost-state-error', () => null)

  function get(post: Pick<FeedPost, 'id' | 'boostCount' | 'viewerHasBoosted'>): BoostStateEntry {
    const existing = state.value[post.id]
    if (existing) return existing
    return {
      viewerHasBoosted: Boolean(post.viewerHasBoosted),
      boostCount: post.boostCount ?? 0
    }
  }

  function set(postId: string, entry: BoostStateEntry) {
    state.value = { ...state.value, [postId]: entry }
  }

  function ingest(posts: Array<Pick<FeedPost, 'id' | 'boostCount' | 'viewerHasBoosted'>>) {
    const next = { ...state.value }
    for (const p of posts) {
      if (!p?.id) continue
      if (next[p.id]) continue
      next[p.id] = {
        viewerHasBoosted: Boolean(p.viewerHasBoosted),
        boostCount: p.boostCount ?? 0
      }
    }
    state.value = next
  }

  async function toggleBoost(post: Pick<FeedPost, 'id' | 'boostCount' | 'viewerHasBoosted'>) {
    error.value = null

    const current = get(post)
    const nextBoosted = !current.viewerHasBoosted

    await runOptimisticRequest<
      { existed: boolean; prev: BoostStateEntry | null },
      { success: true; viewerHasBoosted: boolean; boostCount: number }
    >({
      key: `boost:${post.id}`,
      inflight,
      apply: () => {
        const existed = Boolean(state.value[post.id])
        const prev = state.value[post.id] ?? null

        const delta = nextBoosted ? 1 : -1
        const nextCount = Math.max(0, (current.boostCount ?? 0) + delta)

        set(post.id, { viewerHasBoosted: nextBoosted, boostCount: nextCount })
        return { existed, prev }
      },
      request: async () => {
        const path = `/posts/${encodeURIComponent(post.id)}/boost`
        if (nextBoosted) {
          return await apiFetchData<{ success: true; viewerHasBoosted: true; boostCount: number }>(path, { method: 'POST' })
        }
        return await apiFetchData<{ success: true; viewerHasBoosted: false; boostCount: number }>(path, { method: 'DELETE' })
      },
      commit: (result) => {
        set(post.id, { viewerHasBoosted: result.viewerHasBoosted, boostCount: result.boostCount })
      },
      rollback: (snapshot, e) => {
        if (snapshot.existed && snapshot.prev) {
          set(post.id, snapshot.prev)
        } else {
          const next = { ...state.value }
          delete next[post.id]
          state.value = next
        }
        error.value = getApiErrorMessage(e) || 'Failed to boost.'
      }
    })
  }

  return { state, inflight, error, get, set, ingest, toggleBoost }
}

