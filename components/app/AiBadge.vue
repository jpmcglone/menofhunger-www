<template>
  <span
    ref="badgeEl"
    :class="[
      'inline-flex shrink-0 items-center justify-center rounded-[3px] align-middle',
      'bg-gradient-to-br from-violet-500 to-indigo-600',
      sizeClass,
    ]"
    v-tooltip="tooltip"
    aria-label="AI assistant"
    @mouseenter="updateTooltipPlacement"
  >
    <Icon
      name="tabler:sparkles"
      class="text-white"
      :style="iconSizeStyle"
      aria-hidden="true"
    />
  </span>
</template>

<script setup lang="ts">
type Size = 'xs' | 'sm' | 'md'

const props = withDefaults(
  defineProps<{
    size?: Size
    showTooltip?: boolean
  }>(),
  { size: 'sm', showTooltip: true },
)

const badgeEl = ref<HTMLElement | null>(null)
const tooltipPlacement = ref<'right' | 'left'>('right')

function updateTooltipPlacement() {
  if (!import.meta.client) return
  const node = badgeEl.value
  if (!node) return
  const rect = node.getBoundingClientRect()
  const est = 220
  const rightSpace = window.innerWidth - rect.right - 12
  const leftSpace = rect.left - 12
  if (rightSpace >= est) tooltipPlacement.value = 'right'
  else if (leftSpace >= est) tooltipPlacement.value = 'left'
  else tooltipPlacement.value = rightSpace >= leftSpace ? 'right' : 'left'
}

const tooltip = computed(() => {
  if (!props.showTooltip) return null
  return {
    value: 'Marv — AI assistant. Ask him anything by mentioning @marv in a post or opening a direct message.',
    class: 'moh-tooltip',
    position: tooltipPlacement.value,
  }
})

const sizeClass = computed(() => {
  if (props.size === 'xs') return 'h-[0.85em] w-[0.85em]'
  if (props.size === 'md') return 'h-[1.15em] w-[1.15em]'
  return 'h-[1em] w-[1em]'
})

const iconSizeStyle = computed(() => {
  if (props.size === 'xs') return { fontSize: '0.55em' }
  if (props.size === 'md') return { fontSize: '0.72em' }
  return { fontSize: '0.62em' }
})
</script>
