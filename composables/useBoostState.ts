import type { FeedPost } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
export type BoostStateEntry = {
  viewerHasBoosted: boolean
  boostCount: number
}

type BoostStateMap = Record<string, BoostStateEntry>

export function useBoostState() {
  const { apiFetchData } = useApiClient()

  const state = useState<BoostStateMap>('boost-state', () => ({}))
  const inflight = useState<Record<string, boolean>>('boost-inflight', () => ({}))
  const pending = useState<Record<string, boolean>>('boost-pending', () => ({}))
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

  function setOptimistic(postId: string, current: BoostStateEntry, desiredBoosted: boolean) {
    const delta = desiredBoosted ? 1 : -1
    const nextCount = Math.max(0, (current.boostCount ?? 0) + delta)
    set(postId, { viewerHasBoosted: desiredBoosted, boostCount: nextCount })
  }

  async function send(postId: string, desiredBoosted: boolean) {
    const path = `/posts/${encodeURIComponent(postId)}/boost`
    if (desiredBoosted) {
      return await apiFetchData<{ success: true; viewerHasBoosted: true; boostCount: number }>(path, { method: 'POST' })
    }
    return await apiFetchData<{ success: true; viewerHasBoosted: false; boostCount: number }>(path, { method: 'DELETE' })
  }

  async function applyDesired(post: Pick<FeedPost, 'id' | 'boostCount' | 'viewerHasBoosted'>, desiredBoosted: boolean) {
    const postId = post.id
    const key = `boost:${postId}`

    error.value = null

    // Always apply the user's latest intent immediately (optimistic).
    // If there's already optimistic state, base the delta on that.
    const basis = state.value[postId] ?? get(post)
    if (basis.viewerHasBoosted !== desiredBoosted) {
      setOptimistic(postId, basis, desiredBoosted)
    }

    // If a request is already in flight, record the latest intent and return.
    if (inflight.value[key]) {
      pending.value = { ...pending.value, [postId]: desiredBoosted }
      return
    }

    // Snapshot before optimistic update (for rollback if this request fails and no newer intent exists).
    const existed = Boolean(state.value[postId])
    const prev = state.value[postId] ?? null

    inflight.value = { ...inflight.value, [key]: true }
    try {
      const result = await send(postId, desiredBoosted)

      // If the user tapped again while this was in flight, this response is stale.
      // Ignore it (we'll send a follow-up to match latest intent below).
      if (typeof pending.value[postId] === 'boolean') return

      // Otherwise commit server truth for this request.
      set(postId, { viewerHasBoosted: result.viewerHasBoosted, boostCount: result.boostCount })
    } catch (e: unknown) {
      // If user tapped again while this was in flight, do NOT fight the latest intent.
      if (typeof pending.value[postId] === 'boolean') {
        error.value = getApiErrorMessage(e) || 'Failed to boost.'
        return
      }

      // Otherwise revert fully.
      if (existed && prev) {
        set(postId, prev)
      } else {
        const next = { ...state.value }
        delete next[postId]
        state.value = next
      }
      error.value = getApiErrorMessage(e) || 'Failed to boost.'
      throw e
    } finally {
      inflight.value = { ...inflight.value, [key]: false }
    }

    // After completing, if there is a newer intent, apply it (last intent wins).
    const nextDesired = pending.value[postId]
    if (typeof nextDesired === 'boolean') {
      const nextPending = { ...pending.value }
      delete nextPending[postId]
      pending.value = nextPending

      const nowEntry = state.value[postId] ?? get(post)
      if (nowEntry.viewerHasBoosted !== nextDesired) {
        await applyDesired(post, nextDesired)
      }
    }
  }

  async function toggleBoost(post: Pick<FeedPost, 'id' | 'boostCount' | 'viewerHasBoosted'>) {
    error.value = null

    const current = get(post)
    const nextBoosted = !current.viewerHasBoosted
    await applyDesired(post, nextBoosted)
  }

  return { state, inflight, pending, error, get, set, ingest, toggleBoost }
}

