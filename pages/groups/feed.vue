<template>
  <div class="min-h-[40vh]" />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Groups',
  hideTopBar: true,
})

/** @deprecated The groups feed is now the primary `/groups` page. */
await navigateTo('/groups', { replace: true })
</script>
