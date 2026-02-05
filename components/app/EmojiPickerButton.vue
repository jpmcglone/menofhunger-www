<template>
  <div class="inline-flex">
    <Button
      ref="anchorEl"
      :icon="icon"
      text
      rounded
      severity="secondary"
      :aria-label="ariaLabel"
      :disabled="disabled"
      v-tooltip.bottom="tinyTooltip(tooltip)"
      @click="toggle"
    />
  </div>

  <Teleport to="body">
    <Transition name="moh-fade">
      <div
        v-if="open"
        ref="panelEl"
        class="fixed z-[1100] w-[min(92vw,22rem)] rounded-xl border moh-border bg-white shadow-2xl dark:bg-zinc-950"
        :style="panelStyle"
        role="dialog"
        aria-label="Emoji picker"
      >
        <ClientOnly>
          <div class="moh-emoji-picker">
            <!-- emoji-picker-element web component -->
            <emoji-picker @emoji-click="onEmojiClick" />
          </div>
        </ClientOnly>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { tinyTooltip } from '~/utils/tiny-tooltip'

const props = withDefaults(
  defineProps<{
    tooltip?: string
    ariaLabel?: string
    icon?: string
    disabled?: boolean
  }>(),
  {
    tooltip: 'Emoji',
    ariaLabel: 'Insert emoji',
    icon: 'pi pi-face-smile',
    disabled: false,
  },
)

const emit = defineEmits<{
  (e: 'select', emoji: string): void
}>()

const open = ref(false)
const anchorEl = ref<HTMLElement | null>(null)
const panelEl = ref<HTMLElement | null>(null)
const panelStyle = ref<Record<string, string>>({})

onMounted(async () => {
  // Registers the <emoji-picker> custom element on the client.
  await import('emoji-picker-element')
})

function updatePanelPosition() {
  if (!import.meta.client) return
  const anchor = anchorEl.value
  const panel = panelEl.value
  if (!anchor || !panel) return

  const r = anchor.getBoundingClientRect()
  const margin = 8
  const vw = window.innerWidth || 0
  const vh = window.innerHeight || 0

  // Prefer below-left, clamp to viewport.
  const panelW = panel.offsetWidth || 0
  const panelH = panel.offsetHeight || 0

  let left = Math.floor(r.left)
  left = Math.max(margin, Math.min(left, vw - margin - panelW))

  // Try below; if not enough space, place above.
  const belowTop = Math.floor(r.bottom + margin)
  const aboveTop = Math.floor(r.top - margin - panelH)
  let top = belowTop
  if (belowTop + panelH > vh - margin && aboveTop >= margin) {
    top = aboveTop
  }
  top = Math.max(margin, Math.min(top, vh - margin - panelH))

  panelStyle.value = { left: `${left}px`, top: `${top}px` }
}

function close() {
  open.value = false
}

function toggle() {
  if (props.disabled) return
  open.value = !open.value
  if (open.value) {
    // Wait for panel mount + measure.
    requestAnimationFrame(() => {
      updatePanelPosition()
      requestAnimationFrame(() => updatePanelPosition())
    })
  }
}

function onDocPointerDown(e: Event) {
  if (!open.value) return
  const t = e.target as Node | null
  const anchor = anchorEl.value
  const panel = panelEl.value
  if (!t || !anchor || !panel) return
  if (panel.contains(t) || anchor.contains(t)) return
  close()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) close()
}

watch(open, (v) => {
  if (!import.meta.client) return
  if (v) {
    window.addEventListener('resize', updatePanelPosition, { passive: true })
    window.addEventListener('scroll', updatePanelPosition, { passive: true, capture: true })
    document.addEventListener('pointerdown', onDocPointerDown, { capture: true })
    document.addEventListener('keydown', onKeydown, { capture: true })
  } else {
    window.removeEventListener('resize', updatePanelPosition)
    window.removeEventListener('scroll', updatePanelPosition, true as any)
    document.removeEventListener('pointerdown', onDocPointerDown, true as any)
    document.removeEventListener('keydown', onKeydown, true as any)
  }
})

function onEmojiClick(e: unknown) {
  // emoji-picker-element dispatches a CustomEvent with detail.unicode
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unicode = (e as any)?.detail?.unicode as string | undefined
  const emoji = (unicode ?? '').trim()
  if (!emoji) return
  emit('select', emoji)
  close()
}
</script>

<style scoped>
.moh-emoji-picker {
  /* Blend picker with app theme. emoji-picker-element uses CSS variables extensively. */
  --background: var(--moh-bg);
  --border-color: var(--moh-border);
  --button-hover-background: var(--moh-surface-hover);
  --input-border-color: var(--moh-border);
  --input-font-color: var(--moh-text);
  --input-placeholder-color: var(--moh-text-muted);
  --outline-color: rgba(43, 123, 185, 0.35);
}
</style>

