<template>
  <AppPageContent gutter="standard" top="standard" bottom="standard">
    <div class="w-full space-y-4">
      <div class="space-y-1">
        <div class="text-xl font-semibold">Verify your email</div>
        <div class="text-sm moh-text-muted">
          This confirms your email for digests and important notifications.
        </div>
      </div>

      <div class="rounded-xl border moh-border moh-bg p-4 space-y-2">
        <div v-if="status === 'working'" class="text-sm moh-text-muted">Verifying…</div>
        <div v-else-if="status === 'ok'" class="text-sm text-green-700 dark:text-green-300">
          Email verified. Redirecting…
        </div>
        <div v-else class="text-sm text-red-700 dark:text-red-300">
          Verification link is invalid or expired.
        </div>
        <div class="pt-1">
          <NuxtLink to="/settings/account" class="text-sm font-medium hover:underline underline-offset-2">
            Go to account settings
          </NuxtLink>
        </div>
      </div>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Verify email',
  // We want this page available but require login before confirmation.
})

usePageSeo({
  title: 'Verify email',
  description: 'Verify your email address.',
  canonicalPath: '/email/verify',
  noindex: true,
})

const route = useRoute()
const { user, ensureLoaded, me } = useAuth()
const { apiFetchData } = useApiClient()

const token = computed(() => String(route.query.token ?? '').trim())
const status = ref<'working' | 'ok' | 'error'>('working')
const didRun = ref(false)

onMounted(async () => {
  // Nuxt runs `script setup` on server + client; only confirm on the client.
  if (!import.meta.client) return
  if (didRun.value) return
  didRun.value = true

  await ensureLoaded()

  if (!user.value?.id) {
    // Require login as the user verifying.
    await navigateTo(`/login?redirect=${encodeURIComponent(`/email/verify?token=${encodeURIComponent(token.value)}`)}`)
    return
  }

  if (!token.value) {
    status.value = 'error'
    return
  }

  try {
    const res = await apiFetchData<{ ok: boolean; reason?: string }>('/email/verification/confirm', {
      method: 'POST',
      body: { token: token.value },
    })

    // Always refresh auth state after attempting verification so UI + redirects are correct.
    await me()

    // If the user is verified now, treat as success (handles double-submit / already-consumed tokens).
    if (user.value?.emailVerifiedAt) {
      status.value = 'ok'
      setTimeout(() => {
        void navigateTo('/settings/account?email_verified=1')
      }, 500)
      return
    }

    if (res.ok) {
      status.value = 'ok'
      setTimeout(() => {
        void navigateTo('/settings/account?email_verified=1')
      }, 500)
    } else {
      status.value = 'error'
      void navigateTo(`/settings/account?email_verified=0&reason=${encodeURIComponent(res.reason || 'unknown')}`)
    }
  } catch {
    // Best-effort: if it actually worked but the request failed client-side, don't show a false negative.
    await me()
    if (user.value?.emailVerifiedAt) {
      status.value = 'ok'
      setTimeout(() => {
        void navigateTo('/settings/account?email_verified=1')
      }, 500)
      return
    }
    status.value = 'error'
  }
})
</script>

