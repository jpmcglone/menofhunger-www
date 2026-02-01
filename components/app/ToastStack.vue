<template>
  <div class="pointer-events-none fixed inset-x-0 z-[1000]" :style="stackStyle" aria-live="polite" aria-relevant="additions">
    <div class="mx-auto w-full max-w-lg px-3">
      <TransitionGroup name="moh-toast" tag="div" class="space-y-2">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="pointer-events-auto overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/10 dark:ring-white/10"
          :style="{ backgroundColor: bgFor(t), color: fgFor(t) }"
          role="status"
        >
          <div class="relative px-4 py-3 pr-8">
            <button
              v-if="t.to"
              type="button"
              class="block w-full text-left"
              :aria-label="t.title"
              @click="onToastClick(t)"
            >
              <div class="text-lg font-semibold leading-tight truncate">{{ t.title }}</div>
              <div v-if="t.message" class="mt-0.5 text-sm opacity-95">{{ t.message }}</div>
            </button>
            <template v-else>
              <div class="text-lg font-semibold leading-tight truncate">{{ t.title }}</div>
              <div v-if="t.message" class="mt-0.5 text-sm opacity-95">{{ t.message }}</div>
            </template>
            <button
              type="button"
              class="absolute top-3 right-3 font-semibold opacity-80 hover:opacity-100 transition-opacity"
              aria-label="Dismiss"
              @click.stop="dismiss(t.id)"
            >
              ×
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
const { toasts, dismiss, bgFor, fgFor } = useAppToast()

const stackStyle = computed<Record<string, string>>(() => {
  // Keep a little clearance from device safe area.
  return { bottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }
})

function onToastClick(t: { id: string; to?: string | null }) {
  if (!t.to) return
  dismiss(t.id)
  void navigateTo(t.to)
}

watchEffect(() => {
  if (!import.meta.client) return
  // Schedule auto-dismiss timers for any toasts that have a duration.
  for (const t of toasts.value) {
    const key = `moh_toast_timer_${t.id}`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((globalThis as any)[key]) continue
    const ms = typeof t.durationMs === 'number' ? t.durationMs : 2600
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any)[key] = window.setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(globalThis as any)[key] = null
      dismiss(t.id)
    }, ms)
  }
})
</script>

<style scoped>
.moh-toast-enter-active,
.moh-toast-leave-active {
  transition: transform 160ms ease, opacity 160ms ease;
}
.moh-toast-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}
.moh-toast-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.98);
}
</style>

