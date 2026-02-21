<template>
  <AppPageContent class="h-full min-h-0" bottom="standard">
    <div class="grid h-full min-h-0" :class="isTinyViewport ? 'grid-cols-1' : ''" :style="gridStyle">
      <!-- Left column: section list -->
      <section
        v-if="showListPane"
        :class="[
          'h-full overflow-y-auto moh-scrollbar-stable border-b border-gray-200 dark:border-zinc-800',
          !isTinyViewport ? 'border-b-0 border-r' : ''
        ]"
      >
        <div class="py-3 sm:py-4">
          <div class="px-3 sm:px-4 text-base sm:text-lg font-semibold">Settings</div>

          <div class="mt-3 px-3 sm:px-4">
            <InputText
              v-model="sectionQuery"
              id="settings-search"
              name="q"
              aria-label="Search settings"
              class="w-full h-11 !rounded-full"
              placeholder="Search settings…"
            />
          </div>

          <div class="mt-4 divide-y divide-gray-200 dark:divide-zinc-800">
            <NuxtLink
              v-for="s in filteredSections"
              :key="s.key"
              :to="`/settings/${s.key}`"
              :class="sectionRowClass(s.key)"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <div class="font-semibold truncate text-gray-900 dark:text-gray-50">{{ s.label }}</div>
                  <div class="text-sm text-gray-600 dark:text-gray-300 truncate">{{ s.description }}</div>
                </div>
                <Icon name="tabler:chevron-right" class="text-gray-400" aria-hidden="true" />
              </div>
            </NuxtLink>
          </div>
        </div>
      </section>

      <!-- Right column: selected section -->
      <section v-if="showDetailPane" :class="['h-full overflow-hidden', !isTinyViewport ? 'pl-4' : '']">
        <div class="flex h-full flex-col">
          <div class="border-b border-gray-200 py-2.5 sm:py-3 dark:border-zinc-800">
            <div class="flex items-center justify-between gap-3">
              <div class="flex min-w-0 items-start gap-2">
                <Button
                  v-if="selectedSection"
                  text
                  severity="secondary"
                  aria-label="Back"
                  @click="navigateTo('/settings')"
                >
                  <template #icon>
                    <Icon name="tabler:chevron-left" aria-hidden="true" />
                  </template>
                </Button>
                <div class="min-w-0">
                  <div class="font-semibold truncate">
                    {{ selectedSectionLabel }}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {{ selectedSectionDescription }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto moh-scrollbar-stable pt-3 sm:pt-4 pb-0 sm:pb-4">
            <div class="px-3 sm:px-4 min-h-[20rem]">
              <div v-if="selectedSection === 'account'" class="space-y-6">
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
                    :loading="emailResendSaving"
                    :disabled="emailResendSaving || emailResendCooldownActive"
                    @click="resendEmailVerification"
                  />
                  <div v-if="emailResendError" class="text-red-700 dark:text-red-300">{{ emailResendError }}</div>
                </div>

                <div class="space-y-3">
                  <AppFormField
                    label="Location"
                    optional
                    helper="Zipcode, city, or city/state. We normalize this to your profile location."
                  >
                    <InputText
                      v-model="locationQueryInput"
                      class="w-full"
                      placeholder="e.g. Roanoke, VA or 24011"
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

              <div v-else-if="selectedSection === 'verification'" class="space-y-6">
                <div class="rounded-xl border moh-border p-3 moh-surface space-y-2 text-sm">
                  <div class="flex items-center justify-between gap-3">
                    <div class="font-semibold text-gray-900 dark:text-gray-50">Your verification</div>
                    <AppVerifiedBadge
                      :status="authUser?.verifiedStatus ?? 'none'"
                      :premium="Boolean(authUser?.premium)"
                      :premium-plus="Boolean(authUser?.premiumPlus)"
                      :is-organization="Boolean((authUser as any)?.isOrganization)"
                      :steward-badge-enabled="authUser?.stewardBadgeEnabled ?? true"
                    />
                  </div>

                  <div class="flex items-center justify-between gap-3">
                    <div class="moh-text-muted">Status</div>
                    <div class="text-sm">
                      <Tag :value="verificationStatusLabel" :severity="verificationStatusSeverity" class="!text-xs" />
                    </div>
                  </div>

                  <div class="flex items-center justify-between gap-3">
                    <div class="moh-text-muted">Verified at</div>
                    <div class="font-mono text-xs">{{ verifiedAtLabel }}</div>
                  </div>

                  <div v-if="verificationLatestRequest" class="pt-2 space-y-2">
                    <div class="text-xs moh-text-muted">Latest request</div>

                    <div class="flex items-center justify-between gap-3">
                      <div class="moh-text-muted">Request status</div>
                      <Tag :value="requestStatusLabel" :severity="requestStatusSeverity" class="!text-xs" />
                    </div>

                    <div class="flex items-center justify-between gap-3">
                      <div class="moh-text-muted">Submitted</div>
                      <div class="font-mono text-xs">{{ requestSubmittedAtLabel }}</div>
                    </div>

                    <div v-if="verificationLatestRequest.reviewedAt" class="flex items-center justify-between gap-3">
                      <div class="moh-text-muted">Reviewed</div>
                      <div class="font-mono text-xs">{{ requestReviewedAtLabel }}</div>
                    </div>

                    <div v-if="verificationLatestRequest.rejectionReason" class="space-y-1">
                      <div class="text-xs moh-text-muted">Reason</div>
                      <div class="text-sm moh-text">{{ verificationLatestRequest.rejectionReason }}</div>
                    </div>
                  </div>
                </div>

                <AppInlineAlert v-if="verificationError" severity="danger">
                  {{ verificationError }}
                </AppInlineAlert>

                <div class="flex flex-wrap items-center gap-3">
                  <Button
                    label="Start verification"
                    :loading="verificationStarting"
                    :disabled="verificationStarting || verificationStartDisabled"
                    @click="startVerification()"
                  >
                    <template #icon>
                      <Icon name="tabler:id-badge" aria-hidden="true" />
                    </template>
                  </Button>
                  <Button
                    label="Refresh"
                    severity="secondary"
                    :loading="verificationRefreshing"
                    :disabled="verificationRefreshing"
                    @click="refreshVerification()"
                  >
                    <template #icon>
                      <Icon name="tabler:refresh" aria-hidden="true" />
                    </template>
                  </Button>
                  <div v-if="verificationStartDisabledReason" class="text-sm moh-text-muted">
                    {{ verificationStartDisabledReason }}
                  </div>
                </div>

                <div class="text-xs moh-text-muted">
                  Provider integration isn’t live yet. For now, your request will show as pending until an admin manually reviews it.
                </div>

                <div
                  v-if="authUser?.premiumPlus"
                  class="rounded-xl border moh-border p-3 moh-surface space-y-3 text-sm"
                >
                  <div class="flex items-start justify-between gap-4">
                    <div class="space-y-1">
                      <div class="font-semibold text-gray-900 dark:text-gray-50">Steward badge</div>
                      <div class="text-xs moh-text-muted">
                        Show a Steward (Premium+) badge next to your verified badge across the app.
                      </div>
                    </div>
                    <Checkbox
                      v-model="stewardBadgeEnabledInput"
                      binary
                      inputId="moh-steward-badge-enabled"
                      :disabled="stewardBadgeSaving"
                    />
                  </div>

                  <div class="flex flex-wrap items-center gap-3">
                    <AppSaveButton severity="secondary" :loading="stewardBadgeSaving" :disabled="!stewardBadgeDirty" @click="saveStewardBadge" />
                    <div v-if="stewardBadgeSaved" class="text-sm text-green-700 dark:text-green-300">Saved.</div>
                  </div>

                  <AppInlineAlert v-if="stewardBadgeError" severity="danger">{{ stewardBadgeError }}</AppInlineAlert>
                </div>
              </div>

            <div v-else-if="selectedSection === 'billing'" class="space-y-6">
              <div class="space-y-2">
                <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Billing</div>
                <div class="text-sm text-gray-600 dark:text-gray-300">
                  Manage Premium and Premium+.
                </div>
              </div>

              <div class="rounded-xl border moh-border p-3 moh-surface space-y-2 text-sm">
                <div class="flex items-center justify-between gap-3">
                  <div class="moh-text-muted">Your tier</div>
                  <div class="font-semibold text-gray-900 dark:text-gray-50">
                    <span v-if="billingMe?.premiumPlus">Premium+</span>
                    <span v-else-if="billingMe?.premium">Premium</span>
                    <span v-else>Free</span>
                  </div>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <div class="moh-text-muted">Verified</div>
                  <div class="font-semibold">
                    <span v-if="billingMe?.verified">Yes</span>
                    <span v-else>No</span>
                  </div>
                </div>
                <div v-if="billingMe?.subscriptionStatus" class="flex items-center justify-between gap-3">
                  <div class="moh-text-muted">Subscription</div>
                  <div class="font-mono text-xs">{{ billingMe.subscriptionStatus }}</div>
                </div>
                <div v-if="billingMe?.currentPeriodEnd" class="flex items-center justify-between gap-3">
                  <div class="moh-text-muted">Renews</div>
                  <div class="font-mono text-xs">{{ formatDateTime(billingMe.currentPeriodEnd) }}</div>
                </div>
                <div v-if="billingMe?.cancelAtPeriodEnd" class="text-xs text-amber-700 dark:text-amber-300">
                  Canceling at period end.
                </div>
              </div>

              <AppInlineAlert v-if="billingError" severity="danger">{{ billingError }}</AppInlineAlert>

              <div class="flex flex-wrap items-center gap-3">
                <Button
                  v-if="billingMe?.verified && !billingMe?.premium"
                  label="Get Premium"
                  :loading="checkoutLoading === 'premium'"
                  :disabled="Boolean(checkoutLoading)"
                  @click="startCheckout('premium')"
                />
                <Button
                  v-if="billingMe?.verified && !billingMe?.premiumPlus"
                  label="Get Premium+"
                  severity="secondary"
                  :loading="checkoutLoading === 'premiumPlus'"
                  :disabled="Boolean(checkoutLoading)"
                  @click="startCheckout('premiumPlus')"
                />
                <Button
                  v-if="billingMe?.verified && (billingMe?.premium || billingMe?.premiumPlus)"
                  label="Manage subscription"
                  severity="secondary"
                  :loading="portalLoading"
                  :disabled="portalLoading"
                  @click="openPortal"
                />
                <NuxtLink
                  v-if="billingMe && !billingMe.verified"
                  to="/settings/verification"
                  class="text-sm font-medium text-gray-700 hover:underline dark:text-gray-300"
                >
                  Verify to subscribe
                </NuxtLink>
              </div>

              <div v-if="billingLoading" class="text-sm moh-text-muted">Loading billing…</div>
            </div>

              <SettingsPrivacySection
                v-else-if="selectedSection === 'privacy'"
                :follow-visibility-input="followVisibilityInput"
                :birthday-visibility-input="birthdayVisibilityInput"
                :follow-visibility-options="followVisibilityOptions"
                :birthday-visibility-options="birthdayVisibilityOptions"
                :privacy-saving="privacySaving"
                :privacy-dirty="privacyDirty"
                :privacy-saved="privacySaved"
                :privacy-error="privacyError"
                @update:follow-visibility-input="followVisibilityInput = $event"
                @update:birthday-visibility-input="birthdayVisibilityInput = $event"
                @save="savePrivacy"
              />

              <div v-else-if="selectedSection === 'notifications'" class="space-y-6">
                <SettingsBrowserNotificationsSection
                  :push-vapid-configured="pushVapidConfigured"
                  :push-is-supported="pushIsSupported"
                  :push-requires-install="pushRequiresInstall"
                  :push-initial-state-checked="pushInitialStateChecked"
                  :push-is-subscribed="pushIsSubscribed"
                  :push-permission="pushPermission"
                  :push-is-registering="pushIsRegistering"
                  :push-subscribe="pushSubscribe"
                  :push-unsubscribe="pushUnsubscribe"
                  :push-test-sending="pushTestSending"
                  :send-push-test="sendPushTest"
                  :push-error-message="pushErrorMessage"
                  :push-test-message="pushTestMessage"
                />

                <div class="rounded-xl border moh-border p-3 moh-surface space-y-4">
                  <div class="space-y-1">
                    <div class="font-semibold text-gray-900 dark:text-gray-50">Notification preferences</div>
                    <div class="text-xs moh-text-muted">
                      These control what we send as browser notifications and emails.
                    </div>
                  </div>

                  <div v-if="notifPrefsLoading" class="text-sm moh-text-muted">Loading preferences…</div>
                  <AppInlineAlert v-else-if="notifPrefsError" severity="danger">{{ notifPrefsError }}</AppInlineAlert>

                  <div v-else-if="notifPrefs" class="space-y-4">
                    <div class="space-y-2">
                      <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Browser notifications (push)
                      </div>
                      <div class="grid gap-3">
                        <div class="flex items-start justify-between gap-4">
                          <div>
                            <div class="font-medium">Replies</div>
                            <div class="text-xs moh-text-muted">When someone replies to you.</div>
                          </div>
                          <Checkbox v-model="notifPrefs.pushComment" binary :disabled="notifPrefsSaving" />
                        </div>
                        <div class="flex items-start justify-between gap-4">
                          <div>
                            <div class="font-medium">Boosts</div>
                            <div class="text-xs moh-text-muted">When someone boosts your post.</div>
                          </div>
                          <Checkbox v-model="notifPrefs.pushBoost" binary :disabled="notifPrefsSaving" />
                        </div>
                        <div class="flex items-start justify-between gap-4">
                          <div>
                            <div class="font-medium">Follows</div>
                            <div class="text-xs moh-text-muted">When someone follows you.</div>
                          </div>
                          <Checkbox v-model="notifPrefs.pushFollow" binary :disabled="notifPrefsSaving" />
                        </div>
                        <div class="flex items-start justify-between gap-4">
                          <div>
                            <div class="font-medium">Mentions</div>
                            <div class="text-xs moh-text-muted">When someone mentions you.</div>
                          </div>
                          <Checkbox v-model="notifPrefs.pushMention" binary :disabled="notifPrefsSaving" />
                        </div>
                        <div class="flex items-start justify-between gap-4">
                          <div>
                            <div class="font-medium">Messages</div>
                            <div class="text-xs moh-text-muted">Direct messages.</div>
                          </div>
                          <Checkbox v-model="notifPrefs.pushMessage" binary :disabled="notifPrefsSaving" />
                        </div>
                      </div>
                    </div>

                    <div class="space-y-2">
                      <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Email
                      </div>
                      <div
                        v-if="route.query.digest_unsubscribed === '1'"
                        class="rounded-lg border moh-border p-2 text-sm moh-surface"
                      >
                        Daily digest disabled. You can re-enable it below.
                      </div>
                      <div v-if="!authUser?.email" class="text-sm text-gray-600 dark:text-gray-300">
                        Add an email in <NuxtLink to="/settings/account" class="font-medium hover:underline">Your account</NuxtLink> to enable email notifications.
                      </div>
                      <div v-else class="grid gap-3">
                        <div
                          v-if="!emailIsVerified"
                          class="rounded-lg border moh-border p-3 text-sm moh-surface"
                        >
                          <div class="font-semibold">Verify your email to enable email notifications.</div>
                          <div class="mt-1 text-xs moh-text-muted">
                            Your settings are saved, but sending is disabled until verification.
                          </div>
                          <div class="mt-2">
                            <NuxtLink to="/settings/account" class="font-medium hover:underline underline-offset-2">
                              Go to account settings to verify →
                            </NuxtLink>
                          </div>
                        </div>
                        <div class="flex items-start justify-between gap-4">
                          <div>
                            <div class="font-medium">Daily digest</div>
                            <div class="text-xs moh-text-muted">A daily recap (recommended).</div>
                          </div>
                          <Checkbox v-model="notifPrefs.emailDigestDaily" binary :disabled="notifPrefsSaving || !emailIsVerified" />
                        </div>
                        <div class="flex items-start justify-between gap-4">
                          <div>
                            <div class="font-medium">New notifications</div>
                            <div class="text-xs moh-text-muted">A nudge when you have unread notifications.</div>
                          </div>
                          <Checkbox v-model="notifPrefs.emailNewNotifications" binary :disabled="notifPrefsSaving || !emailIsVerified" />
                        </div>
                        <div class="flex items-start justify-between gap-4">
                          <div>
                            <div class="font-medium">Instant emails (high-signal)</div>
                            <div class="text-xs moh-text-muted">
                              Messages, mentions, and replies. Batched + throttled so it won’t spam you.
                            </div>
                          </div>
                          <Checkbox v-model="notifPrefs.emailInstantHighSignal" binary :disabled="notifPrefsSaving || !emailIsVerified" />
                        </div>
                      </div>
                    </div>

                    <div class="flex flex-wrap items-center gap-3">
                      <Button
                        label="Save preferences"
                        severity="secondary"
                        :loading="notifPrefsSaving"
                        :disabled="notifPrefsSaving || !notifPrefsDirty"
                        @click="saveNotifPrefs"
                      />
                      <div v-if="notifPrefsSaved" class="text-sm text-green-700 dark:text-green-300">Saved.</div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-else-if="selectedSection === 'blocked'" class="space-y-4">
                <SettingsBlockedUsersSection />
              </div>

              <div v-else-if="selectedSection === 'links'" class="space-y-4">
                <SettingsLinksSection />
              </div>

              <div v-else class="text-sm text-gray-600 dark:text-gray-300">
                Choose a section from the left.
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Settings'
})

