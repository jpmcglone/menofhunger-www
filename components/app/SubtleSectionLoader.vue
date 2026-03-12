<template>
  <div class="relative">
    <div
      :class="[
        'absolute inset-x-0 top-0 z-0 flex items-center justify-center transition-opacity duration-150',
        minHeightClass,
        loading ? 'opacity-100' : 'opacity-0 pointer-events-none',
      ]"
      :aria-hidden="!loading"
    >
      <AppLogoLoader :compact="compact" />
    </div>

    <div
      class="relative z-10 transition-opacity duration-150"
      :class="loading ? 'opacity-0 pointer-events-none' : 'opacity-100'"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  loading: boolean
  compact?: boolean
  minHeightClass?: string
}>(), {
  compact: false,
  minHeightClass: 'min-h-[240px]',
})
</script>
