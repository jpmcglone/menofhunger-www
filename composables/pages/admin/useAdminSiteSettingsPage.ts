import { getApiErrorMessage } from '~/utils/api-error'
import type {
  AdminEmailSampleSendResult,
  AdminEmailSampleType,
  AutoVerifyApplyDto,
  AutoVerifyPreviewDto,
  SiteConfigAutoVerifyRecruiterDto,
  SiteConfigDto,
} from '~/types/api'

export function useAdminSiteSettingsPage() {
usePageSeo({
  title: 'Site settings',
  description: 'Admin site settings.',
  canonicalPath: '/admin/site-settings',
  noindex: true,
})


const { apiFetchData } = useApiClient()

const siteCfg = ref<SiteConfigDto | null>(null)
const siteSaving = ref(false)
const siteSaved = ref(false)
const siteError = ref<string | null>(null)
const verifiedPostsPerWindow = ref<number>(5)
const verifiedWindowMinutes = ref<number>(5)
const premiumPostsPerWindow = ref<number>(5)
const premiumWindowMinutes = ref<number>(5)

const autoVerifyNewUsers = ref(false)
const autoVerifyReferralCode = ref('')
const autoVerifyRecruiter = ref<SiteConfigAutoVerifyRecruiterDto | null>(null)
const autoVerifyBusy = ref(false)

const previewOpen = ref(false)
const preview = ref<AutoVerifyPreviewDto | null>(null)
const previewError = ref<string | null>(null)
const applyResult = ref<AutoVerifyApplyDto | null>(null)

const { user } = useAuth()
const viewerHasVerifiedEmail = computed(() => Boolean(user.value?.email && user.value?.emailVerifiedAt))
const toast = useAppToast()
const emailSampleSending = ref<AdminEmailSampleType | null>(null)

function applyCfg(cfg: SiteConfigDto) {
  siteCfg.value = cfg
  verifiedPostsPerWindow.value = cfg.verifiedPostsPerWindow ?? 5
  verifiedWindowMinutes.value = Math.max(1, Math.round((cfg.verifiedWindowSeconds ?? 300) / 60))
  premiumPostsPerWindow.value = cfg.premiumPostsPerWindow ?? 5
  premiumWindowMinutes.value = Math.max(1, Math.round((cfg.premiumWindowSeconds ?? 300) / 60))
  autoVerifyNewUsers.value = Boolean(cfg.autoVerifyNewUsers)
  autoVerifyRecruiter.value = cfg.autoVerifyRecruiter ?? null
  autoVerifyReferralCode.value = cfg.autoVerifyRecruiter?.referralCode ?? ''
}

function formatJoined(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}

async function sendEmailSample(type: AdminEmailSampleType) {
  const ok = confirm(`Send sample "${type}" email to yourself?`)
  if (!ok) return
  emailSampleSending.value = type
  try {
    const res = await apiFetchData<AdminEmailSampleSendResult>('/admin/email-samples/send', {
      method: 'POST',
      body: { type },
    })
    if (res?.sent) {
      toast.push({ title: 'Sample email sent', tone: 'success', durationMs: 1800 })
    } else {
      toast.push({ title: res?.reason || 'Sample email was not sent.', tone: 'error', durationMs: 2600 })
    }
  } catch (e: unknown) {
    toast.pushError(e, 'Failed to send sample email.')
  } finally {
    emailSampleSending.value = null
  }
}

async function loadSiteConfig() {
  if (siteCfg.value) return
  siteError.value = null
  try {
    const cfg = await apiFetchData<SiteConfigDto>('/admin/site-config', { method: 'GET' })
    applyCfg(cfg)
  } catch (e: unknown) {
    siteError.value = getApiErrorMessage(e) || 'Failed to load site settings.'
  }
}

watchEffect(() => {
  if (!import.meta.client) return
  void loadSiteConfig()
})

async function patchSiteConfig(body: Record<string, unknown>) {
  const updated = await apiFetchData<SiteConfigDto>('/admin/site-config', {
    method: 'PATCH',
    body,
  })
  applyCfg(updated)
  return updated
}

async function saveRateLimits() {
  siteSaved.value = false
  siteError.value = null
  siteSaving.value = true
  try {
    await patchSiteConfig({
      verifiedPostsPerWindow: verifiedPostsPerWindow.value,
      verifiedWindowSeconds: Math.max(10, Math.round(verifiedWindowMinutes.value * 60)),
      premiumPostsPerWindow: premiumPostsPerWindow.value,
      premiumWindowSeconds: Math.max(10, Math.round(premiumWindowMinutes.value * 60)),
    })
    siteSaved.value = true
  } catch (e: unknown) {
    siteError.value = getApiErrorMessage(e) || 'Failed to save site settings.'
  } finally {
    siteSaving.value = false
  }
}

async function saveAutoVerifySettings(opts?: { openPreview?: boolean }) {
  siteError.value = null
  siteSaving.value = true
  try {
    const code = autoVerifyReferralCode.value.trim()
    await patchSiteConfig({
      autoVerifyNewUsers: autoVerifyNewUsers.value,
      autoVerifyReferralCode: code || null,
    })
    toast.push({ title: 'Auto-verify settings saved', tone: 'success', durationMs: 1600 })
    if (opts?.openPreview && autoVerifyNewUsers.value && code) {
      await openAutoVerifyPreview()
    }
  } catch (e: unknown) {
    siteError.value = getApiErrorMessage(e) || 'Failed to save auto-verify settings.'
    toast.pushError(e, 'Failed to save auto-verify settings.')
  } finally {
    siteSaving.value = false
  }
}

async function onToggleAutoVerify(next: boolean | undefined) {
  const enabled = Boolean(next)
  autoVerifyNewUsers.value = enabled
  await saveAutoVerifySettings({ openPreview: enabled && Boolean(autoVerifyReferralCode.value.trim()) })
}

async function openAutoVerifyPreview() {
  const code = autoVerifyReferralCode.value.trim()
  if (!code) {
    toast.push({ title: 'Enter a referral code first', tone: 'error', durationMs: 2000 })
    return
  }
  previewOpen.value = true
  previewError.value = null
  preview.value = null
  applyResult.value = null
  autoVerifyBusy.value = true
  try {
    // Persist the code first so the toggle + filter stay in sync with the preview.
    await patchSiteConfig({
      autoVerifyNewUsers: true,
      autoVerifyReferralCode: code,
    })
    autoVerifyNewUsers.value = true
    preview.value = await apiFetchData<AutoVerifyPreviewDto>('/admin/site-config/auto-verify/preview', {
      method: 'GET',
      query: { referralCode: code },
    })
  } catch (e: unknown) {
    previewError.value = getApiErrorMessage(e) || 'Failed to load preview.'
  } finally {
    autoVerifyBusy.value = false
  }
}

async function confirmAutoVerifyApply() {
  if (!preview.value?.recruiter.id) return
  autoVerifyBusy.value = true
  previewError.value = null
  try {
    applyResult.value = await apiFetchData<AutoVerifyApplyDto>('/admin/site-config/auto-verify/apply', {
      method: 'POST',
      body: { recruiterId: preview.value.recruiter.id },
    })
    // Refresh the preview list after each batch.
    const code = preview.value.recruiter.referralCode || autoVerifyReferralCode.value.trim()
    if (code) {
      preview.value = await apiFetchData<AutoVerifyPreviewDto>('/admin/site-config/auto-verify/preview', {
        method: 'GET',
        query: { referralCode: code },
      })
    }
    toast.push({
      title: `Verified ${applyResult.value.verifiedCount} user${applyResult.value.verifiedCount === 1 ? '' : 's'}`,
      tone: 'success',
      durationMs: 2000,
    })
  } catch (e: unknown) {
    previewError.value = getApiErrorMessage(e) || 'Failed to verify users.'
    toast.pushError(e, 'Failed to verify users.')
  } finally {
    autoVerifyBusy.value = false
  }
}

function onPreviewHide() {
  preview.value = null
  previewError.value = null
  applyResult.value = null
}
  return {
    formatJoined,
    sendEmailSample,
    saveRateLimits,
    saveAutoVerifySettings,
    onToggleAutoVerify,
    openAutoVerifyPreview,
    confirmAutoVerifyApply,
    onPreviewHide,
    siteSaving,
    siteSaved,
    siteError,
    verifiedPostsPerWindow,
    verifiedWindowMinutes,
    premiumPostsPerWindow,
    premiumWindowMinutes,
    autoVerifyNewUsers,
    autoVerifyReferralCode,
    autoVerifyRecruiter,
    autoVerifyBusy,
    previewOpen,
    preview,
    previewError,
    applyResult,
    viewerHasVerifiedEmail,
    emailSampleSending,
    user,
  }
}