usePageSeo({
  title: 'Settings',
  description: 'Account settings.',
  canonicalPath: '/settings',
  noindex: true
})

type FollowVisibility = 'all' | 'verified' | 'premium' | 'none'
type BirthdayVisibility = 'none' | 'monthDay' | 'full'
type SettingsSection = 'account' | 'verification' | 'billing' | 'privacy' | 'notifications' | 'blocked' | 'links'

const { user: authUser, ensureLoaded, me } = useAuth()
const { invalidateUserPreviewCache } = useUserPreview()
const usersStore = useUsersStore()
const route = useRoute()
const toast = useAppToast()
const emailVerificationUiReady = ref(false)

// Ensure we have the current user (so inputs can prefill immediately).
await ensureLoaded()
// Important: `ensureLoaded()` is a no-op once auth has loaded. When navigating here
// after an out-of-band update (e.g. admin unverifies email), force a refresh.
onMounted(() => {
  // Don't show resend controls until we know the server timestamp
  // (prevents refresh -> click -> bypass countdown UI).
  emailVerificationUiReady.value = false
  void me().finally(() => {
    emailVerificationUiReady.value = true
  })
})

// Show a one-time toast after email verification redirect.
onMounted(() => {
  if (!import.meta.client) return
  if (route.query.email_verified !== '1') return
  toast.push({ title: 'Email was verified.', tone: 'success', durationMs: 2200 })
  // Remove query param so it doesn't re-toast on refresh/back.
  const nextQuery = { ...(route.query as Record<string, any>) }
  delete nextQuery.email_verified
  delete nextQuery.reason
  void navigateTo({ path: route.path, query: nextQuery }, { replace: true })
})

