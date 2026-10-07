const REFERRAL_STORAGE_KEY = 'moh.referralCode.v1'
const REFERRAL_APPLIED_STORAGE_KEY = 'moh.appliedReferralCode.v1'
const REFERRAL_CAPTURED_AT_KEY = 'moh.referralCode.capturedAt.v1'
const REFERRAL_TTL_MS = 30 * 24 * 60 * 60 * 1000

function normalizeReferralCode(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value
  return String(raw ?? '').trim().toUpperCase().slice(0, 50)
}

export function useReferralCapture() {
  const capturedReferralCode = useState<string>('captured-referral-code', () => '')
  const appliedReferralCode = useState<string>('applied-referral-code', () => '')

  function persistValue(key: string, code: string) {
    if (!import.meta.client) return
    if (code) {
      window.localStorage.setItem(key, code)
    } else {
      window.localStorage.removeItem(key)
    }
  }

  function persistCaptured(code: string) {
    capturedReferralCode.value = code
    persistValue(REFERRAL_STORAGE_KEY, code)
    persistValue(REFERRAL_CAPTURED_AT_KEY, code ? String(Date.now()) : '')
  }

  function expireStoredReferralCode() {
    const stored = window.localStorage.getItem(REFERRAL_STORAGE_KEY)
    if (!stored) return
    const capturedAt = Number(window.localStorage.getItem(REFERRAL_CAPTURED_AT_KEY))
    if (!Number.isFinite(capturedAt) || capturedAt <= 0) {
      window.localStorage.setItem(REFERRAL_CAPTURED_AT_KEY, String(Date.now()))
      return
    }
    if (Date.now() - capturedAt >= REFERRAL_TTL_MS) {
      window.localStorage.removeItem(REFERRAL_STORAGE_KEY)
      window.localStorage.removeItem(REFERRAL_CAPTURED_AT_KEY)
    }
  }

  function persistApplied(code: string) {
    appliedReferralCode.value = code
    persistValue(REFERRAL_APPLIED_STORAGE_KEY, code)
  }

  function loadStoredReferralCode() {
    if (!import.meta.client) return
    expireStoredReferralCode()
    if (!capturedReferralCode.value) {
      const stored = normalizeReferralCode(window.localStorage.getItem(REFERRAL_STORAGE_KEY))
      if (stored) capturedReferralCode.value = stored
    }
    if (!appliedReferralCode.value) {
      const applied = normalizeReferralCode(window.localStorage.getItem(REFERRAL_APPLIED_STORAGE_KEY))
      if (applied) appliedReferralCode.value = applied
    }
  }

  function captureReferralCode(value: unknown) {
    const code = normalizeReferralCode(value)
    if (code) persistCaptured(code)
    return code
  }

  function captureReferralFromRoute(route = useRoute()) {
    loadStoredReferralCode()
    return captureReferralCode(route.query.ref)
  }

  function clearCapturedReferralCode() {
    persistCaptured('')
  }

  function markReferralApplied(value: unknown) {
    const code = normalizeReferralCode(value)
    if (!code) return ''
    persistCaptured(code)
    persistApplied(code)
    return code
  }

  function clearAppliedReferralCode() {
    persistApplied('')
  }

  function clearReferralCapture() {
    clearCapturedReferralCode()
    clearAppliedReferralCode()
  }

  loadStoredReferralCode()

  return {
    capturedReferralCode,
    appliedReferralCode,
    captureReferralCode,
    captureReferralFromRoute,
    clearCapturedReferralCode,
    markReferralApplied,
    clearAppliedReferralCode,
    clearReferralCapture,
  }
}
