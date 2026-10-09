<template>
  <Card class="moh-card moh-card-matte !rounded-2xl">
    <template #title>
      <span class="moh-h2">{{ title }}</span>
    </template>
    <template #content>
      <div v-if="loading && items.length === 0" class="space-y-0.5 animate-pulse" aria-hidden="true">
        <div v-for="i in 5" :key="i" class="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5">
          <div class="h-6 w-6 rounded-md bg-gray-200 dark:bg-zinc-800 shrink-0" />
          <div class="flex-1 space-y-1.5">
            <div class="h-3 bg-gray-200 dark:bg-zinc-800 rounded-full w-3/4" />
            <div class="h-2.5 bg-gray-200 dark:bg-zinc-800 rounded-full w-1/2" />
          </div>
        </div>
      </div>

      <div v-else-if="error" class="text-sm moh-text-muted">
        {{ error }}
      </div>

      <div v-else-if="items.length === 0" class="text-sm moh-text-muted">
        {{ emptyText }}
      </div>

      <div v-else class="space-y-0.5">
        <NuxtLink
          v-for="(item, i) in items"
          :key="`${item.key}-${i}`"
          :to="item.to"
          class="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10 moh-focus"
        >
          <AppTrendingRankBadge :rank="i + 1" />
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-sm moh-text truncate">
              {{ item.label }}
            </div>
            <div class="moh-meta">
              {{ item.meta }}
            </div>
          </div>
          <Icon name="tabler:chevron-right" class="shrink-0 text-gray-400 dark:text-zinc-500" aria-hidden="true" />
        </NuxtLink>

        <NuxtLink
          :to="footerTo"
          class="flex items-center justify-between gap-2 border-t moh-border-subtle pt-3 mt-2 group moh-focus"
        >
          <span class="text-sm font-medium moh-text-muted group-hover:moh-text transition-colors">
            {{ footerLabel }}
          </span>
          <Icon name="tabler:chevron-right" class="text-xs moh-text-muted shrink-0" aria-hidden="true" />
        </NuxtLink>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

export type TrendingListItem = { key: string; to: RouteLocationRaw; label: string; meta: string }

defineProps<{
  title: string
  loading: boolean
  error: string | null
  items: TrendingListItem[]
  emptyText: string
  footerTo: string
  footerLabel: string
}>()
</script>
