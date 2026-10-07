<template>
  <div v-if="loading" class="moh-refresh-indicator" role="progressbar" aria-label="Loading">
    <div />
  </div>
</template>

<script setup lang="ts">
defineProps<{ loading: boolean }>()
</script>

<style scoped>
.moh-refresh-indicator {
  position: absolute;
  inset: 0 0 auto;
  z-index: 20;
  height: 2px;
  overflow: hidden;
  pointer-events: none;
  color: var(--moh-text-muted);
}
.moh-refresh-indicator > div {
  width: 35%;
  height: 100%;
  background: currentColor;
  animation: refresh-progress 1.2s ease-in-out infinite;
}
@keyframes refresh-progress {
  from { transform: translateX(-100%); }
  to { transform: translateX(386%); }
}
@media (prefers-reduced-motion: reduce) {
  .moh-refresh-indicator > div { animation: none; width: 100%; opacity: .4; }
}
</style>
