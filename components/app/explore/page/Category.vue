<template>
  <div class="px-4 flex items-center justify-between gap-3">
    <div class="min-w-0">
      <div class="text-sm font-semibold text-gray-900 dark:text-gray-50 truncate">
        Category: {{ activeCategoryLabel || activeCategory }}
      </div>
      <div class="text-xs moh-text-muted">
        Showing posts matching this category.
      </div>
    </div>
    <div class="shrink-0 flex items-center gap-2">
      <Button
        label="Clear"
        text
        severity="secondary"
        @click="clearCategory"
      />
    </div>
  </div>

  <div v-if="categoryTopicsUi.length > 0" class="px-4">
    <AppHorizontalScroller scroller-class="no-scrollbar">
      <div class="flex gap-2 pb-2 pt-2">
        <button
          v-for="t in categoryTopicsUi"
          :key="`ct-${t.value}`"
          type="button"
          class="min-h-11 px-4 shrink-0 rounded-full border moh-border bg-white/60 dark:bg-zinc-900/40 text-sm text-gray-800 dark:text-gray-100 hover:bg-white dark:hover:bg-zinc-900 transition whitespace-nowrap"
          @click="selectTopicInCategory(t.value)"
        >
          {{ t.label }}
        </button>
      </div>
    </AppHorizontalScroller>
  </div>

  <div v-if="categoryError" class="px-4">
    <AppInlineAlert severity="warning">
      {{ categoryError }}
    </AppInlineAlert>
  </div>

  <div v-else-if="categoryLoadingInitial" class="flex justify-center py-12">
    <AppLogoLoader />
  </div>

  <div v-else-if="categoryPosts.length > 0" class="space-y-0">
    <AppFeedPostRow
      v-for="p in categoryPosts"
      :key="p.id"
      :post="p"
      collapse-ancestors
    />
    <div v-if="categoryLoadingMore" class="flex justify-center py-6 px-4">
      <AppLogoLoader />
    </div>
    <div v-else-if="categoryHasMore" class="flex justify-center py-4 px-4">
      <Button
        label="Load more"
        severity="secondary"
        :loading="categoryLoadingMore"
        :disabled="categoryLoadingMore"
        @click="loadMoreCategory"
      />
    </div>
  </div>

  <div v-else class="px-4">
    <div class="rounded-xl border moh-border bg-gray-50/50 dark:bg-zinc-900/30 px-4 py-6 text-center">
      <p class="text-sm moh-text-muted">
        No posts found for this category.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useExplorePageContext } from '~/composables/pages/explore/useExplorePage'

const {
  activeCategoryLabel,
  activeCategory,
  clearCategory,
  categoryTopicsUi,
  selectTopicInCategory,
  categoryError,
  categoryLoadingInitial,
  categoryPosts,
  categoryLoadingMore,
  categoryHasMore,
  loadMoreCategory,
} = useExplorePageContext()
</script>