const { apiFetch, apiFetchData } = useApiClient()
import { getApiErrorMessage } from '~/utils/api-error'
import { useFormSave } from '~/composables/useFormSave'
import { useFormSubmit } from '~/composables/useFormSubmit'
import { formatDateTime } from '~/utils/time-format'
import SettingsPrivacySection from '~/components/settings/sections/SettingsPrivacySection.vue'
import type {
  BillingCheckoutSession,
  BillingMe,
  BillingPortalSession,
  BillingTier,
  MyVerificationStatus,
  NotificationPreferences,
  VerificationRequestPublic
} from '~/types/api'
import { siteConfig } from '~/config/site'

function syncUserCaches(
  nextUser: import('~/composables/useAuth').AuthUser | null | undefined,
  previousUsername?: string | null,
) {
  const prev = (previousUsername ?? '').trim().toLowerCase()
  const next = (nextUser?.username ?? '').trim().toLowerCase()
  if (prev) invalidateUserPreviewCache(prev)
  if (next) invalidateUserPreviewCache(next)
  if (import.meta.client) {
    if (prev) {
      clearNuxtData(`public-profile:${prev}`)
      clearNuxtData(`follow-summary:${prev}`)
    }
    if (next) {
      clearNuxtData(`public-profile:${next}`)
      clearNuxtData(`follow-summary:${next}`)
    }
  }
  if (!nextUser?.id) return
  usersStore.upsert({
    id: nextUser.id,
    username: nextUser.username ?? null,
    name: nextUser.name ?? null,
    bio: nextUser.bio ?? null,
    premium: nextUser.premium,
    premiumPlus: nextUser.premiumPlus,
    verifiedStatus: nextUser.verifiedStatus,
    avatarUrl: nextUser.avatarUrl ?? null,
    bannerUrl: nextUser.bannerUrl ?? null,
    pinnedPostId: nextUser.pinnedPostId ?? null,
  })
}

