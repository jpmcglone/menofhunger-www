<template>
  <AppPageContent bottom="standard">
    <div class="w-full">
      <div class="px-4 pt-4 pb-2">
        <AppPageHeader
          title="Check-ins"
          icon="tabler:calendar-check"
          description="Recent and trending daily check-ins."
        />
      </div>

      <div class="px-4 pb-2 flex items-center gap-2">
        <Button
          label="Trending"
          :severity="sort === 'trending' ? 'primary' : 'secondary'"
          rounded
          size="small"
          @click="() => (sort = 'trending')"
        />
        <Button
          label="New"
          :severity="sort === 'new' ? 'primary' : 'secondary'"
          rounded
          size="small"
          @click="() => (sort = 'new')"
        />
      </div>

      <div v-if="error" class="px-4 pb-3">
        <AppInlineAlert severity="danger">
          {{ error }}
        </AppInlineAlert>
      </div>

      <div v-if="loading && posts.length === 0" class="flex justify-center py-12">
        <AppLogoLoader />
      </div>

      <div v-else-if="posts.length === 0" class="px-4 py-6 text-sm moh-text-muted">
        No check-ins yet.
      </div>

      <div v-else class="space-y-0">
        <TransitionGroup name="moh-post" tag="div" class="space-y-0">
          <AppFeedPostRow
            v-for="p in posts"
            :key="p.id"
            :post="p"
            @deleted="(id) => onDeleted(id)"
            @edited="onEdited"
          />
        </TransitionGroup>
      </div>

      <div class="px-4 py-6 flex justify-center">
        <Button
          v-if="nextCursor"
          label="Load more"
          severity="secondary"
          :loading="loadingMore"
          :disabled="loadingMore"
          @click="loadMore"
        />
      </div>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { FeedPost } from '~/types/api'
import { useCursorFeed } from '~/composables/useCursorFeed'

definePageMeta({
  layout: 'app',
  title: 'Check-ins',
  hideTopBar: true,
})

usePageSeo({
  title: 'Check-ins',
  description: 'Recent and trending check-ins on Men of Hunger.',
  canonicalPath: '/check-ins',
  noindex: true,
})

const sort = ref<'trending' | 'new'>('trending')

const { items: posts, nextCursor, loading, loadingMore, error, refresh, loadMore } = useCursorFeed<FeedPost>({
  stateKey: 'check-ins-feed',
  buildRequest: (cursor) => ({
    path: '/posts',
    query: {
      limit: 30,
      cursor: cursor ?? undefined,
      sort: sort.value,
      kind: 'checkin',
      visibility: 'all',
      followingOnly: false,
    },
  }),
  getItemId: (p) => p.id,
  defaultErrorMessage: 'Failed to load check-ins.',
  loadMoreErrorMessage: 'Failed to load more check-ins.',
})

function onDeleted(id: string) {
  posts.value = posts.value.filter((p) => p.id !== id)
}

function onEdited(payload: { id: string; post: FeedPost }) {
  posts.value = posts.value.map((p) => (p.id === payload.id ? payload.post : p))
}

if (import.meta.server) await refresh()
onMounted(() => {
  if (posts.value.length === 0 && !loading.value) void refresh()
})

// Re-fetch when the user changes sort (client-side interaction only)
watch(sort, () => void refresh())
</script>

