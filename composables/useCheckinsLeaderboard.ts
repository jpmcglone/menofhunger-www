import type { GetCheckinsLeaderboardResponse, LeaderboardUser } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

const LEADERBOARD_KEY = 'checkins-leaderboard'

export function useCheckinsLeaderboard(options?: { limit?: number }) {
  const { apiFetchData } = useApiClient()

  const scopeKey = options?.limit ? `${LEADERBOARD_KEY}:${options.limit}` : LEADERBOARD_KEY

  const users = useState<LeaderboardUser[]>(`${scopeKey}:users`, () => [])
  const generatedAt = useState<string | null>(`${scopeKey}:generatedAt`, () => null)
  const loading = useState<boolean>(`${scopeKey}:loading`, () => false)
  const error = useState<string | null>(`${scopeKey}:error`, () => null)

  async function refresh() {
    loading.value = true
    error.value = null
    try {
      const data = await apiFetchData<GetCheckinsLeaderboardResponse>('/checkins/leaderboard', {
        method: 'GET',
        query: options?.limit ? { limit: options.limit } : undefined,
      })
      users.value = data.users
      generatedAt.value = data.generatedAt
    } catch (e: unknown) {
      error.value = getApiErrorMessage(e) || 'Failed to load leaderboard.'
    } finally {
      loading.value = false
    }
  }

  return { users, generatedAt, loading, error, refresh }
}