const {
  permission: pushPermission,
  isSubscribed: pushIsSubscribed,
  isRegistering: pushIsRegistering,
  errorMessage: pushErrorMessage,
  isSupported: pushIsSupported,
  requiresInstall: pushRequiresInstall,
  vapidConfigured: pushVapidConfigured,
  refreshSubscriptionState,
  subscribe,
  unsubscribe,
} = usePushNotifications()
const pushTestSending = ref(false)
const pushTestMessage = ref('')
const pushInitialStateChecked = ref(false)
const pushStateLoadedOnce = ref(false)

async function pushSubscribe() {
  await subscribe()
}

async function pushUnsubscribe() {
  await unsubscribe()
}

async function sendPushTest() {
  pushTestMessage.value = ''
  pushTestSending.value = true
  try {
    const res = await apiFetch<{ sent: boolean; message?: string }>('/notifications/push-test', {
      method: 'POST'
    })
    const data = res?.data
    if (data?.sent) {
      pushTestMessage.value = 'Test sent.'
    } else {
      pushTestMessage.value = data?.message ?? 'Could not send test.'
    }
  } catch (e) {
    pushTestMessage.value = getApiErrorMessage(e) ?? 'Failed to send test.'
  } finally {
    pushTestSending.value = false
  }
}

const allowedSections: SettingsSection[] = ['account', 'verification', 'billing', 'privacy', 'notifications', 'blocked', 'links']

const routeSection = computed<SettingsSection | null>(() => {
  const raw = typeof route.params.section === 'string' ? route.params.section : null
  if (!raw) return null
  return allowedSections.includes(raw as SettingsSection) ? (raw as SettingsSection) : null
})

// Legacy support: /settings?section=links -> /settings/links
const legacySection = computed<SettingsSection | null>(() => {
  const raw = typeof route.query.section === 'string' ? route.query.section : null
  if (!raw) return null
  return allowedSections.includes(raw as SettingsSection) ? (raw as SettingsSection) : null
})

if (!routeSection.value && legacySection.value) {
  await navigateTo(`/settings/${legacySection.value}`, { replace: true })
}

