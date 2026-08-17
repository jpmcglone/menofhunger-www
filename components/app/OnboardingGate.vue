<template>
  <div
    v-if="show"
    class="fixed inset-0 z-[70] bg-white/95 dark:bg-black/90"
  >
    <div class="h-full w-full overflow-y-auto">
      <div class="min-h-full flex items-start sm:items-center justify-center p-4 sm:py-8">
        <div class="w-full max-w-xl">
          <div class="rounded-2xl border moh-border moh-bg p-5 shadow-sm flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-4rem)]">
            <div class="shrink-0 flex items-start gap-3">
              <Button
                v-if="page > 1"
                type="button"
                text
                rounded
                severity="secondary"
                aria-label="Back"
                :disabled="submitting"
                class="!p-1.5 -ml-1.5"
                @click="goBack"
              >
                <template #icon>
                  <Icon name="tabler:chevron-left" aria-hidden="true" />
                </template>
              </Button>
              <div class="min-w-0 flex-1">
                <div class="text-xl font-bold tracking-tight">{{ pageHeading }}</div>
                <div class="mt-1 text-sm moh-text-muted">{{ pageSubtitle }}</div>
              </div>
            </div>

            <div class="mt-4 flex items-center gap-1.5" aria-hidden="true">
              <span
                v-for="n in 3"
                :key="n"
                class="h-1.5 flex-1 rounded-full"
                :class="n <= page ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-zinc-800'"
              />
            </div>

            <div class="mt-5 space-y-4 overflow-y-auto min-h-0 pr-1 -mr-1 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <div v-show="page === 1" class="space-y-4">
                <AppUsernameField
                  v-model="usernameInput"
                  tone="moh"
                  :status="usernameStatus"
                  :helper-text="usernameErrorText"
                  :disabled="submitting"
                  :invalid="showUsernameError"
                  placeholder="username"
                >
                  <template #label>
                    <label class="text-sm font-medium" :class="showUsernameError ? 'text-red-500 dark:text-red-400' : 'moh-text'">
                      Username<span class="ml-0.5" :class="showUsernameError ? 'text-red-500' : 'moh-text-muted'">*</span>
                    </label>
                  </template>
                </AppUsernameField>

                <div class="space-y-2">
                  <label class="text-sm font-medium moh-text">
                    Display name <span class="moh-text-muted font-normal">(optional)</span>
                  </label>
                  <InputText
                    v-model="displayName"
                    class="w-full"
                    placeholder="How you appear"
                    maxlength="50"
                    autocomplete="name"
                    :disabled="submitting"
                  />
                  <p class="text-xs moh-text-muted">A first name is enough. Username is your identity.</p>
                </div>

                <div class="space-y-2">
                  <label class="text-sm font-medium moh-text">
                    Email <span class="moh-text-muted font-normal">(optional)</span>
                  </label>
                  <InputText
                    v-model="email"
                    type="email"
                    class="w-full"
                    placeholder="you@example.com"
                    autocomplete="email"
                    :disabled="submitting"
                    :invalid="showEmailError"
                  />
                  <p class="text-xs" :class="showEmailError ? 'text-red-500 dark:text-red-400' : 'moh-text-muted'">
                    {{ showEmailError ? 'Enter a valid email address.' : 'Helps us reach you for account support.' }}
                  </p>
                </div>

                <div class="space-y-2">
                  <label class="text-sm font-medium moh-text">
                    Referral code <span class="moh-text-muted font-normal">(optional)</span>
                  </label>
                  <InputText
                    v-model="referralCodeInput"
                    class="w-full font-mono"
                    placeholder="e.g. JOHNDOE"
                    autocomplete="off"
                    spellcheck="false"
                    maxlength="20"
                    :disabled="submitting || referralLocked"
                  />
                  <p v-if="referralLocked" class="text-xs text-green-700 dark:text-green-400">
                    Referral applied. It can’t be changed.
                  </p>
                  <p v-else class="text-xs moh-text-muted">
                    Enter his code and you’ll automatically follow him.
                  </p>
                  <p v-if="referralError" class="text-xs text-red-600 dark:text-red-400">{{ referralError }}</p>
                </div>

                <div class="space-y-2">
                  <label class="text-sm font-medium" :class="showHeardAboutError ? 'text-red-500 dark:text-red-400' : 'moh-text'">
                    {{ VOICE.onboarding.heardAboutLabel }}<span class="ml-0.5" :class="showHeardAboutError ? 'text-red-500' : 'moh-text-muted'">*</span>
                  </label>
                  <Select
                    v-model="heardAboutUs"
                    :options="HEARD_ABOUT_US_OPTIONS"
                    option-label="label"
                    option-value="value"
                    placeholder="Select one"
                    class="w-full"
                    :disabled="submitting"
                    :invalid="showHeardAboutError"
                  />
                  <p v-if="showHeardAboutError" class="text-xs text-red-500 dark:text-red-400">
                    How you heard about us is required.
                  </p>
                  <InputText
                    v-if="heardAboutUs === 'other'"
                    v-model="heardAboutUsOther"
                    class="w-full"
                    placeholder="Tell us how you found us"
                    maxlength="80"
                    :disabled="submitting"
                    :invalid="showHeardAboutOtherError"
                  />
                  <p v-if="showHeardAboutOtherError" class="text-xs text-red-500 dark:text-red-400">
                    Tell us how you found us.
                  </p>
                </div>
              </div>

              <div v-show="page === 2" class="space-y-2">
                <label class="text-sm font-medium" :class="showInterestsError ? 'text-red-500 dark:text-red-400' : 'moh-text'">
                  Arenas<span class="ml-0.5" :class="showInterestsError ? 'text-red-500' : 'moh-text-muted'">*</span>
                </label>
                <AppInterestsPicker
                  v-model="interests"
                  :disabled="submitting"
                  :invalid="showInterestsError"
                  label=""
                  helper-right=""
                  helper-bottom=""
                  description="Pick the arenas you're building in."
                />
                <p v-if="showInterestsError" class="text-xs text-red-500 dark:text-red-400">
                  Pick at least one arena.
                </p>
              </div>

              <div v-show="page === 3" class="space-y-4">
                <div class="space-y-2">
                  <label class="text-sm font-medium" :class="showBirthdateError ? 'text-red-500 dark:text-red-400' : 'moh-text'">
                    Birthday<span v-if="!birthdateLocked" class="ml-0.5" :class="showBirthdateError ? 'text-red-500' : 'moh-text-muted'">*</span>
                  </label>
                  <AppDateOfBirthInput v-if="!birthdateLocked" v-model="birthdate" :disabled="submitting" :invalid="showBirthdateError" />
                  <div v-else class="w-full rounded-xl border moh-border px-3 py-2 text-sm moh-text">
                    {{ birthdatePretty }}
                  </div>
                  <div class="text-xs" :class="showBirthdateError ? 'text-red-500 dark:text-red-400' : 'moh-text-muted'">
                    <span v-if="birthdateLocked">Birthday is locked once set.</span>
                    <span v-else-if="showBirthdateError">{{ birthdateErrorText }}</span>
                    <span v-else>Must be 18+ to join.</span>
                  </div>
                </div>

                <div class="space-y-2">
                  <label class="text-sm font-medium moh-text">
                    ZIP code <span class="moh-text-muted font-normal">(optional)</span>
                  </label>
                  <InputText
                    v-model="locationZipInput"
                    inputmode="numeric"
                    maxlength="5"
                    placeholder="5-digit ZIP code"
                    class="w-full"
                    :invalid="showZipError"
                    @input="onLocationZipInput"
                  />
                  <Transition
                    enter-active-class="transition-all duration-200 ease-out"
                    enter-from-class="opacity-0 -translate-y-1"
                    enter-to-class="opacity-100 translate-y-0"
                    leave-active-class="transition-all duration-150 ease-in"
                    leave-from-class="opacity-100 translate-y-0"
                    leave-to-class="opacity-0 -translate-y-1"
                  >
                    <div v-if="locationPreview" class="flex items-center gap-2 py-0.5">
                      <ClientOnly>
                        <AppStateShape
                          v-if="locationPreview.state"
                          :state="locationPreview.state"
                          class="h-4 w-4 shrink-0 opacity-80"
                        />
                      </ClientOnly>
                      <span class="text-sm font-medium moh-text">{{ locationPreview.stateDisplay ?? locationPreview.state }}</span>
                      <span v-if="locationPreview.city" class="text-sm moh-text-muted">· {{ locationPreview.city }}</span>
                    </div>
                    <div v-else-if="locationPreviewLoading" class="flex items-center gap-1.5 py-0.5">
                      <Icon name="tabler:loader-2" class="animate-spin moh-text-muted h-4 w-4" />
                    </div>
                    <div v-else-if="showZipError" class="py-0.5">
                      <span class="text-xs text-red-500">ZIP code not found</span>
                    </div>
                  </Transition>
                  <p class="text-xs moh-text-muted">Helps you connect with men in your state.</p>
                </div>

                <div class="space-y-2">
                  <label class="text-sm font-medium" :class="showCommunityError ? 'text-red-500 dark:text-red-400' : 'moh-text'">
                    Community<span v-if="!menConfirmLocked" class="ml-0.5" :class="showCommunityError ? 'text-red-500' : 'moh-text-muted'">*</span>
                  </label>
                  <button
                    type="button"
                    class="flex w-full items-start gap-3 rounded-xl border p-3 text-left"
                    :class="showCommunityError ? 'border-red-500 dark:border-red-400' : 'moh-border'"
                    :disabled="submitting || menConfirmLocked"
                    @click="toggleMenOnlyConfirmed"
                  >
                    <Checkbox
                      :modelValue="menOnlyConfirmed"
                      binary
                      inputId="moh-men-only"
                      :disabled="submitting || menConfirmLocked"
                      @click.stop
                      @update:modelValue="(v) => (menOnlyConfirmed = Boolean(v))"
                    />
                    <div class="text-sm moh-text leading-snug">
                      {{ VOICE.onboarding.menConfirm }}
                      <div class="mt-1 text-xs moh-text-muted">
                        You can browse right away. Posting and messaging require verification first.
                      </div>
                    </div>
                  </button>
                  <p v-if="showCommunityError" class="text-xs text-red-500 dark:text-red-400">
                    Confirm you’re joining as a man.
                  </p>
                </div>
              </div>

              <div v-if="error" class="text-sm text-red-700 dark:text-red-300">
                {{ error }}
              </div>

              <div class="flex items-center justify-end gap-3 pt-1">
                <Button
                  class="moh-onboarding-cta"
                  :label="page === 3 ? VOICE.onboarding.ctaStart : VOICE.onboarding.ctaContinue"
                  :loading="submitting"
                  :disabled="submitting"
                  @click="continuePage"
                >
                  <template #icon>
                    <Icon name="tabler:arrow-right" aria-hidden="true" />
                  </template>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { VOICE } from '~/config/voice'
