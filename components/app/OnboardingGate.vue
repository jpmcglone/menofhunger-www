<template>
  <section v-if="show" class="onboarding-screen moh-bg moh-text" role="dialog" aria-modal="true" aria-labelledby="setup-heading">
    <div class="onboarding-column">
      <nav class="min-h-11 flex items-center">
        <button v-if="page === 2" type="button" class="min-h-11 moh-focus" :disabled="submitting" @click="goBack">‹ Back</button>
        <span v-else class="text-xs font-semibold text-[var(--moh-brass)]">MEN OF HUNGER</span>
      </nav>
      <form class="onboarding-form" @submit.prevent="continuePage">
        <div class="onboarding-content">
          <p class="text-xs font-semibold text-[var(--moh-brass)]">SETUP · {{ page }} OF 2</p>
          <h1 id="setup-heading" ref="headingRef" tabindex="-1" class="text-[28px] leading-9 font-semibold">{{ page === 1 ? 'Make it yours.' : 'What are you building?' }}</h1>
          <template v-if="page === 1">
            <div class="space-y-2">
              <label for="setup-username">Username</label>
              <InputText id="setup-username" v-model="usernameInput" class="setup-input w-full" placeholder="@ username" autocomplete="username" autocapitalize="none" :spellcheck="false" :disabled="submitting" :invalid="usernameStatus === 'taken' || usernameStatus === 'invalid'" aria-describedby="username-help" />
              <p id="username-help" class="text-[13px] moh-text-muted" aria-live="polite">{{ usernameHelp }}</p>
            </div>
            <div class="space-y-2">
              <label for="setup-birthday">Birthday</label>
              <p v-if="birthdateLocked" class="setup-input flex items-center px-3">{{ birthdatePretty }}</p>
              <AppDateOfBirthInput v-else id="setup-birthday" v-model="birthdate" :disabled="submitting" :invalid="Boolean(birthdate) && !isBirthdate18Plus(birthdate)" />
              <p class="text-[13px]" :class="birthdate && !isBirthdate18Plus(birthdate) ? 'text-red-500' : 'moh-text-muted'">{{ birthdate && !isBirthdate18Plus(birthdate) ? 'Enter a valid birthday. You must be 18 or older to join.' : 'You must be 18+. Your birth year stays private; month and day show on your profile unless you hide them in Settings.' }}</p>
            </div>
            <label class="community-confirm flex items-center justify-center gap-3 min-h-12 px-4 py-3 border moh-border rounded-full cursor-pointer">
              <Checkbox v-model="menOnlyConfirmed" binary input-id="setup-community" :disabled="submitting || menConfirmLocked" />
              <span>I’m joining as a man.</span>
            </label>
          </template>
          <template v-else>
            <p class="text-[15px] leading-[22px] moh-text-muted">Pick at least one to shape your feed. You can change these later.</p>
            <div class="grid grid-cols-2 gap-2">
              <button v-for="arena in LIFE_ARENAS" :key="arena.key" type="button" class="arena-choice min-h-12 rounded-full border px-4 py-3 moh-focus" :class="selected(arena) ? 'arena-selected' : 'moh-border'" :aria-pressed="selected(arena)" :disabled="submitting" @click="toggleOnboardingArena(arena)">
                <span v-if="selected(arena)" aria-hidden="true">✓ </span>{{ arena.label }}
              </button>
            </div>
          </template>
          <AppInlineAlert v-if="error" severity="danger" role="alert">{{ error }}</AppInlineAlert>
        </div>
        <div class="space-y-2 pb-2">
          <Button type="submit" class="setup-primary w-full" rounded :label="page === 1 ? 'Continue' : 'Show my feed'" :disabled="submitting || !canContinue" :loading="submitting" />
          <p class="text-[13px] moh-text-muted">{{ page === 1 ? 'You can add a name and photo later.' : `${selectedArenaCount} ${selectedArenaCount === 1 ? 'arena' : 'arenas'} selected` }}</p>
        </div>
      </form>
    </div>
  </section>
</template>

<script setup lang="ts">
import { LIFE_ARENAS, toggleArena, type LifeArena } from '~/config/arenas'
import { getApiErrorMessage } from '~/utils/api-error'
import { firstIncompleteOnboardingPage, isBirthdate18Plus, isOnboardingFullyComplete, needsOnboarding, type OnboardingPage } from '~/utils/onboarding'
import { formatDateOnly } from '~/utils/time-format'
import type { AuthUser } from '~/composables/useAuth'

