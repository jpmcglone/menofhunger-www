<template>
  <svg
    class="moh-spinner"
    :class="{ 'moh-spinner--compact': compact }"
    :width="sizeNum"
    :height="sizeNum"
    viewBox="0 0 40 40"
    role="status"
    aria-label="Loading"
  >
    <!-- Stroke ~75% of circle, gap ~25% -->
    <circle
      cx="20"
      cy="20"
      r="16"
      fill="none"
      stroke="var(--moh-spinner)"
      :stroke-width="compact ? 4 : 6"
      stroke-dasharray="75 25"
      stroke-linecap="round"
    />
  </svg>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    /** Size in pixels (width and height). */
    size?: number
    /** Compact: smaller size (for inline/feed loaders). */
    compact?: boolean
  }>(),
  { size: 36, compact: false }
)

const sizeNum = computed(() => (props.compact ? 20 : props.size))
</script>

<style scoped>
.moh-spinner {
  display: inline-block;
  filter: var(--moh-spinner-shadow);
  animation: moh-spin 0.7s linear infinite;
  animation-play-state: running;
  will-change: transform;
}

@keyframes moh-spin {
  from { transform: rotate(0deg) translateZ(0); }
  to { transform: rotate(360deg) translateZ(0); }
}
</style>

<!-- Light: white stroke + black shadow. Dark: slightly brighter than bg. -->
<style>
:root {
  --moh-spinner: #fff;
  --moh-spinner-shadow: drop-shadow(0 0 2px rgba(0, 0, 0, 0.06));
}
html.dark {
  --moh-spinner: #2a2f35;
  --moh-spinner-shadow: drop-shadow(0 0 2px rgba(0, 0, 0, 0.06));
}
</style>
