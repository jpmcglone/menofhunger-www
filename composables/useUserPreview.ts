import type { UserPreview } from '~/types/api'

export function useUserPreview() {
  const { apiFetchData } = useApiClient()

  async function fetchUserPreview(normalizedUsername: string): Promise<UserPreview> {
    const u = (normalizedUsername ?? '').trim()
    if (!u) throw new Error('Username is required')

    return await apiFetchData<UserPreview>(`/users/${encodeURIComponent(u)}/preview`, {
      method: 'GET',
      mohCache: { ttlMs: 5 * 60 * 1000 },
    })
  }

  return { fetchUserPreview }
}

