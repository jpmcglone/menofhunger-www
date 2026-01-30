<template>
  <div
    class="inline-flex items-stretch rounded-full border moh-border moh-surface p-1"
    role="tablist"
    :aria-label="ariaLabel"
  >
    <button
      v-for="(t, idx) in tabs"
      :key="t.key"
      type="button"
      role="tab"
      :aria-selected="String(modelValue) === String(t.key)"
      :tabindex="String(modelValue) === String(t.key) ? 0 : -1"
      :disabled="Boolean(t.disabled)"
      :class="tabButtonClass(t)"
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

function isActive(t: TabSelectorTab) {
  return String(props.modelValue) === String(t.key)
}

function tabButtonClass(t: TabSelectorTab) {
  const disabled = Boolean(t.disabled)
  const active = isActive(t)

  return [
    'inline-flex items-center justify-center select-none rounded-full',
    // Segmented-control hit area.
    'px-3 py-1.5',
    'text-[14px] font-bold tracking-tight leading-none',
    'transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15 dark:focus-visible:ring-white/20',
    disabled ? 'opacity-55 cursor-not-allowed' : 'cursor-pointer',
    active ? 'moh-pill-primary' : 'bg-transparent moh-text-muted hover:moh-text',
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
</script>
