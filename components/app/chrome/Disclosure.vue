<template>
  <details class="moh-disclosure" :open="open || undefined">
    <summary class="flex min-h-14 cursor-pointer list-none items-start gap-4 py-5">
      <span class="min-w-0 flex-1 text-[15px] font-semibold leading-[22px]"><slot name="title" /></span>
      <span class="moh-disclosure-mark w-5 shrink-0 text-center moh-text-muted" aria-hidden="true" />
    </summary>
    <slot />
  </details>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ open?: boolean }>(), { open: false })
</script>

<style scoped>
.moh-disclosure { border-bottom: 1px solid var(--moh-border); }
summary::-webkit-details-marker { display: none; }
summary:focus-visible { outline: 2px solid var(--moh-brass); outline-offset: 3px; }
.moh-disclosure-mark::before { content: '+'; }
.moh-disclosure[open] > summary .moh-disclosure-mark::before { content: '−'; }
</style>
