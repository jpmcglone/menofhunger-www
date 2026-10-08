import { usePresenceCallback } from '~/composables/presence/usePresenceCallback'
import type { AffiliateSummary, Recruit, ReferralMe, FollowListUser } from '~/types/api'
import type { ReferralCallback } from '~/composables/presence/types'
import { getApiErrorMessage } from '~/utils/api-error'
import { useInviteReward } from '~/composables/useInviteReward'
import { inviteShareUrl } from '~/utils/acquisition-share'

export function useInvitePage() {

useHead({ title: 'Invite' })

const { apiFetchData } = useApiClient()
const { isVerified: isVerifiedBase, isPremium } = useAuth()
const { setReferralCode } = useReferralCode()

// ─── State ────────────────────────────────────────────────────────────────────

const loading = ref(true)
const error = ref<string | null>(null)
const referralData = ref<ReferralMe | null>(null)
const recruits = ref<Recruit[]>([])
const affiliate = ref<Extract<AffiliateSummary, { isAffiliate: true }> | null>(null)
const codeInput = ref('')
const savingCode = ref(false)
const codeError = ref<string | null>(null)
const editingCode = ref(false)
const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

const claimCodeInputRef = ref<{ $el: HTMLInputElement } | null>(null)

function focusCodeInput() {
  nextTick(() => {
    const el = claimCodeInputRef.value?.$el
    el?.focus()
  })
}

// Verified or premium — either can hold a referral code.
const canInviteLocal = computed(() => isPremium.value || isVerifiedBase.value)
// After load, use the API-confirmed value; fall back to the local check while loading.
const canInvite = computed(() =>
  referralData.value !== null ? Boolean(referralData.value.canInvite) : canInviteLocal.value,
)

const referralCode = computed(() => referralData.value?.referralCode ?? null)
const monthsEarned = computed(() => referralData.value?.monthsEarned ?? 0)

const reward = computed(() => useInviteReward(referralData.value))

const codeFontSize = computed(() => {
  const len = (referralCode.value ?? '').length
  if (len <= 6) return '1.75rem'
  if (len <= 10) return '1.375rem'
  if (len <= 14) return '1.125rem'
  if (len <= 17) return '0.9375rem'
  return '0.8125rem'
})

const shareUrl = computed(() => {
  const code = referralCode.value
  if (!code || !import.meta.client) return ''
  return inviteShareUrl(code, window.location.origin)
})

const shareMessage = computed(() => {
  const code = referralCode.value
  if (!code) return 'Join me on Men of Hunger.'
  return reward.value.shareMessage(code)
})

// ─── Pilot progress ───────────────────────────────────────────────────────────

const pendingProgressPct = computed(() => {
  const a = affiliate.value
  if (!a) return 0
  if (a.pendingCents >= a.minPayoutCents) {
    return Math.min(100, Math.round((a.pendingCents / a.capCents) * 100))
  }
  return Math.min(99, Math.round((a.pendingCents / a.minPayoutCents) * 100))
})

// ─── Load ────────────────────────────────────────────────────────────────────

async function load() {
  if (!canInviteLocal.value) {
    loading.value = false
    return
  }
  loading.value = true
  error.value = null
  try {
    const [billingData, recruitsData, affiliateData] = await Promise.all([
      apiFetchData<ReferralMe>('/billing/referral', { method: 'GET' }),
      apiFetchData<Recruit[]>('/billing/referral/recruits', { method: 'GET' }),
      apiFetchData<AffiliateSummary>('/billing/affiliate', { method: 'GET' }),
    ])
    referralData.value = billingData
    setReferralCode(billingData.referralCode ?? null)
    recruits.value = recruitsData
    if (affiliateData.isAffiliate) {
      affiliate.value = affiliateData
    }
    if (!referralCode.value) focusCodeInput()
  } catch (e) {
    error.value = getApiErrorMessage(e) || 'Failed to load referrals.'
  } finally {
    loading.value = false
  }
}

// ─── Actions ─────────────────────────────────────────────────────────────────

function startEditCode() {
  codeInput.value = referralCode.value ?? ''
  codeError.value = null
  editingCode.value = true
  focusCodeInput()
}

function cancelEditCode() {
  editingCode.value = false
  codeInput.value = ''
  codeError.value = null
}

function onEditKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') { e.preventDefault(); void saveCode() }
  if (e.key === 'Escape') { e.preventDefault(); cancelEditCode() }
}

