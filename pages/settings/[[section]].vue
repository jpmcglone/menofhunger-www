<template>
  <AppPageContent class="h-full min-h-0" bottom="standard">
    <div class="grid h-full min-h-0" :class="isTinyViewport ? 'grid-cols-1' : ''" :style="gridStyle">
      <!-- Left column: section list -->
      <section
        v-if="showListPane"
        :class="[
          'h-full overflow-y-auto border-b border-gray-200 dark:border-zinc-800',
          !isTinyViewport ? 'border-b-0 border-r' : ''
        ]"
      >
        <div class="py-4">
          <div class="px-4 text-lg font-semibold">Settings</div>

          <div class="mt-3 px-4">
            <InputText v-model="sectionQuery" class="w-full h-11 !rounded-full" placeholder="Search settings…" />
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
          <div class="border-b border-gray-200 py-3 dark:border-zinc-800">
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

          <div class="flex-1 overflow-y-auto pt-4 pb-0 sm:pb-4">
            <div class="px-4">
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
                  <Button
                    label="Save"
                    :loading="saving"
                    :disabled="saving || !canSaveUsername"
                    @click="save"
                  >
                    <template #icon>
                      <Icon name="tabler:check" aria-hidden="true" />
                    </template>
                  </Button>
                  <div v-if="saved" class="text-sm text-green-700 dark:text-green-300">Saved.</div>
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
                  <Button
                    label="Save email"
                    severity="secondary"
                    :loading="emailSaving"
                    :disabled="emailSaving || !emailDirty"
                    @click="saveEmail"
                  >
                    <template #icon>
                      <Icon name="tabler:check" aria-hidden="true" />
                    </template>
                  </Button>
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
                    <Button
                      label="Save interests"
                      severity="secondary"
                      :loading="interestsSaving"
                      :disabled="interestsSaving || !interestsDirty"
                      @click="saveInterests"
                    >
                      <template #icon>
                        <Icon name="tabler:check" aria-hidden="true" />
                      </template>
                    </Button>
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
                    <Button
                      label="Save"
                      severity="secondary"
                      :loading="stewardBadgeSaving"
                      :disabled="stewardBadgeSaving || !stewardBadgeDirty"
                      @click="saveStewardBadge"
                    >
                      <template #icon>
                        <Icon name="tabler:check" aria-hidden="true" />
                      </template>
                    </Button>
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

              <div v-else-if="selectedSection === 'privacy'" class="space-y-6">
                <div class="space-y-2">
                  <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Follow visibility</div>
                  <div class="text-sm text-gray-600 dark:text-gray-300">
                    Choose who can see your follower/following counts and lists.
                  </div>
                </div>

                <Select
                  v-model="followVisibilityInput"
                  :options="followVisibilityOptions"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Select…"
                  class="w-full"
                  :disabled="privacySaving"
                />

                <div class="flex items-center gap-3">
                  <Button
                    label="Save"
                    severity="secondary"
                    :loading="privacySaving"
                    :disabled="privacySaving || !privacyDirty"
                    @click="savePrivacy"
                  >
                    <template #icon>
                      <Icon name="tabler:check" aria-hidden="true" />
                    </template>
                  </Button>
                  <div v-if="privacySaved" class="text-sm text-green-700 dark:text-green-300">Saved.</div>
                </div>

                <div v-if="privacyError" class="text-sm text-red-700 dark:text-red-300">
                  {{ privacyError }}
                </div>
              </div>

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
                      <div v-if="!authUser?.email" class="text-sm text-gray-600 dark:text-gray-300">
                        Add an email in <NuxtLink to="/settings/account" class="font-medium hover:underline">Your account</NuxtLink> to enable email notifications.
                      </div>
                      <div v-else class="grid gap-3">
                        <div class="flex items-start justify-between gap-4">
                          <div>
                            <div class="font-medium">Weekly digest</div>
                            <div class="text-xs moh-text-muted">A weekly recap email.</div>
                          </div>
                          <Checkbox v-model="notifPrefs.emailDigestWeekly" binary :disabled="notifPrefsSaving" />
                        </div>
                        <div class="flex items-start justify-between gap-4">
                          <div>
                            <div class="font-medium">New notifications</div>
                            <div class="text-xs moh-text-muted">A nudge when you have unread notifications.</div>
                          </div>
                          <Checkbox v-model="notifPrefs.emailNewNotifications" binary :disabled="notifPrefsSaving" />
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
type SettingsSection = 'account' | 'verification' | 'billing' | 'privacy' | 'notifications' | 'links'

const { user: authUser, ensureLoaded } = useAuth()
const route = useRoute()

// Ensure we have the current user (so inputs can prefill immediately).
await ensureLoaded()

