<template>
  <AppPageContent bottom="standard">
    <AppPageHeader sticky class="px-4 pt-4 pb-3" title="Push Notifications" description="Send a test push to your own account on each channel.">
      <template #leading>
        <div class="md:hidden">
          <Button as="NuxtLink" to="/admin" text severity="secondary" aria-label="Back">
            <template #icon><Icon name="tabler:chevron-left" aria-hidden="true" /></template>
          </Button>
        </div>
      </template>
    </AppPageHeader>

    <div class="px-4 py-4 space-y-4">
      <!-- iOS / APNs -->
      <div class="rounded-xl border moh-border moh-bg p-4 space-y-3">
        <div>
          <div class="text-sm font-semibold moh-text">iOS / APNs</div>
          <div class="text-xs moh-text-muted mt-0.5">
            Sends to all APNs device tokens registered for your account. Requires a real device with
            notifications enabled — simulators can't receive APNs pushes.
          </div>
        </div>
        <Button
          label="Send test iOS push"
          :loading="apnsLoading"
          :disabled="apnsLoading"
          @click="sendApns"
        />
        <div v-if="apnsResult" :class="resultClass(apnsResult.sent)" class="rounded-lg p-3 text-xs">
          {{ apnsResult.sent ? 'Sent successfully.' : (apnsResult.message ?? 'Something went wrong.') }}
        </div>
      </div>

      <!-- Web Push / VAPID -->
      <div class="rounded-xl border moh-border moh-bg p-4 space-y-3">
        <div>
          <div class="text-sm font-semibold moh-text">Web Push / VAPID</div>
          <div class="text-xs moh-text-muted mt-0.5">
            Sends to all browser push subscriptions for your account. Open the web app, allow
            notifications in your browser, then click below.
          </div>
        </div>
        <Button
          label="Send test web push"
          :loading="webLoading"
          :disabled="webLoading"
          @click="sendWeb"
        />
        <div v-if="webResult" :class="resultClass(webResult.sent)" class="rounded-lg p-3 text-xs">
          {{ webResult.sent ? 'Sent successfully.' : (webResult.message ?? 'Something went wrong.') }}
        </div>
      </div>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import { getSafeUserErrorMessage } from '~/utils/api-error'

definePageMeta({
  layout: 'app',
  title: 'Push Notifications',
  middleware: 'admin',
  ssr: false,
})

usePageSeo({
  title: 'Admin Push',
  description: 'Send test push notifications.',
  canonicalPath: '/admin/push',
  noindex: true,
})

interface PushResult {
  sent: boolean
  message?: string
}

const { apiFetchData } = useApiClient()

const apnsLoading = ref(false)
const apnsResult = ref<PushResult | null>(null)

const webLoading = ref(false)
const webResult = ref<PushResult | null>(null)

async function sendApns() {
  apnsLoading.value = true
  apnsResult.value = null
  try {
    apnsResult.value = await apiFetchData<PushResult>('/admin/push/test/apns', { method: 'POST' })
  } catch (err) {
    apnsResult.value = { sent: false, message: getSafeUserErrorMessage(err) }
  } finally {
    apnsLoading.value = false
  }
}

async function sendWeb() {
  webLoading.value = true
  webResult.value = null
  try {
    webResult.value = await apiFetchData<PushResult>('/admin/push/test/web', { method: 'POST' })
  } catch (err) {
    webResult.value = { sent: false, message: getSafeUserErrorMessage(err) }
  } finally {
    webLoading.value = false
  }
}

function resultClass(sent: boolean) {
  return sent
    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200'
    : 'bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200'
}
</script>
