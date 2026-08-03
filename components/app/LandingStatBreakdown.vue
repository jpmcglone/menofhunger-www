<template>
  <div class="relative inline-flex items-center">
    <button
      ref="triggerEl"
      type="button"
      class="moh-tap inline-flex items-center font-semibold text-gray-900 dark:text-gray-50 cursor-default select-none"
      :aria-label="ariaLabel"
      @mouseenter="open"
      @focus="open"
      @mouseleave="close"
      @blur="close"
      @click.stop="toggle"
    >
      <slot />
    </button>

    <!-- Breakdown popover: teleported to body so it's never clipped by a parent stacking context -->
    <Teleport to="body">
      <Transition name="stat-breakdown">
        <div
          v-if="visible"
          ref="popoverEl"
          class="fixed z-[9999] min-w-[10rem] rounded-lg border moh-border moh-surface shadow-lg px-3 py-2.5 text-[11px] sm:text-xs"
          :style="popoverStyle"
          role="tooltip"
        >
          <p class="mb-1.5 font-semibold moh-text tabular-nums">
            {{ title }}
          </p>
          <div class="flex flex-col gap-1 moh-text-muted">
            <div
              v-for="row in activeRows"
              :key="row.key"
              class="flex items-center justify-between gap-3"
            >
              <span class="flex items-center gap-1.5">
                <span
                  class="inline-block h-2 w-2 rounded-full shrink-0"
                  :class="row.dotClass"
                  aria-hidden="true"
                />
                {{ row.label }}
              </span>
              <span class="tabular-nums font-medium moh-text">{{ row.count.toLocaleString('en-US') }}</span>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
export type BreakdownRow = {
  key: string
  label: string
  count: number
  dotClass: string
}

const props = defineProps<{
  /** Displayed in the popover header, e.g. "32 verified men". */
  title: string
  /** aria-label for the trigger button. */
  ariaLabel: string
  rows: BreakdownRow[]
}>()

const activeRows = computed(() => props.rows.filter((r) => r.count > 0))

const triggerEl = ref<HTMLElement | null>(null)
const visible = ref(false)

const {
  style: popoverStyle,
  menuEl: popoverEl,
  place,
  reset: resetPosition,
} = useMenuPosition()

function placeFrom(anchor: HTMLElement | null) {
  if (!anchor) return
  place(anchor, {
    align: 'start',
    gap: 6,
    menuWidth: 180,
    menuHeight: 100,
  })
}

function open(event?: Event) {
  const anchor = event?.currentTarget instanceof HTMLElement ? event.currentTarget : triggerEl.value
  placeFrom(anchor)
  visible.value = true
  placeFrom(anchor)
}

function close() {
  visible.value = false
  resetPosition()
}

function toggle() {
  if (visible.value) close()
  else open()
}
</script>

<style scoped>
.stat-breakdown-enter-active,
.stat-breakdown-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.stat-breakdown-enter-from,
.stat-breakdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
