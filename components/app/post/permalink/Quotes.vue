<template>
  <div
    v-if="post && (post as any).quoteCount > 0"
    class="border-b moh-border"
  >
    <button
      type="button"
      class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors"
      @click="quotesOpen = !quotesOpen"
    >
      <div class="text-sm font-semibold moh-text">
        Quotes
        <span class="ml-2 text-xs font-medium text-gray-500 dark:text-gray-400 tabular-nums">
          {{ (post as any).quoteCount }}
        </span>
      </div>
      <Icon
        :name="quotesOpen ? 'tabler:chevron-up' : 'tabler:chevron-down'"
        class="text-sm moh-text-muted shrink-0"
        aria-hidden="true"
      />
    </button>
    <div v-if="quotesOpen">
      <AppScreenState v-if="quotesLoading && !quotePosts.length" status="loading" skeleton="post" :skeleton-count="3" />
      <template v-else>
        <AppFeedPostRow
          v-for="q in quotePosts"
          :key="q.id"
          :post="q"
        />
        <div v-if="quotesNextCursor" class="flex justify-center px-4 py-3">
          <Button
            label="Load more quotes"
            severity="secondary"
            rounded
            size="small"
            :loading="quotesLoading"
            :disabled="quotesLoading"
            @click="loadMoreQuotes"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePostPageContext } from '~/composables/pages/post/usePostPage'

const {
  post,
  quotesOpen,
  quotesLoading,
  quotePosts,
  quotesNextCursor,
  loadMoreQuotes,
} = usePostPageContext()
</script>

