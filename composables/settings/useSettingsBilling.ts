import type {
  BillingCheckoutSession,
  BillingMe,
  BillingPortalSession,
  BillingTier,
  Recruit,
} from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

const BILLING_MS_PER_MONTH = 30.44 * 24 * 60 * 60 * 1000

/**
 * State + actions for the Billing settings section: billing summary,
 * Stripe checkout/portal, referrals (code, recruiter, recruits), and the
 * post-checkout success modal polling.
 */
export function useSettingsBilling() {
  const { me } = useAuth()
  const { apiFetchData } = useApiClient()
  const route = useRoute()
  const toast = useAppToast()

  const billingMe = ref<BillingMe | null>(null)
  const billingLoading = ref(false)
  const billingError = ref<string | null>(null)
  const checkoutLoading = ref<BillingTier | null>(null)
  const portalLoading = ref(false)

  const billingFreeMonthsPremiumPlus = computed(() => {
    const now = Date.now()
    const grants = billingMe.value?.grants ?? []
    const remainingMs = grants
      .filter((g) => g.tier === 'premiumPlus')
      .reduce((sum, g) => {
        const endsAtMs = new Date(String(g.endsAt)).getTime()
        if (!Number.isFinite(endsAtMs)) return sum
        return sum + Math.max(0, endsAtMs - now)
      }, 0)
    return Math.round(remainingMs / BILLING_MS_PER_MONTH)
  })

  const billingFreeMonthsPremium = computed(() => {
    const now = Date.now()
    const grants = billingMe.value?.grants ?? []
    const remainingMs = grants
      .filter((g) => g.tier === 'premium')
      .reduce((sum, g) => {
        const endsAtMs = new Date(String(g.endsAt)).getTime()
        if (!Number.isFinite(endsAtMs)) return sum
        return sum + Math.max(0, endsAtMs - now)
      }, 0)
    return Math.round(remainingMs / BILLING_MS_PER_MONTH)
  })

  const billingHasAnyFreeMonths = computed(() =>
    billingFreeMonthsPremiumPlus.value > 0 || billingFreeMonthsPremium.value > 0,
  )

  async function refreshBilling() {
    billingLoading.value = true
    billingError.value = null
    try {
      billingMe.value = await apiFetchData<BillingMe>('/billing/me', { method: 'GET' })
    } catch (e: unknown) {
      billingError.value = getApiErrorMessage(e) || 'Failed to load billing.'
    } finally {
      billingLoading.value = false
    }
  }

  async function startCheckout(tier: BillingTier) {
    if (checkoutLoading.value) return
    checkoutLoading.value = tier
    billingError.value = null
    try {
      const res = await apiFetchData<BillingCheckoutSession>('/billing/checkout-session', {
        method: 'POST',
        body: { tier },
      })
      const url = (res?.url ?? '').trim()
      if (!url) throw new Error('Missing checkout URL.')
      await navigateTo(url, { external: true })
    } catch (e: unknown) {
      billingError.value = getApiErrorMessage(e) || 'Failed to start checkout.'
    } finally {
      checkoutLoading.value = null
    }
  }

  async function openPortal() {
    if (portalLoading.value) return
    portalLoading.value = true
    billingError.value = null
    try {
      const res = await apiFetchData<BillingPortalSession>('/billing/portal-session', {
        method: 'POST',
      })
      const url = (res?.url ?? '').trim()
      if (!url) throw new Error('Missing portal URL.')
      await navigateTo(url, { external: true })
    } catch (e: unknown) {
      billingError.value = getApiErrorMessage(e) || 'Failed to open billing portal.'
    } finally {
      portalLoading.value = false
    }
  }

  // ─── Dev-only: reset premium ────────────────────────────────────────

  const devResetLoading = ref(false)

  async function devResetPremium() {
    if (devResetLoading.value) return
    devResetLoading.value = true
    try {
      await apiFetchData('/billing/dev-reset', { method: 'DELETE' })
      await refreshBilling()
      await me()
      toast.push({ title: 'Premium removed (dev).', tone: 'success', durationMs: 2000 })
    } catch (e: unknown) {
      billingError.value = getApiErrorMessage(e) || 'Failed to reset premium.'
    } finally {
      devResetLoading.value = false
    }
  }

  // ─── Checkout success modal ─────────────────────────────────────────

  const checkoutSuccessModal = ref(false)
  const checkoutSuccessTier = ref<'premium' | 'premiumPlus'>('premium')

  function stripCheckoutQuery() {
    const nextQuery = { ...(route.query as Record<string, any>) }
    delete nextQuery.checkout
    delete nextQuery.session_id
    void navigateTo({ path: route.path, query: nextQuery }, { replace: true })
  }

  function showSuccessModal() {
    if (billingMe.value?.premiumPlus) {
      checkoutSuccessTier.value = 'premiumPlus'
    } else {
      checkoutSuccessTier.value = 'premium'
    }
    checkoutSuccessModal.value = true
  }

  onMounted(() => {
    if (!import.meta.client) return
    if (route.query.checkout !== 'success') return

    const sessionId = typeof route.query.session_id === 'string' ? route.query.session_id.trim() : null

    if (sessionId) {
      // Fast path: sync from Stripe directly — no polling, works without webhooks.
      const syncAndShow = async () => {
        try {
          const synced = await apiFetchData<BillingMe>('/billing/checkout-session/sync', {
            method: 'POST',
            body: { sessionId },
          })
          if (synced) billingMe.value = synced
          if (synced?.premium || synced?.premiumPlus) {
            // me() updates auth-user; useMarv watches auth-user.premium and will
            // force-refresh its own state automatically.
            await me()
            showSuccessModal()
          }
        } catch {
          // Sync failed — fall through to polling so the UI isn't stuck.
          void pollForPremium()
          return
        }
        stripCheckoutQuery()
      }
      void syncAndShow()
      return
    }

    // Fallback polling path for sessions that don't carry a session_id (e.g. inline upgrade).
    const pollForPremium = async (attempts = 0) => {
      await refreshBilling()
      if (billingMe.value?.premium || billingMe.value?.premiumPlus) {
        await me()
        showSuccessModal()
      } else if (attempts < 5) {
        setTimeout(() => pollForPremium(attempts + 1), 2000)
        return
      }
      stripCheckoutQuery()
    }
    void pollForPremium()
  })

  // ─── Referral ───────────────────────────────────────────────────────

  const referralCodeDraft = ref('')
  const referralCodeSaving = ref(false)
  const referralCodeSaved = ref(false)
  const referralCodeError = ref<string | null>(null)
  let referralCodeSavedTimer: ReturnType<typeof setTimeout> | null = null

  const referralCodeCopied = ref(false)
  let referralCodeCopiedTimer: ReturnType<typeof setTimeout> | null = null

  const recruiterCodeDraft = ref('')
  const recruiterSaving = ref(false)
  const recruiterError = ref<string | null>(null)

  const recruits = ref<Recruit[]>([])
  const recruitsLoading = ref(false)

  async function saveReferralCode() {
    const code = referralCodeDraft.value.trim()
    if (!code) return
    referralCodeSaving.value = true
    referralCodeError.value = null
    referralCodeSaved.value = false
    try {
      const res = await apiFetchData<{ referralCode: string }>('/billing/referral/code', {
        method: 'PUT',
        body: { code },
      })
      referralCodeDraft.value = ''
      referralCodeSaved.value = true
      if (billingMe.value) billingMe.value = { ...billingMe.value, referralCode: res.referralCode }
      if (referralCodeSavedTimer) clearTimeout(referralCodeSavedTimer)
      referralCodeSavedTimer = setTimeout(() => { referralCodeSaved.value = false }, 3000)
    } catch (e: unknown) {
      referralCodeError.value = getApiErrorMessage(e) || 'Failed to save referral code.'
    } finally {
      referralCodeSaving.value = false
    }
  }

  async function applyRecruiter() {
    const code = recruiterCodeDraft.value.trim()
    if (!code) return
    recruiterSaving.value = true
    recruiterError.value = null
    try {
      await apiFetchData('/billing/referral/set-recruiter', { method: 'POST', body: { code } })
      recruiterCodeDraft.value = ''
      // Refresh billing to get the full rich recruiter object (avatar, badges, etc.)
      await refreshBilling()
    } catch (e: unknown) {
      recruiterError.value = getApiErrorMessage(e) || 'Failed to apply referral code.'
    } finally {
      recruiterSaving.value = false
    }
  }

  async function copyReferralCode() {
    const code = billingMe.value?.referralCode
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      referralCodeCopied.value = true
      if (referralCodeCopiedTimer) clearTimeout(referralCodeCopiedTimer)
      referralCodeCopiedTimer = setTimeout(() => { referralCodeCopied.value = false }, 2000)
    } catch {
      // clipboard unavailable — silent fail
    }
  }

  async function loadRecruits() {
    recruitsLoading.value = true
    try {
      recruits.value = await apiFetchData<Recruit[]>('/billing/referral/recruits', { method: 'GET' })
    } catch {
      // non-critical
    } finally {
      recruitsLoading.value = false
    }
  }

  // Load recruits once premium status is known to be true.
  watch(
    () => billingMe.value?.premium,
    (isPremium) => {
      if (isPremium) void loadRecruits()
    },
  )

  onBeforeUnmount(() => {
    if (referralCodeSavedTimer) {
      clearTimeout(referralCodeSavedTimer)
      referralCodeSavedTimer = null
    }
    if (referralCodeCopiedTimer) {
      clearTimeout(referralCodeCopiedTimer)
      referralCodeCopiedTimer = null
    }
  })

  return {
    billingMe,
    billingLoading,
    billingError,
    checkoutLoading,
    portalLoading,
    billingFreeMonthsPremiumPlus,
    billingFreeMonthsPremium,
    billingHasAnyFreeMonths,
    refreshBilling,
    startCheckout,
    openPortal,
    devResetLoading,
    devResetPremium,
    checkoutSuccessModal,
    checkoutSuccessTier,
    referralCodeDraft,
    referralCodeSaving,
    referralCodeSaved,
    referralCodeError,
    referralCodeCopied,
    copyReferralCode,
    saveReferralCode,
    recruiterCodeDraft,
    recruiterSaving,
    recruiterError,
    applyRecruiter,
    recruits,
    recruitsLoading,
  }
}