import { getApiErrorMessage } from '~/utils/api-error'
import {
  firstIncompleteOnboardingPage,
  HEARD_ABOUT_US_OPTIONS,
  isOnboardingFullyComplete,
  needsOnboarding,
} from '~/utils/onboarding'
import { formatDateOnly } from '~/utils/time-format'
import type { HeardAboutUs } from '~/types/api'

const { user, ensureLoaded, me } = useAuth()
const usersStore = useUsersStore()
const { apiFetchData } = useApiClient()
const {
  capturedReferralCode,
  appliedReferralCode,
  captureReferralFromRoute,
  markReferralApplied,
  clearReferralCapture,
} = useReferralCapture()

await ensureLoaded()

const show = computed(() => {
  const u = user.value
  if (!u?.id) return false
  return needsOnboarding(u)
})

const page = ref<1 | 2 | 3>(1)
const didLand = ref(false)

watch(
  () => user.value,
  (u) => {
    if (!u || didLand.value) return
    page.value = firstIncompleteOnboardingPage(u)
    didLand.value = true
  },
  { immediate: true },
)

const pageHeading = computed(() => {
  if (page.value === 1) return VOICE.onboarding.accountHeading
  if (page.value === 2) return VOICE.onboarding.interestsHeading
  return VOICE.onboarding.doorHeading
})

