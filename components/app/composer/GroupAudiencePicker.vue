<template>
  <div ref="wrapEl" class="relative">
    <span ref="btnEl" class="inline-flex">
      <Button
        text
        rounded
        severity="secondary"
        v-tooltip.bottom="selectedName ? `Posting to: ${selectedName}` : 'Post to a group'"
        class="moh-focus"
        :aria-label="selectedName ? `Posting to ${selectedName}` : 'Post to a group'"
        :aria-expanded="open"
        aria-haspopup="menu"
        :style="modelValue ? { color: 'var(--moh-brass)' } : {}"
        @click="toggle"
      >
        <template #icon>
          <Icon name="tabler:users-group" aria-hidden="true" />
        </template>
      </Button>
    </span>

    <Teleport to="body">
      <div
        v-if="open"
        ref="panelEl"
        class="fixed z-[2000] overflow-y-auto rounded-xl border moh-border moh-surface shadow-lg py-1"
        :style="panelStyle"
        role="menu"
        aria-label="Post to a group"
      >
        <button
          type="button"
          class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          :class="!modelValue ? 'font-semibold text-[var(--moh-brass)]' : ''"
          role="menuitem"
          @click="set(null)"
        >
          All followers
        </button>
        <div class="border-t moh-border my-1" />
        <button
          v-for="g in groups"
          :key="g.id"
          type="button"
          class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          :class="modelValue === g.id ? 'font-semibold text-[var(--moh-brass)]' : ''"
          role="menuitem"
          @click="set(g.id)"
        >
          {{ g.name }}
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
const PANEL_WIDTH = 224
const VIEWPORT_PAD = 8
const GAP = 8
const MAX_PANEL = 320

const props = defineProps<{
  groups: readonly { id: string; name: string }[]
  modelValue: string | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', id: string | null): void
  (e: 'open'): void
}>()

const open = ref(false)
const wrapEl = ref<HTMLElement | null>(null)
const btnEl = ref<HTMLElement | null>(null)
const panelEl = ref<HTMLElement | null>(null)
const panelStyle = ref<Record<string, string>>({})

const selectedName = computed(() => {
  const id = props.modelValue
  if (!id) return null
  return props.groups.find((g) => g.id === id)?.name ?? null
})

function positionPanel() {
  if (!import.meta.client) return
  const btn = btnEl.value
  if (!btn) return

  const r = btn.getBoundingClientRect()
  const spaceAbove = r.top - VIEWPORT_PAD
  const spaceBelow = window.innerHeight - r.bottom - VIEWPORT_PAD
  const measured = panelEl.value?.offsetHeight ?? 0
  const wanted = measured || Math.min(MAX_PANEL, 52 + props.groups.length * 36)
  const openDown = spaceBelow >= Math.min(wanted, MAX_PANEL) || spaceBelow >= spaceAbove
  const available = Math.max(96, (openDown ? spaceBelow : spaceAbove) - GAP)
  const maxH = Math.min(MAX_PANEL, available)
  const height = Math.min(wanted, maxH)

  let top = openDown ? r.bottom + GAP : r.top - GAP - height
  top = Math.min(Math.max(VIEWPORT_PAD, top), window.innerHeight - VIEWPORT_PAD - 96)

  let left = r.right - PANEL_WIDTH
  left = Math.min(Math.max(VIEWPORT_PAD, left), window.innerWidth - PANEL_WIDTH - VIEWPORT_PAD)

  panelStyle.value = {
    top: `${Math.round(top)}px`,
    left: `${Math.round(left)}px`,
    width: `${PANEL_WIDTH}px`,
    maxHeight: `${Math.round(maxH)}px`,
  }
}

async function positionPanelAfterPaint() {
  await nextTick()
  positionPanel()
  await nextTick()
  positionPanel()
}

function toggle() {
  open.value = !open.value
}

function set(id: string | null) {
  emit('update:modelValue', id)
  open.value = false
}

function onDocPointerDown(e: PointerEvent) {
  if (!open.value) return
  const wrap = wrapEl.value
  const panel = panelEl.value
  const t = e.target as Node | null
  if (!t) return
  if (wrap?.contains(t) || panel?.contains(t)) return
  open.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (!open.value) return
  if (e.key === 'Escape') {
    e.stopPropagation()
    open.value = false
  }
}

function onViewportChange() {
  if (!open.value) return
  positionPanel()
}

watch(open, (isOpen) => {
  if (!isOpen) return
  emit('open')
  void positionPanelAfterPaint()
})

watch(
  () => props.groups.length,
  () => {
    if (open.value) void positionPanelAfterPaint()
  },
)

onMounted(() => {
  if (!import.meta.client) return
  window.addEventListener('pointerdown', onDocPointerDown, { capture: true })
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', onViewportChange)
  window.addEventListener('scroll', onViewportChange, true)
})

onBeforeUnmount(() => {
  if (!import.meta.client) return
  window.removeEventListener('pointerdown', onDocPointerDown, { capture: true })
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onViewportChange, true)
})
</script>
