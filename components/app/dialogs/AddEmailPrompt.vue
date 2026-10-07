<template>
  <AppModal
    v-if="open"
    v-model="open"
    title="Account recovery"
    max-width-class="max-w-sm"
    :dismissable-mask="false"
    :show-close="false"
    max-height="min(90vh, 28rem)"
  >
    <div class="moh-gutter-x py-5 flex flex-col gap-4">
      <p class="text-sm font-semibold moh-text">Add an email for account recovery?</p>
      <p class="text-sm moh-text-muted leading-relaxed">
        Optional. Helps us reach you if you lose access to your phone number.
      </p>
      <InputText
        v-model="email"
        type="email"
        class="w-full"
        placeholder="you@example.com"
        autocomplete="email"
        :disabled="saving"
        :invalid="showError"
      />
      <p v-if="error" class="text-xs text-red-600 dark:text-red-400">{{ error }}</p>
    </div>
    <template #footer>
      <div class="flex flex-col gap-2">
        <Button
          label="Save"
          class="w-full !bg-black !text-white !border-black dark:!bg-white dark:!text-black dark:!border-white"
          rounded
          :disabled="saving || !email.trim()"
          :loading="saving"
          @click="save"
        />
        <Button
          label="Skip"
          severity="secondary"
          text
          class="w-full"
          :disabled="saving"
          @click="finishEmail"
        />
      </div>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import type { UserDto } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

const { step, finishEmail } = useFirstRunFlow()
const { user } = useAuth()
const { apiFetchData } = useApiClient()

const open = computed({
  get: () => step.value === 'email',
  set: () => {},
})

const email = ref('')
const saving = ref(false)
const error = ref<string | null>(null)
const attempted = ref(false)

const showError = computed(() => attempted.value && Boolean(error.value))

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)
}

async function save() {
  attempted.value = true
  const trimmed = email.value.trim()
  if (!trimmed || !isValidEmail(trimmed)) {
    error.value = 'Enter a valid email address.'
    return
  }
  saving.value = true
  error.value = null
  try {
    const updated = await apiFetchData<{ user: UserDto }>('/users/me/profile', {
      method: 'PATCH',
      body: { email: trimmed },
    })
    if (updated?.user && user.value) Object.assign(user.value, updated.user)
    finishEmail()
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || "Couldn't save your email."
  } finally {
    saving.value = false
  }
}
</script>
