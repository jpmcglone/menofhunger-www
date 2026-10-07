<template>
  <!-- Figma: YnuRSJB7p90n9jEY4mb4RN node 832:290 -->
  <Dialog
    :visible="visible"
    modal
    header="Let MARV use OpenAI?"
    :style="{ width: '420px' }"
    :breakpoints="{ '480px': 'calc(100vw - 2rem)' }"
    :closable="!busy"
    @update:visible="(open) => { if (!open) finish(false) }"
  >
    <div class="space-y-4" data-testid="marv-consent">
      <p class="text-sm moh-text-muted">
        MARV runs on OpenAI. To answer you, it sends what you ask to OpenAI along with the context it needs.
      </p>
      <dl class="moh-surface rounded-2xl p-4 space-y-3 text-sm">
        <div class="flex gap-3">
          <dt class="w-12 shrink-0 font-semibold moh-text">Sent</dt>
          <dd class="moh-text-muted">Your request, any images you add, and the post, thread, or chat you ask about.</dd>
        </div>
        <div class="flex gap-3">
          <dt class="w-12 shrink-0 font-semibold moh-text">Never</dt>
          <dd class="moh-text-muted">Your private fitness records, or chats you are not asking about.</dd>
        </div>
      </dl>
      <AppInlineAlert v-if="error" severity="danger">{{ error }}</AppInlineAlert>
      <p class="text-xs moh-text-muted">
        Nothing is sent unless you allow it. Change this anytime in Settings → MARV ·
        <NuxtLink to="/privacy" target="_blank" class="underline">Privacy Policy</NuxtLink>
      </p>
    </div>

    <template #footer>
      <Button label="Not now" text severity="secondary" :disabled="busy" @click="finish(false)" />
      <Button label="Allow" rounded :loading="busy" @click="allow" />
    </template>
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
  } finally {
    busy.value = false
  }
}
</script>
