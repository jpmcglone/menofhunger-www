import type { BoardLeaderboard, BoardLeaderboardUser, LeaderboardUser, LeaderboardViewerRank } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

/** Leaderboard rows share one shape across tabs; Board rows carry points instead of streaks. */
export type BoardLeaderboardRow = LeaderboardUser & { boardPoints?: number }

function toRow(u: BoardLeaderboardUser): BoardLeaderboardRow {
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    premium: u.premium,
    premiumPlus: u.premiumPlus,
    isOrganization: u.isOrganization,
    verifiedStatus: u.verifiedStatus,
    avatarUrl: u.avatarUrl,
    avatarVideo: u.avatarVideo ?? null,
    checkinStreakDays: 0,
    longestStreakDays: 0,
    boardPoints: u.boardPoints,
  }
}

/** Members ranked by Board points (boosts received on Board posts and comments). */
export function useBoardLeaderboard() {
  const { apiFetchData } = useApiClient()
  const users = useState<BoardLeaderboardRow[]>('board-leaderboard:users', () => [])
  const viewerRank = useState<(LeaderboardViewerRank & { user: BoardLeaderboardRow }) | null>('board-leaderboard:viewerRank', () => null)
  const loading = useState<boolean>('board-leaderboard:loading', () => true)
  const error = useState<string | null>('board-leaderboard:error', () => null)

  async function refresh() {
    loading.value = true
    error.value = null
    try {
      const data = await apiFetchData<BoardLeaderboard>('/board/leaderboard', { method: 'GET' })
      users.value = data.users.map(toRow)
      viewerRank.value = data.viewerRank ? { rank: data.viewerRank.rank, user: toRow(data.viewerRank.user) } : null
    } catch (e: unknown) {
      error.value = getApiErrorMessage(e) || 'Failed to load leaderboard.'
    } finally {
      loading.value = false
    }
  }

  return { users, viewerRank, loading, error, refresh }
}