const pageSubtitle = computed(() => {
  if (page.value === 1) return VOICE.onboarding.accountSubtitle
  if (page.value === 2) return VOICE.onboarding.interestsSubtitle
  return VOICE.onboarding.doorSubtitle
})

const usernameInput = ref('')
const displayName = ref('')
const email = ref('')
const heardAboutUs = ref<HeardAboutUs | null>(null)
const heardAboutUsOther = ref('')
const birthdate = ref('')
const interests = ref<string[]>([])
const menOnlyConfirmed = ref(false)
const locationZipInput = ref('')
const locationPreview = ref<import('~/types/api').LocationPreviewResponse | null>(null)
const locationPreviewLoading = ref(false)
const locationPreviewNotFound = ref(false)

let locationPreviewDebounce: ReturnType<typeof setTimeout> | null = null

async function fetchLocationPreview(zip: string) {
  locationPreviewLoading.value = true
  locationPreviewNotFound.value = false
  try {
    locationPreview.value = await apiFetchData<import('~/types/api').LocationPreviewResponse>(
      '/users/location-preview',
      { method: 'GET', query: { zip } },
    )
  } catch {
    locationPreview.value = null
    locationPreviewNotFound.value = true
  } finally {
    locationPreviewLoading.value = false
  }
}

function onLocationZipInput() {
  locationPreview.value = null
  locationPreviewNotFound.value = false
  if (locationPreviewDebounce) clearTimeout(locationPreviewDebounce)
  const zip = locationZipInput.value.replace(/\D/g, '').slice(0, 5)
  locationZipInput.value = zip
  if (zip.length !== 5) return
  locationPreviewDebounce = setTimeout(() => void fetchLocationPreview(zip), 300)
}

