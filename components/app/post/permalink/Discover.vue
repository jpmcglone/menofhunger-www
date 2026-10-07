<template>
  <ClientOnly>
    <div
      v-if="!isOnlyMe && showDiscoverSection && !railShowsDiscover"
      class="border-b moh-border"
    >
      <div ref="discoverSentinelEl" class="h-1 w-full" aria-hidden="true" />
      <div class="px-4 sm:px-6 pt-6 pb-4">
        <div class="text-xl font-semibold moh-text">Discover more</div>
        <div class="mt-0.5 text-sm moh-text-muted">From across Men of Hunger</div>
      </div>
      <AppScreenState v-if="discoverLoading && !discoverPosts.length" status="loading" skeleton="post" :skeleton-count="4" />
      <template v-else-if="discoverPosts.length">
        <AppFeedPostRow
          v-for="d in discoverPosts"
          :key="d.id"
          :post="d"
        />
        <div
          v-if="discoverNextCursor || discoverLoading"
          ref="discoverMoreSentinelEl"
          class="flex items-center justify-center py-4"
          aria-hidden="true"
        >
          <AppLoadMoreFooter :state="discoverLoading ? 'loading' : 'idle'" />
        </div>
      </template>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { usePostPageContext } from '~/composables/pages/post/usePostPage'

const {
  isOnlyMe,
  showDiscoverSection,
  railShowsDiscover,
  discoverLoading,
  discoverPosts,
  discoverNextCursor,
  discoverSentinelEl,
  discoverMoreSentinelEl,
} = usePostPageContext()
</script>

