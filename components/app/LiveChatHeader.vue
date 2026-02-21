<template>
  <div class="min-w-0">
    <div :class="['truncate font-semibold text-gray-900 dark:text-gray-50', titleClass]" :id="headingId || undefined">
      {{ title }}
    </div>
    <div class="mt-0.5 text-xs text-gray-600 dark:text-gray-300">
      Live chat
    </div>
  </div>
  <div class="shrink-0 flex items-center gap-2">
    <span class="tabular-nums text-gray-500 dark:text-gray-400 text-xs">
      {{ messageCount }}
    </span>
    <div class="relative group">
      <span class="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full border moh-border px-2 py-1 text-gray-600 dark:text-gray-300 cursor-default select-none">
        <Icon name="tabler:clock-off" class="text-[11px] opacity-70" aria-hidden="true" />
        Not saved
      </span>
      <div class="pointer-events-none absolute right-0 top-full mt-1.5 z-50 w-48 rounded-lg border moh-border moh-surface px-3 py-2 text-xs text-gray-700 dark:text-gray-300 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        These messages disappear when you leave — nothing is stored or saved.
      </div>
    </div>
    <slot name="actions" />
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    messageCount?: number | string
    titleClass?: string
    headingId?: string
  }>(),
  {
    messageCount: 0,
    titleClass: '',
  },
)
</script>
