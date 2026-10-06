<template>
  <NuxtLink
    :to="item.href"
    class="moh-focus moh-surface-hover flex min-h-11 items-center gap-3 px-4 py-3 transition-colors"
    :aria-label="item.meta ? `${item.title}, ${item.meta}` : item.title"
  >
    <div class="min-w-0 flex-1">
      <p class="line-clamp-2 text-sm font-semibold leading-snug moh-text">{{ item.title }}</p>
      <p v-if="item.meta" class="mt-0.5 truncate text-xs moh-text-muted">{{ item.meta }}</p>
    </div>
    <img
      v-if="item.thumbnailUrl"
      :src="item.thumbnailUrl"
      alt=""
      loading="lazy"
      class="w-14 shrink-0 rounded-md object-cover moh-img-outline"
      style="aspect-ratio: 16/9;"
    >
  </NuxtLink>
</template>

<script setup lang="ts">
import type { RailRecommendationItem } from '~/composables/useRailRecommendations'

defineProps<{ item: RailRecommendationItem }>()
</script>
