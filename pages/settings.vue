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
                <div class="space-y-2">
                  <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Username</label>
                  <div class="relative">
                    <span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">@</span>
                    <InputText
                      v-model="usernameInput"
                      class="w-full !pl-10"
                      placeholder="your_handle"
                      autocomplete="off"
                      :disabled="saving"
                    />
                    <div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                      <i v-if="checking" class="pi pi-spin pi-spinner text-gray-500" aria-hidden="true" />
                      <i
                        v-else-if="availability === 'available' || availability === 'same'"
                        class="pi pi-check text-green-600"
                        aria-hidden="true"
                      />
                      <i
                        v-else-if="availability === 'taken' || availability === 'invalid'"
                        class="pi pi-times text-red-600"
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                  <div v-if="helperText" class="text-sm" :class="helperToneClass">
                    {{ helperText }}
                  </div>
                </div>

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

                <div class="space-y-2 pt-2">
                  <label class="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Email <span class="text-gray-500 dark:text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <InputText
                    v-model="emailInput"
                    class="w-full"
                    placeholder="you@example.com"
                    autocomplete="email"
                    :disabled="emailSaving"
                  />
                  <div v-if="emailHelperText" class="text-sm" :class="emailHelperToneClass">
                    {{ emailHelperText }}
                  </div>
                  <div class="flex items-center gap-3">
                    <Button
                      label="Save email"
                      icon="pi pi-check"
                      severity="secondary"
                      :loading="emailSaving"
                      :disabled="emailSaving || !emailDirty"
                      @click="saveEmail"
                    />
                    <div v-if="emailSaved" class="text-sm text-green-700 dark:text-green-300">Saved.</div>
                  </div>
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

type Availability = 'unknown' | 'checking' | 'available' | 'taken' | 'invalid' | 'same'
type FollowVisibility = 'all' | 'verified' | 'premium' | 'none'
type SettingsSection = 'account' | 'privacy' | 'links'

const { user: authUser, ensureLoaded } = useAuth()

// Ensure we have the current user (so inputs can prefill immediately).
await ensureLoaded()

const { apiFetchData } = useApiClient()
import { getApiErrorMessage } from '~/utils/api-error'
import { siteConfig } from '~/config/site'
const { check: checkUsername } = useUsernameAvailability()

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
const availability = ref<Availability>('unknown')
const checking = computed(() => availability.value === 'checking')
const helperText = ref<string | null>(null)
const helperToneClass = computed(() => {
  if (availability.value === 'available' || availability.value === 'same') return 'text-green-700 dark:text-green-300'
  if (availability.value === 'taken' || availability.value === 'invalid') return 'text-red-700 dark:text-red-300'
  return 'text-gray-600 dark:text-gray-300'
})

const saving = ref(false)
const saved = ref(false)

const emailSaving = ref(false)
const emailSaved = ref(false)
const emailHelperText = ref<string | null>(null)
const emailHelperToneClass = computed(() => {
  if (emailSaved.value) return 'text-green-700 dark:text-green-300'
  if (emailHelperText.value) return 'text-red-700 dark:text-red-300'
  return 'text-gray-600 dark:text-gray-300'
})

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

const currentUsernameLower = computed(() => (authUser.value?.username ?? '').trim().toLowerCase())
const desiredUsernameLower = computed(() => usernameInput.value.trim().toLowerCase())
const isCaseOnlyChange = computed(() => {
  const current = currentUsernameLower.value
  const desired = desiredUsernameLower.value
  if (!current || !desired) return false
  return current === desired
})

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
  return availability.value === 'available'
})

const followVisibilityOptions: Array<{ label: string; value: FollowVisibility }> = [
  { label: 'Public (anyone)', value: 'all' },
  { label: 'Verified members', value: 'verified' },
  { label: 'Premium members', value: 'premium' },
  { label: 'Only me', value: 'none' }
]

const followVisibilityInput = ref<FollowVisibility>('all')
const privacySaving = ref(false)
const privacySaved = ref(false)
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

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function resetHelper() {
  helperText.value = null
  availability.value = 'unknown'
  saved.value = false
}

async function checkAvailability(username: string) {
  availability.value = 'checking'
  helperText.value = null

  const result = await checkUsername(username)
  availability.value = result.status
  helperText.value = result.message
}

watch(
  usernameInput,
  (value) => {
    if (debounceTimer) clearTimeout(debounceTimer)
    resetHelper()

    const trimmed = value.trim()
    if (!trimmed) return

    const currentLower = currentUsernameLower.value
    const desiredLower = trimmed.toLowerCase()

    // Capitalization-only change is always allowed (even for legacy/special-case usernames).
    if (currentLower && desiredLower === currentLower) {
      availability.value = 'same'
      helperText.value = 'Only capitalization changes are allowed (this change is OK).'
      return
    }

    // If username is already set, disallow non-cap changes and tell the user explicitly.
    if (authUser.value?.usernameIsSet) {
      availability.value = 'invalid'
      helperText.value = 'Only capitalization changes are allowed for your username.'
      return
    }

    debounceTimer = setTimeout(() => {
      void checkAvailability(trimmed)
    }, 500)
  },
  { flush: 'post' }
)

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})

async function save() {
  saved.value = false
  helperText.value = null

  const username = usernameInput.value.trim()
  if (!username) return

  if (authUser.value?.usernameIsSet && !isCaseOnlyChange.value) {
    availability.value = 'invalid'
    helperText.value = 'Only capitalization changes are allowed for your username.'
    return
  }

  saving.value = true
  try {
    const result = await apiFetchData<{ user: any }>('/users/me/username', {
      method: 'PATCH',
      body: { username },
    })

    // Update client auth state with latest user data.
    authUser.value = result.user ?? authUser.value
    saved.value = true
  } catch (e: unknown) {
    helperText.value = getApiErrorMessage(e) || 'Failed to save username.'
  } finally {
    saving.value = false
  }
}

async function saveEmail() {
  if (emailSaving.value) return
  emailSaved.value = false
  emailHelperText.value = null
  emailSaving.value = true
  try {
    const raw = emailInput.value.trim()
    const body = { email: raw ? raw : '' }
    const result = await apiFetchData<{ user: any }>('/users/me/profile', {
      method: 'PATCH',
      body,
    })
    authUser.value = result.user ?? authUser.value
    emailSaved.value = true
  } catch (e: unknown) {
    emailHelperText.value = getApiErrorMessage(e) || 'Failed to save email.'
  } finally {
    emailSaving.value = false
  }
}

async function savePrivacy() {
  privacySaved.value = false
  privacyError.value = null
  privacySaving.value = true
  try {
    const result = await apiFetchData<{ user: any }>('/users/me/settings', {
      method: 'PATCH',
      body: { followVisibility: followVisibilityInput.value }
    })
    authUser.value = result.user ?? authUser.value
    privacySaved.value = true
  } catch (e: unknown) {
    privacyError.value = getApiErrorMessage(e) || 'Failed to save privacy.'
  } finally {
    privacySaving.value = false
  }
}

function sendFeedback() {
  const subject = encodeURIComponent(`${siteConfig.name} Feedback`)
  const href = `mailto:feedback@menofhunger.com?subject=${subject}`
  if (import.meta.client) window.open(href, '_blank', 'noopener,noreferrer')
}
</script>

