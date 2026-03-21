<template>
  <div class="min-h-[40vh]" />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'My groups',
  hideTopBar: true,
})

/** @deprecated Use `/groups?tab=my` — combined list lives on the Groups hub. */
await navigateTo({ path: '/groups', query: { tab: 'my' } }, { replace: true })
</script>
