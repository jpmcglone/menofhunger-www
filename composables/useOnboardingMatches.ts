import type { OnboardingMatches } from '~/types/api'
import { getSafeUserErrorMessage } from '~/utils/api-error'

/** Groups and people matched to the member's interests and, optionally, a sentence about what they want. */
export function useOnboardingMatches() {
  const { apiFetchData } = useApiClient()
  const matches = ref<OnboardingMatches | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  let requestId = 0

  async function load(intent = '') {
    const id = ++requestId
    loading.value = true
    error.value = null
    try {
      const body = intent.trim() ? { intent: intent.trim().slice(0, 300) } : {}
      const result = await apiFetchData<OnboardingMatches>('/me/onboarding/matches', { method: 'POST', body })
      if (id === requestId) matches.value = result
    } catch (cause) {
      if (id === requestId) error.value = getSafeUserErrorMessage(cause, 'Couldn’t load suggestions. Try again.')
    } finally {
      if (id === requestId) loading.value = false
    }
  }

  return { matches, loading, error, load }
}
