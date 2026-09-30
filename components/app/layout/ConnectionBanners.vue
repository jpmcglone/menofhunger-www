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
      v-focus-trap
      class="moh-recovery-overlay z-[80] overflow-y-auto moh-bg moh-texture"
      role="dialog"
      aria-modal="true"
      aria-label="Connection unavailable"
    >
      <AppScreenState
        title="Let’s reconnect" icon="globe" prominent
        description="We can’t reach Men of Hunger. Check your connection and try again."
        action-label="Try again" :busy="apiRetrying" @action="onApiRetryClick"
      >
        <template #actions>
          <NuxtLink to="/status" class="inline-flex items-center text-sm font-medium moh-text-muted">Check status</NuxtLink>
        </template>
      </AppScreenState>
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
import FocusTrap from 'primevue/focustrap'

const vFocusTrap = FocusTrap
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

// Keep keyboard focus and scroll ownership within the blocking recovery screen.
let overlayPreviousFocus: HTMLElement | null = null
let overlayPreviousOverflow: string | null = null
function restoreOverlayContext() {
  if (!import.meta.client || overlayPreviousOverflow === null) return
  document.documentElement.style.overflow = overlayPreviousOverflow
  overlayPreviousOverflow = null
  if (overlayPreviousFocus?.isConnected) overlayPreviousFocus.focus({ preventScroll: true })
  overlayPreviousFocus = null
}

watch(
  () => apiUnreachable.value && !apiJustReconnected.value,
  (showOverlay) => {
    if (!import.meta.client) return
    if (showOverlay) {
      if (overlayPreviousOverflow === null) {
        overlayPreviousOverflow = document.documentElement.style.overflow
        overlayPreviousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
      }
      document.documentElement.style.overflow = 'hidden'
    } else restoreOverlayContext()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (apiReconnectedTimer) {
    clearTimeout(apiReconnectedTimer)
    apiReconnectedTimer = null
  }
  restoreOverlayContext()
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

<style scoped>
/* The texture utility is positioned relatively; the blocking screen must own the viewport. */
.moh-recovery-overlay { position: fixed; inset: 0; }
.moh-recovery-overlay :deep(.moh-screen-state) { min-height: 100dvh; }
</style>