const usernameLocked = computed(() => Boolean(user.value?.usernameIsSet))
const birthdateLocked = computed(() => Boolean(user.value?.birthdate))
const menConfirmLocked = computed(() => Boolean(user.value?.menOnlyConfirmed))
const currentUsername = computed(() => (user.value?.username ?? '').trim())

const birthdatePretty = computed(() => {
  const raw = (user.value?.birthdate ?? '').slice(0, 10)
  if (!raw) return '—'
  return formatDateOnly(`${raw}T00:00:00.000Z`, {
    dateOptions: { year: 'numeric', month: 'long', day: 'numeric' },
    fallback: raw,
  })
})

watch(
  () => user.value,
  (u) => {
    if (!u) return
    if (!usernameInput.value.trim() && u.username) usernameInput.value = u.username
    if (!displayName.value.trim() && u.name) displayName.value = u.name
    if (!birthdate.value && u.birthdate) birthdate.value = u.birthdate.slice(0, 10)
    if (interests.value.length === 0 && Array.isArray(u.interests)) interests.value = u.interests
    if (!email.value && u.email) email.value = u.email
    if (!menOnlyConfirmed.value && u.menOnlyConfirmed) menOnlyConfirmed.value = true
    if (!heardAboutUs.value && u.heardAboutUs) heardAboutUs.value = u.heardAboutUs
    if (!heardAboutUsOther.value && u.heardAboutUsOther) heardAboutUsOther.value = u.heardAboutUsOther
    if (!locationZipInput.value && u.locationZip) {
      locationZipInput.value = u.locationZip
      if (u.locationZip.length === 5) void fetchLocationPreview(u.locationZip)
    }
  },
  { immediate: true, deep: true },
)

const {
  status: usernameStatus,
  helperText: usernameHelp,
  isCaseOnlyChange: usernameIsCaseOnly,
} = useUsernameField({
  value: usernameInput,
  currentUsername,
  usernameIsSet: usernameLocked,
  debounceMs: 450,
  lockedInvalidMessage: 'Username can’t be changed here. Only capitalization is allowed.',
  caseOnlyMessage: () => {
    const trimmed = usernameInput.value.trim()
    return trimmed === currentUsername.value ? 'Username is set.' : 'Only capitalization changes are allowed (this change is OK).'
  },
})

const referralCodeInput = ref('')
const referralError = ref<string | null>(null)
const referralLocked = computed(() => Boolean(user.value?.hasRecruiter || appliedReferralCode.value))

const route = useRoute()
watch(
  () => route.query.ref,
  () => {
    captureReferralFromRoute(route)
  },
  { immediate: true },
)

