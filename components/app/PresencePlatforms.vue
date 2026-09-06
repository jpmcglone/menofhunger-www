<template>
  <div class="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs moh-text-muted">
    <AppMarvMark v-if="isBot" :size="14" />
    <template v-else-if="!recentLabel">
      <AppIconGlyph v-for="platform in activePlatforms" :key="platform.key" :name="platform.icon" :size="14" />
    </template>
    <span>{{ label }}</span>
    <span v-if="inCall && !recentLabel" class="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
      <span aria-hidden="true">·</span>
      <Icon name="tabler:headset" class="h-3.5 w-3.5" aria-hidden="true" />
      In a call
    </span>
  </div>
</template>

<script setup lang="ts">
import { presencePlatforms } from '~/utils/presence-platforms'
const props = defineProps<{ platforms?: string[] | null; recentLabel?: string | null; isBot?: boolean; inCall?: boolean }>()
const activePlatforms = computed(() => presencePlatforms(props.platforms))
const label = computed(() => {
  if (props.isBot) return 'AI assistant'
  if (props.recentLabel) return `Active ${props.recentLabel}`
  return activePlatforms.value.length ? `Online · ${activePlatforms.value.map(p => p.label).join(' & ')}` : 'Online now'
})
</script>
