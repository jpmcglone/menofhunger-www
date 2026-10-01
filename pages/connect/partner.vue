<template>
  <main class="moh-gutter-x mx-auto max-w-lg py-12 space-y-4">
    <AppOnboardingGate v-if="isAuthed" />
    <h1 class="moh-h1">Connect Men of Hunger</h1>
    <p class="moh-text-muted">Continue to choose your personal account or page and review the app’s access.</p>
    <a v-if="destination" :href="destination" class="inline-flex min-h-11 items-center font-semibold underline">Continue securely</a>
    <p v-else role="alert">This connection request is missing or expired. Start again from the partner site.</p>
  </main>
</template>
<script setup lang="ts">
const route = useRoute()
const { isAuthed } = useAuth()
const { apiBaseUrl } = useApiClient()
const destination = computed(() => {
  const interaction = route.query.interaction
  if (typeof interaction !== 'string' || !/^[A-Za-z0-9_-]{20,200}$/.test(interaction)) return null
  try { return new URL(`/oauth/interaction/${encodeURIComponent(interaction)}`, apiBaseUrl).href } catch { return null }
})
useHead({ title: 'Connect Men of Hunger', meta: [{ name: 'referrer', content: 'no-referrer' }] })
</script>
