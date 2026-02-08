<template>
  <AppPageContent />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Verification',
})

// Alias route: verification lives under Settings → Verification.
await navigateTo('/settings/verification', { replace: true })
</script>

