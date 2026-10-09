<template>
  <div
    class="shrink-0 flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-black tabular-nums leading-none"
    :class="rank === 1
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
      : 'bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-zinc-500'"
  >
    {{ rank }}
  </div>
</template>

<script setup lang="ts">
/** 1-based rank chip for trending lists; rank 1 is highlighted. */
defineProps<{ rank: number }>()
</script>
