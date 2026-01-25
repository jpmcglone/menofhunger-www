<template>
  <span
    v-if="isVerified"
    :class="['inline-flex shrink-0 items-center justify-center rounded-full', sizeClass]"
    :style="{ backgroundColor: badgeBlue }"
    v-tooltip="tooltip"
    aria-label="Verified"
  >
    <!-- Twitter-style check (white) -->
    <svg viewBox="0 0 24 24" :class="['text-white', iconClass]" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9.00002 16.2L4.80002 12L3.40002 13.4L9.00002 19L21 7.00001L19.6 5.60001L9.00002 16.2Z"
      />
    </svg>
  </span>
</template>

<script setup lang="ts">
type VerifiedStatus = 'none' | 'identity' | 'manual'
type Size = 'sm' | 'md'

const props = withDefaults(
  defineProps<{
    status?: VerifiedStatus | null
    size?: Size
  }>(),
  { size: 'sm' }
)

// Twitter-ish blue; works on both light/dark.
const badgeBlue = '#1D9BF0'

const isVerified = computed(() => Boolean(props.status && props.status !== 'none'))

const tooltip = computed(() => {
  if (props.status === 'identity') return 'Identity verified'
  if (props.status === 'manual') return 'Manually verified'
  return ''
})

const sizeClass = computed(() => {
  return props.size === 'md' ? 'h-6 w-6' : 'h-5 w-5'
})

const iconClass = computed(() => {
  return props.size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'
})
</script>

