<template>
  <Teleport to="body">
    <Transition name="moh-fade">
      <div
        v-if="open"
        ref="panelEl"
        :id="listboxId || undefined"
        class="fixed z-[10100] w-[min(18rem,92vw)] border moh-border bg-white shadow-2xl dark:bg-zinc-950 rounded-xl overflow-hidden"
        :style="panelStyle"
        role="listbox"
        aria-label="Hashtag suggestions"
        :data-placement="panelPlacement"
      >
        <div ref="scrollEl" class="max-h-[min(18rem,46vh)] overflow-y-auto">
          <template v-for="(sec, sIdx) in renderSections" :key="sec.key">
            <div
              v-if="sec.label"
              class="px-3 pt-3 pb-1 text-[11px] font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400"
            >
              {{ sec.label }}
            </div>
            <button
              v-for="(t, i) in sec.items"
              :key="`${sec.key}:${t.value}`"
              type="button"
              :id="optionId((sectionOffsets[sIdx] ?? 0) + i)"
              class="w-full text-left px-3 py-2 flex items-center justify-between gap-3 transition-colors"
              :class="((sectionOffsets[sIdx] ?? 0) + i) === highlightedIndex ? 'bg-black/5 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/10'"
              role="option"
              :aria-selected="((sectionOffsets[sIdx] ?? 0) + i) === highlightedIndex ? 'true' : 'false'"
              @mouseenter="emit('highlight', (sectionOffsets[sIdx] ?? 0) + i)"
              @mousedown.prevent
              @click="emit('select', t)"
            >
              <div class="min-w-0 flex-1">
                <div class="font-semibold text-sm text-gray-900 dark:text-gray-50 truncate">
                  #{{ t.label }}
                </div>
              </div>
              <div class="shrink-0 text-[11px] font-semibold tabular-nums text-gray-500 dark:text-gray-400">
                {{ formatCount(t.usageCount) }}
              </div>
            </button>
          </template>

          <div v-if="totalItems === 0" class="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
            No matches.
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { HashtagResult } from '~/types/api'

type HashtagSection = { key: string; label?: string | null; items: HashtagResult[] }

const props = defineProps<{
  open: boolean
  items: HashtagResult[]
  sections?: HashtagSection[]
  highlightedIndex: number
  anchor: { left: number; top: number; height: number } | null
  listboxId?: string
}>()

const emit = defineEmits<{
  (e: 'select', tag: HashtagResult): void
  (e: 'highlight', index: number): void
  (e: 'requestClose'): void
}>()

const panelEl = ref<HTMLElement | null>(null)
const scrollEl = ref<HTMLElement | null>(null)
const panelStyle = ref<Record<string, string>>({})
const panelPlacement = ref<'top' | 'bottom'>('bottom')

function optionId(i: number): string | undefined {
  if (!props.listboxId) return undefined
  return `${props.listboxId}-opt-${i}`
}

function formatCount(n: number): string {
  const num = Math.max(0, Math.floor(Number(n) || 0))
  const trim = (s: string) => (s.endsWith('.0') ? s.slice(0, -2) : s)
  if (num >= 1_000_000) return `${trim((num / 1_000_000).toFixed(num >= 10_000_000 ? 0 : 1))}m`
  if (num >= 1_000) return `${trim((num / 1_000).toFixed(num >= 10_000 ? 0 : 1))}k`
  return String(num)
}

const renderSections = computed<HashtagSection[]>(() => {
  const secs = props.sections
  if (Array.isArray(secs) && secs.length) return secs
  return [{ key: 'results', label: null, items: props.items ?? [] }]
})

const sectionOffsets = computed(() => {
  const out: number[] = []
  let n = 0
  for (const sec of renderSections.value) {
    out.push(n)
    n += sec.items.length
  }
  return out
})

const totalItems = computed(() => renderSections.value.reduce((sum, s) => sum + (s.items?.length ?? 0), 0))

function scrollHighlightedIntoView() {
  if (!import.meta.client) return
  if (!props.open) return
  const container = scrollEl.value
  if (!container) return
  const id = optionId(props.highlightedIndex)
  if (!id) return
  const el = document.getElementById(id)
  if (!el) return

  const top = (el as HTMLElement).offsetTop
  const bottom = top + (el as HTMLElement).offsetHeight
  const viewTop = container.scrollTop
  const viewBottom = viewTop + container.clientHeight

  if (bottom > viewBottom) {
    container.scrollTop = Math.max(0, bottom - container.clientHeight)
  } else if (top < viewTop) {
    container.scrollTop = Math.max(0, top)
  }
}

function updatePanelPosition() {
  if (!import.meta.client) return
  const anchor = props.anchor
  const panel = panelEl.value
  if (!anchor || !panel) return

  const margin = 8
  const vw = window.innerWidth || 0
  const vh = window.innerHeight || 0

  const panelW = panel.offsetWidth || 0
  const panelH = panel.offsetHeight || 0

  let left = Math.floor(anchor.left)
  left = Math.max(margin, Math.min(left, vw - margin - panelW))

  const belowTop = Math.floor(anchor.top + anchor.height + margin)
  const aboveTop = Math.floor(anchor.top - margin - panelH)
  let top = belowTop
  let placement: 'top' | 'bottom' = 'bottom'
  if (belowTop + panelH > vh - margin && aboveTop >= margin) {
    top = aboveTop
    placement = 'top'
  }
  top = Math.max(margin, Math.min(top, vh - margin - panelH))

  panelPlacement.value = placement
  panelStyle.value = { left: `${left}px`, top: `${top}px` }
}

watch(
  () => [props.open, props.anchor, props.items.length] as const,
  () => {
    if (!props.open) return
    void nextTick().then(() => {
      updatePanelPosition()
      requestAnimationFrame(() => updatePanelPosition())
    })
  },
  { flush: 'post' },
)

watch(
  () => [props.open, props.highlightedIndex, props.items.length] as const,
  () => {
    if (!props.open) return
    void nextTick().then(() => {
      scrollHighlightedIntoView()
      requestAnimationFrame(() => scrollHighlightedIntoView())
    })
  },
  { flush: 'post' },
)

function onDocPointerDown(e: Event) {
  if (!props.open) return
  const t = e.target as Node | null
  const panel = panelEl.value
  if (!t || !panel) return
  if (panel.contains(t)) return
  emit('requestClose')
}

const scrollOpts = { passive: true, capture: true } as const
const pointerOpts = { capture: true } as const
watch(
  () => props.open,
  (v, _old, onCleanup) => {
    if (!import.meta.client) return

    const teardown = () => {
      window.removeEventListener('resize', updatePanelPosition)
      window.removeEventListener('scroll', updatePanelPosition, scrollOpts)
      document.removeEventListener('pointerdown', onDocPointerDown, pointerOpts)
    }
    onCleanup(() => teardown())

    if (v) {
      window.addEventListener('resize', updatePanelPosition, { passive: true })
      window.addEventListener('scroll', updatePanelPosition, scrollOpts)
      document.addEventListener('pointerdown', onDocPointerDown, pointerOpts)
    } else {
      teardown()
    }
  },
  { immediate: true },
)
</script>

