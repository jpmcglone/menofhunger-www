<template>
  <!-- Figma: 866:1210 / 866:1233 / 866:1550 -->
  <section class="auth-flow moh-text" aria-label="Sign up or log in">
    <nav class="auth-nav">
      <button v-if="step === 'code'" type="button" class="min-h-11 moh-focus" :disabled="verifying || phoneSubmitting" @click="changePhone()">‹ Back</button>
      <NuxtLink v-else to="/" class="min-h-11 inline-flex items-center text-xs font-semibold text-[var(--moh-brass)]">MEN OF HUNGER</NuxtLink>
    </nav>
    <form class="auth-form" @submit.prevent="step === 'phone' ? submitPhone() : submitCode()">
      <div class="auth-content">
        <h1 class="text-[28px] leading-9 font-semibold">{{ step === 'phone' ? 'Find your people.' : 'Check your texts.' }}</h1>
        <p class="text-[15px] leading-[22px] moh-text-muted">{{ step === 'phone' ? 'A community for men building a better life.' : `Enter the code sent to ${phoneCommitted}.` }}</p>
        <template v-if="showDeletedNotice">
          <AppInlineAlert severity="success">Your account is unavailable. If you requested deletion, use your private receipt to check its status.</AppInlineAlert>
          <Button label="Dismiss" severity="secondary" rounded @click="dismissDeleted" />
        </template>
        <template v-else-if="showBannedNotice">
          <AppInlineAlert severity="danger">This account was banned. Contact an admin if you think it’s a mistake.</AppInlineAlert>
          <Button label="Dismiss" rounded @click="dismissBanned" />
        </template>
        <template v-else-if="step === 'phone'">
          <p class="text-[15px]">Sign up or log in with your phone.</p>
          <div class="space-y-2">
            <label for="auth-phone">Phone number</label>
            <InputText id="auth-phone" ref="phoneInputRef" v-model="phoneInput" class="auth-input w-full" placeholder="+1 (201) 555-0123" autocomplete="tel" inputmode="tel" :disabled="phoneSubmitting" aria-describedby="phone-help" @input="onPhoneInput" />
            <p id="phone-help" class="text-[13px] moh-text-muted">We’ll text you a one-time code.</p>
            <details class="text-[13px] moh-text-muted">
              <summary class="min-h-11 flex items-center cursor-pointer">Outside the US?</summary>
              <p>For other countries, start with + and your country code.</p>
            </details>
          </div>
          <p class="text-[13px] moh-text-muted">For men 18+. Be respectful. Be real.</p>
        </template>
        <template v-else>
          <div class="space-y-2">
            <label for="auth-code">6-digit code</label>
            <InputText id="auth-code" ref="codeInputRef" v-model="codeInput" class="auth-input w-full tracking-[0.3em]" placeholder="••••••" autocomplete="one-time-code" inputmode="numeric" maxlength="6" :disabled="verifying" />
          </div>
          <p v-if="codeAlreadyPending" role="status" class="text-[13px] moh-text-muted">We already texted you a code — check your messages.</p>
          <Button label="Change phone number" text severity="secondary" class="w-full min-h-12" :disabled="verifying || phoneSubmitting" @click="changePhone()" />
          <Button :label="resendRemainingSeconds > 0 ? `Resend code in ${resendRemainingSeconds}s` : 'Resend code'" text severity="secondary" class="w-full min-h-12" :disabled="resendRemainingSeconds > 0 || phoneSubmitting || verifying" :loading="phoneSubmitting" @click="resend" />
        </template>
        <AppInlineAlert v-if="inlineError" severity="danger" role="alert">{{ inlineError }}</AppInlineAlert>
      </div>
      <div v-if="!showBannedNotice && !showDeletedNotice" class="auth-actions space-y-2">
        <p v-if="step === 'phone'" class="text-[13px] leading-[18px] moh-text-muted">
          By tapping Send code, you agree to our
          <NuxtLink to="/terms" target="_blank" class="underline underline-offset-2">Terms</NuxtLink> and
          <NuxtLink to="/privacy" target="_blank" class="underline underline-offset-2">Privacy Policy</NuxtLink>.
        </p>
        <Button type="submit" :label="step === 'phone' ? 'Send code' : 'Verify code'" class="auth-primary w-full" rounded :loading="phoneSubmitting || verifying" :disabled="phoneSubmitting || verifying || (step === 'phone' ? !phoneInput.trim() : codeInput.length !== 6)" />
        <p class="text-[13px] moh-text-muted">{{ step === 'phone' ? 'No password to remember.' : 'Code autofill and paste supported.' }}</p>
      </div>
    </form>
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

