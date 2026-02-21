<template>
  <span ref="anchorWrapEl" class="inline-flex">
    <Button
      text
      rounded
      severity="secondary"
      :aria-label="ariaLabel"
      :disabled="disabled"
      v-tooltip.bottom="tinyTooltip(tooltip)"
      @click="toggle"
    >
      <template #icon>
        <Icon :name="icon" aria-hidden="true" />
      </template>
    </Button>
  </span>

  <Teleport to="body">
    <Transition name="moh-fade">
      <div
        v-if="open"
        ref="panelEl"
        class="moh-emoji-popover fixed z-[10100] w-fit max-w-[92vw] border moh-border bg-white shadow-2xl dark:bg-zinc-950"
        :style="panelStyle"
        role="dialog"
        aria-label="Emoji picker"
        :data-placement="panelPlacement"
      >
        <ClientOnly>
          <div class="moh-emoji-picker">
            <!-- emoji-picker-element web component -->
            <emoji-picker class="moh-emoji-el" @emoji-click="onEmojiClick" />
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
    icon: 'tabler:mood-smile',
    disabled: false,
  },
)

const emit = defineEmits<{
  (e: 'select', emoji: string): void
}>()

const open = ref(false)
const anchorWrapEl = ref<HTMLElement | null>(null)
const panelEl = ref<HTMLElement | null>(null)
const panelStyle = ref<Record<string, string>>({})
const panelPlacement = ref<'top' | 'bottom'>('bottom')

onMounted(async () => {
  // Registers the <emoji-picker> custom element on the client.
  await import('emoji-picker-element')
})

function updatePanelPosition() {
  if (!import.meta.client) return
  const anchor = anchorWrapEl.value
  const panel = panelEl.value
  if (!anchor || !panel) return

  const r = anchor.getBoundingClientRect()
  const margin = 8
  const vw = window.innerWidth || 0
  const vh = window.innerHeight || 0

  const panelW = panel.offsetWidth || 0
  const panelH = panel.offsetHeight || 0

  // Prefer aligning panel's left with anchor's left, clamp to viewport.
  let left = Math.floor(r.left)
  left = Math.max(margin, Math.min(left, vw - margin - panelW))

  // Try below; if not enough space, place above.
  const belowTop = Math.floor(r.bottom + margin)
  const aboveTop = Math.floor(r.top - margin - panelH)
  let top = belowTop
  let placement: 'top' | 'bottom' = 'bottom'
  if (belowTop + panelH > vh - margin && aboveTop >= margin) {
    top = aboveTop
    placement = 'top'
  }
  top = Math.max(margin, Math.min(top, vh - margin - panelH))

  // Caret should point at the center of the anchor.
  const anchorCenterX = r.left + r.width / 2
  const caretLeft = Math.max(14, Math.min(panelW - 14, Math.floor(anchorCenterX - left)))

  panelPlacement.value = placement
  panelStyle.value = {
    left: `${left}px`,
    top: `${top}px`,
    '--moh-caret-left': `${caretLeft}px`,
  }
}

function focusEmojiSearch(attempt = 0) {
  if (!import.meta.client) return
  const panel = panelEl.value
  if (!panel) return
  const picker = panel.querySelector('emoji-picker') as HTMLElement | null
  const searchInput = (picker?.shadowRoot?.querySelector('input[type="search"]') ??
    picker?.shadowRoot?.querySelector('input')) as HTMLInputElement | null
  if (searchInput) {
    searchInput.focus()
    return
  }
  if (attempt < 6) {
    setTimeout(() => focusEmojiSearch(attempt + 1), 60)
  }
}

function close() {
  open.value = false
}

function toggle() {
  if (props.disabled) return
  open.value = !open.value
  if (open.value) {
    // Wait for mount + measure.
    void nextTick().then(() => {
      updatePanelPosition()
      requestAnimationFrame(() => updatePanelPosition())
      focusEmojiSearch()
    })
  }
}

function onDocPointerDown(e: Event) {
  if (!open.value) return
  const t = e.target as Node | null
  const anchor = anchorWrapEl.value
  const panel = panelEl.value
  if (!t || !anchor || !panel) return
  if (panel.contains(t) || anchor.contains(t)) return
  close()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) close()
}

const scrollOpts = { passive: true, capture: true } as const
const pointerOpts = { capture: true } as const
watch(open, (v, _old, onCleanup) => {
  if (!import.meta.client) return

  const teardown = () => {
    window.removeEventListener('resize', updatePanelPosition)
    window.removeEventListener('scroll', updatePanelPosition, scrollOpts)
    document.removeEventListener('pointerdown', onDocPointerDown, pointerOpts)
    document.removeEventListener('keydown', onKeydown, pointerOpts)
  }

  // Ensure cleanup runs on unmount even if `open` stays true.
  onCleanup(() => teardown())

  if (v) {
    window.addEventListener('resize', updatePanelPosition, { passive: true })
    window.addEventListener('scroll', updatePanelPosition, scrollOpts)
    document.addEventListener('pointerdown', onDocPointerDown, pointerOpts)
    document.addEventListener('keydown', onKeydown, pointerOpts)
  } else {
    teardown()
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

.moh-emoji-popover {
  border-radius: 0;
  padding: 0;
  overflow: hidden;
}

.moh-emoji-el {
  display: block;
  width: 100%;
  margin: 0;
}

.moh-emoji-popover::before {
  content: '';
  position: absolute;
  left: var(--moh-caret-left, 20px);
  width: 10px;
  height: 10px;
  transform: translateX(-50%) rotate(45deg);
  background: inherit;
  border-left: 1px solid var(--moh-border);
  border-top: 1px solid var(--moh-border);
}

.moh-emoji-popover[data-placement='bottom']::before {
  top: -6px;
}

.moh-emoji-popover[data-placement='top']::before {
  bottom: -6px;
  transform: translateX(-50%) rotate(225deg);
}
</style>