const { apiFetch, apiFetchData } = useApiClient()
import { getApiErrorMessage } from '~/utils/api-error'
import { useFormSave } from '~/composables/useFormSave'
import { useFormSubmit } from '~/composables/useFormSubmit'
import { formatDateTime } from '~/utils/time-format'
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

onMounted(() => {
  pushInitialStateChecked.value = false
  void refreshSubscriptionState()
    .catch(() => {})
    .finally(() => {
      pushInitialStateChecked.value = true
    })
})

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

const allowedSections: SettingsSection[] = ['account', 'verification', 'billing', 'privacy', 'notifications', 'links']

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
    description: 'Who can see your follower info.'
  },
  {
    key: 'notifications' as const,
    label: 'Notifications',
    description: 'Browser and in-app alerts.'
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
    'block px-4 py-3 transition-colors',
    active ? 'bg-gray-50 dark:bg-zinc-900' : 'hover:bg-gray-50 dark:hover:bg-zinc-900',
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
    if (s === 'notifications') void loadNotifPrefs()
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
  if (notifPrefsSavedTimer) {
    clearTimeout(notifPrefsSavedTimer)
    notifPrefsSavedTimer = null
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

onMounted(() => {
  void refreshVerification()
})

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
const usernameIsSet = computed(() => Boolean(authUser.value?.usernameIsSet))
const {
  status: usernameStatus,
  helperText: usernameHelperText,
  isCaseOnlyChange,
} = useUsernameField({
  value: usernameInput,
  currentUsername: currentUsername,
  usernameIsSet,
  debounceMs: 500,
  lockedInvalidMessage: 'Only capitalization changes are allowed for your username.',
  caseOnlyMessage: 'Only capitalization changes are allowed (this change is OK).',
})

const emailHelperText = ref<string | null>(null)
watch(
  () => authUser.value?.email ?? null,
  (v) => {
    if (emailInput.value.trim()) return
    if (typeof v !== 'string' || !v.trim()) return
    emailInput.value = v
  },
  { immediate: true },
)

const emailDirty = computed(() => {
  const current = (authUser.value?.email ?? '').trim().toLowerCase()
  const desired = emailInput.value.trim().toLowerCase()
  return current !== desired
})

const { save: saveEmailRequest, saving: emailSaving, saved: emailSaved } = useFormSave(
  async () => {
    const raw = emailInput.value.trim()
    const body = { email: raw ? raw : '' }
    const result = await apiFetchData<{ user: import('~/composables/useAuth').AuthUser }>('/users/me/profile', {
      method: 'PATCH',
      body,
    })
    authUser.value = result.user ?? authUser.value
  },
  {
    defaultError: 'Failed to save email.',
    onError: (message) => {
      emailHelperText.value = message
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
    const body = { interests: interestsInput.value }
    const result = await apiFetchData<{ user: import('~/composables/useAuth').AuthUser }>('/users/me/profile', {
      method: 'PATCH',
      body,
    })
    authUser.value = result.user ?? authUser.value
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
  if (authUser.value?.usernameIsSet) return false
  return usernameStatus.value === 'available'
})

const { save: saveUsernameRequest, saving, saved } = useFormSave(
  async () => {
    const username = usernameInput.value.trim()
    const result = await apiFetchData<{ user: import('~/composables/useAuth').AuthUser }>('/users/me/username', {
      method: 'PATCH',
      body: { username },
    })

    // Update client auth state with latest user data.
    authUser.value = result.user ?? authUser.value
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

const followVisibilityInput = ref<FollowVisibility>('all')
const privacyError = ref<string | null>(null)

watch(
  () => authUser.value?.followVisibility,
  (v) => {
    const next = (v || 'all') as FollowVisibility
    followVisibilityInput.value = next
  },
  { immediate: true }
)

const privacyDirty = computed(() => (authUser.value?.followVisibility || 'all') !== followVisibilityInput.value)

const { save: savePrivacyRequest, saving: privacySaving, saved: privacySaved } = useFormSave(
  async () => {
    const result = await apiFetchData<{ user: import('~/composables/useAuth').AuthUser }>('/users/me/settings', {
      method: 'PATCH',
      body: { followVisibility: followVisibilityInput.value }
    })
    authUser.value = result.user ?? authUser.value
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
    const result = await apiFetchData<{ user: import('~/composables/useAuth').AuthUser }>('/users/me/settings', {
      method: 'PATCH',
      body: { stewardBadgeEnabled: stewardBadgeEnabledInput.value }
    })
    authUser.value = result.user ?? authUser.value
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

  if (authUser.value?.usernameIsSet && !isCaseOnlyChange.value) {
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

