<template>
  <div class="pointer-events-none fixed inset-x-0 z-[1000]" :style="stackStyle" aria-live="polite" aria-relevant="additions">
    <div class="mx-auto w-full max-w-md px-3">
      <TransitionGroup name="moh-toast" tag="div" class="space-y-2">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="pointer-events-auto overflow-hidden shadow-lg ring-1 ring-black/10 dark:ring-white/10"
          :class="hasActions(t) ? 'rounded-2xl' : 'rounded-full'"
          :style="{ backgroundColor: bgFor(t), color: fgFor(t) }"
          role="status"
        >
          <div class="flex min-h-12 items-center gap-3 px-4 py-2">
            <!-- Whole-row action: only when there are no buttons AND `to` is set. -->
            <button
              v-if="t.to && !hasActions(t)"
              type="button"
              class="flex min-w-0 flex-1 items-center gap-2 text-left moh-focus rounded-full -mx-1 px-1 py-0.5"
              :aria-label="t.title"
              @click="onToastClick(t)"
            >
              <span class="truncate text-sm font-semibold leading-none">{{ t.title }}</span>
              <span v-if="t.message" class="truncate text-sm opacity-90 leading-none">{{ t.message }}</span>
            </button>
            <!-- Static row (no nav, no buttons OR with buttons): just text. -->
            <div v-else class="flex min-w-0 flex-1" :class="hasActions(t) ? 'flex-col gap-1' : 'items-center gap-2'">
              <span
                class="text-sm font-semibold leading-snug"
                :class="hasActions(t) ? '' : 'truncate leading-none'"
              >{{ t.title }}</span>
              <span
                v-if="t.message"
                class="text-sm opacity-90"
                :class="hasActions(t) ? 'leading-snug' : 'truncate leading-none'"
              >{{ t.message }}</span>
            </div>

            <div v-if="hasActions(t)" class="flex shrink-0 items-center gap-1.5 ml-auto">
              <button
                v-for="(action, i) in t.actions!"
                :key="action.id ?? `${t.id}-action-${i}`"
                type="button"
                class="inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold transition-colors moh-focus"
                :class="action.primary
                  ? 'bg-white/95 text-gray-900 hover:bg-white'
                  : 'bg-white/15 text-current hover:bg-white/25'"
                @click.stop="onActionClick(t, action)"
              >
                {{ action.label }}
              </button>
              <button
                type="button"
                class="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full text-lg font-semibold opacity-80 hover:opacity-100 transition-opacity moh-focus"
                aria-label="Dismiss"
                @click.stop="dismiss(t.id)"
              >
                ×
              </button>
            </div>

            <button
              v-else
              type="button"
              class="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full font-semibold opacity-80 hover:opacity-100 transition-opacity moh-focus"
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
import type { AppToast, AppToastAction } from '~/composables/useAppToast'

const { toasts, dismiss, bgFor, fgFor } = useAppToast()

function hasActions(t: AppToast): boolean {
  return Array.isArray(t.actions) && t.actions.length > 0
}

const isSmUp = ref(false)
function updateIsSmUp() {
  if (!import.meta.client || typeof window === 'undefined') return
  isSmUp.value = window.matchMedia('(min-width: 640px)').matches
}
onMounted(() => {
  updateIsSmUp()
  if (!import.meta.client || typeof window === 'undefined') return
  window.addEventListener('resize', updateIsSmUp, { passive: true })
})
onBeforeUnmount(() => {
  if (!import.meta.client || typeof window === 'undefined') return
  window.removeEventListener('resize', updateIsSmUp as any)
})

const stackStyle = computed<Record<string, string>>(() => {
  // On mobile, keep clearance above the fixed tab bar (and safe area).
  // On sm+ the tab bar is hidden, so keep it tighter.
  return isSmUp.value
    ? { bottom: 'calc(var(--moh-safe-bottom, 0px) + 1rem)' }
    : { bottom: 'calc(var(--moh-tabbar-height, 4.5rem) + var(--moh-safe-bottom, 0px) + 1rem)' }
})

function onToastClick(t: AppToast) {
  if (!t.to) return
  dismiss(t.id)
  void navigateTo(t.to)
}

async function onActionClick(t: AppToast, action: AppToastAction) {
  let keepOpen = Boolean(action.keepOpen)
  try {
    const res = await action.onClick?.(t.id)
    if (res === true) keepOpen = true
  } catch {
    // Surface action errors via separate toast if needed; do not auto-dismiss on throw.
    keepOpen = true
  }
  if (!keepOpen) dismiss(t.id)
}

watchEffect(() => {
  if (!import.meta.client) return
  // Schedule auto-dismiss timers only for non-persistent toasts.
  for (const t of toasts.value) {
    const key = `moh_toast_timer_${t.id}`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((globalThis as any)[key]) continue
    if (t.persistent || !t.durationMs) continue
    const ms = t.durationMs
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
