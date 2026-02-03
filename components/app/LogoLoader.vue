<template>
  <div
    class="moh-double-spinner"
    :style="{ width: sizePx, height: sizePx }"
    role="status"
    aria-label="Loading"
  >
    <div class="moh-double-spinner-outer" />
    <div class="moh-double-spinner-inner" />
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    /** Size in pixels (width and height). */
    size?: number
  }>(),
  { size: 48 }
)

const sizePx = computed(() => `${props.size}px`)
</script>

<style scoped>
.moh-double-spinner {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.moh-double-spinner-outer,
.moh-double-spinner-inner {
  position: absolute;
  border-radius: 50%;
  border-style: solid;
  border-width: 2px;
  border-bottom-color: transparent;
}

.moh-double-spinner-outer {
  inset: 0;
  border-color: var(--p-primary-500, var(--p-primary-color, #c77d1a));
  animation: moh-spin-cw 0.9s linear infinite;
}

.moh-double-spinner-inner {
  inset: 22%;
  border-color: #141210;
  border-bottom-color: transparent;
  animation: moh-spin-ccw 0.7s linear infinite;
}

@keyframes moh-spin-cw {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes moh-spin-ccw {
  from { transform: rotate(0deg); }
  to { transform: rotate(-360deg); }
}
</style>

<!-- Inner ring contrast: light in dark mode (unscoped so html.dark applies) -->
<style>
html.dark .moh-double-spinner-inner {
  border-color: #f1eee7;
  border-bottom-color: transparent;
}
</style>
