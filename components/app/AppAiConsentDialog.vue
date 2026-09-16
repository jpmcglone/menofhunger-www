<template>
  <Dialog :visible="visible" modal :base-z-index="10000" header="Use MARV with OpenAI?" :style="{ width: 'min(440px, calc(100vw - 32px))' }" :closable="!busy" :dismissable-mask="false" @update:visible="close">
    <div class="space-y-5 text-sm moh-text-muted">
      <p>MARV uses OpenAI to answer you. If you allow it, we send your requests, selected images and relevant conversation context to OpenAI.</p>
      <h3 class="font-semibold moh-text">Your choice</h3>
      <p>MARV can use public profiles and content, plus restricted thread or group content within that conversation. Your private fitness records and unrelated private conversations stay excluded. OpenAI may retain API data to operate and protect its service.</p>
      <p>You can turn off personal MARV requests in Settings → MARV. Content you share remains available within its audience.</p>
      <a href="/privacy" target="_blank" rel="noopener" class="inline-flex min-h-11 items-center underline">Read our Privacy Policy</a>
      <p>Choosing Not now keeps the rest of Men of Hunger available.</p>
      <p v-if="error" role="alert" class="text-red-600 dark:text-red-400">{{ error }}</p>
      <Button label="Allow and continue" class="w-full min-h-11" :loading="busy" @click="allow" />
      <Button label="Not now" severity="secondary" class="w-full min-h-11" :disabled="busy" @click="finish(false)" />
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { getAuthGeneration, useIdentityVersion } from '~/composables/auth/authState'
const { visible, finish } = useAiConsent()
const { apiFetchData } = useApiClient()
const busy = ref(false)
const error = ref('')
const identity = useIdentityVersion()
watch(identity, () => finish(false))
watch(visible, () => { error.value = '' })
onUnmounted(() => finish(false))
function close(value: boolean) { if (!value && !busy.value) finish(false) }
async function allow() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  const generation = getAuthGeneration()
  try {
    await apiFetchData('/marvin/me/preferences', { method: 'PATCH', body: { aiConsent: true } })
    finish(generation === getAuthGeneration())
  } catch {
    error.value = 'Your choice could not be saved. Please try again.'
  } finally { busy.value = false }
}
</script>
