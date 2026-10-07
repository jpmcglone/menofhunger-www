<template>
  <span
    :class="[
      'inline-flex min-w-[2rem] items-center justify-center overflow-hidden rounded-full border border-white/80 bg-gradient-to-r from-[var(--moh-verified)] to-[var(--moh-premium)] px-1.5 py-0.5 text-center font-bold leading-none tracking-wide text-white shadow-[0_1px_6px_rgba(0,0,0,0.25)] dark:border-black/70 moh-new-badge-float',
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

/* A soft highlight sweeps across every few seconds. */
.moh-new-badge-float::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, 0.55) 50%, transparent 70%);
  transform: translateX(-120%);
  animation: mohNewBadgeShine 3.6s ease-in-out infinite;
  pointer-events: none;
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

@keyframes mohNewBadgeShine {
  0%,
  55% {
    transform: translateX(-120%);
  }
  85%,
  100% {
    transform: translateX(120%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .moh-new-badge-float,
  .moh-new-badge-float::after {
    animation: none;
  }
  .moh-new-badge-float::after {
    opacity: 0;
  }
}
</style>
