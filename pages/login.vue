<template>
  <section class="w-full max-w-md px-6">
    <div class="space-y-6">
      <!-- Brand mark + heading -->
      <div class="flex flex-col items-center gap-4 text-center">
        <AppLogo
          as-link
          to="/"
          :alt="siteConfig.name"
          :width="80"
          :height="80"
          wrapper-class="inline-flex"
          img-class="h-20 w-20"
        />
        <div class="space-y-1.5">
          <h1 class="text-3xl font-semibold tracking-tight text-balance">Log in or sign up</h1>
          <p
            v-if="step === 'phone' && !showBannedNotice && !showDeletedNotice"
            class="text-sm moh-text-muted text-pretty"
          >
            Enter your phone number to continue.
          </p>
        </div>
      </div>

      <template v-if="showDeletedNotice">
        <AppInlineAlert severity="success">
          Your account has been deleted. Thanks for being part of Men of Hunger.
        </AppInlineAlert>
        <Button
          label="Dismiss"
          class="w-full sm:w-auto"
          severity="secondary"
          rounded
          @click="dismissDeleted"
        />
      </template>

      <template v-else-if="showBannedNotice">
        <AppInlineAlert severity="danger">
          This account was banned. Contact an admin if you think it’s a mistake.
        </AppInlineAlert>
        <Button
          label="Dismiss"
          class="w-full sm:w-auto"
          rounded
          @click="dismissBanned"
        />
      </template>

      <template v-else>
      <!-- Step 1: Phone -->
      <div class="space-y-2">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Phone number</label>

        <div v-if="step === 'phone'" class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <InputText
            ref="phoneInputRef"
            v-model="phoneInput"
            class="w-full"
            placeholder="+1 (555) 555-5555"
            autocomplete="tel"
            inputmode="tel"
            :disabled="phoneSubmitting"
            @input="onPhoneInput"
            @keydown.enter.prevent="submitPhone"
          />
          <button
            type="button"
            class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white dark:text-black self-end sm:self-auto"
            :disabled="phoneSubmitting || !phoneInput.trim()"
            aria-label="Continue"
            @click="submitPhone"
          >
            <!-- Bold right arrow -->
            <svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true">
              <path fill="currentColor" d="M13.2 5.2L20 12l-6.8 6.8-1.6-1.6L15.6 13H4v-2h11.6l-4-4.2 1.6-1.6z" />
            </svg>
          </button>
        </div>

        <div v-else class="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 dark:border-zinc-800">
          <div class="min-w-0">
            <div class="text-xs text-gray-500 dark:text-gray-400">Using</div>
            <div class="font-mono text-sm text-gray-900 dark:text-gray-50 truncate">{{ phoneCommitted }}</div>
          </div>
          <Button label="Change" text severity="secondary" @click="resetToPhone()" />
        </div>

        <!-- Phone-step errors (e.g. invalid number, /auth/phone/exists or /start failure).
             Without this, errors set on inlineError were silently invisible until the user
             advanced to the code step. -->
        <AppInlineAlert v-if="step === 'phone' && inlineError" severity="danger">
          <!-- inlineError comes from useFormSubmit → getApiErrorMessage (hardened against technical strings) -->
          {{ inlineError }}
        </AppInlineAlert>
      </div>

      <template v-if="step !== 'phone'">
        <hr class="border-gray-200 dark:border-zinc-800" >

        <!-- Step 2: Code -->
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-3">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-200">One-time code</label>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              <span v-if="resendRemainingSeconds > 0">
                Resend in {{ resendRemainingSeconds }}s
              </span>
            </div>
          </div>

          <div class="space-y-3">
          <AppInlineAlert v-if="codeAlreadyPending" severity="info">
            We already texted you a code a moment ago — check your messages.
          </AppInlineAlert>

          <div class="flex items-center gap-2">
            <InputText
              ref="codeInputRef"
              v-model="codeInput"
              class="w-full font-mono tracking-[0.25em] text-left"
              placeholder="••••••"
              autocomplete="one-time-code"
              inputmode="numeric"
              maxlength="6"
              :disabled="verifying"
            />

            <div v-if="verifying" class="shrink-0 flex items-center justify-center w-12">
              <AppLogoLoader :size="28" />
            </div>
          </div>

          <AppInlineAlert v-if="inlineError" severity="danger">
            <!-- sanitized at source -->
            {{ inlineError }}
          </AppInlineAlert>

          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              label="Resend code"
              rounded
              severity="secondary"
              class="w-full sm:w-auto"
              :disabled="resendRemainingSeconds > 0 || phoneSubmitting"
              :loading="phoneSubmitting"
              @click="resend"
            >
              <template #icon>
                <Icon name="tabler:refresh" aria-hidden="true" />
              </template>
            </Button>
          </div>

          <p class="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
            <b>Dev tip:</b> in development, the code <span class="font-mono">000000</span> always works after you’ve sent a code.
          </p>
        </div>
        </div>
      </template>

    <AppConfirmDialog
      :visible="introOpen"
      header="Welcome to Men of Hunger"
      confirm-label="Continue"
      confirm-severity="primary"
      confirm-icon="tabler:arrow-right"
      :loading="introContinuing"
      @update:visible="!$event && closeIntro()"
      @confirm="acceptIntroAndContinue"
      @cancel="closeIntro"
    >
      <div class="space-y-4 text-sm moh-text-muted">
        <p>
          You’re about to create a new account.
          Men of Hunger is a men’s trusted community for men who want measurable progress — structured conversations, accountability, and real growth.
        </p>

        <div class="space-y-2">
          <div class="font-semibold moh-text">A few basic rules</div>
          <ul class="list-disc pl-5 space-y-1">
            <li>Be respectful. No harassment, abusive content, or threats.</li>
            <li>Keep it real. No impersonation or scams.</li>
            <li>No spam. Don’t flood the feed or DM people unsolicited.</li>
            <li>You must be 18+ to join.</li>
          </ul>
          <div class="text-xs moh-text-soft">
            You can browse right away. Posting and messaging require verification first.
          </div>
        </div>

        <div v-if="introError" class="text-sm text-red-700 dark:text-red-300">{{ introError }}</div>
      </div>
    </AppConfirmDialog>

      <!-- Daily quote — quiet ambient note on the phone step only. -->
      <Transition name="fade" appear>
        <div
          v-if="dailyQuote && step === 'phone'"
          class="pt-4 text-center text-sm leading-relaxed text-gray-700 dark:text-gray-200"
        >
          <figure>
            <blockquote class="moh-serif italic text-balance">“{{ dailyQuote.text }}”</blockquote>
            <figcaption class="mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span class="font-semibold">{{ dailyQuoteAttribution }}</span>
              <span v-if="dailyQuote.isParaphrase" class="ml-1">(paraphrase)</span>
            </figcaption>
          </figure>
          <div class="mx-auto mt-6 h-px w-32 bg-gradient-to-r from-transparent via-gray-400 to-transparent dark:via-gray-600" />
        </div>
      </Transition>
      </template>
    </div>

    <p class="mt-8 text-center text-xs text-gray-400 dark:text-zinc-600 text-pretty">
      By continuing, you agree to our
      <NuxtLink to="/terms" class="underline underline-offset-2 hover:text-gray-500 dark:hover:text-zinc-500 transition-colors">Terms</NuxtLink>
      and
      <NuxtLink to="/privacy" class="underline underline-offset-2 hover:text-gray-500 dark:hover:text-zinc-500 transition-colors">Privacy&nbsp;Policy</NuxtLink>.
    </p>
  </section>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'empty',
  title: 'Log in or sign up'
})

