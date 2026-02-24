<template>
  <AppPageContent bottom="standard">
  <div class="px-4 py-4 space-y-6">
    <AppPageHeader title="Site settings" icon="tabler:settings" description="Admin-only configuration for the site.">
      <template #leading>
        <Button
          class="md:hidden"
          text
          severity="secondary"
          aria-label="Back"
          @click="navigateTo('/admin')"
        >
          <template #icon>
            <Icon name="tabler:chevron-left" aria-hidden="true" />
          </template>
        </Button>
      </template>
    </AppPageHeader>

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
          label="Daily digest"
          severity="secondary"
          :loading="emailSampleSending === 'daily_digest'"
          :disabled="!viewerHasVerifiedEmail || Boolean(emailSampleSending)"
          @click="sendEmailSample('daily_digest')"
        />
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
        label="Save"
        severity="secondary"
        :loading="siteSaving"
        :disabled="siteSaving"
        @click="saveSiteConfig"
      >
        <template #icon>
          <Icon name="tabler:check" aria-hidden="true" />
        </template>
      </Button>
      <div v-if="siteSaved" class="text-sm text-green-700 dark:text-green-300">Saved.</div>
    </div>

    <div class="pt-2 border-t moh-border" />

  </div>
  </AppPageContent>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Site settings',
  hideTopBar: true,
  middleware: 'admin',
})

usePageSeo({
  title: 'Site settings',
  description: 'Admin site settings.',
  canonicalPath: '/admin/site-settings',
  noindex: true,
})

type SiteConfig = {
  id: number
  postsPerWindow: number
  windowSeconds: number
  verifiedPostsPerWindow: number
  verifiedWindowSeconds: number
  premiumPostsPerWindow: number
  premiumWindowSeconds: number
}

const { apiFetchData } = useApiClient()
import { getApiErrorMessage } from '~/utils/api-error'
import type { AdminEmailSampleSendResult, AdminEmailSampleType } from '~/types/api'

const siteCfg = ref<SiteConfig | null>(null)
const siteSaving = ref(false)
const siteSaved = ref(false)
const siteError = ref<string | null>(null)
const verifiedPostsPerWindow = ref<number>(5)
const verifiedWindowMinutes = ref<number>(5)
const premiumPostsPerWindow = ref<number>(5)
const premiumWindowMinutes = ref<number>(5)

const { user } = useAuth()
const viewerHasVerifiedEmail = computed(() => Boolean(user.value?.email && user.value?.emailVerifiedAt))
const toast = useAppToast()
const emailSampleSending = ref<AdminEmailSampleType | null>(null)

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
    const cfg = await apiFetchData<SiteConfig>('/admin/site-config', { method: 'GET' })
    siteCfg.value = cfg
    verifiedPostsPerWindow.value = cfg.verifiedPostsPerWindow ?? 5
    verifiedWindowMinutes.value = Math.max(1, Math.round((cfg.verifiedWindowSeconds ?? 300) / 60))
    premiumPostsPerWindow.value = cfg.premiumPostsPerWindow ?? 5
    premiumWindowMinutes.value = Math.max(1, Math.round((cfg.premiumWindowSeconds ?? 300) / 60))
  } catch (e: unknown) {
    siteError.value = getApiErrorMessage(e) || 'Failed to load site settings.'
  }
}

watchEffect(() => {
  if (!import.meta.client) return
  void loadSiteConfig()
})

async function saveSiteConfig() {
  siteSaved.value = false
  siteError.value = null
  siteSaving.value = true
  try {
    const updated = await apiFetchData<SiteConfig>('/admin/site-config', {
      method: 'PATCH',
      body: {
        verifiedPostsPerWindow: verifiedPostsPerWindow.value,
        verifiedWindowSeconds: Math.max(10, Math.round(verifiedWindowMinutes.value * 60)),
        premiumPostsPerWindow: premiumPostsPerWindow.value,
        premiumWindowSeconds: Math.max(10, Math.round(premiumWindowMinutes.value * 60)),
      },
    })
    siteCfg.value = updated
    siteSaved.value = true
  } catch (e: unknown) {
    siteError.value = getApiErrorMessage(e) || 'Failed to save site settings.'
  } finally {
    siteSaving.value = false
  }
}
</script>

