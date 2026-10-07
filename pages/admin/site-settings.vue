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
          <AppUserAvatar :user="u" size-class="h-8 w-8" />
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
import { useAdminSiteSettingsPage } from '~/composables/pages/admin/useAdminSiteSettingsPage'

definePageMeta({
  layout: 'app',
  title: 'Site settings',
  hideTopBar: true,
  middleware: 'admin',
})

const {
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
} = useAdminSiteSettingsPage()
</script>
