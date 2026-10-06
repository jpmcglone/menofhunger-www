<template>
  <span class="inline-flex items-center gap-[3px]" role="img" :aria-label="label">
    <span v-for="i in 3" :key="i" class="typing-dot size-1 rounded-full bg-current" :style="{ animationDelay: `${(i - 1) * 150}ms` }" />
  </span>
</template>
<script setup lang="ts">
defineProps<{ label: string }>()
</script>
<style scoped>
.typing-dot { animation: typing-dot 1.1s ease-in-out infinite; }
@keyframes typing-dot { 0%, 60%, 100% { opacity: .35; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-2px); } }
@media (prefers-reduced-motion: reduce) { .typing-dot { animation: none; opacity: .7; } }
</style>