watch(
  [capturedReferralCode, appliedReferralCode],
  ([captured, applied]) => {
    const code = applied || captured
    if (code && !referralCodeInput.value.trim()) referralCodeInput.value = code
  },
  { immediate: true },
)

const error = ref<string | null>(null)
const submitting = ref(false)
const attempted = ref(false)

const birthdateInvalid = computed(() => {
  if (page.value !== 3 || birthdateLocked.value) return false
  return !birthdate.value || !isBirthdate18Plus(birthdate.value)
})

const birthdateErrorText = computed(() => {
  if (!birthdate.value) return 'Birthday is required.'
  const d = new Date(`${birthdate.value}T00:00:00.000Z`)
  if (!Number.isNaN(d.getTime()) && d > new Date()) return 'Birthday can\'t be in the future.'
  return 'You must be at least 18 years old to join.'
})

const communityInvalid = computed(() =>
  page.value === 3 && !menConfirmLocked.value && !menOnlyConfirmed.value,
)

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)
}

const emailInvalid = computed(() => {
  const v = email.value.trim()
  return v.length > 0 && !isValidEmail(v)
})

const heardAboutInvalid = computed(() => !heardAboutUs.value)
const heardAboutOtherInvalid = computed(() =>
  heardAboutUs.value === 'other' && !heardAboutUsOther.value.trim(),
)
const interestsInvalid = computed(() => !Array.isArray(interests.value) || interests.value.length < 1)

const usernameInvalid = computed(() => {
  if (usernameLocked.value) {
    return !usernameInput.value.trim() || !usernameIsCaseOnly.value
  }
  const s = usernameStatus.value
  return s !== 'available' && s !== 'checking' && s !== 'same'
})

const showUsernameError = computed(() => attempted.value && usernameInvalid.value)
const showEmailError = computed(() => attempted.value && emailInvalid.value)
const showHeardAboutError = computed(() => attempted.value && heardAboutInvalid.value)
const showHeardAboutOtherError = computed(() => attempted.value && heardAboutOtherInvalid.value)
const showInterestsError = computed(() => attempted.value && interestsInvalid.value)
const showBirthdateError = computed(() => attempted.value && birthdateInvalid.value)
const showCommunityError = computed(() => attempted.value && communityInvalid.value)
const showZipError = computed(() => attempted.value && locationPreviewNotFound.value)

const usernameErrorText = computed(() => {
  const help = usernameHelp.value
  const s = usernameStatus.value
  if (s === 'available' || s === 'same' || s === 'checking') return help
  if (showUsernameError.value) return help || 'Username is required.'
  return null
})

const canContinue = computed(() => {
  if (page.value === 1) {
    if (emailInvalid.value || heardAboutInvalid.value || heardAboutOtherInvalid.value) return false
    if (!usernameInput.value.trim()) return false
    if (usernameLocked.value) return usernameIsCaseOnly.value
    return usernameStatus.value === 'available'
  }
  if (page.value === 2) {
    return Array.isArray(interests.value) && interests.value.length >= 1
  }
  if (!menConfirmLocked.value && menOnlyConfirmed.value !== true) return false
  if (!birthdateLocked.value && (!birthdate.value || !isBirthdate18Plus(birthdate.value))) return false
  return true
})