const { user, ensureLoaded } = useAuth()
const { apiFetchData } = useApiClient()
const { startAfterOnboarding } = useFirstRunFlow()
const { capturedReferralCode, appliedReferralCode, markReferralApplied, clearReferralCapture } = useReferralCapture()
const { capture } = usePostHog()
await ensureLoaded()
const show = computed(() => Boolean(user.value?.id) && needsOnboarding(user.value))
const page = ref<OnboardingPage>(firstIncompleteOnboardingPage(user.value))
const headingRef = ref<HTMLElement | null>(null)
const usernameInput = ref(user.value?.username ?? '')
const birthdate = ref(user.value?.birthdate?.slice(0, 10) ?? '')
const menOnlyConfirmed = ref(user.value?.menOnlyConfirmed ?? false)
const interests = ref<string[]>(user.value?.interests ?? [])
const submitting = ref(false)
const error = ref<string | null>(null)
const usernameLocked = computed(() => Boolean(user.value?.usernameIsSet))
const birthdateLocked = computed(() => Boolean(user.value?.birthdate))
const menConfirmLocked = computed(() => Boolean(user.value?.menOnlyConfirmed))
const currentUsername = computed(() => user.value?.username ?? '')
const birthdatePretty = computed(() => formatDateOnly(`${birthdate.value}T00:00:00.000Z`, { dateOptions: { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }, fallback: birthdate.value }))
const { status: usernameStatus, helperText: usernameHelp, isCaseOnlyChange: usernameIsCaseOnly } = useUsernameField({ value: usernameInput, currentUsername, usernameIsSet: usernameLocked, debounceMs: 450 })
const selected = (arena: LifeArena) => arena.featuredInterests.some(key => interests.value.includes(key))
const selectedArenaCount = computed(() => LIFE_ARENAS.filter(selected).length)
const canContinue = computed(() => page.value === 2 ? interests.value.length > 0
  : Boolean(usernameInput.value.trim()) && (usernameLocked.value ? usernameIsCaseOnly.value : usernameStatus.value === 'available')
    && (birthdateLocked.value || isBirthdate18Plus(birthdate.value)) && menOnlyConfirmed.value)

watch(() => user.value?.id, () => {
  page.value = firstIncompleteOnboardingPage(user.value)
  usernameInput.value = user.value?.username ?? ''
  birthdate.value = user.value?.birthdate?.slice(0, 10) ?? ''
  menOnlyConfirmed.value = user.value?.menOnlyConfirmed ?? false
  interests.value = user.value?.interests ?? []
})
onMounted(() => {
  watch([show, page], async ([visible, step]) => {
    if (!visible) return
    capture('onboarding_step_viewed', { step })
    await nextTick()
    headingRef.value?.focus()
  }, { immediate: true })
})
function goBack() { error.value = null; page.value = 1 }
function toggleOnboardingArena(arena: LifeArena) {
  if (submitting.value) return
  // Four representative interests per arena lets all seven fit within the API's 30-interest limit.
  const choice = selected(arena) ? arena : { ...arena, featuredInterests: arena.featuredInterests.slice(0, 4) }
  interests.value = toggleArena(choice, interests.value, 30)
}
async function applyCapturedReferral() {
  const code = capturedReferralCode.value.trim()
  if (user.value?.hasRecruiter || appliedReferralCode.value) { clearReferralCapture(); return }
  if (!code) return
  try {
    await apiFetchData('/billing/referral/set-recruiter', { method: 'POST', body: { code } })
    markReferralApplied(code)
  } catch {
    // Keep the captured code available in optional profile details for a retry.
  }
}
async function continuePage() {
  if (submitting.value || !canContinue.value) return
  submitting.value = true
  error.value = null
  try {
    const body: Record<string, unknown> = page.value === 2 ? { interests: interests.value } : {}
    if (page.value === 1) {
      if (!usernameLocked.value || usernameInput.value.trim() !== currentUsername.value) body.username = usernameInput.value.trim()
      if (!birthdateLocked.value) body.birthdate = birthdate.value
      if (!menConfirmLocked.value) body.menOnlyConfirmed = menOnlyConfirmed.value
    }
    await applyCapturedReferral()
    const result = await apiFetchData<{ user: AuthUser }>('/users/me/onboarding', { method: 'PATCH', body })
    user.value = result.user
    if (isOnboardingFullyComplete(result.user)) {
      capture('onboarding_gate_finished', { arena_count: selectedArenaCount.value })
      startAfterOnboarding()
    } else page.value = firstIncompleteOnboardingPage(result.user)
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Couldn’t save. Please try again.'
  } finally { submitting.value = false }
}
</script>

<style scoped>
.onboarding-screen { position: fixed; inset: 0; z-index: 10000; overflow-y: auto; padding: 24px; }
.onboarding-column { max-width: 400px; margin: 0 auto; min-height: calc(100dvh - 48px); display: flex; flex-direction: column; gap: 24px; }
.onboarding-form { flex: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 32px; }
.onboarding-content { display: flex; flex-direction: column; gap: 20px; margin: auto 0; padding: 24px 0; }
.setup-input { min-height: 52px; border-radius: 10px; background: var(--moh-surface); }
.setup-primary { min-height: 48px; background: var(--moh-text) !important; color: var(--moh-bg) !important; border-color: var(--moh-text) !important; }
.arena-selected { background: var(--moh-brass); color: var(--moh-bg); border-color: var(--moh-brass); }
@media (min-width: 640px) {
  .onboarding-screen { padding: 48px; }
  .onboarding-column { min-height: 0; gap: 32px; }
  .onboarding-content { margin: 0; padding: 0; }
}
</style>
