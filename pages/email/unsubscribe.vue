<template>
  <div class="mx-auto w-full max-w-md px-5 py-12 space-y-4">
    <h1 class="text-xl font-semibold moh-text">Newsletters</h1>
    <div class="rounded-xl border moh-border moh-surface p-4 space-y-3">
      <template v-if="status === 'ask'">
        <p class="text-sm moh-text">
          This stops occasional notes from us. Weekly digest and other emails stay on.
        </p>
        <Button
          label="Unsubscribe from newsletters"
          rounded
          :loading="submitting"
          :disabled="submitting"
          @click="unsubscribeNewsletters"
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
        <p class="text-sm moh-text">You’re unsubscribed from newsletters.</p>
        <p class="text-sm moh-text-muted">
          Weekly digest and other emails stay on unless you change them.
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
  ssr: false,
})

usePageSeo({
  title: 'Unsubscribe',
  description: 'Unsubscribe from Men of Hunger newsletters.',
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

async function unsubscribeNewsletters() {
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
