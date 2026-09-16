<template>
  <Teleport v-if="visible" :to="targetSelector" :disabled="!target">
    <section class="moh-surface border-y moh-border px-5 py-4" aria-label="Enable Marv" role="region">
      <div class="mx-auto max-w-xl space-y-3">
        <p class="text-[15px] font-semibold leading-[22px]">Enable Marv</p>
        <p class="text-[13px] leading-[18px] moh-text-muted">Marv sends your requests, selected images, and relevant profile and conversation context to OpenAI. Private fitness records and unrelated private conversations stay excluded.</p>
        <p class="text-[13px] leading-[18px] moh-text-muted"><NuxtLink to="/privacy" target="_blank" class="underline">Privacy Policy</NuxtLink> · Change your choice in Settings → Marv</p>
        <p v-if="error" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
        <div class="flex flex-wrap gap-3">
          <AppActionButton label="Enable Marv" kind="secondary" :loading="busy" @click="allow" />
          <AppActionButton label="Not now" kind="ghost" :disabled="busy" @click="finish(false)" />
        </div>
      </div>
    </section>
  </Teleport>
</template>

<script setup lang="ts">
import { getAuthGeneration, useIdentityVersion } from '~/composables/auth/authState'
const { visible, target, finish } = useAiConsent()
const targetSelector = computed(() => target.value ? `#${CSS.escape(target.value)}` : 'body')
const { apiFetchData } = useApiClient()
const busy = ref(false)
const error = ref('')
const identity = useIdentityVersion()
watch(identity, () => finish(false))
watch(visible, () => { error.value = '' })
const route = useRoute()
watch(() => route.path, () => finish(false))
onUnmounted(() => finish(false))
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
