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
          <div class="flex flex-col">
            <template v-for="(section, sectionIndex) in activeSections" :key="sectionIndex">
              <div
                v-if="sectionIndex > 0"
                class="my-1.5 border-t border-gray-200/70 dark:border-white/10"
                aria-hidden="true"
              />
              <div class="flex flex-col gap-1 moh-text-muted">
                <div
                  v-for="row in section"
                  :key="row.key"
                  class="flex items-center justify-between gap-3"
                >
                  <span class="flex items-center gap-1.5">
                    <span
                      v-if="row.dotClass"
                      class="inline-block h-2 w-2 rounded-full shrink-0"
                      :class="row.dotClass"
                      aria-hidden="true"
                    />
                    {{ row.label }}
                  </span>
                  <span class="tabular-nums font-medium moh-text">{{ formatRowValue(row) }}</span>
                </div>
              </div>
            </template>
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
  /** Colored swatch. Omit for plain rows (e.g. Original / Replies). */
  dotClass?: string
  /** Default count. Use `percent` for concentration shares. */
  format?: 'count' | 'percent'
  /**
   * Keep the row when count is 0 (e.g. show "Top author 0%" only when useful).
   * Default: hide zero counts.
   */
  keepZero?: boolean
}

export type BreakdownSection = BreakdownRow[]

const props = defineProps<{
  /** Displayed in the popover header, e.g. "32 verified men". */
  title: string
  /** aria-label for the trigger button. */
  ariaLabel: string
  /** Single-section rows (men / views). Ignored when `sections` is set. */
  rows?: BreakdownRow[]
  /** Multi-section rows with low-contrast dividers between groups. */
  sections?: BreakdownSection[]
}>()

const activeSections = computed(() => {
  const source = props.sections?.length
    ? props.sections
    : [props.rows ?? []]
  return source
    .map((section) => section.filter((r) => r.keepZero || r.count > 0))
    .filter((section) => section.length > 0)
})

function formatRowValue(row: BreakdownRow): string {
  if (row.format === 'percent') return `${Math.round(row.count)}%`
  return row.count.toLocaleString('en-US')
}

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
  const rowCount = activeSections.value.reduce((n, s) => n + s.length, 0)
  const dividerCount = Math.max(0, activeSections.value.length - 1)
  place(anchor, {
    align: 'start',
    gap: 6,
    // Wide enough for "Top 5 authors" / "24 of 37 have posted".
    menuWidth: 210,
    // Title + rows + optional section dividers.
    menuHeight: 36 + rowCount * 22 + dividerCount * 14,
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
