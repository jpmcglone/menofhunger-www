import type { GetCheckinsLeaderboardResponse, LeaderboardUser } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

export function useCheckinsLeaderboard(options?: { limit?: number }) {
  const { apiFetchData } = useApiClient()

  const users = ref<LeaderboardUser[]>([])
  const generatedAt = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

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
