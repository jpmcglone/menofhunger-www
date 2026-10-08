import type { BillingMe } from '~/types/api'

type Fetch = <T>(path: string, options?: Record<string, unknown>) => Promise<T>

/**
 * Re-check a Stripe return whose webhook has not activated the membership yet.
 * Syncs the checkout session when we still have its id, otherwise reads billing.
 * Returns the latest billing and whether Premium is now active.
 */
export async function checkActivation(apiFetchData: Fetch, sessionId: string | null): Promise<{ billing: BillingMe | null; active: boolean }> {
  let billing: BillingMe | null = null
  if (sessionId) {
    try { billing = await apiFetchData<BillingMe>('/billing/checkout-session/sync', { method: 'POST', body: { sessionId } }) } catch { billing = null }
  }
  if (!billing?.premium && !billing?.premiumPlus) billing = await apiFetchData<BillingMe>('/billing/me', { method: 'GET' })
  return { billing, active: Boolean(billing?.premium || billing?.premiumPlus) }
}

/**
 * "Activation pending": the payment completed but the membership is not active yet.
 * Shared across Billing and Tiers for the session so nobody is nudged to pay twice.
 */
export function useActivationPending() {
  const { apiFetchData } = useApiClient()
  const pending = useState<{ sessionId: string | null } | null>('membership-activation-pending', () => null)
  const checking = ref(false)
  const error = ref<string | null>(null)

  function markPending(sessionId: string | null) { pending.value = { sessionId } }
  function clear() { pending.value = null; error.value = null }

  /** Resolves to the billing snapshot when activation finished, otherwise null. */
  async function check(): Promise<BillingMe | null> {
    if (!pending.value || checking.value) return null
    checking.value = true
    error.value = null
    try {
      const result = await checkActivation(apiFetchData as Fetch, pending.value.sessionId)
      if (result.active) { clear(); return result.billing }
      return null
    } catch {
      error.value = 'Couldn’t check yet. Try again in a moment.'
      return null
    } finally {
      checking.value = false
    }
  }
  return { pending, checking, error, markPending, clear, check }
}
