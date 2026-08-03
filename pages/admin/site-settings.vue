<template>
  <AppPageContent bottom="standard">
    <AppPageHeader sticky class="px-4 pt-4 pb-3" title="Site settings" description="Admin-only configuration for the site.">
      <template #leading>
        <div class="md:hidden">
          <Button as="NuxtLink" to="/admin" text severity="secondary" aria-label="Back">
            <template #icon><Icon name="tabler:chevron-left" aria-hidden="true" /></template>
          </Button>
        </div>
      </template>
    </AppPageHeader>
  <div class="px-4 py-4 space-y-6">

    <div class="space-y-2">
      <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Auto-verify new signups</div>
      <div class="text-sm text-gray-600 dark:text-gray-300">
        When enabled, new signups (and users who apply a referral code later) are verified automatically.
        Optionally scope to a single referral code.
      </div>
    </div>

    <div class="rounded-xl border moh-border p-3 space-y-3">
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Enable auto-verify</div>
          <div class="text-xs text-gray-500 dark:text-gray-400">
            Blank referral code = all new signups. With a code = only that recruiter’s recruits.
          </div>
        </div>
        <Checkbox
          :model-value="autoVerifyNewUsers"
          binary
          :disabled="siteSaving || autoVerifyBusy"
          @update:model-value="onToggleAutoVerify"
        />
      </div>

      <div class="space-y-2">
        <label class="text-xs font-medium text-gray-700 dark:text-gray-200">Referral code (optional)</label>
        <div class="flex flex-wrap items-center gap-2">
          <InputText
            v-model="autoVerifyReferralCode"
            class="w-full max-w-xs"
            size="small"
            placeholder="e.g. NXR"
            :disabled="siteSaving || autoVerifyBusy"
            @keydown.enter.prevent="() => saveAutoVerifySettings()"
          />
          <Button
            label="Save"
            severity="secondary"
            size="small"
            :loading="siteSaving"
            :disabled="siteSaving || autoVerifyBusy"
            @click="() => saveAutoVerifySettings()"
          />
        </div>
        <div v-if="autoVerifyRecruiter" class="text-xs text-gray-500 dark:text-gray-400">
          Scoped to
          <span class="font-medium text-gray-700 dark:text-gray-200">
            {{ autoVerifyRecruiter.referralCode || '—' }}
          </span>
          <template v-if="autoVerifyRecruiter.username">
            (@{{ autoVerifyRecruiter.username }})
          </template>
        </div>
        <div v-else-if="autoVerifyNewUsers" class="text-xs text-gray-500 dark:text-gray-400">
          All new signups will be auto-verified (no backfill for existing users).
        </div>
      </div>

      <div v-if="autoVerifyNewUsers && autoVerifyReferralCode.trim()" class="pt-1">
        <Button
          label="Preview & verify matching users"
          severity="secondary"
          size="small"
          :loading="autoVerifyBusy"
          :disabled="autoVerifyBusy || siteSaving"
          @click="openAutoVerifyPreview"
        />
      </div>
    </div>

    <div class="space-y-2">
      <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Post rate limits</div>
      <div class="text-sm text-gray-600 dark:text-gray-300">
        Configure how frequently users can post.
      </div>
    </div>

    <div v-if="siteError" class="text-sm text-red-700 dark:text-red-300">
      {{ siteError }}
    </div>

    <div v-else class="space-y-3">
      <!-- Compact, vertical stacks (mobile-friendly) -->
      <div class="rounded-xl border moh-border p-3 space-y-3">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Verified</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              Verified (non-premium). Only-me excluded.
            </div>
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between gap-3">
            <label class="text-xs font-medium text-gray-700 dark:text-gray-200">Posts / window</label>
            <InputNumber
              v-model="verifiedPostsPerWindow"
              :min="1"
              :max="100"
              size="small"
              :inputStyle="{ width: '5.25rem' }"
            />
          </div>
          <div class="flex items-center justify-between gap-3">
            <label class="text-xs font-medium text-gray-700 dark:text-gray-200">Window (minutes)</label>
            <InputNumber
              v-model="verifiedWindowMinutes"
              :min="1"
              :max="1440"
              size="small"
              :inputStyle="{ width: '5.25rem' }"
            />
          </div>
        </div>
      </div>

      <div class="rounded-xl border moh-border p-3 space-y-3">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Premium</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              Premium + Premium+. Only-me excluded.
            </div>
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between gap-3">
            <label class="text-xs font-medium text-gray-700 dark:text-gray-200">Posts / window</label>
            <InputNumber
              v-model="premiumPostsPerWindow"
              :min="1"
              :max="100"
              size="small"
              :inputStyle="{ width: '5.25rem' }"
            />
          </div>
          <div class="flex items-center justify-between gap-3">
            <label class="text-xs font-medium text-gray-700 dark:text-gray-200">Window (minutes)</label>
            <InputNumber
              v-model="premiumWindowMinutes"
              :min="1"
              :max="1440"
              size="small"
              :inputStyle="{ width: '5.25rem' }"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="pt-4" />

    <div class="space-y-2">
      <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Email samples</div>
      <div class="text-sm text-gray-600 dark:text-gray-300">
        Send yourself sample emails (requires a verified email on your admin account).
      </div>
    </div>

    <div class="rounded-xl border moh-border p-3 space-y-3">
      <div v-if="!viewerHasVerifiedEmail" class="text-sm text-gray-600 dark:text-gray-300">
        Your email isn’t verified yet. Verify it first to send samples.
      </div>

      <div class="flex flex-wrap gap-2">
        <Button
          label="Weekly digest"
          severity="secondary"
          :loading="emailSampleSending === 'weekly_digest'"
          :disabled="!viewerHasVerifiedEmail || Boolean(emailSampleSending)"
          @click="sendEmailSample('weekly_digest')"
        />
        <Button
          label="Unread notifications"
          severity="secondary"
          :loading="emailSampleSending === 'new_notifications'"
          :disabled="!viewerHasVerifiedEmail || Boolean(emailSampleSending)"
          @click="sendEmailSample('new_notifications')"
        />
        <Button
          label="Instant high-signal"
          severity="secondary"
          :loading="emailSampleSending === 'instant_high_signal'"
          :disabled="!viewerHasVerifiedEmail || Boolean(emailSampleSending)"
          @click="sendEmailSample('instant_high_signal')"
        />
        <Button
          label="Streak reminder"
          severity="secondary"
          :loading="emailSampleSending === 'streak_reminder'"
          :disabled="!viewerHasVerifiedEmail || Boolean(emailSampleSending)"
          @click="sendEmailSample('streak_reminder')"
        />
      </div>
      <div class="text-xs text-gray-500 dark:text-gray-400">
        Tip: check your spam/promotions folders if you don’t see it.
      </div>
    </div>

    <div class="flex items-center gap-3">
      <Button
        label="Save rate limits"
        severity="secondary"
        :loading="siteSaving"
        :disabled="siteSaving"
        @click="saveRateLimits"
      >
        <template #icon>
          <Icon name="tabler:check" aria-hidden="true" />
        </template>
      </Button>
      <div v-if="siteSaved" class="text-sm text-green-700 dark:text-green-300">Saved.</div>
    </div>

    <div class="pt-2 border-t moh-border" />

  </div>

  <Dialog
    v-model:visible="previewOpen"
    modal
    header="Auto-verify matching users"
    :style="{ width: 'min(36rem, 96vw)' }"
    :closable="!autoVerifyBusy"
    @hide="onPreviewHide"
  >
    <div v-if="previewError" class="text-sm text-red-700 dark:text-red-300">
      {{ previewError }}
    </div>
    <div v-else-if="preview" class="space-y-3">
      <p class="text-sm text-gray-600 dark:text-gray-300">
        <span class="font-semibold text-gray-900 dark:text-gray-50">{{ preview.total }}</span>
        unverified user{{ preview.total === 1 ? '' : 's' }} recruited by
        <span class="font-semibold text-gray-900 dark:text-gray-50">
          {{ preview.recruiter.referralCode || '—' }}
        </span>
        will be verified.
        <template v-if="preview.total > preview.users.length">
          Showing the first {{ preview.users.length }}.
        </template>
      </p>

      <div v-if="applyResult" class="rounded-lg border moh-border bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950/40 dark:text-green-200">
        Verified {{ applyResult.verifiedCount }}.
        <template v-if="applyResult.remaining > 0">
          {{ applyResult.remaining }} remaining — run again to continue.
        </template>
        <template v-else>
          All matching users are verified.
        </template>
      </div>

      <ul class="max-h-72 space-y-2 overflow-y-auto">
        <li
          v-for="u in preview.users"
          :key="u.id"
          class="flex items-center gap-3 rounded-lg border moh-border px-3 py-2"
        >
          <img
            v-if="u.avatarUrl"
            :src="u.avatarUrl"
            alt=""
            class="h-8 w-8 rounded-full object-cover moh-img-outline"
          >
          <div
            v-else
            class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600 dark:bg-zinc-700 dark:text-gray-200"
          >
            {{ (u.username || u.name || '?').slice(0, 1).toUpperCase() }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-medium text-gray-900 dark:text-gray-50">
              {{ u.name || u.username || 'Untitled' }}
            </div>
            <div class="truncate text-xs text-gray-500 dark:text-gray-400">
              <template v-if="u.username">@{{ u.username }} · </template>
              joined {{ formatJoined(u.createdAt) }}
            </div>
          </div>
        </li>
      </ul>
    </div>
    <div v-else class="text-sm text-gray-500 dark:text-gray-400">
      Loading preview…
    </div>

    <template #footer>
      <div class="flex w-full items-center justify-end gap-2">
        <Button
          label="Cancel"
          severity="secondary"
          text
          :disabled="autoVerifyBusy"
          @click="previewOpen = false"
        />
        <Button
          v-if="preview && preview.total > 0 && (!applyResult || applyResult.remaining > 0)"
          :label="applyResult ? 'Verify next batch' : 'Confirm & verify'"
          :loading="autoVerifyBusy"
          :disabled="autoVerifyBusy"
          @click="confirmAutoVerifyApply"
        />
      </div>
    </template>
  </Dialog>
  </AppPageContent>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Site settings',
  hideTopBar: true,
  middleware: 'admin',
  ssr: false,
})

usePageSeo({
  title: 'Site settings',
  description: 'Admin site settings.',
  canonicalPath: '/admin/site-settings',
  noindex: true,
})

import { getApiErrorMessage } from '~/utils/api-error'
import type {
  AdminEmailSampleSendResult,
  AdminEmailSampleType,
  AutoVerifyApplyDto,
  AutoVerifyPreviewDto,
  SiteConfigAutoVerifyRecruiterDto,
  SiteConfigDto,
} from '~/types/api'

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
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
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
</script>
