<template>
  <div class="sticky top-0 z-20 border-b moh-border moh-bg p-0">
    <div class="moh-feed-header-inner flex items-stretch justify-between gap-3 px-4 py-2">
      <AppTabSelector
        :model-value="scope"
        aria-label="Feed scope"
        :tabs="scopeTabs"
        @update:model-value="$emit('update:scope', $event as 'following' | 'all')"
      />
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
