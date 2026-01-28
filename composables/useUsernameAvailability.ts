import { getApiErrorMessage } from '~/utils/api-error'

export type UsernameAvailabilityStatus = 'unknown' | 'checking' | 'available' | 'taken' | 'invalid'

export function useUsernameAvailability() {
  const { apiFetchData } = useApiClient()

  async function check(username: string): Promise<{
    status: Exclude<UsernameAvailabilityStatus, 'checking' | 'unknown'>
    normalized: string | null
    message: string
  }> {
    const trimmed = (username ?? '').trim()
    if (!trimmed) {
      return { status: 'invalid', normalized: null, message: 'Username is required.' }
    }

    try {
      const res = await apiFetchData<{ available: boolean; normalized: string | null; error?: string }>(
        '/users/username/available',
        {
          method: 'GET',
          query: { username: trimmed },
        },
      )

      if (res.available) {
        return { status: 'available', normalized: res.normalized, message: `Available: @${res.normalized}` }
      }

      if (res.error) return { status: 'invalid', normalized: res.normalized, message: res.error }
      return { status: 'taken', normalized: res.normalized, message: 'That username is taken.' }
    } catch (e: unknown) {
      return {
        status: 'invalid',
        normalized: null,
        message: getApiErrorMessage(e) || 'Failed to check username.',
      }
    }
  }

  return { check }
}

