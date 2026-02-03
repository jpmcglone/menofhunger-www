<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-stretch">
      <IconField iconPosition="left" class="w-full min-w-0 flex-1">
        <InputIcon class="pi pi-search" />
        <InputText
          v-model="searchQuery"
          class="w-full"
          placeholder="Search…"
          @keydown.enter="flushDebounceAndSearch"
        />
      </IconField>
    </div>

    <!-- Min length hint -->
    <div
      v-if="searchQueryTrimmed && searchQueryTrimmed.length < 2"
      class="rounded-xl border moh-border bg-gray-50/50 dark:bg-zinc-900/30 px-4 py-4"
    >
      <p class="text-sm moh-text-muted">
        Enter at least 2 characters to search.
      </p>
    </div>

    <!-- Error -->
    <AppInlineAlert v-else-if="searchQueryTrimmed.length >= 2 && searchError" severity="danger">
      {{ searchError }}
    </AppInlineAlert>

    <!-- Loading -->
    <div
      v-else-if="searchQueryTrimmed.length >= 2 && loading && interleaved.length === 0"
      class="flex justify-center py-12"
    >
      <AppLogoLoader />
    </div>

    <!-- Results: list edge to edge (no margin) -->
    <template v-else-if="searchQueryTrimmed.length >= 2">
      <div v-if="interleaved.length > 0" class="space-y-0 -mx-4">
        <p class="mb-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
          Searching for: <span class="font-semibold">{{ searchQueryTrimmed }}</span>
        </p>
        <div class="space-y-0">
          <template v-for="item in interleaved" :key="item.kind === 'user' ? `u-${item.user.id}` : `p-${item.post.id}`">
            <AppUserRow
              v-if="item.kind === 'user'"
              :user="item.user"
              :show-follow-button="true"
            />
            <AppFeedPostRow
              v-else
              :post="item.post"
            />
          </template>
        </div>
        <div v-if="loadingMore" class="flex justify-center py-6 px-4">
          <AppLogoLoader />
        </div>
        <div v-else-if="hasMore" class="flex justify-center py-4 px-4">
          <Button
            label="Load more"
            severity="secondary"
            :loading="loadingMore"
            :disabled="loadingMore"
            @click="loadMore"
          />
        </div>
      </div>

      <div
        v-else-if="searchedOnce && !loading"
        class="rounded-xl border moh-border bg-gray-50/50 dark:bg-zinc-900/30 px-4 py-6 text-center"
      >
        <p class="text-sm moh-text-muted">
          No people or posts found for “{{ searchQueryTrimmed }}”.
        </p>
      </div>
    </template>

    <!-- No search query: placeholder -->
    <p v-else class="text-sm moh-text-muted">
      Type in the search bar to search.
    </p>
  </div>
</template>

<script setup lang="ts">
import type { FeedPost, SearchUserResult, SearchMixedResult, SearchMixedPagination } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({
  layout: 'app',
  title: 'Explore',
})

usePageSeo({
  title: 'Explore',
  description: 'Explore Men of Hunger — trending topics, discovery, and new groups worth joining.',
  canonicalPath: '/explore',
  noindex: true,
  ogType: 'website',
  image: '/images/banner.png',
})

const route = useRoute()
const { apiFetch } = useApiClient()

const searchQuery = ref(String(route.query.q ?? '').trim())
const searchQueryTrimmed = computed(() => searchQuery.value.trim())

watch(
  () => route.query.q,
  (q) => {
    searchQuery.value = String(q ?? '').trim()
  },
  { immediate: true },
)

const DEBOUNCE_MS = 400
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function flushDebounceAndSearch() {
  if (debounceTimer != null) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  const q = searchQueryTrimmed.value
  if (q.length >= 2) {
    void navigateTo({ path: '/explore', query: { q } })
  } else {
    void navigateTo({ path: '/explore', query: q ? { q } : {} })
    users.value = []
    posts.value = []
    nextUserCursor.value = null
    nextPostCursor.value = null
    searchError.value = null
    searchedOnce.value = false
  }
}

