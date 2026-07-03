<template>
  <div
    class="sticky top-0 z-20 moh-surface relative border-b moh-border"
  >
    <AppFeedScopeSelector
      :model-value="scope"
      @update:model-value="$emit('update:scope', $event as FeedScope)"
      @reselect="$emit('reselect', $event as FeedScope)"
    />

    <!-- Filters bar — floated to the right, vertically centered in the tab row -->
    <div class="absolute inset-y-0 right-0 flex items-center pr-3 sm:pr-4 pointer-events-none">
      <div class="pointer-events-auto">
        <AppFeedFiltersBar
          :sort="sort"
          :filter="filter"
          :viewer-is-verified="viewerIsVerified"
          :viewer-is-premium="viewerIsPremium"
          :hide-sort="scope === 'forYou'"
          @update:sort="$emit('update:sort', $event)"
          @update:filter="$emit('update:filter', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProfilePostsFilter } from '~/utils/post-visibility'
import type { FeedScope } from '~/composables/useUrlFeedFilters'

defineProps<{
  scope: FeedScope
  sort: 'new' | 'trending'
  filter: ProfilePostsFilter
  viewerIsVerified: boolean
  viewerIsPremium: boolean
}>()

defineEmits<{
  (e: 'update:scope', v: FeedScope): void
  (e: 'reselect', v: FeedScope): void
  (e: 'update:sort', v: 'new' | 'trending'): void
  (e: 'update:filter', v: ProfilePostsFilter): void
}>()
</script>