function isBirthdate18Plus(yyyyMmDd: string): boolean {
  const raw = (yyyyMmDd ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false
  const d = new Date(`${raw}T00:00:00.000Z`)
  if (Number.isNaN(d.getTime())) return false

  const now = new Date()
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const cutoff = new Date(Date.UTC(todayUtc.getUTCFullYear() - 18, todayUtc.getUTCMonth(), todayUtc.getUTCDate()))
  return d.getTime() <= cutoff.getTime()
}

function toggleMenOnlyConfirmed() {
  if (submitting.value || menConfirmLocked.value) return
  menOnlyConfirmed.value = !menOnlyConfirmed.value
}

function goBack() {
  attempted.value = false
  if (page.value > 1) page.value = (page.value - 1) as 1 | 2 | 3
}

async function continuePage() {
  if (!canContinue.value) {
    attempted.value = true
    return
  }
  attempted.value = false
  submitting.value = true
  error.value = null
  referralError.value = null
  try {
    if (page.value === 1) await saveAccountPage()
    else if (page.value === 2) await saveInterestsPage()
    else await saveDoorPage()

    if (!isOnboardingFullyComplete(user.value)) {
      page.value = firstIncompleteOnboardingPage(user.value)
      return
    }
    await finishOnboarding()
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to save. Please try again.'
  } finally {
    submitting.value = false
  }
}

async function patchOnboarding(payload: Record<string, unknown>) {
  const res = await apiFetchData<{ user: import('~/composables/useAuth').AuthUser }>('/users/me/onboarding', {
    method: 'PATCH',
    body: payload,
  })
  user.value = res.user ?? user.value
}

async function saveAccountPage() {
  const payload: Record<string, unknown> = {
    name: displayName.value.trim(),
    email: email.value.trim() ? email.value.trim() : '',
    heardAboutUs: heardAboutUs.value,
    heardAboutUsOther: heardAboutUs.value === 'other' ? heardAboutUsOther.value.trim() : null,
  }
  const trimmedUsername = usernameInput.value.trim()
  if (!usernameLocked.value) {
    payload.username = trimmedUsername
  } else if (trimmedUsername && trimmedUsername !== currentUsername.value && usernameIsCaseOnly.value) {
    payload.username = trimmedUsername
  }
  await patchOnboarding(payload)
  await applyReferralIfNeeded()
}

async function saveInterestsPage() {
  await patchOnboarding({ interests: interests.value })
}

async function saveDoorPage() {
  if (!birthdateLocked.value && birthdate.value && !isBirthdate18Plus(birthdate.value)) {
    throw new Error('You must be at least 18 years old to join Men of Hunger.')
  }
  const payload: Record<string, unknown> = {}
  if (!birthdateLocked.value) payload.birthdate = birthdate.value
  if (!menConfirmLocked.value) payload.menOnlyConfirmed = Boolean(menOnlyConfirmed.value)
  if (locationPreview.value && locationZipInput.value.length === 5) {
    payload.locationQuery = locationZipInput.value
  }
  await patchOnboarding(payload)
}

async function applyReferralIfNeeded() {
  const code = referralCodeInput.value.trim()
  if (!code || referralLocked.value) {
    if (referralLocked.value) clearReferralCapture()
    return
  }
  try {
    await apiFetchData('/billing/referral/set-recruiter', { method: 'POST', body: { code } })
    markReferralApplied(code)
    if (user.value) user.value = { ...user.value, hasRecruiter: true }
  } catch (e: unknown) {
    const msg = getApiErrorMessage(e) ?? ''
    if (!msg.toLowerCase().includes('already been set')) {
      referralError.value = msg || 'Referral code not applied.'
    } else {
      markReferralApplied(code)
      if (user.value) user.value = { ...user.value, hasRecruiter: true }
    }
  } finally {
    clearReferralCapture()
  }
}

async function finishOnboarding() {
  const { whenSocketConnected, emitActivity } = usePresence()
  void whenSocketConnected(5000).then(() => emitActivity())
  useNuxtApp().$posthog?.capture('onboarding_completed', {
    arena_count: interests.value.length,
  })
  const latest = await me()
  const username = (latest?.username ?? user.value?.username ?? usernameInput.value).trim()
  if (!username) return
  if (latest) {
    usersStore.upsert({
      id: latest.id,
      username: latest.username ?? username,
      name: latest.name ?? (displayName.value.trim() || null),
      bio: latest.bio ?? null,
      avatarUrl: latest.avatarUrl ?? null,
      bannerUrl: latest.bannerUrl ?? null,
      premium: latest.premium,
      premiumPlus: latest.premiumPlus,
      verifiedStatus: latest.verifiedStatus,
      pinnedPostId: latest.pinnedPostId ?? null,
    })
  }
  clearNuxtData(`public-profile:${username.toLowerCase()}`)
  useState('pending-edit-profile', () => false).value = true
  await navigateTo(`/u/${encodeURIComponent(username)}`, { replace: true })
}
</script>

<style scoped>
@media (hover: hover) {
  :deep(.moh-onboarding-cta.p-button:not(:disabled):hover) {
    background: color-mix(in srgb, var(--p-primary-color, #111827) 78%, white) !important;
    border-color: transparent !important;
    filter: brightness(1.08);
  }
}
</style>
