<template>
  <div class="space-y-6">
    <AppUsernameField
      v-model="usernameInput"
      :status="usernameStatus"
      :helper-text="usernameHelperText"
      :disabled="saving"
      placeholder="your_handle"
    >
      <template #label>
        <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Username</label>
      </template>
    </AppUsernameField>

    <div class="flex items-center gap-3">
      <AppSaveButton :loading="saving" :disabled="!canSaveUsername" @click="save" />
      <div v-if="saved" class="text-sm text-green-700 dark:text-green-300">Saved.</div>
    </div>

    <div
      v-if="route.query.email_verified === '1'"
      class="rounded-lg border moh-border p-2 text-sm text-green-800 dark:text-green-200 moh-surface"
    >
      Email verified.
    </div>
    <div
      v-else-if="route.query.email_verified === '0'"
      class="rounded-lg border moh-border p-2 text-sm text-red-800 dark:text-red-200 moh-surface"
    >
      Email verification link is invalid or expired.
    </div>

    <AppFormField
      label="Email"
      optional
      :helper="emailHelperText ?? (emailSaved ? 'Saved.' : undefined)"
      :helper-tone="emailSaved ? 'success' : emailHelperText ? 'error' : 'default'"
    >
      <InputText
        v-model="emailInput"
        class="w-full"
        placeholder="you@example.com"
        autocomplete="email"
        :disabled="emailSaving"
      />
    </AppFormField>
    <div class="flex items-center gap-3">
      <AppSaveButton label="Save email" severity="secondary" :loading="emailSaving" :disabled="!emailDirty" @click="saveEmail" />
      <div v-if="emailResendSaved" class="text-sm text-green-700 dark:text-green-300">Verification email sent.</div>
    </div>

    <div v-if="authUser?.email" class="flex flex-wrap items-center gap-3 text-sm">
      <Tag
        :value="authUser.emailVerifiedAt ? 'Email verified' : 'Email unverified'"
        :severity="authUser.emailVerifiedAt ? 'success' : 'warning'"
        class="!text-xs"
      />
      <div v-if="!authUser.emailVerifiedAt" class="moh-text-muted">
        Please verify your email to receive the daily digest.
      </div>
      <Button
        v-if="!authUser.emailVerifiedAt && emailVerificationUiReady"
        :label="emailResendButtonLabel"
        size="small"
        severity="secondary"
        class="tabular-nums"
        :loading="emailResendSaving"
        :disabled="emailResendSaving || emailResendCooldownActive"
        @click="resendEmailVerification"
      />
      <div v-if="emailResendError" class="text-red-700 dark:text-red-300">{{ emailResendError }}</div>
    </div>

    <div class="space-y-3">
      <AppFormField
        label="ZIP code"
        optional
        helper="Your state will be shown on your profile."
      >
        <InputText
          v-model="locationQueryInput"
          class="w-full"
          placeholder="e.g. 24011"
          inputmode="numeric"
          maxlength="5"
          :disabled="profileDetailsSaving"
        />
      </AppFormField>

      <AppFormField
        label="Website"
        optional
        :helper="'Include full URL, e.g. https://example.com'"
      >
        <InputText
          v-model="websiteInput"
          class="w-full"
          placeholder="https://your-site.com"
          inputmode="url"
          :disabled="profileDetailsSaving"
        />
      </AppFormField>

      <div class="flex items-center gap-3">
        <AppSaveButton label="Save profile details" severity="secondary" :loading="profileDetailsSaving" :disabled="!profileDetailsDirty" @click="saveProfileDetails" />
        <div v-if="profileDetailsSaved" class="text-sm text-green-700 dark:text-green-300">Saved.</div>
      </div>
      <div v-if="profileDetailsHelperText" class="text-sm text-red-700 dark:text-red-300">
        {{ profileDetailsHelperText }}
      </div>
    </div>

    <div class="space-y-3">
      <AppInterestsPicker
        v-model="interestsInput"
        :disabled="interestsSaving"
        label="Interests"
        helper-right="Pick at least 1"
        helper-bottom="Used for discovery and recommendations."
        description="Search, pick from suggestions, or add your own."
      />
      <div class="flex items-center gap-3">
        <AppSaveButton label="Save interests" severity="secondary" :loading="interestsSaving" :disabled="!interestsDirty" @click="saveInterests" />
        <div v-if="interestsSaved" class="text-sm text-green-700 dark:text-green-300">Saved.</div>
      </div>
      <div v-if="interestsHelperText" class="text-sm text-red-700 dark:text-red-300">
        {{ interestsHelperText }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettingsAccount } from '~/composables/settings/useSettingsAccount'

defineProps<{
  /** Resend controls stay hidden until the page has refreshed auth (prevents countdown bypass on refresh). */
  emailVerificationUiReady: boolean
}>()

const { user: authUser } = useAuth()
const route = useRoute()

const {
  usernameInput,
  usernameStatus,
  usernameHelperText,
  canSaveUsername,
  saving,
  saved,
  save,
  emailInput,
  emailHelperText,
  emailDirty,
  emailSaving,
  emailSaved,
  saveEmail,
  emailResendSaving,
  emailResendSaved,
  emailResendError,
  emailResendCooldownActive,
  emailResendButtonLabel,
  resendEmailVerification,
  locationQueryInput,
  websiteInput,
  profileDetailsHelperText,
  profileDetailsDirty,
  profileDetailsSaving,
  profileDetailsSaved,
  saveProfileDetails,
  interestsInput,
  interestsHelperText,
  interestsDirty,
  interestsSaving,
  interestsSaved,
  saveInterests,
} = useSettingsAccount()
</script>
