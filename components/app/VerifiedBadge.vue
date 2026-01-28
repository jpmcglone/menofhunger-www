<template>
  <span
    v-if="isVerified"
    :class="['inline-flex shrink-0 items-center justify-center rounded-full', sizeClass]"
    :style="{ backgroundColor: badgeColor }"
    v-tooltip="tooltip"
    aria-label="Verified"
  >
    <!-- Twitter-style check (white) -->
    <svg viewBox="0 0 24 24" :class="['text-white', iconClass]" aria-hidden="true">
      <!-- Outline stroke (darker than badge) -->
      <path
        :stroke="checkStrokeColor"
        stroke-width="5.2"
        stroke-linecap="round"
        stroke-linejoin="round"
        fill="none"
        d="M9.00002 16.2L4.80002 12L3.40002 13.4L9.00002 19L21 7.00001L19.6 5.60001L9.00002 16.2Z"
      />
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
    premium?: boolean
    size?: Size
  }>(),
  { size: 'sm', premium: false }
)

// Twitter-ish blue; works on both light/dark.
const badgeBlue = '#1D9BF0'
// Premium orange.
const badgeOrange = '#F59E0B'
// Darker strokes for the check outline (derived by eye).
const badgeBlueStroke = '#0B6FBF'
const badgeOrangeStroke = '#B45309'

const isVerified = computed(() => Boolean(props.status && props.status !== 'none'))

const badgeColor = computed(() => {
  return isVerified.value && props.premium ? badgeOrange : badgeBlue
})

const checkStrokeColor = computed(() => {
  return isVerified.value && props.premium ? badgeOrangeStroke : badgeBlueStroke
})

const tooltip = computed(() => {
  const text = props.status === 'identity' ? 'Identity verified' : props.status === 'manual' ? 'Manually verified' : ''
  if (!text) return null
  return { value: text, class: 'moh-tooltip' }
})

const sizeClass = computed(() => {
  return props.size === 'md' ? 'h-6 w-6' : 'h-5 w-5'
})

const iconClass = computed(() => {
  return props.size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'
})
</script>

