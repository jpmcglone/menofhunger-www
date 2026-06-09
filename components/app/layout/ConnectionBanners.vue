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
      v-if="isAuthed && (disconnectedDueToIdle || connectionBarJustConnected || (socketDisconnectedWhileVisible && !isSocketConnected))"
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
  <!-- API connectivity banner: shown when REST API is unreachable (network error, server down). -->
  <!-- Keeps the user in a logged-in appearance during brief outages or rolling deploys. -->
  <Transition
    enter-active-class="transition-[opacity,transform] duration-200 ease-out"
    enter-from-class="opacity-0 -translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-[opacity,transform] duration-150 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-2"
  >
    <div
      v-if="apiUnreachable && !apiJustReconnected"
      :class="[
        'fixed left-0 right-0 top-0 z-50 flex items-center justify-center gap-3 border-b px-4 pb-2.5 pt-[calc(0.625rem+var(--moh-safe-top,0px))] text-center text-sm backdrop-blur-sm',
        'border-amber-400/70 bg-amber-50/95 text-amber-900 dark:border-amber-500/50 dark:bg-amber-900/25 dark:text-amber-100',
      ]"
      role="status"
      aria-live="polite"
    >
      <span>Trouble connecting to the server.</span>
      <span class="hidden sm:inline moh-text-muted text-amber-700 dark:text-amber-300">Some features may be unavailable.</span>
      <Button
        label="Retry"
        size="small"
        severity="secondary"
        class="ml-2 !bg-white/80 dark:!bg-zinc-800/80"
        :loading="apiRetrying"
        @click="onApiRetryClick"
      />
    </div>
    <div
      v-else-if="apiJustReconnected"
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
  isSocketConnected,
  connectionBarJustConnected,
  isSocketConnecting,
  reconnect,
} = usePresence()

function onReconnectClick() {
  reconnect()
}

// API connectivity banner state
const apiRetrying = ref(false)
const apiJustReconnected = ref(false)
let apiReconnectedTimer: ReturnType<typeof setTimeout> | null = null

async function onApiRetryClick() {
  if (apiRetrying.value) return
  apiRetrying.value = true
  try {
    await fetchMe()
    if (!apiUnreachable.value) {
      apiJustReconnected.value = true
      if (apiReconnectedTimer) clearTimeout(apiReconnectedTimer)
      apiReconnectedTimer = setTimeout(() => {
        apiJustReconnected.value = false
      }, 2500)
    }
  } finally {
    apiRetrying.value = false
  }
}

// Auto-clear the "just reconnected" flash when apiUnreachable goes false on its own (e.g. next page nav).
watch(apiUnreachable, (unreachable, wasUnreachable) => {
  if (!unreachable && wasUnreachable && !apiJustReconnected.value) {
    apiJustReconnected.value = true
    if (apiReconnectedTimer) clearTimeout(apiReconnectedTimer)
    apiReconnectedTimer = setTimeout(() => {
      apiJustReconnected.value = false
    }, 2500)
  }
})

onBeforeUnmount(() => {
  if (apiReconnectedTimer) {
    clearTimeout(apiReconnectedTimer)
    apiReconnectedTimer = null
  }
})

// When disconnected bar is visible, scroll or tap anywhere should reconnect.
function onScrollOrTapReconnect() {
  const showBanner = disconnectedDueToIdle.value || (socketDisconnectedWhileVisible.value && !isSocketConnected.value)
  if (showBanner && !isSocketConnecting.value) reconnect()
}

watch(
  () => isAuthed.value && (disconnectedDueToIdle.value || (socketDisconnectedWhileVisible.value && !isSocketConnected.value)),
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
