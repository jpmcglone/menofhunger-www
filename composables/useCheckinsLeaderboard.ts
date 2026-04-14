import type { GetCheckinsLeaderboardResponse, LeaderboardUser, LeaderboardViewerRank } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

const LEADERBOARD_KEY = 'checkins-leaderboard'
const inflightByKey = new Map<string, Promise<void>>()

export function useCheckinsLeaderboard(options?: { limit?: number; scope?: 'all' | 'best' | 'weekly' }) {
  const { apiFetchData } = useApiClient()

  const scope = options?.scope ?? 'all'
  const scopeKey = `${LEADERBOARD_KEY}:${scope}${options?.limit ? `:${options.limit}` : ''}`

  const users = useState<LeaderboardUser[]>(`${scopeKey}:users`, () => [])
  const viewerRank = useState<LeaderboardViewerRank | null>(`${scopeKey}:viewerRank`, () => null)
  const weekStart = useState<string | null>(`${scopeKey}:weekStart`, () => null)
  const generatedAt = useState<string | null>(`${scopeKey}:generatedAt`, () => null)
  const loading = useState<boolean>(`${scopeKey}:loading`, () => true)
  const error = useState<string | null>(`${scopeKey}:error`, () => null)

  async function refresh() {
    const existing = inflightByKey.get(scopeKey)
    if (existing) {
      await existing
      return
    }

    const run = (async () => {
      loading.value = true
      error.value = null
      try {
        const query: Record<string, string | number> = {}
        if (options?.limit) query.limit = options.limit
        if (scope === 'weekly') query.scope = 'weekly'
        else if (scope === 'best') query.scope = 'best'

        const data = await apiFetchData<GetCheckinsLeaderboardResponse>('/checkins/leaderboard', {
          method: 'GET',
          query: Object.keys(query).length ? query : undefined,
        })
        users.value = data.users
        viewerRank.value = data.viewerRank ?? null
        weekStart.value = data.weekStart ?? null
        generatedAt.value = data.generatedAt
      } catch (e: unknown) {
        error.value = getApiErrorMessage(e) || 'Failed to load leaderboard.'
      } finally {
        loading.value = false
        inflightByKey.delete(scopeKey)
      }
    })()
    inflightByKey.set(scopeKey, run)
    await run
  }

  return { users, viewerRank, weekStart, generatedAt, loading, error, refresh }
}
