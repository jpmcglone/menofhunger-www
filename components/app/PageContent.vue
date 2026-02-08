<template>
  <div :class="wrapperClass">
    <slot />
  </div>
</template>

<script setup lang="ts">
type PadMode = 'none' | 'standard'

const props = withDefaults(
  defineProps<{
    /** Horizontal gutters (standard app inset). */
    gutter?: PadMode
    /** Top spacing inside the page area (below the title bar). */
    top?: PadMode
    /** Bottom spacing (useful for scroll breathing room on mobile). */
    bottom?: PadMode
  }>(),
  {
    gutter: 'none',
    top: 'none',
    bottom: 'none',
  },
)

const wrapperClass = computed(() => [
  'w-full',
  props.gutter === 'standard' ? 'px-4' : '',
  props.top === 'standard' ? 'pt-4' : '',
  // Match prior layout behavior: no extra bottom padding on mobile (viewport is already shortened),
  // light breathing room on sm+.
  props.bottom === 'standard' ? 'pb-0 sm:pb-4' : '',
])
</script>

