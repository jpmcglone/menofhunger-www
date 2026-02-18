<template>
  <div
    class="sticky top-0 z-20 border-b moh-border moh-surface p-0 shadow-[0_6px_16px_rgba(20,18,16,0.06)] dark:shadow-none"
  >
    <div class="moh-feed-header-inner relative flex items-center justify-between gap-3 moh-gutter-x py-2">
      <template v-if="scopeTabs.length > 1">
        <AppTabSelector
          :model-value="scope"
          aria-label="Feed scope"
          :tabs="scopeTabs"
          @update:model-value="$emit('update:scope', $event as 'following' | 'all')"
        />
      </template>
      <!-- Keep filters pinned to the far right even when scope tabs are hidden. -->
      <div v-else class="flex-1" aria-hidden="true" />

      <div class="ml-auto">
        <AppFeedFiltersBar
          :sort="sort"
          :filter="filter"
          :viewer-is-verified="viewerIsVerified"
          :viewer-is-premium="viewerIsPremium"
          :show-reset="showReset"
          @update:sort="$emit('update:sort', $event)"
          @update:filter="$emit('update:filter', $event)"
          @reset="$emit('reset')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProfilePostsFilter } from '~/utils/post-visibility'

defineProps<{
  scope: 'following' | 'all'
  sort: 'new' | 'trending'
  filter: ProfilePostsFilter
  scopeTabs: Array<{ key: string; label: string; disabled: boolean }>
  viewerIsVerified: boolean
  viewerIsPremium: boolean
  showReset: boolean
}>()

defineEmits<{
  (e: 'update:scope', v: 'following' | 'all'): void
  (e: 'update:sort', v: 'new' | 'trending'): void
  (e: 'update:filter', v: ProfilePostsFilter): void
  (e: 'reset'): void
}>()
</script>