const selectedSection = ref<SettingsSection | null>(routeSection.value)
watch(
  routeSection,
  (s) => {
    selectedSection.value = s
  },
  { immediate: true }
)

const sectionQuery = ref('')

const sections = computed(() => [
  {
    key: 'account' as const,
    label: 'Your account',
    description: 'Username and profile basics.'
  },
  {
    key: 'verification' as const,
    label: 'Verification',
    description: 'Start verification and check your status.'
  },
  {
    key: 'billing' as const,
    label: 'Billing',
    description: 'Premium and Premium+ subscriptions.'
  },
  {
    key: 'privacy' as const,
    label: 'Privacy',
    description: 'Manage who can see parts of your profile and activity.'
  },
  {
    key: 'notifications' as const,
    label: 'Notifications',
    description: 'Browser and in-app alerts.'
  },
  {
    key: 'blocked' as const,
    label: 'Blocked users',
    description: 'Manage users you have blocked.'
  },
  {
    key: 'links' as const,
    label: 'Links',
    description: 'About, terms, privacy, feedback.'
  }
])

const filteredSections = computed(() => {
  const q = sectionQuery.value.trim().toLowerCase()
  if (!q) return sections.value
  return sections.value.filter((s) => (s.label + ' ' + s.description).toLowerCase().includes(q))
})

function sectionRowClass(key: SettingsSection) {
  const active = selectedSection.value === key
  return [
    'block px-3 py-2.5 sm:px-4 sm:py-3 min-h-[44px] transition-colors',
    active
      ? 'moh-pane-row-active'
      : 'hover:bg-gray-50 dark:hover:bg-zinc-900',
  ]
}

const { isTinyViewport, showListPane, showDetailPane, gridStyle } = useTwoPaneLayout(selectedSection, {
  leftCols: '22rem',
})

watch(
  isTinyViewport,
  async (tiny) => {
    // On desktop, default to first section by route (so URL reflects selection).
    if (!tiny && !routeSection.value) {
      await navigateTo('/settings/account', { replace: true })
    }
  },
  { immediate: true }
)

const selectedSectionLabel = computed(() => sections.value.find((s) => s.key === selectedSection.value)?.label || 'Settings')
const selectedSectionDescription = computed(
  () => sections.value.find((s) => s.key === selectedSection.value)?.description || 'Choose a section.'
)

const billingMe = ref<BillingMe | null>(null)
const billingLoading = ref(false)
const billingError = ref<string | null>(null)
const checkoutLoading = ref<BillingTier | null>(null)
const portalLoading = ref(false)

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

watch(
  selectedSection,
  (s) => {
    if (s === 'billing') void refreshBilling()
  },
  { immediate: true }
)

