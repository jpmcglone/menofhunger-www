<template>
  <span
    v-if="kind"
    class="inline-flex items-center font-bold uppercase tracking-wider rounded-full shrink-0"
    :class="[sizeClass, kindClass]"
  >
    <span
      v-if="kind === 'live'"
      class="rounded-full bg-current animate-pulse"
      :class="dotClass"
      aria-hidden="true"
    />
    {{ label }}
  </span>
</template>

<script setup lang="ts">
/**
 * Space status brand pills — use everywhere (list, feed preview, chat, detail).
 * - Live: space is on-air (`isActive`)
 * - Scheduled: upcoming `scheduledAt`
 * Never use "Active" for public status — that's viewer-local "you're in this room".
 */
const props = withDefaults(
  defineProps<{
    kind: 'live' | 'scheduled' | null
    size?: 'sm' | 'md'
  }>(),
  { size: 'md' },
)

const label = computed(() => {
  if (props.kind === 'live') return 'Live'
  if (props.kind === 'scheduled') return 'Scheduled'
  return ''
})

const sizeClass = computed(() =>
  props.size === 'sm'
    ? 'gap-0.5 px-1 py-0.5 text-[8px]'
    : 'gap-1 px-1.5 py-0.5 text-[9px]',
)

const dotClass = computed(() =>
  props.size === 'sm' ? 'h-1 w-1' : 'h-1.5 w-1.5',
)

const kindClass = computed(() => {
  if (props.kind === 'live') {
    return 'bg-green-500/15 text-green-700 dark:text-green-400'
  }
  if (props.kind === 'scheduled') {
    return 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
  }
  return ''
})
</script>
