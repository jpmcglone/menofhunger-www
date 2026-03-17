<template>
  <span
    v-if="statusLabel"
    class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none"
    :class="labelClass"
    :title="statusLabel.description"
  >
    <Icon :name="statusLabel.icon" class="text-[10px]" aria-hidden="true" />
    {{ statusLabel.label }}
  </span>
</template>

<script setup lang="ts">
import { getStatusLabel } from '~/config/milestones'

const props = defineProps<{
  longestStreakDays: number
}>()

const statusLabel = computed(() => getStatusLabel(props.longestStreakDays))

const labelClass = computed(() => {
  if (!statusLabel.value) return ''
  const color = statusLabel.value.color
  const map: Record<string, string> = {
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    gray: 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-gray-300',
  }
  return map[color] ?? map.gray
})
</script>
