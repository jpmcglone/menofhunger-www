<template>
  <!-- Title + user count -->
  <div class="min-w-0 flex items-center gap-2">
    <div :class="['truncate font-semibold text-gray-900 dark:text-gray-50', titleClass]" :id="headingId || undefined">
      {{ title }}
    </div>
    <span v-if="memberCount != null" class="shrink-0 inline-flex items-center gap-1">
      <Icon name="tabler:users" class="text-[12px] opacity-30" aria-hidden="true" />
      <span class="text-[11px] tabular-nums font-medium text-gray-900 dark:text-white">{{ memberCount }}</span>
    </span>
  </div>

  <!-- Right side: ephemeral indicator + actions -->
  <div class="shrink-0 flex items-center gap-1">
    <!-- "Not saved" icon with tooltip -->
    <button
      v-tooltip.bottom="ephemeralTooltip"
      type="button"
      aria-label="Messages are not saved"
      class="moh-tap cursor-pointer inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 dark:text-gray-500 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
    >
      <Icon name="tabler:clock-off" class="text-[15px]" aria-hidden="true" />
    </button>
    <slot name="actions" />
  </div>
</template>

<script setup lang="ts">
import { tinyTooltip } from '~/utils/tiny-tooltip'

withDefaults(
  defineProps<{
    title: string
    memberCount?: number | null
    titleClass?: string
    headingId?: string
  }>(),
  {
    memberCount: null,
    titleClass: '',
  },
)

const ephemeralTooltip = computed(() => tinyTooltip('Messages are not saved — they disappear when you leave'))
</script>