async function saveCode() {
  const code = codeInput.value.trim()
  if (!code || savingCode.value) return
  savingCode.value = true
  codeError.value = null
  try {
    const res = await apiFetchData<{ referralCode: string }>('/billing/referral/code', {
      method: 'PUT',
      body: { code },
    })
    if (referralData.value) {
      referralData.value = { ...referralData.value, referralCode: res.referralCode }
    }
    setReferralCode(res.referralCode)
    codeInput.value = ''
    editingCode.value = false
  } catch (e) {
    codeError.value = getApiErrorMessage(e) || 'Failed to save referral code.'
  } finally {
    savingCode.value = false
  }
}

async function copyShareLink() {
  if (!shareUrl.value || !import.meta.client) return
  try {
    await navigator.clipboard?.writeText(shareUrl.value)
    setCopied()
  } catch {
    codeError.value = 'Could not copy link.'
  }
}

async function shareReferral() {
  if (!shareUrl.value || !import.meta.client) return
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Join Men of Hunger', text: shareMessage.value, url: shareUrl.value })
    } catch { /* user cancelled */ }
    return
  }
  try {
    await navigator.clipboard?.writeText(`${shareMessage.value}\n\n${shareUrl.value}`)
    setCopied()
  } catch {
    codeError.value = 'Could not share.'
  }
}

function setCopied() {
  copied.value = true
  if (copiedTimer) clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => { copied.value = false; copiedTimer = null }, 1800)
}

// ─── Formatting ───────────────────────────────────────────────────────────────

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toUserRowUser(recruit: Recruit): FollowListUser & { isBot?: boolean } {
  return {
    ...recruit,
    relationship: recruit.relationship ?? {
      viewerFollowsUser: false,
      userFollowsViewer: false,
      viewerPostNotificationsEnabled: false,
    },
  }
}

function recruitTier(r: Recruit): 0 | 1 | 2 {
  if (r.premium || r.premiumPlus) return 0
  if (r.verifiedStatus !== 'none') return 1
  return 2
}

const RECRUIT_GROUP_LABELS: Record<0 | 1 | 2, string> = {
  0: 'Premium',
  1: 'Verified',
  2: 'Joined',
}

type RecruitGroup = { tier: 0 | 1 | 2; label: string; recruits: Recruit[] }

const groupedRecruits = computed((): RecruitGroup[] => {
  const buckets = new Map<0 | 1 | 2, Recruit[]>()
  for (const r of recruits.value) {
    if (!r.username) continue
    const tier = recruitTier(r)
    const bucket = buckets.get(tier)
    if (bucket) bucket.push(r)
    else buckets.set(tier, [r])
  }
  return ([0, 1, 2] as const)
    .filter((t) => buckets.has(t))
    .map((t) => ({ tier: t, label: RECRUIT_GROUP_LABELS[t], recruits: buckets.get(t)! }))
})

const recruitStats = computed(() => {
  const all = groupedRecruits.value.flatMap((g) => g.recruits)
  return {
    total: all.length,
    verified: all.filter((r) => r.verifiedStatus !== 'none').length,
    premium: all.filter((r) => r.premium || r.premiumPlus).length,
  }
})

// ─── Realtime ────────────────────────────────────────────────────────────────

const referralCb: ReferralCallback = {
  onRecruitUpdated({ recruit }) {
    const idx = recruits.value.findIndex((r) => r.id === recruit.id)
    if (idx >= 0) {
      recruits.value[idx] = recruit
    } else {
      recruits.value.unshift(recruit)
    }
    if (affiliate.value?.isAffiliate) {
      void apiFetchData<AffiliateSummary>('/billing/affiliate', { method: 'GET' }).then((data) => {
        if (data.isAffiliate) affiliate.value = data
      }).catch(() => undefined)
    }
  },
}

usePresenceCallback('Referral', referralCb)
onMounted(() => {
  void load()
})

onActivated(() => {
  void load()
})

onBeforeUnmount(() => {
  if (copiedTimer) clearTimeout(copiedTimer)
})
const initialLoading = useInitialLoading(loading, false, error)
  return {
    startEditCode,
    cancelEditCode,
    onEditKeydown,
    saveCode,
    copyShareLink,
    shareReferral,
    formatCents,
    toUserRowUser,
    loading,
    error,
    recruits,
    affiliate,
    codeInput,
    savingCode,
    codeError,
    editingCode,
    copied,
    claimCodeInputRef,
    canInvite,
    referralCode,
    monthsEarned,
    reward,
    codeFontSize,
    pendingProgressPct,
    groupedRecruits,
    recruitStats,
    initialLoading,
  }
}
