<template>
  <div class="flex items-center justify-center" :class="compact ? 'py-2' : 'py-8'">
    <AppLogoLoader :compact="compact" />
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    compact?: boolean
  }>(),
  { compact: false },
)
</script>
