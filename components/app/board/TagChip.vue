<template>
  <NuxtLink
    :to="{ path: '/b', query: { tags: tag } }"
    class="relative z-[2] inline-flex items-center rounded-full border moh-border px-2 py-px text-[11px] leading-4 moh-text-muted transition-colors hover:text-[var(--moh-text)] hover:bg-[var(--moh-surface-hover)]"
    @click.stop
  >{{ tag }}</NuxtLink>
</template>

<script setup lang="ts">
defineProps<{ tag: string }>()
</script>
