<template>
  <div class="relative -mx-4">
    <!-- Content (blurred until revealed) -->
    <div :class="revealed ? '' : 'blur-md pointer-events-none select-none'">
      <div class="px-4 py-4 border-b moh-border">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <i class="pi pi-eye-slash text-sm moh-text-muted" aria-hidden="true" />
              <h1 class="text-lg font-semibold">Only me</h1>
            </div>
            <div class="mt-1 text-sm moh-text-muted">
              Private posts that only you can see. These never appear in feeds.
            </div>
          </div>
        </div>
      </div>

      <div v-if="error" class="px-4 mt-4">
        <AppInlineAlert severity="danger">
          {{ error }}
        </AppInlineAlert>
      </div>

      <div v-if="!loading && posts.length === 0" class="px-4 py-6 text-sm moh-text-muted">
        No “Only me” posts yet.
      </div>

      <div class="relative mt-2">
        <div v-for="p in posts" :key="p.id">
          <AppPostRow :post="p" @deleted="removePost" />
        </div>
      </div>

      <div v-if="nextCursor" class="px-4 py-6 flex justify-center">
        <Button label="Load more" severity="secondary" :loading="loading" :disabled="loading" @click="loadMore" />
      </div>
    </div>

    <!-- Privacy gate (resets every visit) -->
    <div
      v-if="!revealed"
      class="absolute inset-0 z-10 flex items-start justify-center bg-white/55 dark:bg-black/55"
    >
      <div class="w-full max-w-md px-4 pt-10 sm:pt-14">
        <div class="rounded-2xl border border-gray-200 bg-white/90 p-5 shadow-sm dark:border-zinc-800 dark:bg-black/70">
          <div class="flex items-start gap-3">
            <div class="mt-0.5 h-9 w-9 shrink-0 rounded-full flex items-center justify-center moh-onlyme-icon">
              <i class="pi pi-eye-slash" aria-hidden="true" />
            </div>
            <div class="min-w-0">
              <div class="text-lg font-semibold text-gray-900 dark:text-gray-50">These posts are only for you</div>
              <div class="mt-1 text-sm text-gray-600 dark:text-gray-300">
                For privacy, we hide them by default each time you visit this page.
              </div>
            </div>
          </div>

          <div class="mt-5">
            <AppSlideToReveal
              label="Slide to unhide"
              completedLabel="Unhidden"
              hint="Drag the handle all the way to the right"
              @revealed="revealed = true"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Only me',
})

usePageSeo({
  title: 'Only me',
  description: 'Private posts only you can see.',
  canonicalPath: '/only-me',
  noindex: true,
})

const revealed = ref(false)

const { posts, nextCursor, loading, error, refresh, loadMore, removePost } = useOnlyMePosts()

if (import.meta.server) {
  await refresh()
} else {
  onMounted(() => void refresh())
}

onMounted(() => {
  revealed.value = false
})

onActivated(() => {
  // If this page is ever cached/kept-alive, still require reveal each time it becomes active.
  revealed.value = false
})
</script>

