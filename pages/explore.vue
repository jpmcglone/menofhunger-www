<template>
  <div class="w-full">
    <!-- Sticky search bar (replaces layout title bar) -->
    <div class="sticky top-0 z-10 border-b moh-border moh-frosted">
      <div class="px-4 py-3">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <IconField iconPosition="left" class="w-full min-w-0 flex-1">
            <InputIcon class="pi pi-search" />
            <InputText
              v-model="searchQuery"
              class="w-full h-11 !rounded-full"
              placeholder="Search…"
              @keydown.enter="flushDebounceAndSearch"
            />
          </IconField>
        </div>
      </div>
    </div>

    <div class="py-4 space-y-4">

      <!-- Min length hint -->
      <div v-if="searchQueryTrimmed && searchQueryTrimmed.length < 2" class="px-4">
        <div class="rounded-xl border moh-border bg-gray-50/50 dark:bg-zinc-900/30 p-4">
          <p class="text-sm moh-text-muted">
            Enter at least 2 characters to search.
          </p>
        </div>
      </div>

      <!-- Search results -->
      <template v-if="isSearching">
        <div v-if="searchError" class="px-4">
          <AppInlineAlert severity="danger">
            {{ searchError }}
          </AppInlineAlert>
        </div>

        <div
          v-else-if="loading && interleaved.length === 0"
          class="flex justify-center py-12"
        >
          <AppLogoLoader />
        </div>

        <!-- Results: list edge to edge (no margin) -->
        <div v-else-if="interleaved.length > 0" class="space-y-0">
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

        <div v-else-if="searchedOnce && !loading" class="px-4">
          <div class="rounded-xl border moh-border bg-gray-50/50 dark:bg-zinc-900/30 px-4 py-6 text-center">
            <p class="text-sm moh-text-muted">
              No people or posts found for “{{ searchQueryTrimmed }}”.
            </p>
          </div>
        </div>
      </template>

      <!-- No (valid) search query: discovery sections -->
      <template v-else>
        <template v-if="isAuthed">
          <div v-if="discoverError" class="px-4">
            <AppInlineAlert severity="warning">
              {{ discoverError }}
            </AppInlineAlert>
          </div>

          <!-- People to follow -->
          <section class="space-y-3">
            <div class="px-4 flex items-center justify-between gap-3">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-50">
                People to follow
              </h2>
              <Button
                label="Refresh"
                text
                severity="secondary"
                :loading="discoverLoading"
                :disabled="discoverLoading"
                @click="refreshDiscover"
              />
            </div>

            <div v-if="discoverLoading && recommendedUsers.length === 0" class="flex justify-center py-6">
              <AppLogoLoader />
            </div>

            <AppHorizontalScroller v-else-if="recommendedUsers.length > 0" scroller-class="no-scrollbar px-4">
              <div class="flex gap-3 pb-2">
                <AppUserMiniCard
                  v-for="u in recommendedUsers"
                  :key="u.id"
                  :user="u"
                  @followed="removeDiscoverUser(u.id)"
                />
              </div>
            </AppHorizontalScroller>

            <p v-else class="px-4 text-sm moh-text-muted">
              No recommendations yet — try searching for people.
            </p>
          </section>

          <!-- Trending from recommended -->
          <section class="space-y-3">
            <h2 class="px-4 text-sm font-semibold text-gray-900 dark:text-gray-50">
              Trending from people you might like
            </h2>

            <div v-if="discoverLoading && trendingPosts.length === 0" class="flex justify-center py-6">
              <AppLogoLoader />
            </div>

            <div v-else-if="trendingPosts.length > 0" class="space-y-0">
              <div class="space-y-0">
                <AppFeedPostRow
                  v-for="p in trendingBefore"
                  :key="p.id"
                  :post="p"
                />
              </div>

              <div v-if="shouldInlineNewUsers && newestUsers.length > 0" class="px-4 py-3">
                <div class="flex items-center justify-between gap-3">
                  <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-50">
                    New users
                  </h3>
                </div>
                <AppHorizontalScroller scroller-class="no-scrollbar mt-3">
                  <div class="flex gap-3 pb-2">
                    <AppUserMiniCard
                      v-for="u in newestUsers"
                      :key="u.id"
                      :user="u"
                      @followed="removeDiscoverUser(u.id)"
                    />
                  </div>
                </AppHorizontalScroller>
              </div>

              <div class="space-y-0">
                <AppFeedPostRow
                  v-for="p in trendingAfter"
                  :key="p.id"
                  :post="p"
                />
              </div>
            </div>

            <p v-else class="px-4 text-sm moh-text-muted">
              No trending posts yet.
            </p>
          </section>

          <!-- New users (standalone when we can’t inline) -->
          <section v-if="!shouldInlineNewUsers && newestUsers.length > 0" class="space-y-3">
            <h2 class="px-4 text-sm font-semibold text-gray-900 dark:text-gray-50">
              New users
            </h2>
            <AppHorizontalScroller scroller-class="no-scrollbar px-4">
              <div class="flex gap-3 pb-2">
                <AppUserMiniCard
                  v-for="u in newestUsers"
                  :key="u.id"
                  :user="u"
                  @followed="removeDiscoverUser(u.id)"
                />
              </div>
            </AppHorizontalScroller>
          </section>

          <p class="px-4 text-sm moh-text-muted">
            Or type in the search bar to search.
          </p>
        </template>

        <!-- Logged out: simple search-only Explore -->
        <template v-else>
          <div class="px-4">
            <div class="rounded-xl border moh-border bg-gray-50/50 dark:bg-zinc-900/30 p-4">
              <p class="text-sm moh-text-muted">
                Use the search bar above to find people and posts.
              </p>
            </div>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FeedPost, SearchUserResult, SearchMixedResult, SearchMixedPagination } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({
  layout: 'app',
  title: 'Explore',
  hideTopBar: true,
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
const router = useRouter()
const { apiFetch } = useApiClient()
const { isAuthed } = useAuth()

function normalizeQueryParam(v: unknown): string {
  return String(v ?? '').trim()
}

function getRouteQ(): string {
  return normalizeQueryParam(route.query.q)
}

const searchQuery = ref(getRouteQ())
const searchQueryTrimmed = computed(() => searchQuery.value.trim())
const isSearching = computed(() => searchQueryTrimmed.value.length >= 2)

const {
  recommendedUsers,
  newestUsers,
  trendingPosts,
  loading: discoverLoading,
  error: discoverError,
  refresh: refreshDiscover,
  removeUserById: removeDiscoverUser,
} = useExploreRecommendations({
  // Logged out Explore should not attempt any discovery calls.
  enabled: computed(() => isAuthed.value && !isSearching.value),
})

const TRENDING_INLINE_NEW_USERS_AFTER = 6
const shouldInlineNewUsers = computed(() => trendingPosts.value.length >= 4)
const trendingBefore = computed(() => trendingPosts.value.slice(0, TRENDING_INLINE_NEW_USERS_AFTER))
const trendingAfter = computed(() => trendingPosts.value.slice(TRENDING_INLINE_NEW_USERS_AFTER))

const DEBOUNCE_MS = 400
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let isUpdatingRouteFromInput = false

function clearSearchResults() {
  users.value = []
  posts.value = []
  nextUserCursor.value = null
  nextPostCursor.value = null
  searchError.value = null
  searchedOnce.value = false
}

function setRouteQueryQ(nextQ: string) {
  const trimmed = nextQ.trim()
  const current = getRouteQ()
  if (trimmed === current) return

  const nextQuery: Record<string, any> = { ...route.query }
  if (trimmed) nextQuery.q = trimmed
  else delete nextQuery.q

  isUpdatingRouteFromInput = true
  Promise.resolve(router.replace({ path: route.path, query: nextQuery }))
    .catch(() => {
      // ignore: route updates should never break typing
    })
    .finally(() => {
      isUpdatingRouteFromInput = false
    })
}

function flushDebounceAndSearch() {
  if (debounceTimer != null) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  const q = searchQueryTrimmed.value
  if (q.length >= 2) {
    setRouteQueryQ(q)
  } else {
    setRouteQueryQ(q)
    clearSearchResults()
  }
}

function scheduleDebouncedSearch() {
  if (debounceTimer != null) clearTimeout(debounceTimer)
  debounceTimer = null
  const trimmed = searchQueryTrimmed.value
  if (trimmed.length >= 2) {
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      setRouteQueryQ(trimmed)
    }, DEBOUNCE_MS)
  } else {
    setRouteQueryQ(trimmed)
    clearSearchResults()
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
    const trimmed = normalizeQueryParam(q)
    // Only sync route -> input when the user didn't just type it.
    // This keeps the input stable while results update under it.
    if (!isUpdatingRouteFromInput && trimmed !== searchQueryTrimmed.value) {
      searchQuery.value = trimmed
    }

    if (trimmed.length >= 2) {
      void fetchPage({ append: false })
    } else {
      clearSearchResults()
    }
  },
  { immediate: true },
)

watch(searchQuery, () => {
  const trimmed = searchQueryTrimmed.value
  const fromRoute = getRouteQ()
  if (trimmed !== fromRoute) scheduleDebouncedSearch()
})

onBeforeUnmount(() => {
  if (debounceTimer != null) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
})
</script>
