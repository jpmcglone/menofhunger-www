<template>
  <div class="h-[calc(100dvh-9rem)] sm:h-[calc(100dvh-6.5rem)]">
    <div class="grid h-full" :class="isTinyViewport ? 'grid-cols-1' : ''" :style="gridStyle">
      <!-- Left column: section list -->
      <section
        v-if="showListPane"
        :class="[
          'h-full overflow-y-auto border-b border-gray-200 dark:border-zinc-800',
          !isTinyViewport ? 'border-b-0 border-r pr-4' : 'pr-0'
        ]"
      >
        <div class="text-lg font-semibold">Settings</div>

        <div class="mt-3">
          <InputText v-model="sectionQuery" class="w-full" placeholder="Search settings…" />
        </div>

        <div class="mt-4 space-y-2">
          <button
            v-for="s in filteredSections"
            :key="s.key"
            type="button"
            class="w-full text-left"
            @click="selectedSection = s.key"
          >
            <div
              :class="[
                'w-full rounded-xl border p-3 transition-colors',
                selectedSection === s.key
                  ? 'border-gray-300 bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900'
                  : 'border-gray-200 hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-900'
              ]"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <div class="font-semibold truncate text-gray-900 dark:text-gray-50">{{ s.label }}</div>
                  <div class="text-sm text-gray-600 dark:text-gray-300 truncate">{{ s.description }}</div>
                </div>
                <i class="pi pi-angle-right text-gray-400" aria-hidden="true" />
              </div>
            </div>
          </button>
        </div>
      </section>

      <!-- Right column: selected section -->
      <section v-if="showDetailPane" :class="['h-full overflow-hidden', !isTinyViewport ? 'pl-4' : '']">
        <div class="flex h-full flex-col">
          <div class="border-b border-gray-200 py-3 dark:border-zinc-800">
            <div class="flex items-center justify-between gap-3">
              <div class="flex min-w-0 items-start gap-2">
                <Button
                  v-if="isTinyViewport && selectedSection"
                  icon="pi pi-arrow-left"
                  text
                  severity="secondary"
                  aria-label="Back"
                  @click="selectedSection = null"
                />
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

          <div class="flex-1 overflow-y-auto py-4">
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
                    icon="pi pi-check"
                    :loading="saving"
                    :disabled="saving || !canSaveUsername"
                    @click="save"
                  />
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
                    icon="pi pi-check"
                    severity="secondary"
                    :loading="emailSaving"
                    :disabled="emailSaving || !emailDirty"
                    @click="saveEmail"
                  />
                </div>
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
                    icon="pi pi-check"
                    severity="secondary"
                    :loading="privacySaving"
                    :disabled="privacySaving || !privacyDirty"
                    @click="savePrivacy"
                  />
                  <div v-if="privacySaved" class="text-sm text-green-700 dark:text-green-300">Saved.</div>
                </div>

                <div v-if="privacyError" class="text-sm text-red-700 dark:text-red-300">
                  {{ privacyError }}
                </div>
              </div>

              <div v-else-if="selectedSection === 'notifications'" class="space-y-6">
                <div class="space-y-2">
                  <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Browser notifications</div>
                  <div class="text-sm text-gray-600 dark:text-gray-300">
                    Get notified when you're not on the site (e.g. tab closed or in the background).
                  </div>
                </div>
                <div v-if="!pushVapidConfigured" class="space-y-2">
                  <p class="text-sm text-amber-700 dark:text-amber-300">
                    Push notifications are not configured. To enable them (e.g. on localhost), add the same VAPID public key used by the API to the www app.
                  </p>
                  <p class="text-xs text-gray-600 dark:text-gray-400">
                    In <code class="rounded bg-gray-200 px-1 dark:bg-gray-700">menofhunger-www/.env</code> set <code class="rounded bg-gray-200 px-1 dark:bg-gray-700">NUXT_PUBLIC_VAPID_PUBLIC_KEY</code> to the value of <code class="rounded bg-gray-200 px-1 dark:bg-gray-700">VAPID_PUBLIC_KEY</code> from <code class="rounded bg-gray-200 px-1 dark:bg-gray-700">menofhunger-api/.env</code>, then restart the dev server.
                  </p>
                </div>
                <div v-else-if="!pushIsSupported" class="text-sm text-gray-600 dark:text-gray-400">
                  Push notifications are not supported in this browser.
                </div>
                <div v-else class="flex flex-col items-start gap-3">
                  <div v-if="pushRequiresInstall" class="text-sm text-gray-600 dark:text-gray-400">
                    On iOS Safari, install this site to your Home Screen to enable notifications. Tap Share → Add to Home Screen, then reopen the app.
                  </div>
                  <div class="flex flex-wrap items-center gap-3">
                  <Button
                    v-if="!pushIsSubscribed && pushPermission !== 'denied'"
                    label="Enable browser notifications"
                    icon="pi pi-bell"
                    :loading="pushIsRegistering"
                    :disabled="pushIsRegistering || pushRequiresInstall"
                    @click="pushSubscribe"
                  />
                  <Button
                    v-else-if="pushIsSubscribed"
                    label="Disable browser notifications"
                    icon="pi pi-bell-slash"
                    severity="secondary"
                    @click="pushUnsubscribe"
                  />
                  <Button
                    v-if="pushIsSubscribed"
                    label="Send test notification"
                    icon="pi pi-send"
                    severity="secondary"
                    :loading="pushTestSending"
                    :disabled="pushTestSending"
                    @click="sendPushTest"
                  />
                  <span v-else-if="pushPermission === 'denied'" class="text-sm text-gray-600 dark:text-gray-400">
                    Notifications were denied. Enable them in your browser settings for this site to try again.
                  </span>
                  <span v-if="pushErrorMessage" class="text-sm text-red-700 dark:text-red-300">
                    {{ pushErrorMessage }}
                  </span>
                  <span v-if="pushTestMessage" class="text-sm text-gray-600 dark:text-gray-400">
                    {{ pushTestMessage }}
                  </span>
                  </div>
                </div>
              </div>

              <div v-else-if="selectedSection === 'links'" class="space-y-4">
                <div class="flex flex-col gap-3">
                  <NuxtLink to="/about" class="inline-flex items-center gap-3 text-gray-800 hover:underline dark:text-gray-200">
                    <i class="pi pi-info-circle text-gray-500 dark:text-gray-400" aria-hidden="true" />
                    <span class="font-medium">About</span>
                  </NuxtLink>
                  <NuxtLink to="/privacy" class="inline-flex items-center gap-3 text-gray-800 hover:underline dark:text-gray-200">
                    <i class="pi pi-lock text-gray-500 dark:text-gray-400" aria-hidden="true" />
                    <span class="font-medium">Privacy</span>
                  </NuxtLink>
                  <NuxtLink to="/terms" class="inline-flex items-center gap-3 text-gray-800 hover:underline dark:text-gray-200">
                    <i class="pi pi-file text-gray-500 dark:text-gray-400" aria-hidden="true" />
                    <span class="font-medium">Terms</span>
                  </NuxtLink>
                  <NuxtLink to="/feedback" class="inline-flex items-center gap-3 text-gray-800 hover:underline dark:text-gray-200">
                    <i class="pi pi-comment text-gray-500 dark:text-gray-400" aria-hidden="true" />
                    <span class="font-medium">Send feedback</span>
                  </NuxtLink>
                </div>
                <div class="text-xs moh-text-muted">
                  We’re building this out. Submissions aren’t sent yet.
                </div>
              </div>

              <div v-else class="text-sm text-gray-600 dark:text-gray-300">
                Choose a section from the left.
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
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
type SettingsSection = 'account' | 'privacy' | 'notifications' | 'links'

