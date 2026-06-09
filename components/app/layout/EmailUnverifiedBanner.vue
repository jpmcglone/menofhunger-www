<template>
  <button
    v-if="showEmailUnverifiedBar"
    type="button"
    class="w-full border-b moh-border px-4 py-2 text-left text-sm backdrop-blur-sm bg-amber-50/95 text-amber-900 hover:bg-amber-50 dark:bg-amber-900/25 dark:text-amber-100 dark:hover:bg-amber-900/35"
    :disabled="emailVerifResending"
    @click="resendEmailVerificationFromBanner"
  >
    <span class="font-semibold">Email not verified.</span>
    <span class="ml-2">
      <span class="font-mono">{{ (user?.email ?? '').trim() }}</span>
      <span class="ml-2 opacity-90">{{ emailVerifResending ? 'Sending…' : 'Tap to resend verification email.' }}</span>
    </span>
  </button>
</template>

<script setup lang="ts">
const route = useRoute()
const { user } = useAuth()
const { isAuthed } = useAppNav()
const { apiFetchData } = useApiClient()
const appToast = useAppToast()

const showEmailUnverifiedBar = computed(() => {
  if (!isAuthed.value) return false
  // Avoid redundancy: this banner is meant to drive people *to* settings.
  if (route.path.startsWith('/settings')) return false
  // Also avoid redundancy on email flow pages (verify/unsubscribe, etc).
  if (route.path.startsWith('/email')) return false
  const email = (user.value?.email ?? '').trim()
  if (!email) return false
  return !user.value?.emailVerifiedAt
})

const emailVerifResending = ref(false)

async function resendEmailVerificationFromBanner() {
  if (emailVerifResending.value) return
  emailVerifResending.value = true
  try {
    await apiFetchData<{ sent: boolean }>('/email/verification/resend', { method: 'POST' })
    appToast.push({ title: 'Verification email sent', message: 'Check your inbox.', tone: 'success' })
  } catch {
    appToast.push({ title: 'Could not send email', message: 'Please try again later.', tone: 'error' })
  } finally {
    emailVerifResending.value = false
  }
}
</script>