usePageSeo({
  title: 'Log in or sign up',
  description: 'Log in or sign up using your phone number.',
  canonicalPath: '/login',
  noindex: true
})

type Step = 'phone' | 'code'

const { apiFetchData } = useApiClient()
import { useFormSubmit } from '~/composables/useFormSubmit'
import { countDigitsBeforeIndex, formatPhoneAsYouType, indexFromDigitCount, normalizePhoneForApi } from '~/utils/phone'
import { isSafeRedirect } from '~/utils/url'
import { siteConfig } from '~/config/site'
import { formatDailyQuoteAttribution } from '~/utils/daily-quote'
import type { DailyContentToday, DailyQuote } from '~/types/api'

// Quiet ambient touch: the same daily quote the landing page shows. Fetched on
// SSR so it paints with the page (no client-only pop-in / hydration mismatch).
const { data: dailyContent } = await useAsyncData<DailyContentToday>(
  'login:daily-content:today',
  () => apiFetchData<DailyContentToday>('/meta/daily-content/today', { method: 'GET' }),
  { server: true },
)
const dailyQuote = computed<DailyQuote | null>(() => dailyContent.value?.quote ?? null)
const dailyQuoteAttribution = computed(() => (dailyQuote.value ? formatDailyQuoteAttribution(dailyQuote.value) : ''))
const route = useRoute()
const { capturedReferralCode, captureReferralFromRoute, markReferralApplied } = useReferralCapture()

