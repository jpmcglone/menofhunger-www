<template>
  <NuxtPage />
</template>

<script setup lang="ts">
// Parent shell so /invite and /invite/payouts are nested routes (same pattern as /admin).
definePageMeta({ layout: 'app', ssr: false })
</script>
