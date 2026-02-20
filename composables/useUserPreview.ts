import type { UserPreview } from '~/types/api'
import { invalidateMohCache } from '~/composables/useApiClient'

export function useUserPreview() {
  const { apiFetchData } = useApiClient()
  const { user } = useAuth()

  function cacheKeyFor(username: string) {
    const u = (username ?? '').trim().toLowerCase()
    const authed = Boolean(user.value?.id) ? '1' : '0'
    return `userPreview:${u}:auth=${authed}`
  }

  async function fetchUserPreview(
    normalizedUsername: string,
    opts?: { signal?: AbortSignal },
  ): Promise<UserPreview> {
    const u = (normalizedUsername ?? '').trim()
    if (!u) throw new Error('Username is required')

    const data = await apiFetchData<UserPreview | { banned: true }>(
      `/users/${encodeURIComponent(u)}/preview`,
      {
        method: 'GET',
        mohCache: { ttlMs: 5 * 60 * 1000, staleWhileRevalidateMs: 10 * 60 * 1000, key: cacheKeyFor(u) },
        signal: opts?.signal,
      },
    )
    if (data && 'banned' in data && data.banned) {
      throw new Error('User unavailable')
    }
    return data as UserPreview
  }

  function invalidateUserPreviewCache(username: string) {
    const u = (username ?? '').trim()
    if (!u) return
    // Invalidate both authed/anon variants.
    invalidateMohCache({ prefix: `userPreview:${u.toLowerCase()}:auth=` })
  }

  return { fetchUserPreview, invalidateUserPreviewCache }
}

