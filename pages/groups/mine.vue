<template>
  <div class="min-h-[40vh]" />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Explore groups',
  hideTopBar: true,
})

/** @deprecated The "My groups" tab was removed; your groups now appear as the
 *  carousel at the top of /groups/explore. */
await navigateTo('/groups/explore', { replace: true })
</script>
