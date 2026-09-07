<template>
  <div class="landing-stat">
    <button
      ref="triggerEl" type="button" class="landing-stat-trigger moh-tap"
      :aria-label="triggerLabel" aria-haspopup="dialog" :aria-expanded="visible" :aria-controls="panelId"
      @pointerenter="preview" @pointerleave="scheduleClose" @focusout="onFocusOut" @click.stop="toggle"
    ><slot /></button>
    <Teleport to="body">
      <Transition name="stat-breakdown">
        <div
          v-if="visible" :id="panelId" ref="popoverEl" class="moh-count-breakdown"
          :style="popoverStyle" role="dialog" :aria-labelledby="`${panelId}-title`"
          @pointerenter="cancelClose" @pointerleave="scheduleClose" @focusout="onFocusOut"
        >
          <header class="moh-count-breakdown-header">
            <div>
              <h2 :id="`${panelId}-title`">{{ title }}</h2>
              <p v-if="subtitle">{{ subtitle }}</p>
            </div>
            <button ref="closeEl" type="button" class="moh-count-breakdown-close moh-tap" aria-label="Close breakdown" @click="close(true)">
              <Icon name="tabler:x" aria-hidden="true" />
            </button>
          </header>
          <div v-for="(section, sectionIndex) in activeSections" :key="sectionIndex" class="moh-count-breakdown-section">
            <div v-for="row in section" :key="row.key" class="moh-count-breakdown-row">
              <span class="moh-count-breakdown-label">
                <span v-if="row.dotClass" class="moh-count-breakdown-dot" :class="row.dotClass" aria-hidden="true" />
                {{ row.label }}
              </span>
              <span class="moh-count-breakdown-value">{{ formatRowValue(row) }}</span>
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
  subtitle?: string
  /** aria-label for the trigger button. */
  triggerLabel: string
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

const panelId = `landing-stat-${useId()}`
const triggerEl = ref<HTMLElement | null>(null)
const closeEl = ref<HTMLButtonElement | null>(null)
const visible = ref(false)
const pinned = ref(false)
let closeTimer: ReturnType<typeof setTimeout> | undefined
const { style: popoverStyle, menuEl: popoverEl, place, reset: resetPosition } = useMenuPosition()

useOverlayDismiss(pinned, () => close(true))

function cancelClose() {
  clearTimeout(closeTimer)
  closeTimer = undefined
}

function open() {
  cancelClose()
  visible.value = true
  if (!triggerEl.value) return
  const rows = activeSections.value.reduce((count, section) => count + section.length, 0)
  place(triggerEl.value, {
    align: 'start', gap: 12, menuWidth: 390,
    menuHeight: 120 + rows * 32 + activeSections.value.length * 24,
    trackViewport: true, maxHeight: Math.max(96, window.innerHeight - 32),
  })
}

function preview(event: PointerEvent) {
  if (event.pointerType === 'mouse') open()
}

function scheduleClose() {
  cancelClose()
  if (!pinned.value) closeTimer = setTimeout(() => close(), 160)
}

function close(restoreFocus = false) {
  cancelClose()
  visible.value = false
  pinned.value = false
  resetPosition()
  if (restoreFocus) triggerEl.value?.focus({ preventScroll: true })
}

async function toggle() {
  if (pinned.value) return close(true)
  open()
  pinned.value = true
  await nextTick()
  closeEl.value?.focus({ preventScroll: true })
}

function contains(target: EventTarget | null) {
  return target instanceof Node && (triggerEl.value?.contains(target) || popoverEl.value?.contains(target))
}

function onFocusOut(event: FocusEvent) {
  if (!contains(event.relatedTarget)) close()
}

function onOutsidePointer(event: PointerEvent) {
  if (visible.value && !contains(event.target)) close()
}

function onPreviewEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && visible.value && !pinned.value) close(true)
}

onMounted(() => {
  document.addEventListener('pointerdown', onOutsidePointer)
  document.addEventListener('keydown', onPreviewEscape)
})
onBeforeUnmount(() => {
  cancelClose()
  document.removeEventListener('pointerdown', onOutsidePointer)
  document.removeEventListener('keydown', onPreviewEscape)
})
</script>

<style scoped>
.landing-stat { min-width: 0; }
.landing-stat-trigger { display: flex; flex-direction: column; gap: 8px; width: 100%; min-height: 80px; text-align: left; color: var(--moh-text); cursor: pointer; }
.landing-stat-trigger:focus-visible { outline: 2px solid var(--moh-brass); outline-offset: 5px; border-radius: 4px; }
.stat-breakdown-enter-active, .stat-breakdown-leave-active { transition: opacity .12s ease, transform .12s ease; }
.stat-breakdown-enter-from, .stat-breakdown-leave-to { opacity: 0; transform: translateY(-4px); }
@media (prefers-reduced-motion: reduce) {
  .stat-breakdown-enter-active, .stat-breakdown-leave-active { transition: none; }
}
</style>
