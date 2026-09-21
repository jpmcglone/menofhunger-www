import type { BillingCheckoutSession, BillingMe, BillingTier } from '~/types/api'
import { tiers } from '~/config/tiers.data'
import { getApiErrorMessage } from '~/utils/api-error'
import { getAuthGeneration } from '~/composables/auth/authState'

/** Shared explicit purchase entry for Tiers and Billing. URLs never start purchases. */
export function useMembershipCheckout() {
  const { user } = useAuth()
  const { apiFetchData } = useApiClient()
  const { confirm } = useAppConfirm()
  const checkoutLoading = ref<BillingTier | null>(null)
  const checkoutError = ref<string | null>(null)
  let disposed = false
  onBeforeUnmount(() => { disposed = true })

  async function startCheckout(tier: BillingTier) {
    if (checkoutLoading.value || !user.value) return
    const identity = user.value.id
    const generation = getAuthGeneration()
    const active = () => !disposed && user.value?.id === identity && getAuthGeneration() === generation
    checkoutLoading.value = tier
    checkoutError.value = null
    try {
      const billing = await apiFetchData<BillingMe>('/billing/me', { method: 'GET' })
      if (!active()) return
      if (!billing.verified) throw new Error('Verify your account before upgrading.')
      if (billing.source === 'apple') throw new Error('Your subscription is managed by Apple. Use Manage with Apple to change it.')
      if (billing.premiumPlus || (tier === 'premium' && billing.premium)) throw new Error('Your membership already includes this tier.')
      if (billing.source === 'stripe' && billing.premium && tier === 'premiumPlus') {
        const price = tiers.find(t => t.id === tier)?.price
        const accepted = await confirm({
          header: 'Upgrade to Premium+?',
          message: `${price?.amount} ${price?.interval}. This updates your existing subscription. Prorated charges may apply. Your billing provider calculates the adjustment.`,
          confirmLabel: 'Confirm upgrade',
          cancelLabel: 'Cancel',
        })
        if (accepted !== true || !active()) return
        // A membership or account can change while the confirmation is open.
        const latest = await apiFetchData<BillingMe>('/billing/me', { method: 'GET' })
        if (!active()) return
        if (!latest.verified || latest.source !== 'stripe' || !latest.premium || latest.premiumPlus) {
          throw new Error('Your membership changed. Refresh it before upgrading.')
        }
      }
      const result = await apiFetchData<BillingCheckoutSession>('/billing/checkout-session', {
        method: 'POST', body: { tier },
      })
      if (!active()) return
      const url = result.url?.trim()
      if (!url) throw new Error('Couldn’t open checkout. Please try again.')
      await navigateTo(url, { external: true })
    } catch (error) {
      if (active()) checkoutError.value = getApiErrorMessage(error) || 'Couldn’t open checkout. Please try again.'
    } finally {
      checkoutLoading.value = null
    }
  }

  return { checkoutLoading, checkoutError, startCheckout }
}
