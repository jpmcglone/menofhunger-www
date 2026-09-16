<template>
  <AppPageContent top="standard" bottom="standard">
    <section class="mx-auto max-w-prose px-4 space-y-6">
      <h1 class="moh-h1">Account deletion</h1>
      <p v-if="loading" role="status" class="moh-body moh-text-muted">Checking your private receipt…</p>
      <AppInlineAlert v-else-if="error" severity="danger">{{ error }}</AppInlineAlert>
      <template v-else-if="receipt">
        <h2 class="moh-h2">{{ title }}</h2>
        <p class="moh-body moh-text-muted">{{ explanation }}</p>
        <p v-if="receipt.status === 'scheduled'" class="moh-meta">Scheduled for {{ scheduledDate }}. Signing in before then cancels deletion.</p>
        <p class="moh-meta">Save this private link to check completion. Anyone with the link can see this status, so keep it private. Receipts expire 90 days after the scheduled date.</p>
      </template>
      <div class="flex flex-wrap gap-3">
        <Button label="Check status" severity="secondary" :loading="loading" @click="load" />
        <NuxtLink to="/feedback" class="moh-text underline">Contact support</NuxtLink>
        <NuxtLink to="/login" class="moh-text underline">Sign in</NuxtLink>
      </div>
      <p class="moh-meta">Apple subscription billing is separate. <a href="https://apps.apple.com/account/subscriptions" class="underline">Manage your Apple subscriptions</a> to stop renewals.</p>
    </section>
  </AppPageContent>
</template>

<script setup lang="ts">
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({ layout: 'default' })
useHead({ title: 'Account deletion', meta: [{ name: 'robots', content: 'noindex, nofollow' }, { name: 'referrer', content: 'no-referrer' }] })
const route = useRoute()
const { apiFetchData } = useApiClient()
type Receipt = { status: 'scheduled' | 'processing' | 'completed' | 'cancelled'; scheduledAt: string; completedAt: string | null }
const receipt = ref<Receipt | null>(null)
const loading = ref(false)
const error = ref('')
const title = computed(() => ({ scheduled: 'Deletion scheduled', processing: 'Deletion in progress', completed: 'Your account has been deleted', cancelled: 'Deletion cancelled' })[receipt.value?.status ?? 'scheduled'])
const explanation = computed(() => ({ scheduled: 'Your profile is hidden and you have been signed out. Your personal content and fitness data are scheduled for permanent deletion.', processing: 'We are removing your account and associated data. Check back here for confirmation when cleanup is complete.', completed: 'Your account and associated personal content and fitness data have been deleted.', cancelled: 'Signing back in cancelled this deletion request. Your account remains available.' })[receipt.value?.status ?? 'scheduled'])
const scheduledDate = computed(() => receipt.value ? new Date(receipt.value.scheduledAt).toLocaleDateString(undefined, { dateStyle: 'long' }) : '')
async function load() {
  const token = route.hash.slice(1)
  if (!/^[0-9a-f-]{36}$/i.test(token)) { error.value = 'Open the private status link provided when you requested deletion.'; return }
  loading.value = true
  error.value = ''
  try { receipt.value = await apiFetchData<Receipt>('/auth/account/deletion-status', { method: 'POST', body: { token }, mohUnauthorized: 'ignore' }) }
  catch (e) { error.value = getApiErrorMessage(e) || 'Could not check deletion status. Please try again.' }
  finally { loading.value = false }
}
onMounted(load)
</script>
