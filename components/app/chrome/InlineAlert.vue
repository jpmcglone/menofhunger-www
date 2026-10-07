<template>
  <div :class="['rounded-lg border px-3 py-2 text-sm', toneClass]">
    <div v-if="title" class="font-semibold">{{ title }}</div>
    <div :class="title ? 'mt-1' : ''">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
type Severity = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

const props = withDefaults(
  defineProps<{
    title?: string
    severity?: Severity
  }>(),
  { severity: 'neutral' }
)

const toneClass = computed(() => {
  switch (props.severity) {
    case 'danger':
      return 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200'
    case 'warning':
      return 'border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-900/40 dark:bg-yellow-950/40 dark:text-yellow-100'
    case 'success':
      return 'border-green-200 bg-green-50 text-green-900 dark:border-green-900/40 dark:bg-green-950/40 dark:text-green-100'
    case 'info':
      return 'border-gray-200 bg-gray-50 text-gray-700 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-gray-200'
    default:
      return 'border-gray-200 bg-white text-gray-700 dark:border-zinc-800 dark:bg-black/20 dark:text-gray-200'
  }
})
</script>