const showBannedNotice = computed(() => String(route.query.banned ?? '') === '1')
const showDeletedNotice = computed(() => String(route.query.deleted ?? '') === '1')

function dismissBanned() {
  resetToPhone()
  // Preserve other query params like `redirect`, only clear the banned treatment.
  const q = { ...route.query }
  delete q.banned
  navigateTo({ path: '/login', query: q }, { replace: true })
}

function dismissDeleted() {
  const q = { ...route.query }
  delete q.deleted
  navigateTo({ path: '/login', query: q }, { replace: true })
}

const step = ref<Step>('phone')

const phoneInput = ref('')
const phoneCommitted = ref('')
const phoneCommittedNormalized = ref('')

const codeInput = ref('')

const inlineError = ref<string | null>(null)

const introOpen = ref(false)
const introPhone = ref<string | null>(null)
const introError = ref<string | null>(null)
const phoneInputRef = ref<{ $el?: HTMLElement } | null>(null)
const codeInputRef = ref<{ $el?: HTMLElement } | null>(null)

function focusInput(compRef: { value: { $el?: HTMLElement } | null }) {
  nextTick(() => {
    const el = compRef.value?.$el
    const input = el?.tagName === 'INPUT' ? el : (el?.querySelector?.('input') as HTMLInputElement | null)
    if (input && typeof input.focus === 'function') input.focus()
  })
}

watch(
  () => route.query.ref,
  () => {
    captureReferralFromRoute(route)
  },
  { immediate: true },
)

onMounted(() => {
  captureReferralFromRoute(route)
  focusInput(phoneInputRef)
})

const resendRemainingSeconds = ref(0)
let resendTimer: ReturnType<typeof setInterval> | null = null
// True when /auth/phone/start reused an already-pending code instead of sending a new text
// (resend cooldown is shared by phone number across devices/tabs/apps).
const codeAlreadyPending = ref(false)

function startResendCountdown(seconds: number) {
  resendRemainingSeconds.value = Math.max(0, Math.floor(seconds))
  if (resendTimer) clearInterval(resendTimer)
  if (resendRemainingSeconds.value <= 0) return
  resendTimer = setInterval(() => {
    resendRemainingSeconds.value = Math.max(0, resendRemainingSeconds.value - 1)
    if (resendRemainingSeconds.value === 0 && resendTimer) {
      clearInterval(resendTimer)
      resendTimer = null
    }
  }, 1000)
}

onBeforeUnmount(() => {
  if (resendTimer) clearInterval(resendTimer)
})

function resetToPhone() {
  step.value = 'phone'
  phoneCommitted.value = ''
  phoneCommittedNormalized.value = ''
  codeInput.value = ''
  inlineError.value = null
  introOpen.value = false
  introPhone.value = null
  introError.value = null
  introContinuing.value = false
  verifying.value = false
  codeAlreadyPending.value = false
  startResendCountdown(0)
}

function closeIntro() {
  introOpen.value = false
  introPhone.value = null
  introError.value = null
  introContinuing.value = false
}

async function startOtp(phone: string) {
  const result = await apiFetchData<{ sent: boolean; retryAfterSeconds: number }>('/auth/phone/start', {
    method: 'POST',
    body: { phone }
  })

  inlineError.value = null
  introError.value = null
  phoneCommitted.value = formatPhoneAsYouType(phoneInput.value.trim()) || phone
  phoneCommittedNormalized.value = phone
  step.value = 'code'
  codeInput.value = ''
  // A code can already be pending for this phone (e.g. requested moments ago from
  // another device/tab/app) — the resend cooldown is shared by phone number, not
  // per-session. In that case no new text was sent, so say so instead of implying one was.
  codeAlreadyPending.value = result.sent === false

  startResendCountdown(result.retryAfterSeconds ?? 30)
}

let isPhoneFormatting = false
function onPhoneInput(e: Event) {
  if (isPhoneFormatting) return
  const el = e.target as HTMLInputElement | null
  if (!el) return

  const raw = el.value ?? ''
  const selectionStart = el.selectionStart ?? raw.length
  const digitsBefore = countDigitsBeforeIndex(raw, selectionStart)

  const formatted = formatPhoneAsYouType(raw)
  if (formatted === raw) return

  isPhoneFormatting = true
  phoneInput.value = formatted

  // Restore caret position based on digit count (prevents "cursor jumps to end" while typing).
  requestAnimationFrame(() => {
    try {
      const nextPos = indexFromDigitCount(formatted, digitsBefore)
      el.setSelectionRange(nextPos, nextPos)
    } finally {
      isPhoneFormatting = false
    }
  })
}

