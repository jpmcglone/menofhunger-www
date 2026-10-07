<template>
  <span
    v-if="show"
    class="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[var(--p-primary-color)] ring-2 ring-white dark:ring-zinc-950"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
const { show } = useSpacesNotifyBadge()
</script>
