<template>
  <section class="w-full max-w-md">
    <div class="space-y-6">
      <div class="space-y-2">
        <div class="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <i class="pi pi-sign-in" aria-hidden="true" />
          <span>Login</span>
        </div>
      </div>

      <!-- Step 1: Phone -->
      <div class="space-y-2">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Phone number</label>

        <div v-if="step === 'phone'" class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <InputText
            v-model="phoneInput"
            class="w-full"
            placeholder="+1 (555) 555-5555"
            autocomplete="tel"
            inputmode="tel"
            :disabled="phoneSubmitting"
            @keydown.enter.prevent="submitPhone"
          />
          <button
            type="button"
            class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white dark:text-black self-end sm:self-auto"
            :disabled="phoneSubmitting || !phoneInput.trim()"
            aria-label="Send"
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
      </div>

      <template v-if="step !== 'phone'">
        <hr class="border-gray-200 dark:border-zinc-800" />

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
          <div class="flex items-center gap-2">
            <InputText
              v-model="codeInput"
              class="w-full font-mono tracking-[0.25em] text-center"
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
            {{ inlineError }}
          </AppInlineAlert>

          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              label="Resend code"
              icon="pi pi-refresh"
              rounded
              severity="secondary"
              class="w-full sm:w-auto"
              :disabled="resendRemainingSeconds > 0 || phoneSubmitting"
              :loading="phoneSubmitting"
              @click="resend"
            />
          </div>

          <p class="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
            <b>Dev tip:</b> in development, the code <span class="font-mono">000000</span> always works after you’ve sent a code.
          </p>
        </div>
        </div>
      </template>
    </div>

    <Dialog
      v-model:visible="introOpen"
      modal
      header="Welcome to Men of Hunger"
      :draggable="false"
      class="w-[min(34rem,calc(100vw-2rem))]"
      @hide="closeIntro"
    >
      <div class="space-y-4 text-sm text-gray-700 dark:text-gray-200">
        <p>
          You’re about to create a new account.
          Men of Hunger is a men’s community — built for brotherhood, self-improvement, and real conversations.
        </p>

        <div class="space-y-2">
          <div class="font-semibold text-gray-900 dark:text-gray-50">A few basic rules</div>
          <ul class="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-200">
            <li>Be respectful. No harassment, hate, or threats.</li>
            <li>Keep it real. No impersonation or scams.</li>
            <li>No spam. Don’t flood the feed or DM people unsolicited.</li>
            <li>You must be 18+ to join.</li>
          </ul>
          <div class="text-xs text-gray-500 dark:text-gray-400">
            You can browse right away. Posting and messaging require verification first.
          </div>
        </div>

        <div v-if="introError" class="text-sm text-red-700 dark:text-red-300">{{ introError }}</div>

        <div class="flex items-center justify-end gap-2 pt-1">
          <Button label="Cancel" severity="secondary" text :disabled="introContinuing" @click="closeIntro" />
          <Button
            label="Continue"
            icon="pi pi-arrow-right"
            :loading="introContinuing"
            :disabled="introContinuing"
            @click="acceptIntroAndContinue"
          />
        </div>
      </div>
    </Dialog>
  </section>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'empty',
  title: 'Login'
})

usePageSeo({
  title: 'Login',
  description: 'Login or sign up using your phone number.',
  canonicalPath: '/login',
  noindex: true
})

type Step = 'phone' | 'code'

const { apiFetchData } = useApiClient()
import { useFormSubmit } from '~/composables/useFormSubmit'
const route = useRoute()

const step = ref<Step>('phone')

const phoneInput = ref('')
const phoneCommitted = ref('')

const codeInput = ref('')

const inlineError = ref<string | null>(null)

const introOpen = ref(false)
const introPhone = ref<string | null>(null)
const introError = ref<string | null>(null)

const resendRemainingSeconds = ref(0)
let resendTimer: ReturnType<typeof setInterval> | null = null

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
  codeInput.value = ''
  inlineError.value = null
  introOpen.value = false
  introPhone.value = null
  introError.value = null
  introContinuing.value = false
  verifying.value = false
  startResendCountdown(0)
}

function closeIntro() {
  introOpen.value = false
  introPhone.value = null
  introError.value = null
  introContinuing.value = false
}

async function startOtp(phone: string) {
  const result = await apiFetchData<{ retryAfterSeconds: number }>('/auth/phone/start', {
    method: 'POST',
    body: { phone }
  })

  phoneCommitted.value = phone
  step.value = 'code'
  codeInput.value = ''

  startResendCountdown(result.retryAfterSeconds ?? 30)
}

const { submit: submitPhone, submitting: submitPhoneSubmitting } = useFormSubmit(
  async () => {
    inlineError.value = null
    introError.value = null
    const phone = phoneInput.value.trim()
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
    if (!phoneCommitted.value) return
    await startOtp(phoneCommitted.value)
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

    const phone = phoneCommitted.value.trim()
    const code = codeInput.value.replace(/\D/g, '').slice(0, 6)
    if (!phone || code.length !== 6) return

    const result = await apiFetchData<{ isNewUser: boolean; user: any; sessionId: string }>('/auth/phone/verify', {
      method: 'POST',
      body: { phone, code }
    })

    // Immediately hydrate auth state from the response so we don't look logged out
    // until a full refresh (client-side navigation won't rerun SSR init).
    const { user } = useAuth()
    user.value = result.user ?? null

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
    if (redirect && redirect.startsWith('/')) {
      await navigateTo(redirect)
    } else {
      // New signup: route them straight into profile setup (OnboardingGate).
      // We keep a query flag so OnboardingGate can send them to their profile once complete.
      if (result.isNewUser) {
        await navigateTo('/settings?welcome=1')
      } else {
        await navigateTo('/home')
      }
    }
  },
  {
    defaultError: 'Failed to verify code.',
    onError: (message) => {
      inlineError.value = message
    },
  },
)
</script>

