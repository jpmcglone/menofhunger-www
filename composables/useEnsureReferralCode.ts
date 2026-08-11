import type { ReferralMe } from '~/types/api'

/**
 * Lazily loads the viewer's referral code into shared `useReferralCode` state
 * so share surfaces can append `?ref=` without each page owning a fetch.
 */
export function useEnsureReferralCode() {
  const { isAuthed } = useAuth()
  const { referralCode, setReferralCode } = useReferralCode()
  const { apiFetchData } = useApiClient()
  let inflight: Promise<string | null> | null = null

  async function ensureReferralCode(): Promise<string | null> {
    if (!isAuthed.value) return null
    if (referralCode.value !== undefined) return referralCode.value

    if (!inflight) {
      inflight = (async () => {
        try {
          const data = await apiFetchData<ReferralMe>('/billing/referral', { method: 'GET' })
          const code = data.referralCode ?? null
          setReferralCode(code)
          return code
        } catch {
          // Soft-fail: share still works without attribution.
          setReferralCode(null)
          return null
        } finally {
          inflight = null
        }
      })()
    }
    return inflight
  }

  return {
    referralCode,
    ensureReferralCode,
  }
}
