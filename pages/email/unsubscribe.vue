<template>
  <div class="mx-auto w-full max-w-md px-5 py-12 space-y-4">
    <h1 class="text-xl font-semibold moh-text">Email preferences</h1>
    <div class="rounded-xl border moh-border moh-surface p-4 space-y-3">
      <template v-if="status === 'ask'">
        <p class="text-sm moh-text">
          Stop this type of email. Your other email preferences stay the same.
        </p>
        <Button
          label="Unsubscribe from these emails"
          rounded
          :loading="submitting"
          :disabled="submitting"
          @click="unsubscribeEmails"
        />
        <div>
          <NuxtLink
            to="/settings/notifications"
            class="text-sm font-medium hover:underline underline-offset-2"
          >
            Manage all email settings
          </NuxtLink>
        </div>
      </template>
      <template v-else-if="status === 'ok'">
        <p class="text-sm moh-text">You’re unsubscribed from these emails.</p>
        <p class="text-sm moh-text-muted">
          Your other email preferences haven’t changed.
        </p>
        <div>
          <NuxtLink
            to="/settings/notifications"
            class="text-sm font-medium hover:underline underline-offset-2"
          >
            Manage email settings
          </NuxtLink>
        </div>
      </template>
      <template v-else>
        <p class="text-sm text-red-700 dark:text-red-300">{{ errorMessage }}</p>
        <div>
          <NuxtLink
            to="/settings/notifications"
            class="text-sm font-medium hover:underline underline-offset-2"
          >
            Manage email settings
          </NuxtLink>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getSafeUserErrorMessage } from '~/utils/api-error'

definePageMeta({
})

usePageSeo({
  title: 'Unsubscribe',
  description: 'Manage your Men of Hunger email preferences.',
  canonicalPath: '/email/unsubscribe',
  noindex: true,
})

const route = useRoute()
const { apiFetchData } = useApiClient()
const token = computed(() => String(route.query.token ?? '').trim())
const alreadyDone = computed(() => String(route.query.done ?? '') === '1')

type Status = 'ask' | 'ok' | 'error'
const status = ref<Status>(alreadyDone.value ? 'ok' : token.value ? 'ask' : 'error')
const submitting = ref(false)
const errorMessage = ref('Unsubscribe link is invalid or expired.')

async function unsubscribeEmails() {
  if (!token.value || submitting.value) return
  submitting.value = true
  try {
    await apiFetchData<{ ok: boolean }>('/email/unsubscribe', {
      method: 'POST',
      body: { token: token.value },
    })
    status.value = 'ok'
  } catch (err) {
    errorMessage.value = getSafeUserErrorMessage(err, 'Unsubscribe link is invalid or expired.')
    status.value = 'error'
  } finally {
    submitting.value = false
  }
}
</script>
