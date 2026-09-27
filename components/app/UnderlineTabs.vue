<!-- Underline tabs, matching iOS MohTabBar. -->
<template>
  <div class="flex gap-6 moh-gutter-x" role="tablist" :aria-label="ariaLabel">
    <button
      v-for="(t, idx) in tabs"
      :key="t.key"
      :ref="(el) => setTabEl(idx, el as HTMLButtonElement | null)"
      type="button"
      role="tab"
      :aria-selected="modelValue === t.key"
      :tabindex="modelValue === t.key ? 0 : -1"
      class="moh-focus relative min-h-11 cursor-pointer text-[15px] transition-colors"
      :class="modelValue === t.key ? 'font-semibold moh-text' : 'font-medium moh-text-soft hover:text-[var(--moh-text-muted)]'"
      @click="select(t.key)"
      @keydown="onKeydown($event, idx)"
    >
      {{ t.label }}
      <span
        class="absolute inset-x-0 bottom-0 mx-auto h-[3px] rounded-full transition-[width,opacity] duration-200"
        :class="modelValue === t.key ? 'w-7 opacity-100' : 'w-0 opacity-0'"
        style="background-color: var(--moh-text)"
        aria-hidden="true"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: string
  tabs: Array<{ key: string; label: string }>
  ariaLabel?: string
}>(), { ariaLabel: 'Tabs' })

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const tabEls: Array<HTMLButtonElement | null> = []
function setTabEl(idx: number, el: HTMLButtonElement | null) {
  tabEls[idx] = el
}

function select(key: string) {
  if (key !== props.modelValue) emit('update:modelValue', key)
}

function onKeydown(e: KeyboardEvent, idx: number) {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
  e.preventDefault()
  const next = (idx + (e.key === 'ArrowRight' ? 1 : -1) + props.tabs.length) % props.tabs.length
  const tab = props.tabs[next]
  if (!tab) return
  select(tab.key)
  tabEls[next]?.focus()
}
</script>
