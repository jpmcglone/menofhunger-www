<template>
  <div
    ref="barEl"
    role="tablist"
    aria-label="Feed scope"
    class="relative flex items-stretch border-b moh-border"
  >
    <button
      v-for="(tab, idx) in TABS"
      :key="tab.key"
      :ref="(el) => setTabEl(tab.key, el as HTMLElement | null)"
      type="button"
      role="tab"
      :aria-selected="modelValue === tab.key ? 'true' : 'false'"
      :tabindex="modelValue === tab.key ? 0 : -1"
      class="relative inline-flex items-center px-4 sm:px-5 py-2.5 sm:py-3 text-[13px] sm:text-sm whitespace-nowrap select-none transition-colors duration-150 cursor-pointer moh-focus"
      :class="[
        tab.bold ? 'font-bold' : 'font-semibold',
        modelValue === tab.key
          ? 'moh-text'
          : 'moh-text-muted hover:moh-text',
      ]"
      @click="select(tab.key)"
      @keydown="(e) => onKeydown(e, idx)"
    >
      {{ tab.label }}
    </button>

    <!-- Sliding underline indicator -->
    <span
      class="absolute bottom-0 h-[2px] rounded-full pointer-events-none bg-[var(--p-primary-500,#b45309)]"
      :style="{
        left: `${underlineLeft}px`,
        width: `${underlineWidth}px`,
        transition: underlineReady ? 'left 220ms ease-in-out, width 220ms ease-in-out' : 'none',
      }"
      aria-hidden="true"
    />
  </div>
</template>

<script setup lang="ts">
import type { FeedScope } from '~/composables/useUrlFeedFilters'

const TABS = [
  { key: 'forYou' as FeedScope, label: 'For You', bold: true },
  { key: 'following' as FeedScope, label: 'Following', bold: false },
  { key: 'all' as FeedScope, label: 'All', bold: false },
] as const

const props = defineProps<{
  modelValue: FeedScope
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: FeedScope): void
}>()

function select(key: FeedScope) {
  if (props.modelValue !== key) emit('update:modelValue', key)
}

// ── keyboard navigation (roving tabindex pattern) ─────────────────────────────
function onKeydown(e: KeyboardEvent, idx: number) {
  const len = TABS.length
  let targetIdx: number | null = null
  if (e.key === 'ArrowRight') { e.preventDefault(); targetIdx = (idx + 1) % len }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); targetIdx = (idx - 1 + len) % len }
  else if (e.key === 'Home') { e.preventDefault(); targetIdx = 0 }
  else if (e.key === 'End') { e.preventDefault(); targetIdx = len - 1 }
  if (targetIdx !== null) {
    select(TABS[targetIdx].key)
    tabEls.get(TABS[targetIdx].key)?.focus()
  }
}

// ── sliding underline ─────────────────────────────────────────────────────────
const barEl = ref<HTMLElement | null>(null)
const tabEls = new Map<FeedScope, HTMLElement>()
const underlineLeft = ref(0)
const underlineWidth = ref(0)
const underlineReady = ref(false)

function setTabEl(key: FeedScope, el: HTMLElement | null) {
  if (el) tabEls.set(key, el)
  else tabEls.delete(key)
}

function updateUnderline() {
  if (!import.meta.client) return
  const bar = barEl.value
  const btn = tabEls.get(props.modelValue)
  if (!bar || !btn) return
  const barRect = bar.getBoundingClientRect()
  const btnRect = btn.getBoundingClientRect()
  underlineLeft.value = Math.round(btnRect.left - barRect.left)
  underlineWidth.value = Math.round(btnRect.width)
}

watch(
  () => props.modelValue,
  updateUnderline,
  { flush: 'post' },
)

onMounted(() => {
  if (!import.meta.client) return
  nextTick(() => {
    updateUnderline()
    requestAnimationFrame(() => { underlineReady.value = true })
  })
  const onResize = () => updateUnderline()
  window.addEventListener('resize', onResize)
  onBeforeUnmount(() => window.removeEventListener('resize', onResize))
})
</script>
