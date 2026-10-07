import { getApiErrorMessage } from '~/utils/api-error'
import { formatDateTime } from '~/utils/time-format'
import { APP_FEATURE_TOGGLE_OPTIONS, type AppFeatureToggle } from '~/config/app-feature-toggles'
import { articleVisibilityBarClass, articleVisibilityHoverClass } from '~/utils/article-visibility'
import { avatarRoundClass as getAvatarRoundClass } from '~/utils/avatar-rounding'
import type {
  AdminAdjustCoinsResult,
  AdminReferralInfo,
  AdminUserDetailData,
  AdminUserSensitiveFields,
  AdminUserRecentArticle,
  AdminUserRecentPost,
  AdminUserRecentSearch,
} from '~/types/api'

export function useAdminUserDetailPage() {

const route = useRoute()
const username = computed(() => String(route.params.username ?? '').trim())
const encodedUsername = computed(() => encodeURIComponent(username.value))
const avatarWrapperRef = ref<HTMLElement | null>(null)

usePageSeo({
  title: 'Admin user 360',
  description: 'Admin user overview and management.',
  canonicalPath: computed(() => `/admin/users/${encodedUsername.value}`),
  noindex: true,
})

const { apiFetchData } = useApiClient()
const viewer = useImageLightbox()
const { openFromEvent } = viewer

const loading = ref(true)
const loadError = ref<string | null>(null)
const user = ref<AdminUserDetailData | null>(null)
const avatarRoundClass = computed(() => getAvatarRoundClass(Boolean(user.value?.isOrganization)))

const revealLoading = ref(false)
const sensitiveRevealed = ref(false)
const revealedSensitive = ref<AdminUserSensitiveFields | null>(null)

const editPhone = ref('')
const editUsername = ref('')
const editName = ref('')
const editBio = ref('')
const editVerifiedStatus = ref<'none' | 'identity' | 'manual'>('none')
const editIsOrganization = ref(false)
const editFeatureToggles = ref<AppFeatureToggle[]>([])
const editSaving = ref(false)
const editError = ref<string | null>(null)
const coinsAdjustAmount = ref<number | null>(null)
const coinsAdjustReason = ref('')
const coinsAdjustSaving = ref(false)
const coinsAdjustError = ref<string | null>(null)

const actionSaving = ref(false)
const banSaving = ref(false)

const recentPosts = ref<AdminUserRecentPost[]>([])
const recentArticles = ref<AdminUserRecentArticle[]>([])
const recentSearches = ref<AdminUserRecentSearch[]>([])
const referralInfo = ref<AdminReferralInfo | null>(null)
const isAffiliate = ref(false)
const affiliateSaving = ref(false)
const affiliateError = ref<string | null>(null)
const userIsPremium = computed(() => Boolean(user.value?.premium || user.value?.premiumPlus))

const verifiedStatusOptions: Array<{ label: string; value: 'none' | 'identity' | 'manual' }> = [
  { label: 'None', value: 'none' },
  { label: 'Identity', value: 'identity' },
  { label: 'Manual', value: 'manual' },
]
const selectedFeatureToggleOptions = computed(() =>
  APP_FEATURE_TOGGLE_OPTIONS.filter((opt) => editFeatureToggles.value.includes(opt.value)),
)
const hideBannerThumb = computed(() => viewer.visible.value && viewer.kind.value === 'banner')
const hideAvatarThumb = computed(() => viewer.visible.value && viewer.kind.value === 'avatar')
const hideAvatarDuringBanner = computed(() => viewer.visible.value && viewer.kind.value === 'banner')

const displayPhone = computed(() => (sensitiveRevealed.value ? (revealedSensitive.value?.phone ?? user.value?.phone ?? '') : (user.value?.sensitive.phone ?? '')))
const displayEmail = computed(() => (sensitiveRevealed.value ? (revealedSensitive.value?.email ?? user.value?.email ?? null) : (user.value?.sensitive.email ?? null)))
const displayBirthdate = computed(() =>
  sensitiveRevealed.value ? (revealedSensitive.value?.birthdate ?? user.value?.birthdate ?? null) : (user.value?.sensitive.birthdate ?? null),
)

function onOpenProfileImage(payload: {
  event: MouseEvent
  url: string
  title: string
  kind: 'avatar' | 'banner'
  isOrganization?: boolean
  originRect?: { left: number; top: number; width: number; height: number }
}) {
  void openFromEvent(payload.event, payload.url, payload.title, payload.kind, {
    ...(payload.kind === 'avatar' && { avatarBorderRadius: payload.isOrganization ? '16%' : '9999px', avatarVideo: user.value?.avatarVideo }),
    originRect: payload.originRect,
  })
}

function onAvatarClick(event: MouseEvent) {
  const url = user.value?.avatarUrl ?? null
  if (!url) return
  const rect = avatarWrapperRef.value?.getBoundingClientRect()
  onOpenProfileImage({
    event,
    url,
    title: 'Avatar',
    kind: 'avatar',
    isOrganization: Boolean(user.value?.isOrganization),
    originRect: rect
      ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
      : undefined,
  })
}

function mergeUserUpdate(updated: AdminUserDetailData): AdminUserDetailData {
  const current = user.value
  return { ...updated, sensitive: current?.sensitive ?? updated.sensitive, canRevealSensitive: current?.canRevealSensitive ?? updated.canRevealSensitive }
}

function removeFeatureToggle(value: AppFeatureToggle) {
  editFeatureToggles.value = editFeatureToggles.value.filter((entry) => entry !== value)
}

const compactArticleAccentBarClass = articleVisibilityBarClass
const compactArticleHoverClass = articleVisibilityHoverClass

function resetEditForm() {
  const current = user.value
  if (!current) return
  editPhone.value = current.phone ?? ''
  editUsername.value = current.username ?? ''
  editName.value = current.name ?? ''
  editBio.value = current.bio ?? ''
  editVerifiedStatus.value = current.verifiedStatus
  editIsOrganization.value = Boolean(current.isOrganization)
  editFeatureToggles.value = Array.isArray(current.featureToggles)
    ? current.featureToggles
        .map((v) => String(v ?? '').trim())
        .filter((v): v is AppFeatureToggle => APP_FEATURE_TOGGLE_OPTIONS.some((opt) => opt.value === v))
    : []
}

async function loadPage() {
  if (!username.value) {
    loadError.value = 'Username is required.'
    loading.value = false
    return
  }
  loading.value = true
  loadError.value = null
  try {
    const base = `/admin/users/by-username/${encodedUsername.value}`
    const [detail, posts, articles, searches] = await Promise.all([
      apiFetchData<AdminUserDetailData>(base),
      apiFetchData<AdminUserRecentPost[]>(`${base}/recent/posts`, { query: { limit: 5 } }),
      apiFetchData<AdminUserRecentArticle[]>(`${base}/recent/articles`, { query: { limit: 5 } }),
      apiFetchData<AdminUserRecentSearch[]>(`${base}/recent/searches`, { query: { limit: 5 } }),
    ])
    user.value = detail
    recentPosts.value = posts
    recentArticles.value = articles
    recentSearches.value = searches
    sensitiveRevealed.value = false
    revealedSensitive.value = null
    resetEditForm()
    // Load referral + affiliate info separately (best-effort, non-blocking).
    try {
      const [referral, affiliateRes] = await Promise.all([
        apiFetchData<AdminReferralInfo>(`/admin/users/${encodeURIComponent(detail.id)}/referral`),
        apiFetchData<{ userId: string; isAffiliate: boolean; affiliateAt: string | null }>(`/admin/users/${encodeURIComponent(detail.id)}/affiliate`).catch(() => ({ userId: detail.id, isAffiliate: false, affiliateAt: null })),
      ])
      referralInfo.value = referral
      isAffiliate.value = affiliateRes.isAffiliate
    } catch {
      referralInfo.value = null
    }
  } catch (e: unknown) {
    loadError.value = getApiErrorMessage(e) || 'Failed to load user.'
  } finally {
    loading.value = false
  }
}

async function toggleAffiliate() {
  const userId = user.value?.id
  if (!userId || affiliateSaving.value) return
  affiliateSaving.value = true
  affiliateError.value = null
  const newValue = !isAffiliate.value
  try {
    await apiFetchData(`/admin/users/${encodeURIComponent(userId)}/affiliate`, {
      method: 'PATCH',
      body: { enabled: newValue },
    })
    isAffiliate.value = newValue
  } catch (e) {
    affiliateError.value = getApiErrorMessage(e) || 'Failed to update affiliate status.'
  } finally {
    affiliateSaving.value = false
  }
}

async function revealSensitive() {
  if (!username.value || revealLoading.value) return
  revealLoading.value = true
  try {
    revealedSensitive.value = await apiFetchData<AdminUserSensitiveFields>(
      `/admin/users/by-username/${encodedUsername.value}/reveal-sensitive`,
      { method: 'POST' },
    )
    sensitiveRevealed.value = true
  } catch (e: unknown) {
    loadError.value = getApiErrorMessage(e) || 'Failed to reveal sensitive fields.'
  } finally {
    revealLoading.value = false
  }
}

async function saveEdit() {
  const current = user.value
  if (!current || editSaving.value) return
  editSaving.value = true
  editError.value = null
  try {
    const updated = await apiFetchData<AdminUserDetailData>(`/admin/users/${encodeURIComponent(current.id)}/profile`, {
      method: 'PATCH',
      body: {
        phone: editPhone.value.trim(),
        username: editUsername.value.trim() ? editUsername.value.trim() : null,
        name: editName.value.trim() ? editName.value.trim() : null,
        bio: editBio.value.trim() ? editBio.value.trim() : null,
        verifiedStatus: editVerifiedStatus.value,
        isOrganization: editIsOrganization.value,
        featureToggles: editFeatureToggles.value,
      },
    })
    user.value = mergeUserUpdate(updated)
    if (sensitiveRevealed.value) {
      revealedSensitive.value = { phone: updated.phone, email: updated.email, birthdate: updated.birthdate }
    }
  } catch (e: unknown) {
    editError.value = getApiErrorMessage(e) || 'Failed to save user.'
  } finally {
    editSaving.value = false
  }
}

async function adjustCoins(sign: 1 | -1) {
  const current = user.value
  const rawAmount = Math.floor(Number(coinsAdjustAmount.value || 0))
  if (!current || coinsAdjustSaving.value || rawAmount < 1) return
  coinsAdjustSaving.value = true
  coinsAdjustError.value = null
  try {
    const result = await apiFetchData<AdminAdjustCoinsResult>(`/admin/users/${encodeURIComponent(current.id)}/coins/adjust`, {
      method: 'POST',
      body: {
        delta: sign * rawAmount,
        reason: coinsAdjustReason.value.trim() || null,
      },
    })
    user.value = { ...current, coins: result.targetBalanceAfter }
    coinsAdjustAmount.value = null
    coinsAdjustReason.value = ''
  } catch (e: unknown) {
    coinsAdjustError.value = getApiErrorMessage(e) || 'Failed to adjust coins.'
  } finally {
    coinsAdjustSaving.value = false
  }
}

async function unverifyEmail() {
  const current = user.value
  if (!current || !current.email || !current.emailVerifiedAt || actionSaving.value) return
  const ok = window.confirm(
    `Unverify ${current.email}?\n\nThis clears verification and invalidates existing verification links.`,
  )
  if (!ok) return
  actionSaving.value = true
  try {
    const updated = await apiFetchData<AdminUserDetailData>(`/admin/users/${encodeURIComponent(current.id)}/email/unverify`, {
      method: 'POST',
    })
    user.value = mergeUserUpdate(updated)
  } catch (e: unknown) {
    loadError.value = getApiErrorMessage(e) || 'Failed to unverify email.'
  } finally {
    actionSaving.value = false
  }
}

async function banUser() {
  const current = user.value
  if (!current || banSaving.value) return
  const reason = window.prompt('Ban reason (optional):') ?? ''
  banSaving.value = true
  try {
    const updated = await apiFetchData<AdminUserDetailData>(`/admin/users/${encodeURIComponent(current.id)}/ban`, {
      method: 'POST',
      body: { reason: reason.trim() || undefined },
    })
    user.value = mergeUserUpdate(updated)
  } catch (e: unknown) {
    loadError.value = getApiErrorMessage(e) || 'Failed to ban user.'
  } finally {
    banSaving.value = false
  }
}

async function unbanUser() {
  const current = user.value
  if (!current || banSaving.value) return
  const ok = window.confirm(`Unban ${current.username ? `@${current.username}` : 'this user'}?`)
  if (!ok) return
  banSaving.value = true
  try {
    const updated = await apiFetchData<AdminUserDetailData>(`/admin/users/${encodeURIComponent(current.id)}/unban`, {
      method: 'POST',
    })
    user.value = mergeUserUpdate(updated)
  } catch (e: unknown) {
    loadError.value = getApiErrorMessage(e) || 'Failed to unban user.'
  } finally {
    banSaving.value = false
  }
}

watch(
  () => username.value,
  () => {
    void loadPage()
  },
  { immediate: true },
)
  return {
    onOpenProfileImage,
    onAvatarClick,
    removeFeatureToggle,
    toggleAffiliate,
    revealSensitive,
    saveEdit,
    adjustCoins,
    unverifyEmail,
    banUser,
    unbanUser,
    username,
    encodedUsername,
    avatarWrapperRef,
    loading,
    loadError,
    user,
    verifiedStatusOptions,
    avatarRoundClass,
    revealLoading,
    sensitiveRevealed,
    editPhone,
    editUsername,
    editName,
    editBio,
    editVerifiedStatus,
    editIsOrganization,
    editFeatureToggles,
    editSaving,
    editError,
    coinsAdjustAmount,
    coinsAdjustReason,
    coinsAdjustSaving,
    coinsAdjustError,
    actionSaving,
    banSaving,
    recentPosts,
    recentArticles,
    recentSearches,
    referralInfo,
    isAffiliate,
    affiliateSaving,
    affiliateError,
    userIsPremium,
    selectedFeatureToggleOptions,
    hideBannerThumb,
    hideAvatarThumb,
    hideAvatarDuringBanner,
    displayPhone,
    displayEmail,
    displayBirthdate,
    compactArticleAccentBarClass,
    compactArticleHoverClass,
  }
}
