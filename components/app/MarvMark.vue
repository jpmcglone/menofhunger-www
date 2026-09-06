<template>
  <svg
    viewBox="0 0 24 24"
    :width="size"
    :height="size"
    class="marv-mark shrink-0"
    :class="{ 'marv-mark--loading': loading }"
    aria-hidden="true"
  >
    <path v-for="(segment, index) in segments" :key="index" :d="segment.d" :class="`marv-mark__${segment.role}`" />
  </svg>
</template>

<script setup lang="ts">
import mark from '~/design/marv-mark.json'
// `tone` remains accepted for existing callers; the brand always retains both colors.
const props = withDefaults(defineProps<{
  size?: number
  tone?: 'muted' | 'active' | 'inherit'
  loading?: boolean
  thick?: boolean
}>(), { size: 20, tone: 'muted', loading: false, thick: false })
const segments = computed(() => mark.shapes[props.loading || props.thick ? 'loading' : 'standard'])
</script>

<style scoped>
.marv-mark { display: inline-block; vertical-align: middle; }
.marv-mark__neutral { fill: var(--moh-text); }
.marv-mark__orange { fill: #c45b00; }
:global(html.dark) .marv-mark__orange { fill: #ff8500; }
.marv-mark--loading { animation: marv-rotate 1.2s linear infinite; transform-origin: center; }
@keyframes marv-rotate { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .marv-mark--loading { animation: none; } }
</style>