function scheduleDebouncedSearch() {
  if (debounceTimer != null) clearTimeout(debounceTimer)
  debounceTimer = null
  const trimmed = searchQueryTrimmed.value
  if (trimmed.length >= 2) {
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      void navigateTo({ path: '/explore', query: { q: trimmed } })
    }, DEBOUNCE_MS)
  } else {
    void navigateTo({ path: '/explore', query: trimmed ? { q: trimmed } : {} })
    users.value = []
    posts.value = []
    nextUserCursor.value = null
    nextPostCursor.value = null
    searchError.value = null
    searchedOnce.value = false
  }
}

const users = ref<SearchUserResult[]>([])
const posts = ref<FeedPost[]>([])
const nextUserCursor = ref<string | null>(null)
const nextPostCursor = ref<string | null>(null)
const loading = ref(false)
const loadingMore = ref(false)
const searchError = ref<string | null>(null)
const searchedOnce = ref(false)

const hasMore = computed(
  () => nextUserCursor.value !== null || nextPostCursor.value !== null,
)

/** Users first (API order = exact match then relationship rank), then posts (API order = newest first). Keeps @john at top when they match. */
const interleaved = computed(() => {
  const userItems = users.value.map((user) => ({ kind: 'user' as const, user }))
  const postItems = posts.value.map((post) => ({ kind: 'post' as const, post }))
  return [...userItems, ...postItems]
})

async function fetchPage(params: { append: boolean }) {
  const q = searchQueryTrimmed.value
  if (q.length < 2) return

  const isAppend = params.append
  if (isAppend) {
    loadingMore.value = true
  } else {
    loading.value = true
  }
  searchError.value = null
  if (!isAppend) searchedOnce.value = true

  try {
    const query: Record<string, string> = {
      type: 'all',
      q,
      limit: '30',
    }
    if (isAppend && nextUserCursor.value) query.userCursor = nextUserCursor.value
    if (isAppend && nextPostCursor.value) query.postCursor = nextPostCursor.value

    const res = await apiFetch<SearchMixedResult>('/search', {
      method: 'GET',
      query,
    })

    const data = res.data as SearchMixedResult
    const pagination = res.pagination as SearchMixedPagination | undefined
    const newUsers = data.users ?? []
    const newPosts = data.posts ?? []

    if (isAppend) {
      users.value = [...users.value, ...newUsers]
      posts.value = [...posts.value, ...newPosts]
    } else {
      users.value = newUsers
      posts.value = newPosts
    }

    nextUserCursor.value = pagination?.nextUserCursor ?? null
    nextPostCursor.value = pagination?.nextPostCursor ?? null
  } catch (e: unknown) {
    searchError.value = getApiErrorMessage(e) || 'Search failed.'
    if (!isAppend) {
      users.value = []
      posts.value = []
      nextUserCursor.value = null
      nextPostCursor.value = null
    }
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || (!nextUserCursor.value && !nextPostCursor.value)) return
  await fetchPage({ append: true })
}

watch(
  () => route.query.q,
  (q) => {
    searchQuery.value = String(q ?? '').trim()
    const trimmed = String(q ?? '').trim()
    if (trimmed.length >= 2) {
      void fetchPage({ append: false })
    } else {
      users.value = []
      posts.value = []
      nextUserCursor.value = null
      nextPostCursor.value = null
      searchError.value = null
      searchedOnce.value = false
    }
  },
  { immediate: true },
)

watch(searchQuery, () => {
  const trimmed = searchQueryTrimmed.value
  const fromRoute = String(route.query.q ?? '').trim()
  if (trimmed !== fromRoute) scheduleDebouncedSearch()
})

onBeforeUnmount(() => {
  if (debounceTimer != null) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
})
</script>
