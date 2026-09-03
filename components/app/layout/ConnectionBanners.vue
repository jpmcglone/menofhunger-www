<template>
  <Transition
    enter-active-class="transition-[opacity,transform] duration-200 ease-out"
    enter-from-class="opacity-0 -translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-[opacity,transform] duration-150 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-2"
  >
    <div
      v-if="isAuthed && (disconnectedDueToIdle || connectionBarJustConnected || (wasSocketConnectedOnce && socketDisconnectedWhileVisible && !isSocketConnected))"
      :class="[
        'fixed left-0 right-0 top-0 z-50 flex items-center justify-center gap-3 border-b px-4 pb-2.5 pt-[calc(0.625rem+var(--moh-safe-top,0px))] text-center text-sm backdrop-blur-sm',
        connectionBarJustConnected
          ? 'border-green-500/60 bg-green-100/95 text-green-900 dark:border-green-500/50 dark:bg-green-900/30 dark:text-green-100'
          : isSocketConnecting
            ? 'border-amber-400/70 bg-amber-50/95 text-amber-900 dark:border-amber-500/50 dark:bg-amber-900/25 dark:text-amber-100'
            : 'border-red-500/60 bg-red-100/95 text-red-900 dark:border-red-500/50 dark:bg-red-900/30 dark:text-red-100'
      ]"
      role="status"
      aria-live="polite"
    >
      <template v-if="connectionBarJustConnected">
        <span>Reconnected.</span>
      </template>
      <template v-else-if="isSocketConnecting">
        <span>Reconnecting…</span>
      </template>
      <template v-else>
        <span>You've been disconnected.</span>
        <span class="ml-1.5">Scroll or tap anywhere to reconnect.</span>
        <Button
          label="Reconnect"
          size="small"
          severity="secondary"
          class="ml-2 !bg-white/80 dark:!bg-zinc-800/80"
          @click="onReconnectClick"
        />
      </template>
    </div>
  </Transition>

  <!-- Full-screen API-down treatment. Replaces the thin amber banner so the page
       doesn't stack "Failed to load posts / suggestions / WOTD" under an outage. -->
  <Transition
    enter-active-class="transition-opacity duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="apiUnreachable && !apiJustReconnected"
      class="fixed inset-0 z-[80] flex items-center justify-center moh-bg moh-texture px-4"
      role="alert"
      aria-live="assertive"
    >
      <div class="w-full max-w-md text-center space-y-5">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full border moh-border moh-surface">
          <Icon name="tabler:cloud-off" class="text-2xl moh-text-muted" aria-hidden="true" />
        </div>
        <div class="space-y-2">
          <h1 class="text-xl font-semibold tracking-tight moh-text">
            Can't reach the server
          </h1>
          <p class="text-sm moh-text-muted">
            We're having trouble connecting right now. Your session is safe — try again in a moment.
          </p>
        </div>
        <div class="flex flex-wrap items-center justify-center gap-3">
          <Button
            label="Retry"
            :loading="apiRetrying"
            :disabled="apiRetrying"
            @click="onApiRetryClick"
          />
          <Button
            as="NuxtLink"
            to="/status"
            label="Check status"
            severity="secondary"
            text
          />
        </div>
      </div>
    </div>
  </Transition>

  <Transition
    enter-active-class="transition-[opacity,transform] duration-200 ease-out"
    enter-from-class="opacity-0 -translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-[opacity,transform] duration-150 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-2"
  >
    <div
      v-if="apiJustReconnected"
      class="fixed left-0 right-0 top-0 z-50 flex items-center justify-center gap-3 border-b px-4 pb-2.5 pt-[calc(0.625rem+var(--moh-safe-top,0px))] text-center text-sm backdrop-blur-sm border-green-500/60 bg-green-100/95 text-green-900 dark:border-green-500/50 dark:bg-green-900/30 dark:text-green-100"
      role="status"
      aria-live="polite"
    >
      <span>Reconnected.</span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const { me: fetchMe, apiUnreachable } = useAuth()
const { isAuthed } = useAppNav()
const {
  disconnectedDueToIdle,
  socketDisconnectedWhileVisible,
  wasSocketConnectedOnce,
  isSocketConnected,
  connectionBarJustConnected,
  isSocketConnecting,
  reconnect,
} = usePresence()

function onReconnectClick() {
  reconnect()
}

const apiRetrying = ref(false)
const apiJustReconnected = ref(false)
/** Set while Retry is about to reloadNuxtApp — suppresses the green flash. */
const apiRetryReloading = ref(false)
let apiReconnectedTimer: ReturnType<typeof setTimeout> | null = null

async function onApiRetryClick() {
  if (apiRetrying.value) return
  apiRetrying.value = true
  // Suppress the green flash before fetchMe can clear apiUnreachable.
  apiRetryReloading.value = true
  try {
    await fetchMe()
    if (!apiUnreachable.value && import.meta.client) {
      // Reload so feeds / rails / WOTD leave their stuck local error states.
      reloadNuxtApp({ force: true })
      return
    }
    apiRetryReloading.value = false
  } catch {
    apiRetryReloading.value = false
  } finally {
    apiRetrying.value = false
  }
}

// Auto flash "Reconnected." when apiUnreachable clears without an explicit Retry
// (e.g. another me() elsewhere). Skip if we're about to reload from Retry.
watch(apiUnreachable, (unreachable, wasUnreachable) => {
  if (!unreachable && wasUnreachable && !apiJustReconnected.value && !apiRetryReloading.value) {
    apiJustReconnected.value = true
    if (apiReconnectedTimer) clearTimeout(apiReconnectedTimer)
    apiReconnectedTimer = setTimeout(() => {
      apiJustReconnected.value = false
    }, 2500)
  }
})

// Lock scroll while the API-down overlay covers the app shell.
watch(
  () => apiUnreachable.value && !apiJustReconnected.value,
  (showOverlay) => {
    if (!import.meta.client) return
    document.documentElement.style.overflow = showOverlay ? 'hidden' : ''
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (apiReconnectedTimer) {
    clearTimeout(apiReconnectedTimer)
    apiReconnectedTimer = null
  }
  if (import.meta.client) document.documentElement.style.overflow = ''
})

function onScrollOrTapReconnect() {
  const showBanner = disconnectedDueToIdle.value || (wasSocketConnectedOnce.value && socketDisconnectedWhileVisible.value && !isSocketConnected.value)
  if (showBanner && !isSocketConnecting.value) reconnect()
}

watch(
  () => isAuthed.value && (disconnectedDueToIdle.value || (wasSocketConnectedOnce.value && socketDisconnectedWhileVisible.value && !isSocketConnected.value)),
  (shouldListen, _, onCleanup) => {
    if (!import.meta.client || !shouldListen) return
    const opts = { capture: true }
    document.addEventListener('scroll', onScrollOrTapReconnect, opts)
    document.addEventListener('click', onScrollOrTapReconnect, opts)
    document.addEventListener('touchstart', onScrollOrTapReconnect, opts)
    document.addEventListener('keydown', onScrollOrTapReconnect, opts)
    onCleanup(() => {
      document.removeEventListener('scroll', onScrollOrTapReconnect, opts)
      document.removeEventListener('click', onScrollOrTapReconnect, opts)
      document.removeEventListener('touchstart', onScrollOrTapReconnect, opts)
      document.removeEventListener('keydown', onScrollOrTapReconnect, opts)
    })
  },
  { immediate: true },
)
</script>