function accountNoticeFromError(e: unknown): 'banned' | 'deleted' | null {
  const data = (e as { data?: { meta?: { errors?: { reason?: string }[] } }; response?: { _data?: { meta?: { errors?: { reason?: string }[] } } } } | null | undefined)
  const reason = data?.data?.meta?.errors?.[0]?.reason ?? data?.response?._data?.meta?.errors?.[0]?.reason
  if (reason === 'account_banned') return 'banned'
  if (reason === 'account_deleted') return 'deleted'
  return null
}

function showAccountNotice(kind: 'banned' | 'deleted') {
  resetToPhone()
  inlineError.value = null
  const q = { ...route.query }
  delete q.banned
  delete q.deleted
  q[kind] = '1'
  void Promise.resolve(navigateTo({ path: '/login', query: q }, { replace: true })).catch(() => undefined)
}

const step = ref<Step>('phone')

const phoneInput = ref('')
const phoneCommitted = ref('')
const phoneCommittedNormalized = ref('')

const codeInput = ref('')

const inlineError = ref<string | null>(null)

const phoneInputRef = ref<{ $el?: HTMLElement } | null>(null)
const codeInputRef = ref<{ $el?: HTMLElement } | null>(null)

function changePhone() { resetToPhone(); focusInput(phoneInputRef) }

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
  verifying.value = false
  codeAlreadyPending.value = false
  startResendCountdown(0)
}

async function startOtp(phone: string) {
  const result = await apiFetchData<{ sent: boolean; retryAfterSeconds: number }>('/auth/phone/start', {
    method: 'POST',
    body: { phone }
  })

  inlineError.value = null
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
      const phone = normalizePhoneForApi(phoneInput.value)
    if (!phone) throw new Error('Enter a valid phone number.')

    await startOtp(phone)
  },
  {
    defaultError: 'Failed to send code.',
    onError: (message, e) => {
      const notice = accountNoticeFromError(e)
      if (notice) {
        showAccountNotice(notice)
        return
      }
      inlineError.value = message
    },
  },
)

const { submit: resend, submitting: resendSubmitting } = useFormSubmit(
  async () => {
    inlineError.value = null
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
      // The onboarding gate resumes missing requirements; welcome never opens a blocking sheet.
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
        showAccountNotice('banned')
        return
      }
      if (reason === 'account_deleted') {
        showAccountNotice('deleted')
        return
      }

      inlineError.value = message
      codeInput.value = ''
      focusInput(codeInputRef)
    },
  },
)
</script>


<style scoped>
.auth-flow { width: 100%; min-height: 100dvh; padding: 24px; display: flex; flex-direction: column; gap: 24px; }
.auth-nav { min-height: 44px; }
.auth-form { width: 100%; max-width: 400px; margin: 0 auto; flex: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 32px; }
.auth-content { display: flex; flex-direction: column; gap: 20px; margin: auto 0; padding: 24px 0; }
.auth-actions { padding-bottom: env(safe-area-inset-bottom); }
.auth-input { min-height: 52px; border-radius: 10px; background: var(--moh-surface); }
.auth-primary { min-height: 48px; background: var(--moh-text) !important; border-color: var(--moh-text) !important; color: var(--moh-bg) !important; }
@media (min-width: 640px) {
  .auth-flow { padding: 48px; }
  .auth-form { flex: none; }
  .auth-content { margin: 0; padding: 0; }
}
</style>
