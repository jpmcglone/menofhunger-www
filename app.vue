<template>
  <div>
    <!-- Keep SSR/client first paint stable: loading bar tint can update after hydration via CSS vars. -->
    <NuxtLoadingIndicator color="var(--p-primary-color)" :height="4" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
// Intentionally do not compute loading indicator color from authed user:
// it creates hydration mismatches when SSR can't know the viewer yet.
</script>
