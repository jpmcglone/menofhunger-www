<template>
  <!--
    Always visible while a site admin is acting as another user. Deliberately has no
    dismiss control: forgetting you are signed in as someone else is the main hazard
    of this feature, so the banner is the permanent reminder and the way out.
  -->
  <div
    v-if="isImpersonating"
    class="w-full border-b border-violet-300/70 bg-violet-100/95 px-4 py-2 text-sm backdrop-blur-sm dark:border-violet-500/30 dark:bg-violet-950/60"
  >
    <div class="flex items-center gap-2">
      <Icon
        name="tabler:eye"
        class="shrink-0 text-base text-violet-700 dark:text-violet-300"
        aria-hidden="true"
      />
      <div class="min-w-0 flex-1 truncate text-violet-900 dark:text-violet-100">
        <span class="font-semibold">Viewing as @{{ user?.username ?? 'user' }}</span>
        <span class="ml-2 opacity-80">
          signed in by @{{ impersonation?.adminUsername ?? 'admin' }}
        </span>
      </div>
      <button
        type="button"
        class="shrink-0 rounded-full bg-violet-700 px-3 py-1 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60 dark:bg-violet-500"
        :disabled="exiting"
        @click="onExit"
      >
        {{ exiting ? 'Exiting…' : 'Exit' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const { user, impersonation, isImpersonating, stopImpersonation } = useAuth()
const appToast = useAppToast()

const exiting = ref(false)

async function onExit() {
  if (exiting.value) return
  exiting.value = true
  try {
    const admin = await stopImpersonation()
    if (admin) {
      appToast.push({ title: `Back to @${admin.username ?? 'your account'}`, tone: 'success' })
      await navigateTo('/admin', { replace: true })
    }
  } catch {
    appToast.push({
      title: 'Could not exit',
      message: 'Please try again, or log out to end the session.',
      tone: 'error',
    })
  } finally {
    exiting.value = false
  }
}
</script>
