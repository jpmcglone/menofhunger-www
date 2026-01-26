<template>
  <section class="w-full max-w-md">
    <Card class="shadow-sm">
      <template #title>
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <i class="pi pi-sign-in" aria-hidden="true" />
            <span>Login</span>
          </div>
          <Tag value="Phone" severity="info" />
        </div>
      </template>

      <template #content>
        <div class="space-y-5">
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Enter your phone number. We’ll text you a one-time code.
          </p>

          <!-- Step 1: Phone -->
          <div class="space-y-2">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Phone number</label>

            <div v-if="step === 'phone'" class="flex gap-2">
              <InputText
                v-model="phoneInput"
                class="w-full"
                placeholder="+1 (555) 555-5555"
                autocomplete="tel"
                inputmode="tel"
                :disabled="phoneSubmitting"
                @keydown.enter.prevent="submitPhone"
              />
              <Button
                label="Send"
                icon="pi pi-arrow-right"
                :loading="phoneSubmitting"
                :disabled="!phoneInput.trim()"
                @click="submitPhone"
              />
            </div>

            <div v-else class="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 dark:border-zinc-800">
              <div class="min-w-0">
                <div class="text-xs text-gray-500 dark:text-gray-400">Using</div>
                <div class="font-mono text-sm text-gray-900 dark:text-gray-50 truncate">{{ phoneCommitted }}</div>
              </div>
              <Button label="Change" text severity="secondary" @click="resetToPhone()" />
            </div>
          </div>

          <Divider />

          <!-- Step 2: Code -->
          <div class="space-y-2">
            <div class="flex items-center justify-between gap-3">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-200">One-time code</label>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                <span v-if="step !== 'phone' && resendRemainingSeconds > 0">
                  Resend in {{ resendRemainingSeconds }}s
                </span>
              </div>
            </div>

            <div v-if="step === 'phone'" class="text-sm text-gray-500 dark:text-gray-400">
              Send a code to continue.
            </div>

            <div v-else class="space-y-3">
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
                  <ProgressSpinner style="width: 28px; height: 28px" strokeWidth="5" />
                </div>
              </div>

              <AppInlineAlert v-if="inlineError" severity="danger">
                {{ inlineError }}
              </AppInlineAlert>

              <div class="flex items-center justify-between gap-3">
                <Button
                  label="Resend code"
                  icon="pi pi-refresh"
                  severity="secondary"
                  :disabled="resendRemainingSeconds > 0 || phoneSubmitting"
                  :loading="phoneSubmitting"
                  @click="resend"
                />
                <div class="flex-1" />
                <Button
                  label="Verify"
                  icon="pi pi-check"
                  :disabled="verifying || codeInput.replace(/\\D/g, '').length !== 6"
                  :loading="verifying"
                  @click="submitCode"
                />
              </div>

              <p class="text-xs text-gray-500 dark:text-gray-400">
                Dev tip: in development, the code <span class="font-mono">000000</span> always works after you’ve sent a code.
              </p>
            </div>
          </div>
        </div>
      </template>
    </Card>
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
  noindex: true
})

type Step = 'phone' | 'code'

const { apiFetchData } = useApiClient()
import { getApiErrorMessage } from '~/utils/api-error'
const route = useRoute()

const step = ref<Step>('phone')

const phoneInput = ref('')
const phoneCommitted = ref('')
const phoneSubmitting = ref(false)

const codeInput = ref('')
const verifying = ref(false)

const inlineError = ref<string | null>(null)

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
  verifying.value = false
  startResendCountdown(0)
}

async function submitPhone() {
  inlineError.value = null
  const phone = phoneInput.value.trim()
  if (!phone) return

  phoneSubmitting.value = true
  try {
    const result = await apiFetchData<{ retryAfterSeconds: number }>('/auth/phone/start', {
      method: 'POST',
      body: { phone }
    })

    phoneCommitted.value = phone
    step.value = 'code'
    codeInput.value = ''

    startResendCountdown(result.retryAfterSeconds ?? 30)
  } catch (e: unknown) {
    inlineError.value = getApiErrorMessage(e) || 'Failed to send code.'
  } finally {
    phoneSubmitting.value = false
  }
}

async function resend() {
  if (!phoneCommitted.value) return
  phoneInput.value = phoneCommitted.value
  await submitPhone()
}

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

async function submitCode() {
  if (verifying.value) return
  inlineError.value = null

  const phone = phoneCommitted.value.trim()
  const code = codeInput.value.replace(/\D/g, '').slice(0, 6)
  if (!phone || code.length !== 6) return

  verifying.value = true
  try {
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
      await navigateTo('/home')
    }
  } catch (e: unknown) {
    inlineError.value = getApiErrorMessage(e) || 'Failed to verify code.'
  } finally {
    verifying.value = false
  }
}
</script>

