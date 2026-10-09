<template>
  <section class="moh-gutter-x py-3 border-b moh-border" aria-label="Check-in unavailable">
    <p class="text-sm moh-text-muted" role="alert">{{ message }}</p>
    <Button
      label="Try again"
      severity="secondary"
      text
      class="mt-1 min-h-11"
      @click="onRetry?.()"
    />
  </section>
</template>

<script setup lang="ts">
defineProps<{
  message: string
  onRetry?: () => void | Promise<void>
}>()
</script>