const { user: authUser, ensureLoaded } = useAuth()

// Ensure we have the current user (so inputs can prefill immediately).
await ensureLoaded()

const { apiFetch, apiFetchData } = useApiClient()
import { getApiErrorMessage } from '~/utils/api-error'
import { useFormSave } from '~/composables/useFormSave'
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

onMounted(() => {
  void refreshSubscriptionState()
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

const selectedSection = ref<SettingsSection | null>(null)
const sectionQuery = ref('')

const sections = computed(() => [
  {
    key: 'account' as const,
    label: 'Your account',
    description: 'Username and profile basics.'
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

const { isTinyViewport, showListPane, showDetailPane, gridStyle } = useTwoPaneLayout(selectedSection, {
  leftCols: '22rem',
})

watch(
  isTinyViewport,
  (tiny) => {
    // On tiny viewports, default to list view. On desktop, default to first section.
    if (tiny) {
      selectedSection.value = null
      return
    }
    if (!selectedSection.value) selectedSection.value = 'account'
  },
  { immediate: true }
)

const selectedSectionLabel = computed(() => sections.value.find((s) => s.key === selectedSection.value)?.label || 'Settings')
const selectedSectionDescription = computed(
  () => sections.value.find((s) => s.key === selectedSection.value)?.description || 'Choose a section.'
)

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

async function savePrivacy() {
  privacyError.value = null
  privacySaved.value = false
  await savePrivacyRequest()
}

function sendFeedback() {
  const subject = encodeURIComponent(`${siteConfig.name} Feedback`)
  const href = `mailto:feedback@menofhunger.com?subject=${subject}`
  if (import.meta.client) window.open(href, '_blank', 'noopener,noreferrer')
}
</script>

