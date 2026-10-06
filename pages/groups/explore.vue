<template>
  <div class="min-h-[40vh]" />
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', title: 'Groups', hideTopBar: true })
await navigateTo('/groups', { replace: true })
</script>
