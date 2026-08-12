<template>
  <span
    class="inline-flex items-center font-semibold tabular-nums bg-[var(--p-primary-color)]/15 text-[var(--p-primary-color)]"
    :class="compact ? 'gap-0.5 rounded-full px-1.5 py-0.5 text-[10px]' : 'gap-1 rounded-full px-2.5 py-1 text-[11px]'"
    v-tooltip.top="tooltip"
    :aria-label="tooltipText"
  >
    <Icon
      name="tabler:bell"
      class="shrink-0 opacity-90"
      :class="compact ? 'text-[11px]' : 'text-[13px]'"
      aria-hidden="true"
    />
    <span>{{ displayCount }}</span>
  </span>
</template>

<script setup lang="ts">
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { spaceNotifySignupTooltip } from '~/utils/space-notify-copy'

const props = withDefaults(
  defineProps<{
    count: number
    compact?: boolean
  }>(),
  { compact: false },
)

const displayCount = computed(() => Math.max(0, Math.floor(Number(props.count) || 0)))
const tooltipText = computed(() => spaceNotifySignupTooltip(displayCount.value))
const tooltip = computed(() => tinyTooltip(tooltipText.value))
</script>
