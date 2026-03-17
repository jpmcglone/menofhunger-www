import type { GetCheckinsLeaderboardResponse, LeaderboardUser, LeaderboardViewerRank } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

const LEADERBOARD_KEY = 'checkins-leaderboard'

export function useCheckinsLeaderboard(options?: { limit?: number; scope?: 'all' | 'weekly' }) {
  const { apiFetchData } = useApiClient()

  const scope = options?.scope ?? 'all'
  const scopeKey = `${LEADERBOARD_KEY}:${scope}${options?.limit ? `:${options.limit}` : ''}`

  const users = useState<LeaderboardUser[]>(`${scopeKey}:users`, () => [])
  const viewerRank = useState<LeaderboardViewerRank | null>(`${scopeKey}:viewerRank`, () => null)
  const weekStart = useState<string | null>(`${scopeKey}:weekStart`, () => null)
  const generatedAt = useState<string | null>(`${scopeKey}:generatedAt`, () => null)
  const loading = useState<boolean>(`${scopeKey}:loading`, () => false)
  const error = useState<string | null>(`${scopeKey}:error`, () => null)

  async function refresh() {
    loading.value = true
    error.value = null
    try {
      const query: Record<string, string | number> = {}
      if (options?.limit) query.limit = options.limit
      if (scope === 'weekly') query.scope = 'weekly'

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
    }
  }

  return { users, viewerRank, weekStart, generatedAt, loading, error, refresh }
}
