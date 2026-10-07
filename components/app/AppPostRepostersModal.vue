<template>
  <AppModal
    :model-value="open"
    title="Reposted by"
    max-width-class="max-w-sm"
    max-height="min(70svh, 480px)"
    @update:model-value="(v) => { if (!v) $emit('close') }"
  >
    <div>
      <AppScreenState v-if="loading && !authors.length" status="loading" skeleton="user" :skeleton-count="5" />
      <div
        v-else-if="!loading && !authors.length"
        class="flex flex-col items-center justify-center py-10 moh-text-muted text-sm"
      >
        No reposts yet.
      </div>
      <template v-else>
        <div v-for="author in authors" :key="author.id">
          <NuxtLink
            :to="author.username ? `/u/${encodeURIComponent(author.username)}` : '#'"
            class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors"
            @click="$emit('close')"
          >
            <AppUserAvatar :user="author" size-class="h-9 w-9" :show-status="false" />
            <div class="min-w-0 flex-1">
              <AppUserIdentityLine :user="author" />
            </div>
          </NuxtLink>
        </div>
        <div
          v-if="hasMore"
          ref="loadMoreTrigger"
        >
          <AppLoadMoreFooter :state="loadingMore ? 'loading' : 'idle'" />
        </div>
      </template>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import type { PostAuthor } from '~/types/api'

const props = defineProps<{
  open: boolean
  postId: string
}>()

defineEmits<{ close: [] }>()

const repostersFeed = useCursorFeed<PostAuthor>({
  stateKey: 'post-reposters',
  stateMode: 'local',
  buildRequest: (cur) => ({ path: `/posts/${encodeURIComponent(props.postId)}/reposts`, query: cur ? { cursor: cur, limit: 30 } : { limit: 30 } }),
  getItemId: (a) => a.id,
})
const { items: authors, loading, loadingMore, hasMore, loadMore } = repostersFeed

// Intersection observer for infinite scroll
const loadMoreTrigger = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

function setupObserver() {
  if (observer) { observer.disconnect(); observer = null }
  if (!loadMoreTrigger.value || !hasMore.value) return
  observer = new IntersectionObserver(
    (entries) => { if (entries[0]?.isIntersecting) loadMore() },
    { threshold: 0.1 },
  )
  observer.observe(loadMoreTrigger.value)
}

watch(() => props.open, async (val) => {
  if (!val) {
    repostersFeed.reset()
    return
  }
  await repostersFeed.refresh()
  await nextTick()
  setupObserver()
})

watch(loadMoreTrigger, () => { if (hasMore.value) setupObserver() })

onBeforeUnmount(() => observer?.disconnect())
</script>
