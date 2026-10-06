<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <template v-if="kind === 'hash'"><path d="M10 3.5L8 20.5M17 3.5L15 20.5M4.5 9h16M3.5 15.5h16" /></template>
    <template v-else>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="8.6" cy="9.2" r="1.2" fill="currentColor" stroke="none" />
      <path d="M12.2 9.2h4M7.5 13.4h9M7.5 16.6h5.5" />
    </template>
  </svg>
</template>
<script setup lang="ts">
withDefaults(defineProps<{ kind: 'hash' | 'posts'; size?: number; strokeWidth?: number }>(), { size: 20, strokeWidth: 2 })
</script>