const { submit: submitPhone, submitting: submitPhoneSubmitting } = useFormSubmit(
  async () => {
    inlineError.value = null
    introError.value = null
    const phone = normalizePhoneForApi(phoneInput.value)
    if (!phone) return

    const existsRes = await apiFetchData<{ exists: boolean }>('/auth/phone/exists', {
      method: 'GET',
      // ofetch supports `query`; ApiFetchOptions is inferred from $fetch
      query: { phone }
    })

    // First-time signup: show intro modal before we send a code.
    if (!existsRes.exists) {
      introPhone.value = phone
      introOpen.value = true
      return
    }

    // Existing account: behave exactly like login does today.
    await startOtp(phone)
  },
  {
    defaultError: 'Failed to send code.',
    onError: (message) => {
      inlineError.value = message
    },
  },
)

const { submit: resend, submitting: resendSubmitting } = useFormSubmit(
  async () => {
    inlineError.value = null
    introError.value = null
    if (!phoneCommittedNormalized.value) return
    await startOtp(phoneCommittedNormalized.value)
  },
  {
    defaultError: 'Failed to resend code.',
    onError: (message) => {
      inlineError.value = message
    },
  },
)

const phoneSubmitting = computed(() => submitPhoneSubmitting.value || resendSubmitting.value)

const { submit: acceptIntroAndContinue, submitting: introContinuing } = useFormSubmit(
  async () => {
    const phone = (introPhone.value ?? '').trim()
    if (!phone) {
      closeIntro()
      return
    }
    introError.value = null
    inlineError.value = null
    await startOtp(phone)
    closeIntro()
  },
  {
    defaultError: 'Failed to send code.',
    onError: (message) => {
      introError.value = message
    },
  },
)

watch(
  step,
  (newStep) => {
    if (newStep === 'code') focusInput(codeInputRef)
  },
  { flush: 'post' }
)

watch(
  codeInput,
  (value) => {
    // Keep it numeric.
    const digits = value.replace(/\D/g, '').slice(0, 6)
    if (digits !== value) codeInput.value = digits

    // Auto-submit when complete.
    if (step.value === 'code' && digits.length === 6 && !verifying.value) {
      void submitCode()
    }
  },
  { flush: 'sync' }
)

const { submit: submitCode, submitting: verifying } = useFormSubmit(
  async () => {
    inlineError.value = null

    const phone = phoneCommittedNormalized.value.trim()
    const code = codeInput.value.replace(/\D/g, '').slice(0, 6)
    if (!phone || code.length !== 6) return

    const referralCode = capturedReferralCode.value.trim()
    const result = await apiFetchData<{ isNewUser: boolean; referralApplied?: boolean; user: any; sessionId: string }>('/auth/phone/verify', {
      method: 'POST',
      body: referralCode ? { phone, code, referralCode } : { phone, code }
    })
    if (result.referralApplied) markReferralApplied(referralCode)

    // Immediately hydrate auth state from the response so we don't look logged out
    // until a full refresh (client-side navigation won't rerun SSR init).
    const { user } = useAuth()
    user.value = result.user ?? null

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
    if (isSafeRedirect(redirect)) {
      await navigateTo(redirect!)
    } else {
      // New signup: start on home with onboarding gate, then route to profile on completion.
      // Keep a query flag so OnboardingGate knows to redirect to profile.
      if (result.isNewUser) {
        await navigateTo('/home?welcome=1')
      } else {
        await navigateTo('/home')
      }
    }
  },
  {
    defaultError: 'Failed to verify code.',
    onError: (message, e) => {
      const anyErr = e as { data?: any; response?: { _data?: any } | null } | null | undefined
      const data = anyErr?.data ?? anyErr?.response?._data
      const reason = data?.meta?.errors?.[0]?.reason

      if (reason === 'account_banned') {
        resetToPhone()
        inlineError.value = null
        const q = { ...route.query, banned: '1' }
        void Promise.resolve(navigateTo({ path: '/login', query: q }, { replace: true })).catch(() => undefined)
        return
      }

      inlineError.value = message
    },
  },
)
</script>

<style scoped>
.fade-enter-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from {
  opacity: 0;
}
</style>

