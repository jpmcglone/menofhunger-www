<template>
  <div
    class="sticky top-0 z-20 moh-surface relative border-b moh-border flex items-center gap-2 pr-3 sm:pr-4"
  >
    <AppFeedScopeSelector
      :model-value="scope"
      :tint="feedScopeTint(filter, { verified: viewerIsVerified, premium: viewerIsPremium })"
      class="min-w-0 flex-1"
      @update:model-value="$emit('update:scope', $event as FeedScope)"
      @reselect="$emit('reselect', $event as FeedScope)"
    />

    <!-- Keep the filter target separate from horizontally scrollable tabs. -->
    <div class="flex shrink-0 items-center py-1">
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
import { feedScopeTint, type ProfilePostsFilter } from '~/utils/post-visibility'
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
