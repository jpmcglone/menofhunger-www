<template>
  <div class="relative overflow-hidden space-y-6 py-6 text-center">
    <div aria-hidden="true" class="confetti"><i v-for="n in 28" :key="n" :style="{ left: `${(n * 37) % 100}%`, '--delay': `${(n % 7) * .06}s`, '--turn': `${n * 83}deg` }" /></div>
    <p class="moh-text-muted">You’ve completed your getting-started steps. Keep the conversations going.</p>
    <button type="button" class="min-h-11 w-full rounded-full px-5 py-3 font-semibold bg-[var(--moh-text)] text-[var(--moh-bg)]" @click="$emit('done')">Back to feed</button>
  </div>
</template>
<script setup lang="ts">
defineEmits<{ done: [] }>()
</script>
<style scoped>
.confetti { position: absolute; inset: 0; pointer-events: none; }
.confetti i { position: absolute; top: -12px; width: 6px; height: 10px; background: var(--moh-brass); animation: fall 1.8s var(--delay) ease-in forwards; opacity: 0; }
.confetti i:nth-child(even) { background: var(--moh-text); }
@keyframes fall { 0% { opacity: 1; transform: translateY(0) rotate(0); } 100% { opacity: 0; transform: translateY(240px) rotate(var(--turn)); } }
@media (prefers-reduced-motion: reduce) { .confetti { display: none; } }
</style>
