<template>
  <AppPageContent bottom="standard">
    <div class="w-full">
      <div class="sticky top-0 z-20 border-b moh-border moh-frosted moh-texture overflow-hidden">
        <div class="relative z-10 flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
          <div class="min-w-0">
            <div class="text-base sm:text-lg font-semibold">New posts</div>
          </div>
        </div>
      </div>

      <AppInlineAlert v-if="error" class="mx-3 mt-3 sm:mx-4 sm:mt-4" severity="danger">
        {{ error }}
      </AppInlineAlert>

      <AppSubtleSectionLoader :loading="showInitialLoader" min-height-class="min-h-[240px]">
        <div
          v-if="initialLoadResolved && !displayPosts.length && !nextCursor && !loading"
          class="px-3 py-6 sm:px-4 sm:py-8 text-center text-[13px] sm:text-sm text-gray-500 dark:text-gray-400"
        >
          No new posts yet.
        </div>

        <div v-else class="relative mt-3">
          <template v-for="post in displayPosts" :key="post._localId ?? post.id">
            <AppFeedPostRow
              :post="post"
              :replies-sort="'new'"
            />
          </template>
        </div>

        <div v-if="nextCursor && !loading" class="px-3 pt-2.5 pb-0 sm:px-4 sm:pt-3 sm:pb-3 text-center">
          <Button
            label="Load more"
            text
            severity="secondary"
            :loading="loadingMore"
            @click="loadMore"
          />
        </div>
        <div v-else-if="loadingMore" class="px-3 pt-2.5 pb-0 sm:px-4 sm:pt-3 sm:pb-3 text-center">
          <div class="inline-flex transition-opacity duration-150">
            <AppLogoLoader compact />
          </div>
        </div>
      </AppSubtleSectionLoader>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'New posts',
  hideTopBar: true,
  ssr: false,
})

usePageSeo({
  title: 'New posts',
  description: 'A feed of posts from your new-post notifications.',
  canonicalPath: '/new-posts',
  noindex: true,
})

const {
  displayPosts,
  nextCursor,
  loading,
  loadingMore,
  error,
  refresh,
  loadMore,
} = useNewPostsFeed()

const { markNewPostsRead } = useNotifications()
const notifBadge = useNotificationsBadge()
const initialLoadResolved = ref(false)

const showInitialLoader = computed(() => !initialLoadResolved.value || (loading.value && displayPosts.value.length === 0))

onMounted(async () => {
  try {
    void markNewPostsRead()
    await refresh()
  } finally {
    initialLoadResolved.value = true
  }
})

onActivated(async () => {
  void markNewPostsRead()
  await refresh()
})

onUnmounted(() => {
  notifBadge.fetchUndeliveredCount?.()
})
</script>
