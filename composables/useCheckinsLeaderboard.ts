import type { GetCheckinsLeaderboardResponse, LeaderboardUser } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

const LEADERBOARD_KEY = 'checkins-leaderboard'

export function useCheckinsLeaderboard(options?: { limit?: number }) {
  const { apiFetchData } = useApiClient()

  const users = useState<LeaderboardUser[]>(`${LEADERBOARD_KEY}:users`, () => [])
  const generatedAt = useState<string | null>(`${LEADERBOARD_KEY}:generatedAt`, () => null)
  const loading = useState<boolean>(`${LEADERBOARD_KEY}:loading`, () => false)
  const error = useState<string | null>(`${LEADERBOARD_KEY}:error`, () => null)

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
