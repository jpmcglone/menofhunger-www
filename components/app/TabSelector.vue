<template>
  <div
    ref="wrapEl"
    class="relative inline-flex items-stretch rounded-full border moh-border moh-surface p-1"
    role="tablist"
    :aria-label="ariaLabel"
  >
    <!-- Active segment highlight (animates position + width) -->
    <div
      class="moh-seg-highlight moh-texture"
      :class="{ 'moh-seg-highlight--animate': highlightAnimate, 'opacity-0': !highlightReady }"
      :style="highlightStyle"
      aria-hidden="true"
    />

    <button
      v-for="(t, idx) in tabs"
      :key="t.key"
      type="button"
      role="tab"
      :aria-selected="String(modelValue) === String(t.key)"
      :tabindex="String(modelValue) === String(t.key) ? 0 : -1"
      :disabled="Boolean(t.disabled)"
      :class="tabButtonClass(t)"
      :ref="(el) => setTabEl(t.key, el as HTMLElement | null)"
      @click="onTabClick(t)"
      @keydown="(e) => onTabKeydown(e, idx)"
    >
      <span class="relative inline-flex items-center justify-center whitespace-nowrap">
        {{ t.label }}
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
type TabKey = string

type TabSelectorTab = {
  key: TabKey
  label: string
  disabled?: boolean
}

const props = defineProps<{
  modelValue: TabKey
  tabs: TabSelectorTab[]
  ariaLabel?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: TabKey): void
}>()

const ariaLabel = computed(() => props.ariaLabel ?? 'Tabs')

const wrapEl = ref<HTMLElement | null>(null)
const tabEls = new Map<string, HTMLElement>()
const highlightReady = ref(false)
const highlightAnimate = ref(false)
const highlightStyle = ref<Record<string, string>>({
  transform: 'translate3d(0px, 0, 0)',
  width: '0px',
  opacity: '0',
})

function isActive(t: TabSelectorTab) {
  return String(props.modelValue) === String(t.key)
}

function setTabEl(key: TabKey, el: HTMLElement | null) {
  const k = String(key)
  if (!el) {
    tabEls.delete(k)
    return
  }
  tabEls.set(k, el)
}

function updateHighlight() {
  if (!import.meta.client) return

  const wrap = wrapEl.value
  if (!wrap) return

  const activeEl = tabEls.get(String(props.modelValue))
  if (!activeEl) {
    highlightStyle.value = { ...highlightStyle.value, opacity: '0', width: '0px' }
    return
  }

  const wrapRect = wrap.getBoundingClientRect()
  const activeRect = activeEl.getBoundingClientRect()
  const x = Math.round(activeRect.left - wrapRect.left)
  const w = Math.round(activeRect.width)

  highlightStyle.value = {
    transform: `translate3d(${x}px, 0, 0)`,
    width: `${w}px`,
    opacity: '1',
  }
}

function tabButtonClass(t: TabSelectorTab) {
  const disabled = Boolean(t.disabled)
  const active = isActive(t)

  return [
    'relative z-10 inline-flex items-center justify-center select-none rounded-full',
    // Segmented-control hit area.
    'px-3 py-1.5',
    'text-[14px] font-bold tracking-tight leading-none',
    'transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15 dark:focus-visible:ring-white/20',
    disabled ? 'opacity-55 cursor-not-allowed' : 'cursor-pointer',
    active
      ? highlightReady.value
        ? 'text-white'
        : 'text-white moh-seg-fallback-active'
      : 'bg-transparent moh-text-muted hover:moh-text',
  ]
}

function onTabClick(t: TabSelectorTab) {
  if (t.disabled) return
  if (isActive(t)) return
  emit('update:modelValue', t.key)
}

function pickNextEnabledIndex(startIdx: number, dir: -1 | 1): number {
  const n = props.tabs.length
  if (!n) return -1
  for (let step = 1; step <= n; step += 1) {
    const i = (startIdx + dir * step + n) % n
    const tab = props.tabs[i]
    if (!tab?.disabled) return i
  }
  return -1
}

function onTabKeydown(e: KeyboardEvent, idx: number) {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return
  e.preventDefault()

  const n = props.tabs.length
  if (!n) return

  const nextIdx =
    e.key === 'Home'
      ? pickNextEnabledIndex(-1, 1)
      : e.key === 'End'
        ? pickNextEnabledIndex(0, -1)
        : pickNextEnabledIndex(idx, e.key === 'ArrowRight' ? 1 : -1)

  if (nextIdx < 0) return
  const t = props.tabs[nextIdx]
  if (!t || t.disabled) return
  emit('update:modelValue', t.key)
}

onMounted(() => {
  if (!import.meta.client) return
  // Never animate the highlight on first paint: set final position while hidden, then show.
  highlightAnimate.value = false
  function showHighlightWhenReady(retries = 0) {
    updateHighlight()
    const activeEl = tabEls.get(String(props.modelValue))
    if (!activeEl && retries < 5) {
      requestAnimationFrame(() => showHighlightWhenReady(retries + 1))
      return
    }
    requestAnimationFrame(() => {
      highlightReady.value = true
      requestAnimationFrame(() => {
        highlightAnimate.value = true
      })
    })
  }
  nextTick(() => requestAnimationFrame(() => showHighlightWhenReady(0)))

  const onResize = () => updateHighlight()
  window.addEventListener('resize', onResize)
  onBeforeUnmount(() => window.removeEventListener('resize', onResize))
})

watch(
  () => [props.modelValue, props.tabs.map((t) => `${t.key}:${Boolean(t.disabled)}`).join('|')].join('::'),
  async () => {
    await nextTick()
    updateHighlight()
  },
  { flush: 'post' },
)
</script>

<style scoped>
.moh-seg-highlight {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 0;
  border-radius: 9999px;
  background: var(--p-primary-500, #c77d1a);
  will-change: transform, width;
}

.moh-seg-fallback-active {
  background: var(--p-primary-500, #c77d1a);
}

/* In dark mode, use a darker active pill (unverified/default should not be a light/white fill). */
:global(html.dark) .moh-seg-highlight {
  background: var(--moh-bg);
}
:global(html.dark) .moh-seg-fallback-active {
  background: var(--moh-bg);
}

.moh-seg-highlight--animate {
  transition: transform 220ms ease, width 220ms ease, opacity 140ms ease;
}
</style>
