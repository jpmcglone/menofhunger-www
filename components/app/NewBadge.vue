<template>
  <span
    :class="[
      'inline-flex min-w-[2rem] items-center justify-center rounded-full border border-white/80 bg-gradient-to-r from-[var(--moh-verified)] to-[var(--moh-premium)] px-1.5 py-0.5 text-center font-bold leading-none text-white dark:border-black/70 moh-new-badge-float',
      small ? 'text-[8px]' : 'text-[9px]',
    ]"
    :aria-label="label"
  >
    {{ label }}
  </span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  label?: string
  small?: boolean
}>(), {
  label: 'NEW',
  small: false,
})
</script>

<style scoped>
.moh-new-badge-float {
  position: relative;
  animation: mohNewBadgeFloat 2.4s ease-in-out infinite;
  will-change: top;
}

@keyframes mohNewBadgeFloat {
  0%,
  100% {
    top: -1px;
  }
  50% {
    top: 1px;
  }
}
</style>