async function startCheckout(tier: BillingTier) {
  if (checkoutLoading.value) return
  checkoutLoading.value = tier
  billingError.value = null
  try {
    const res = await apiFetchData<BillingCheckoutSession>('/billing/checkout-session', {
      method: 'POST',
      body: { tier }
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
      method: 'POST'
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

const notifPrefs = ref<NotificationPreferences | null>(null)
const notifPrefsInitial = ref<string>('')
const notifPrefsLoading = ref(false)
const notifPrefsSaving = ref(false)
const notifPrefsSaved = ref(false)
const notifPrefsError = ref<string | null>(null)
let notifPrefsSavedTimer: ReturnType<typeof setTimeout> | null = null

const notifPrefsDirty = computed(() => {
  if (!notifPrefs.value) return false
  return JSON.stringify(notifPrefs.value) !== notifPrefsInitial.value
})

async function loadNotifPrefs() {
  notifPrefsLoading.value = true
  notifPrefsError.value = null
  notifPrefsSaved.value = false
  try {
    const res = await apiFetchData<NotificationPreferences>('/notifications/preferences', { method: 'GET' })
    notifPrefs.value = res
    notifPrefsInitial.value = JSON.stringify(res)
  } catch (e: unknown) {
    notifPrefsError.value = getApiErrorMessage(e) || 'Failed to load preferences.'
  } finally {
    notifPrefsLoading.value = false
  }
}

watch(
  selectedSection,
  (s) => {
    if (s === 'notifications') {
      if (!pushStateLoadedOnce.value) {
        pushInitialStateChecked.value = false
        void refreshSubscriptionState()
          .catch(() => {})
          .finally(() => {
            pushInitialStateChecked.value = true
            pushStateLoadedOnce.value = true
          })
      }
      void loadNotifPrefs()
    }
  },
  { immediate: true }
)

async function saveNotifPrefs() {
  if (!notifPrefs.value || notifPrefsSaving.value) return
  notifPrefsSaving.value = true
  notifPrefsError.value = null
  notifPrefsSaved.value = false
  try {
    const res = await apiFetchData<NotificationPreferences>('/notifications/preferences', {
      method: 'PATCH',
      body: notifPrefs.value,
    })
    notifPrefs.value = res
    notifPrefsInitial.value = JSON.stringify(res)
    notifPrefsSaved.value = true
    if (notifPrefsSavedTimer) clearTimeout(notifPrefsSavedTimer)
    notifPrefsSavedTimer = setTimeout(() => {
      notifPrefsSavedTimer = null
      notifPrefsSaved.value = false
    }, 1500)
  } catch (e: unknown) {
    notifPrefsError.value = getApiErrorMessage(e) || 'Failed to save preferences.'
  } finally {
    notifPrefsSaving.value = false
  }
}

onBeforeUnmount(() => {
  if (emailResendTickTimer) {
    clearInterval(emailResendTickTimer)
    emailResendTickTimer = null
  }
  if (notifPrefsSavedTimer) {
    clearTimeout(notifPrefsSavedTimer)
    notifPrefsSavedTimer = null
  }
  if (emailResendSavedTimer) {
    clearTimeout(emailResendSavedTimer)
    emailResendSavedTimer = null
  }
})

const verificationRefreshing = ref(false)
const verificationError = ref<string | null>(null)
const verificationLatestRequest = ref<VerificationRequestPublic | null>(null)

async function refreshVerification() {
  if (verificationRefreshing.value) return
  verificationRefreshing.value = true
  verificationError.value = null
  try {
    const res = await apiFetchData<MyVerificationStatus>('/verification/me', { method: 'GET' })
    verificationLatestRequest.value = res.latestRequest ?? null

    // Keep auth state fresh (useful right after manual approval).
    if (authUser.value) {
      authUser.value = {
        ...authUser.value,
        verifiedStatus: res.verifiedStatus,
        verifiedAt: res.verifiedAt,
        unverifiedAt: res.unverifiedAt,
      }
    }
  } catch (e: unknown) {
    verificationError.value = getApiErrorMessage(e) || 'Failed to load verification status.'
  } finally {
    verificationRefreshing.value = false
  }
}

watch(
  selectedSection,
  (s) => {
    if (s === 'verification') void refreshVerification()
  },
  { immediate: true },
)

const { submit: startVerification, submitting: verificationStarting } = useFormSubmit(
  async () => {
    verificationError.value = null
    const req = await apiFetchData<VerificationRequestPublic>('/verification/request', {
      method: 'POST',
      body: {},
    })
    verificationLatestRequest.value = req
  },
  {
    defaultError: 'Failed to start verification.',
    onError: (message) => {
      verificationError.value = message
    },
  },
)

const verificationStatusLabel = computed(() => {
  const s = authUser.value?.verifiedStatus ?? 'none'
  if (s === 'identity') return 'Identity verified'
  if (s === 'manual') return 'Manually verified'
  return 'Not verified'
})

const verificationStatusSeverity = computed(() => {
  const s = authUser.value?.verifiedStatus ?? 'none'
  if (s === 'identity' || s === 'manual') return 'info'
  return 'secondary'
})

const verifiedAtLabel = computed(() => formatDateTime(authUser.value?.verifiedAt, { fallback: '—' }))

const requestStatusLabel = computed(() => {
  const s = verificationLatestRequest.value?.status
  if (s === 'approved') return 'Approved'
  if (s === 'rejected') return 'Rejected'
  if (s === 'cancelled') return 'Cancelled'
  return 'Pending'
})

const requestStatusSeverity = computed(() => {
  const s = verificationLatestRequest.value?.status
  if (s === 'approved') return 'success'
  if (s === 'rejected') return 'danger'
  if (s === 'cancelled') return 'secondary'
  return 'warning'
})

const requestSubmittedAtLabel = computed(() => formatDateTime(verificationLatestRequest.value?.createdAt, { fallback: '—' }))
const requestReviewedAtLabel = computed(() => formatDateTime(verificationLatestRequest.value?.reviewedAt, { fallback: '—' }))

const verificationStartDisabledReason = computed(() => {
  const verified = (authUser.value?.verifiedStatus ?? 'none') !== 'none'
  if (verified) return 'You’re already verified.'
  if (verificationLatestRequest.value?.status === 'pending') return 'Your request is pending review.'
  return ''
})

const verificationStartDisabled = computed(() => Boolean(verificationStartDisabledReason.value))

const usernameInput = ref('')
const emailInput = ref('')
const currentUsername = computed(() => (authUser.value?.username ?? '').trim())
const usernameLocked = computed(() => Boolean(authUser.value?.usernameIsSet || currentUsername.value))
const {
  status: usernameStatus,
  helperText: usernameHelperText,
  isCaseOnlyChange,
} = useUsernameField({
  value: usernameInput,
  currentUsername: currentUsername,
  usernameIsSet: usernameLocked,
  debounceMs: 500,
  lockedInvalidMessage: 'Only capitalization changes are allowed for your username.',
  caseOnlyMessage: 'Only capitalization changes are allowed (this change is OK).',
})

const emailHelperText = ref<string | null>(null)
const emailResendSaving = ref(false)
const emailResendSaved = ref(false)
const emailResendError = ref<string | null>(null)
let emailResendSavedTimer: ReturnType<typeof setTimeout> | null = null
const EMAIL_RESEND_COOLDOWN_SECONDS = 30
const emailResendUiHydrated = ref(false)
const emailResendNowMs = ref<number>(Date.now())
let emailResendTickTimer: ReturnType<typeof setInterval> | null = null

const emailVerificationRequestedAtMs = computed(() => {
  const raw = authUser.value?.emailVerificationRequestedAt ?? null
  if (!raw) return null
  const ms = new Date(String(raw)).getTime()
  return Number.isFinite(ms) ? ms : null
})

const emailResendRetryAfterSeconds = computed(() => {
  // Avoid SSR hydration mismatches: only show the live countdown after mount.
  if (!emailResendUiHydrated.value) return 0
  const requestedAt = emailVerificationRequestedAtMs.value
  if (!requestedAt) return 0
  const until = requestedAt + EMAIL_RESEND_COOLDOWN_SECONDS * 1000
  const remainingMs = until - (emailResendNowMs.value ?? Date.now())
  return Math.max(0, Math.ceil(remainingMs / 1000))
})

const emailResendCooldownActive = computed(() => emailResendRetryAfterSeconds.value > 0)
const emailResendButtonLabel = computed(() =>
  emailResendCooldownActive.value ? `Resend in ${emailResendRetryAfterSeconds.value}s` : 'Resend verification',
)

onMounted(() => {
  if (!import.meta.client) return
  emailResendUiHydrated.value = true
  emailResendNowMs.value = Date.now()
  if (emailResendTickTimer) clearInterval(emailResendTickTimer)
  emailResendTickTimer = setInterval(() => {
    emailResendNowMs.value = Date.now()
  }, 250)
})
const locationQueryInput = ref('')
const websiteInput = ref('')
const profileDetailsHelperText = ref<string | null>(null)
watch(
  () => authUser.value?.email ?? null,
  (v) => {
    if (emailInput.value.trim()) return
    if (typeof v !== 'string' || !v.trim()) return
    emailInput.value = v
  },
  { immediate: true },
)

watch(
  () => authUser.value?.locationDisplay ?? null,
  (v) => {
    if (locationQueryInput.value.trim()) return
    if (typeof v !== 'string' || !v.trim()) return
    locationQueryInput.value = v
  },
  { immediate: true },
)

watch(
  () => authUser.value?.website ?? null,
  (v) => {
    if (websiteInput.value.trim()) return
    if (typeof v !== 'string' || !v.trim()) return
    websiteInput.value = v
  },
  { immediate: true },
)

const emailDirty = computed(() => {
  const current = (authUser.value?.email ?? '').trim().toLowerCase()
  const desired = emailInput.value.trim().toLowerCase()
  return current !== desired
})

const emailIsVerified = computed(() => Boolean(authUser.value?.email && authUser.value?.emailVerifiedAt))

const profileDetailsDirty = computed(() => {
  const currentLocation = (authUser.value?.locationDisplay ?? '').trim().toLowerCase()
  const desiredLocation = locationQueryInput.value.trim().toLowerCase()
  if (currentLocation !== desiredLocation) return true

  const currentWebsite = (authUser.value?.website ?? '').trim().toLowerCase()
  const desiredWebsite = websiteInput.value.trim().toLowerCase()
  return currentWebsite !== desiredWebsite
})

const { save: saveEmailRequest, saving: emailSaving, saved: emailSaved } = useFormSave(
  async () => {
    const previousUsername = authUser.value?.username ?? null
    const raw = emailInput.value.trim()
    const body = { email: raw ? raw : '' }
    const result = await apiFetchData<{ user: import('~/composables/useAuth').AuthUser }>('/users/me/profile', {
      method: 'PATCH',
      body,
    })
    authUser.value = result.user ?? authUser.value
    syncUserCaches(result.user, previousUsername)

    // If they set/changed email, server marks it unverified and sends verification.
    if (result.user?.email && !result.user.emailVerifiedAt) {
      emailResendSaved.value = true
      if (emailResendSavedTimer) clearTimeout(emailResendSavedTimer)
      emailResendSavedTimer = setTimeout(() => {
        emailResendSavedTimer = null
        emailResendSaved.value = false
      }, 2500)
    }
  },
  {
    defaultError: 'Failed to save email.',
    onError: (message) => {
      emailHelperText.value = message
    },
  },
)

async function resendEmailVerification() {
  if (emailResendSaving.value || emailResendCooldownActive.value) return
  emailResendSaving.value = true
  emailResendError.value = null
  emailResendSaved.value = false
  try {
    const res = await apiFetchData<{ sent: boolean; reason?: string; retryAfterSeconds?: number }>('/email/verification/resend', {
      method: 'POST',
    })
    // Always refresh auth state; requestedAt drives the persistent cooldown (survives refresh).
    await me()

    if (res.sent) {
      emailResendSaved.value = true
    } else if (res.reason === 'cooldown') {
      const s = Math.max(1, Math.floor(res.retryAfterSeconds ?? emailResendRetryAfterSeconds.value ?? 1))
      emailResendError.value = `Please wait ${s}s before resending.`
    }
    if (emailResendSavedTimer) clearTimeout(emailResendSavedTimer)
    emailResendSavedTimer = setTimeout(() => {
      emailResendSavedTimer = null
      emailResendSaved.value = false
    }, 2500)
  } catch (e: unknown) {
    emailResendError.value = getApiErrorMessage(e) || 'Failed to resend verification email.'
  } finally {
    emailResendSaving.value = false
  }
}

const {
  save: saveProfileDetailsRequest,
  saving: profileDetailsSaving,
  saved: profileDetailsSaved,
} = useFormSave(
  async () => {
    const previousUsername = authUser.value?.username ?? null
    const result = await apiFetchData<{ user: import('~/composables/useAuth').AuthUser }>('/users/me/profile', {
      method: 'PATCH',
      body: {
        locationQuery: locationQueryInput.value.trim(),
        website: websiteInput.value.trim(),
      },
    })
    authUser.value = result.user ?? authUser.value
    syncUserCaches(result.user, previousUsername)
  },
  {
    defaultError: 'Failed to save profile details.',
    onError: (message) => {
      profileDetailsHelperText.value = message
    },
  },
)

const interestsHelperText = ref<string | null>(null)
const interestsInput = ref<string[]>([])

function normalizeInterests(vals: string[]): string[] {
  return (vals ?? [])
    .map((s) => String(s ?? '').trim())
    .filter(Boolean)
    .slice(0, 30)
    .sort((a, b) => a.localeCompare(b))
}

watch(
  () => authUser.value?.interests ?? null,
  (v) => {
    if (interestsInput.value.length > 0) return
    if (!Array.isArray(v) || v.length === 0) return
    interestsInput.value = [...v]
  },
  { immediate: true },
)

const interestsDirty = computed(() => {
  const current = normalizeInterests((authUser.value?.interests ?? []) as string[])
  const desired = normalizeInterests(interestsInput.value)
  if (current.length !== desired.length) return true
  for (let i = 0; i < current.length; i++) {
    if (current[i] !== desired[i]) return true
  }
  return false
})

const { save: saveInterestsRequest, saving: interestsSaving, saved: interestsSaved } = useFormSave(
  async () => {
    const previousUsername = authUser.value?.username ?? null
    const body = { interests: interestsInput.value }
    const result = await apiFetchData<{ user: import('~/composables/useAuth').AuthUser }>('/users/me/profile', {
      method: 'PATCH',
      body,
    })
    authUser.value = result.user ?? authUser.value
    syncUserCaches(result.user, previousUsername)
  },
  {
    defaultError: 'Failed to save interests.',
    onError: (message) => {
      interestsHelperText.value = message
    },
  },
)

// Prefill input with current username (if any) once, so "case-only" edits are obvious.
watch(
  () => authUser.value?.username ?? null,
  (u) => {
    if (usernameInput.value.trim()) return
    if (!u) return
    usernameInput.value = u
  },
  { immediate: true }
)

const canSaveUsername = computed(() => {
  const trimmed = usernameInput.value.trim()
  if (!trimmed) return false
  // Allow capitalization-only changes regardless of current validation rules.
  if (isCaseOnlyChange.value) return true
  // If username is set, only capitalization is allowed.
  if (usernameLocked.value) return false
  return usernameStatus.value === 'available'
})

const { save: saveUsernameRequest, saving, saved } = useFormSave(
  async () => {
    const previousUsername = authUser.value?.username ?? null
    const username = usernameInput.value.trim()
    const result = await apiFetchData<{ user: import('~/composables/useAuth').AuthUser }>('/users/me/username', {
      method: 'PATCH',
      body: { username },
    })

    // Update client auth state with latest user data.
    authUser.value = result.user ?? authUser.value
    syncUserCaches(result.user, previousUsername)
  },
  {
    defaultError: 'Failed to save username.',
    onError: (message) => {
      usernameHelperText.value = message
    },
  },
)

const followVisibilityOptions: Array<{ label: string; value: FollowVisibility }> = [
  { label: 'Public (anyone)', value: 'all' },
  { label: 'Verified members', value: 'verified' },
  { label: 'Premium members', value: 'premium' },
  { label: 'Only me', value: 'none' }
]
const birthdayVisibilityOptions: Array<{ label: string; value: BirthdayVisibility }> = [
  { label: 'Hide birthday', value: 'none' },
  { label: 'Month and day only', value: 'monthDay' },
  { label: 'Full birthday (with year)', value: 'full' },
]

const followVisibilityInput = ref<FollowVisibility>('all')
const birthdayVisibilityInput = ref<BirthdayVisibility>('monthDay')
const privacyError = ref<string | null>(null)

watch(
  () => authUser.value?.followVisibility,
  (v) => {
    const next = (v || 'all') as FollowVisibility
    followVisibilityInput.value = next
  },
  { immediate: true }
)

watch(
  () => authUser.value?.birthdayVisibility,
  (v) => {
    const next = (v || 'monthDay') as BirthdayVisibility
    birthdayVisibilityInput.value = next
  },
  { immediate: true }
)

const privacyDirty = computed(() =>
  (authUser.value?.followVisibility || 'all') !== followVisibilityInput.value ||
  (authUser.value?.birthdayVisibility || 'monthDay') !== birthdayVisibilityInput.value
)

const { save: savePrivacyRequest, saving: privacySaving, saved: privacySaved } = useFormSave(
  async () => {
    const previousUsername = authUser.value?.username ?? null
    const result = await apiFetchData<{ user: import('~/composables/useAuth').AuthUser }>('/users/me/settings', {
      method: 'PATCH',
      body: {
        followVisibility: followVisibilityInput.value,
        birthdayVisibility: birthdayVisibilityInput.value,
      }
    })
    authUser.value = result.user ?? authUser.value
    syncUserCaches(result.user, previousUsername)
  },
  {
    defaultError: 'Failed to save privacy.',
    onError: (message) => {
      privacyError.value = message
    },
  },
)

// Premium+ steward badge toggle
const stewardBadgeEnabledInput = ref<boolean>(true)
const stewardBadgeError = ref<string | null>(null)

watch(
  () => authUser.value?.stewardBadgeEnabled,
  (v) => {
    // ON by default when field is missing (defensive).
    stewardBadgeEnabledInput.value = v !== false
  },
  { immediate: true },
)

const stewardBadgeDirty = computed(() => (authUser.value?.stewardBadgeEnabled ?? true) !== stewardBadgeEnabledInput.value)

const { save: saveStewardBadgeRequest, saving: stewardBadgeSaving, saved: stewardBadgeSaved } = useFormSave(
  async () => {
    const previousUsername = authUser.value?.username ?? null
    const result = await apiFetchData<{ user: import('~/composables/useAuth').AuthUser }>('/users/me/settings', {
      method: 'PATCH',
      body: { stewardBadgeEnabled: stewardBadgeEnabledInput.value }
    })
    authUser.value = result.user ?? authUser.value
    syncUserCaches(result.user, previousUsername)
  },
  {
    defaultError: 'Failed to save steward badge.',
    onError: (message) => {
      stewardBadgeError.value = message
    },
  },
)

watch(usernameInput, () => {
  // Clear "Saved" when they edit the field.
  saved.value = false
})

async function save() {
  usernameHelperText.value = null

  const username = usernameInput.value.trim()
  if (!username) return

  if (usernameLocked.value && !isCaseOnlyChange.value) {
    usernameStatus.value = 'invalid'
    usernameHelperText.value = 'Only capitalization changes are allowed for your username.'
    return
  }

  saved.value = false
  await saveUsernameRequest()
}

async function saveEmail() {
  emailHelperText.value = null
  emailSaved.value = false
  await saveEmailRequest()
}

async function saveProfileDetails() {
  profileDetailsHelperText.value = null
  profileDetailsSaved.value = false
  await saveProfileDetailsRequest()
}

async function saveInterests() {
  interestsHelperText.value = null
  interestsSaved.value = false
  await saveInterestsRequest()
}

async function savePrivacy() {
  privacyError.value = null
  privacySaved.value = false
  await savePrivacyRequest()
}

async function saveStewardBadge() {
  stewardBadgeError.value = null
  stewardBadgeSaved.value = false
  await saveStewardBadgeRequest()
}

function sendFeedback() {
  const subject = encodeURIComponent(`${siteConfig.name} Feedback`)
  const href = `mailto:feedback@menofhunger.com?subject=${subject}`
  if (import.meta.client) window.open(href, '_blank', 'noopener,noreferrer')
}
</script>

