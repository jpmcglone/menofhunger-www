<template>
  <main class="moh-gutter-x mx-auto max-w-lg py-12 space-y-4">
    <AppOnboardingGate v-if="isAuthed" />
    <h1 class="moh-h1">Connect Pickax</h1>
    <p class="moh-text-muted">Finish connecting outward sharing. You still choose the destinations for every post.</p>
    <p v-if="result" role="status">Outward sharing is connected. {{ result.readConnected ? 'Pickax read access is also connected.' : 'To allow Pickax to read your MOH profile, connect Men of Hunger from Pickax.' }}</p>
    <a v-if="result?.readConnectUrl" :href="result.readConnectUrl" class="inline-flex min-h-11 items-center font-semibold underline">Finish connecting read access on Pickax</a>
    <AppInlineAlert v-if="error" severity="danger">{{ error }}</AppInlineAlert>
    <NuxtLink v-if="!isAuthed" :to="loginPath" class="inline-flex min-h-11 items-center font-semibold underline">Sign in or create an account</NuxtLink>
    <Button v-else-if="!result && !denied" label="Continue to Pickax" :loading="busy" @click="start" />
    <NuxtLink to="/settings/integrations" class="flex min-h-11 items-center underline">Manage connections</NuxtLink>
  </main>
</template>
<script setup lang="ts">
import { getApiErrorMessage } from '~/utils/api-error'
const route = useRoute()
const { isAuthed } = useAuth()
const { apiFetchData } = useApiClient()
const busy = ref(false)
const error = ref('')
const result = ref<{ accountId: string; readConnected: boolean; outwardConnected: boolean; readConnectUrl?: string | null } | null>(null)
const denied = computed(() => typeof route.query.error === 'string')
const continuation = computed(() => typeof route.query.continuation === 'string' ? route.query.continuation : undefined)
const loginPath = computed(() => `/login?redirect=${encodeURIComponent(`/connect/pickax${continuation.value ? `?continuation=${encodeURIComponent(continuation.value)}` : ''}`)}`)
async function start() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const data = await apiFetchData<{ url: string }>('/me/integrations/pickax/authorize', { method: 'POST', body: { continuation: continuation.value } })
    window.location.assign(data.url)
  } catch (e) { error.value = getApiErrorMessage(e) || 'This connection step could not be started.'; busy.value = false }
}
onMounted(async () => {
  if (denied.value) { error.value = 'Pickax authorization was declined. Your MOH read connection is unchanged.'; return }
  const code = typeof route.query.code === 'string' ? route.query.code : ''
  const state = typeof route.query.state === 'string' ? route.query.state : ''
  if (!code || !state) return
  busy.value = true
  await navigateTo('/connect/pickax', { replace: true })
  try {
    result.value = await apiFetchData('/me/integrations/pickax/oauth/connect', { method: 'POST', body: { code, state }, headers: { 'Idempotency-Key': state } })
  } catch (e) { error.value = getApiErrorMessage(e) || 'Outward sharing was not connected. Retry only this step.' }
  finally { busy.value = false }
})
useHead({ title: 'Connect Pickax', meta: [{ name: 'referrer', content: 'no-referrer' }] })
</script>
