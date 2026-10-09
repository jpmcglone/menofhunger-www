<template>
  <div class="bg-gray-200 dark:bg-zinc-800 animate-pulse" :class="round ? 'rounded-full' : 'rounded'" />
</template>

<script setup lang="ts">
// Size with utility classes on the element (`h-3 w-28`); `round` makes it a pill/avatar placeholder.
defineProps<{ round?: boolean }>()
</script>
