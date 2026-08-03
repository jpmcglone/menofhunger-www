import type { FeedPost, RepostResponse, UnrepostResponse } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

type GetPostData = { data: FeedPost }

export type RepostStateEntry = {
  viewerHasReposted: boolean
  repostCount: number
}

type RepostStateMap = Record<string, RepostStateEntry>

export function useRepostState() {
  const { apiFetchData } = useApiClient()
  const postCache = usePostCache()
  const { prependToHomeFeed } = useHomeFeedPrepend()
  const { prependToProfileFeed } = useProfileFeedPrepend()

  const state = useState<RepostStateMap>('repost-state', () => ({}))
  const inflight = useState<Record<string, boolean>>('repost-inflight', () => ({}))
  const pending = useState<Record<string, boolean>>('repost-pending', () => ({}))
  const error = useState<string | null>('repost-state-error', () => null)

  // Maps original post id → viewer's flat-repost post id, so we can tombstone the
  // shell row when the user un-reposts without needing to walk the feed array.
  const repostIdByOriginal = useState<Record<string, string>>('repost-id-by-original', () => ({}))

  function get(post: Pick<FeedPost, 'id' | 'repostCount' | 'viewerHasReposted'>): RepostStateEntry {
    const existing = state.value[post.id]
    if (existing) return existing
    return {
      viewerHasReposted: Boolean(post.viewerHasReposted),
      repostCount: post.repostCount ?? 0,
    }
  }

  function set(postId: string, entry: RepostStateEntry) {
    state.value = { ...state.value, [postId]: entry }
    // Keep the post cache in sync so PostRow reflects the server-confirmed state.
    postCache.patch(postId, {
      viewerHasReposted: entry.viewerHasReposted,
      repostCount: entry.repostCount,
    })
  }

  function ingest(posts: Array<Pick<FeedPost, 'id' | 'repostCount' | 'viewerHasReposted'>>) {
    const next = { ...state.value }
    for (const p of posts) {
      if (!p?.id) continue
      if (next[p.id]) continue
      next[p.id] = {
        viewerHasReposted: Boolean(p.viewerHasReposted),
        repostCount: p.repostCount ?? 0,
      }
    }
    state.value = next
  }

  function setOptimistic(postId: string, current: RepostStateEntry, desiredReposted: boolean) {
    const delta = desiredReposted ? 1 : -1
    const nextCount = Math.max(0, (current.repostCount ?? 0) + delta)
    set(postId, { viewerHasReposted: desiredReposted, repostCount: nextCount })
  }

  async function send(postId: string, desiredReposted: boolean) {
    const path = `/posts/${encodeURIComponent(postId)}/repost`
    if (desiredReposted) {
      return await apiFetchData<RepostResponse>(path, { method: 'POST' })
    }
    return await apiFetchData<UnrepostResponse>(path, { method: 'DELETE' })
  }

  async function applyDesired(post: Pick<FeedPost, 'id' | 'repostCount' | 'viewerHasReposted'>, desiredReposted: boolean) {
    const postId = post.id
    const key = `repost:${postId}`

    error.value = null

    const basis = state.value[postId] ?? get(post)
    if (basis.viewerHasReposted !== desiredReposted) {
      setOptimistic(postId, basis, desiredReposted)
    }

    if (inflight.value[key]) {
      pending.value = { ...pending.value, [postId]: desiredReposted }
      return
    }

    const existed = Boolean(state.value[postId])
    const prev = state.value[postId] ?? null

    inflight.value = { ...inflight.value, [key]: true }
    try {
      const result = await send(postId, desiredReposted)

      const pendingNow = pending.value[postId]
      if (typeof pendingNow !== 'boolean') {
        set(postId, {
          viewerHasReposted: result.reposted,
          repostCount: result.repostCount,
        })

        if (result.reposted) {
          // Track the repost shell id so we can tombstone it on un-repost.
          if (result.repostId) {
            repostIdByOriginal.value = { ...repostIdByOriginal.value, [postId]: result.repostId }
            // Prepend the new repost shell to the actor's home and profile feeds
            // so it appears live without a page refresh. Best-effort — a failure
            // here only means the actor refreshes to see their repost.
            void apiFetchData<GetPostData>(`/posts/${encodeURIComponent(result.repostId)}`).then(({ data: repostPost }) => {
              prependToHomeFeed(repostPost)
              prependToProfileFeed(repostPost)
            }).catch(() => { /* best-effort */ })
          }
        } else {
          // Un-repost: tombstone the viewer's flat-repost shell row so it disappears.
          const repostShellId = repostIdByOriginal.value[postId]
          if (repostShellId) {
            postCache.patch(repostShellId, { deletedAt: new Date().toISOString() })
            const next = { ...repostIdByOriginal.value }
            delete next[postId]
            repostIdByOriginal.value = next
          }
        }
      }
    } catch (e: unknown) {
      const pendingNow = pending.value[postId]
      if (typeof pendingNow === 'boolean') {
        error.value = getApiErrorMessage(e) || 'Failed to repost.'
      } else {
        const cur = state.value[postId] ?? null
        const curMatchesThisRequest = cur ? cur.viewerHasReposted === desiredReposted : false
        if (curMatchesThisRequest) {
          if (existed && prev) {
            set(postId, prev)
          } else {
            const next = { ...state.value }
            delete next[postId]
            state.value = next
          }
        }
        error.value = getApiErrorMessage(e) || 'Failed to repost.'
        throw e
      }
    } finally {
      inflight.value = { ...inflight.value, [key]: false }
    }

    const nextDesired = pending.value[postId]
    if (typeof nextDesired === 'boolean') {
      const nextPending = { ...pending.value }
      delete nextPending[postId]
      pending.value = nextPending

      const nowEntry = state.value[postId] ?? get(post)
      if (nowEntry.viewerHasReposted !== nextDesired) {
        await applyDesired(post, nextDesired)
      }
    }
  }

  async function toggleRepost(post: Pick<FeedPost, 'id' | 'repostCount' | 'viewerHasReposted'>) {
    error.value = null
    const current = get(post)
    const nextReposted = !current.viewerHasReposted
    await applyDesired(post, nextReposted)
  }

  return { state, inflight, pending, error, get, set, ingest, toggleRepost }
}
