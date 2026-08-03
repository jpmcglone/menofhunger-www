<template>
  <AppModal
    :model-value="open"
    title="Reposted by"
    max-width-class="max-w-sm"
    max-height="min(70svh, 480px)"
    @update:model-value="(v) => { if (!v) $emit('close') }"
  >
    <div>
      <div v-if="loading && !authors.length" class="flex items-center justify-center py-10">
        <AppLoadingSpinner />
      </div>
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
          class="h-10 flex items-center justify-center"
        >
          <AppLoadingSpinner v-if="loadingMore" />
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

const { apiFetchData } = useApiClient()

const authors = ref<PostAuthor[]>([])
const cursor = ref<string | null>(null)
const hasMore = ref(false)
const loading = ref(false)
const loadingMore = ref(false)

async function fetchPage(cur: string | null) {
  const res = await apiFetchData<{ data: PostAuthor[]; pagination: { nextCursor: string | null } }>(
    `/posts/${encodeURIComponent(props.postId)}/reposts`,
    { method: 'GET', query: cur ? { cursor: cur, limit: 30 } : { limit: 30 } },
  )
  return res
}

async function load() {
  loading.value = true
  try {
    const res = await fetchPage(null)
    authors.value = res.data
    cursor.value = res.pagination.nextCursor
    hasMore.value = Boolean(res.pagination.nextCursor)
  } catch {
    // silently fail
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (!cursor.value || loadingMore.value) return
  loadingMore.value = true
  try {
    const res = await fetchPage(cursor.value)
    authors.value = [...authors.value, ...res.data]
    cursor.value = res.pagination.nextCursor
    hasMore.value = Boolean(res.pagination.nextCursor)
  } catch {
    // silently fail
  } finally {
    loadingMore.value = false
  }
}

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
    authors.value = []
    cursor.value = null
    hasMore.value = false
    return
  }
  await load()
  await nextTick()
  setupObserver()
})

watch(loadMoreTrigger, () => { if (hasMore.value) setupObserver() })

onBeforeUnmount(() => observer?.disconnect())
</script>
