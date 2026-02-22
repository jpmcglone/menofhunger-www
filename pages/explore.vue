<template>
  <AppPageContent bottom="standard">
  <div class="w-full">
    <!-- Sticky search bar (replaces layout title bar) -->
    <div class="sticky top-0 z-10 border-b moh-border moh-frosted">
      <div class="px-4 py-3">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <IconField iconPosition="left" class="w-full min-w-0 flex-1">
            <InputIcon>
              <Icon name="tabler:search" class="text-lg opacity-70" aria-hidden="true" />
            </InputIcon>
            <InputText
              ref="searchInputRef"
              v-model="searchQuery"
              id="explore-search"
              name="q"
              aria-label="Search"
              class="w-full h-11 !rounded-full"
              placeholder="Search…"
              @keydown.enter="flushDebounceAndSearch"
            />
          </IconField>
        </div>
      </div>
    </div>

    <div class="pt-4 pb-0 sm:pb-4 space-y-4">

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
          <TransitionGroup name="moh-post" tag="div" class="space-y-0">
            <template v-for="item in interleaved" :key="item.kind === 'user' ? `u-${item.user.id}` : `p-${item.post.id}`">
              <AppUserRow
                v-if="item.kind === 'user'"
                :user="item.user"
                :show-follow-button="true"
              />
              <AppFeedPostRow
                v-else
                :post="item.post"
                @deleted="onSearchPostDeleted"
                @edited="onSearchPostEdited"
              />
            </template>
          </TransitionGroup>
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

      <!-- Topic mode (set by clicking a topic chip) -->
      <template v-else-if="activeTopic">
        <div class="px-4 flex items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="text-sm font-semibold text-gray-900 dark:text-gray-50 truncate">
              Topic: {{ activeTopic }}
            </div>
            <div class="text-xs moh-text-muted">
              Showing posts matching this topic.
            </div>
          </div>
          <div class="shrink-0 flex items-center gap-2">
            <Button
              v-if="isAuthed"
              :label="isActiveTopicFollowed ? 'Unfollow' : 'Follow'"
              :severity="isActiveTopicFollowed ? 'secondary' : 'primary'"
              text
              :loading="followBusy"
              :disabled="followBusy"
              @click="toggleFollowActiveTopic"
            />
            <Button
              label="Clear"
              text
              severity="secondary"
              @click="clearTopic"
            />
          </div>
        </div>

        <div v-if="topicError" class="px-4">
          <AppInlineAlert severity="warning">
            {{ topicError }}
          </AppInlineAlert>
        </div>

        <div v-else-if="topicLoading && topicPosts.length === 0" class="flex justify-center py-12">
          <AppLogoLoader />
        </div>

        <div v-else-if="topicPosts.length > 0" class="space-y-0">
          <AppFeedPostRow
            v-for="p in topicPosts"
            :key="p.id"
            :post="p"
          />
          <div v-if="topicLoadingMore" class="flex justify-center py-6 px-4">
            <AppLogoLoader />
          </div>
          <div v-else-if="topicHasMore" class="flex justify-center py-4 px-4">
            <Button
              label="Load more"
              severity="secondary"
              :loading="topicLoadingMore"
              :disabled="topicLoadingMore"
              @click="loadMoreTopic"
            />
          </div>
        </div>

        <div v-else class="px-4">
          <div class="rounded-xl border moh-border bg-gray-50/50 dark:bg-zinc-900/30 px-4 py-6 text-center">
            <p class="text-sm moh-text-muted">
              No posts found for this topic.
            </p>
          </div>
        </div>
      </template>

      <!-- Category mode (set by clicking a category chip) -->
      <template v-else-if="activeCategory">
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
                class="h-9 px-3 shrink-0 rounded-full border moh-border bg-white/60 dark:bg-zinc-900/40 text-sm text-gray-800 dark:text-gray-100 hover:bg-white dark:hover:bg-zinc-900 transition whitespace-nowrap"
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

        <div v-else-if="categoryLoading && categoryPosts.length === 0" class="flex justify-center py-12">
          <AppLogoLoader />
        </div>

        <div v-else-if="categoryPosts.length > 0" class="space-y-0">
          <AppFeedPostRow
            v-for="p in categoryPosts"
            :key="p.id"
            :post="p"
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

      <!-- No (valid) search query: discovery sections -->
      <template v-else>
        <div v-if="discoverError" class="px-4">
          <AppInlineAlert severity="warning">
            {{ discoverError }}
          </AppInlineAlert>
        </div>

        <!-- Followed topics -->
        <section v-if="isAuthed && followedTopicsUi.length > 0" class="space-y-3">
          <h2 class="px-4 text-sm font-semibold text-gray-900 dark:text-gray-50">
            Followed topics
          </h2>
          <AppHorizontalScroller scroller-class="no-scrollbar px-4">
            <div class="flex gap-2 pb-2">
              <button
                v-for="t in followedTopicsUi"
                :key="`ft-${t.value}`"
                type="button"
                class="h-9 px-3 shrink-0 rounded-full border moh-border bg-white/60 dark:bg-zinc-900/40 text-sm text-gray-800 dark:text-gray-100 hover:bg-white dark:hover:bg-zinc-900 transition whitespace-nowrap"
                @click="selectTopic(t.value)"
              >
                {{ t.label }}
              </button>
            </div>
          </AppHorizontalScroller>
        </section>

        <!-- Categories -->
        <section v-if="displayCategories.length > 0" class="space-y-3">
          <h2 class="px-4 text-sm font-semibold text-gray-900 dark:text-gray-50">
            Categories
          </h2>
          <div class="px-4">
            <div class="flex items-stretch gap-3">
              <div class="min-w-0 flex-1">
                <AppHorizontalScroller scroller-class="no-scrollbar">
                  <div class="flex gap-2 pb-2">
                    <button
                      v-for="c in displayCategories"
                      :key="c.value"
                      type="button"
                      class="h-9 px-3 shrink-0 rounded-full border moh-border bg-white/60 dark:bg-zinc-900/40 text-sm text-gray-800 dark:text-gray-100 hover:bg-white dark:hover:bg-zinc-900 transition whitespace-nowrap"
                      @click="selectCategory(c.value)"
                    >
                      {{ c.label }}
                    </button>
                  </div>
                </AppHorizontalScroller>
              </div>
              <div
                v-if="isAuthed"
                class="w-px self-stretch bg-gray-200/80 dark:bg-zinc-700/70"
                aria-hidden="true"
              />
              <Button
                v-if="isAuthed"
                type="button"
                label="Edit"
                text
                severity="secondary"
                class="shrink-0 self-start"
                @click="openEditInterests"
              >
                <template #icon>
                  <Icon name="tabler:pencil" aria-hidden="true" />
                </template>
              </Button>
            </div>
          </div>
        </section>

        <!-- Featured -->
        <section v-if="discoverLoading || featuredPosts.length > 0" class="space-y-3">
          <div class="px-4 flex items-center justify-between gap-3">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-50">
              Featured
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

          <div v-if="discoverLoading && featuredPosts.length === 0" class="flex justify-center py-6">
            <AppLogoLoader />
          </div>

          <div v-else-if="featuredPosts.length > 0" class="space-y-0">
            <AppFeedPostRow
              v-for="p in featuredPosts"
              :key="p.id"
              :post="p"
            />
          </div>
        </section>

        <!-- Online now -->
        <section v-if="onlineUsers.length > 0" class="space-y-3">
          <h2 class="px-4 text-sm font-semibold text-gray-900 dark:text-gray-50">
            Online now
          </h2>
          <AppHorizontalScroller scroller-class="no-scrollbar px-4">
            <div class="flex gap-3 pb-2">
              <AppUserMiniCard
                v-for="u in onlineUsers.slice(0, 16)"
                :key="u.id"
                :user="u"
                @followed="removeDiscoverUser(u.id)"
              />
            </div>
          </AppHorizontalScroller>
        </section>

        <template v-if="isAuthed">
          <!-- People to follow -->
          <section v-if="discoverLoading || recommendedUsers.length > 0" class="space-y-3">
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
          </section>

          <!-- Trending from recommended -->
          <section v-if="discoverLoading || trendingPosts.length > 0" class="space-y-3">
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
                Use the search bar to find people and posts.
              </p>
            </div>
          </div>
        </template>
      </template>
    </div>
  </div>
  <AppModal
    v-model="editInterestsOpen"
    title="Edit interests"
    max-width-class="max-w-[46rem]"
    :dismissable-mask="true"
  >
    <div class="space-y-3">
      <AppInterestsPicker
        v-model="editInterestsInput"
        :disabled="editInterestsSaving"
        label=""
        helper-right=""
        helper-bottom="Used for discovery and recommendations."
        description="Search, pick from suggestions, or add your own."
      />
      <AppInlineAlert v-if="editInterestsError" severity="danger">
        {{ editInterestsError }}
      </AppInlineAlert>
    </div>
    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <Button label="Cancel" severity="secondary" text :disabled="editInterestsSaving" @click="editInterestsOpen = false" />
        <Button label="Save" :loading="editInterestsSaving" :disabled="editInterestsSaving" @click="saveEditInterests">
          <template #icon>
            <Icon name="tabler:check" aria-hidden="true" />
          </template>
        </Button>
      </div>
    </template>
  </AppModal>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { FeedPost, SearchUserResult, SearchMixedResult, SearchMixedPagination, GetPostsData, GetCategoryPostsData, GetCategoryTopicsData, Topic, TopicCategory } from '~/types/api'
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
const { isAuthed, user: authUser } = useAuth()

const searchInputRef = ref<{ $el: HTMLInputElement } | null>(null)

function onGlobalKeyDown(e: KeyboardEvent) {
  if (e.key !== '/') return
  const target = e.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
  e.preventDefault()
  searchInputRef.value?.$el?.focus()
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeyDown)
})

function normalizeQueryParam(v: unknown): string {
  return String(v ?? '').trim()
}

function getRouteQ(): string {
  return normalizeQueryParam(route.query.q)
}

const searchQuery = ref(getRouteQ())
const searchQueryTrimmed = computed(() => searchQuery.value.trim())
const isSearching = computed(() => searchQueryTrimmed.value.length >= 2)

const activeTopic = computed(() => normalizeQueryParam(route.query.topic))
const activeCategory = computed(() => normalizeQueryParam(route.query.category))

const {
  featuredPosts,
  categories,
  followedTopics,
  onlineUsers,
  recommendedUsers,
  newestUsers,
  trendingPosts,
  loading: discoverLoading,
  error: discoverError,
  refresh: refreshDiscover,
  removeUserById: removeDiscoverUser,
} = useExploreRecommendations({
  // Logged out Explore should not attempt any discovery calls.
  enabled: computed(() => !isSearching.value),
  isAuthed: computed(() => isAuthed.value),
})

const { labelByValue: topicLabelByValue, load: loadTopicOptions } = useTopicOptions()
void loadTopicOptions().catch(() => {})

const displayCategories = computed(() => {
  const raw = (categories.value ?? []) as TopicCategory[]
  const mapped = raw
    .map((c) => ({
      value: c.category,
      label: c.label,
      score: c.score ?? 0,
      postCount: c.postCount ?? 0,
    }))
    .filter((c) => Boolean(c.value))
  mapped.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (b.postCount ?? 0) - (a.postCount ?? 0) || a.label.localeCompare(b.label))
  return mapped.slice(0, 7)
})

const followedTopicsUi = computed(() => {
  const raw = (followedTopics.value ?? []) as Topic[]
  const mapped = raw
    .map((t) => ({
      value: t.topic,
      label: topicLabelByValue.value.get(t.topic) ?? t.topic,
      score: t.score ?? 0,
    }))
    .filter((t) => Boolean(t.value))
  mapped.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.label.localeCompare(b.label))
  return mapped.slice(0, 20)
})

const editInterestsOpen = ref(false)
const editInterestsInput = ref<string[]>([])
const editInterestsSaving = ref(false)
const editInterestsError = ref<string | null>(null)

function openEditInterests() {
  editInterestsInput.value = Array.isArray(authUser.value?.interests) ? [...authUser.value!.interests] : []
  editInterestsError.value = null
  editInterestsOpen.value = true
}

function normalizeInterests(vals: string[]): string[] {
  return (vals ?? [])
    .map((s) => String(s ?? '').trim())
    .filter(Boolean)
    .slice(0, 30)
}

async function saveEditInterests() {
  if (editInterestsSaving.value) return
  editInterestsSaving.value = true
  editInterestsError.value = null
  try {
    const result = await apiFetch<{ user: import('~/composables/useAuth').AuthUser }>('/users/me/profile', {
      method: 'PATCH',
      body: { interests: normalizeInterests(editInterestsInput.value) },
    })
    authUser.value = result.data.user ?? authUser.value
    editInterestsOpen.value = false
    await Promise.resolve(refreshDiscover())
  } catch (e: unknown) {
    editInterestsError.value = getApiErrorMessage(e) || 'Failed to save interests.'
  } finally {
    editInterestsSaving.value = false
  }
}

const isActiveTopicFollowed = computed(() => {
  const t = activeTopic.value
  if (!t) return false
  return Boolean((followedTopics.value ?? []).some((x) => x.topic === t))
})

const followBusy = ref(false)
async function toggleFollowActiveTopic() {
  const t = activeTopic.value
  if (!t || followBusy.value) return
  followBusy.value = true
  try {
    if (isActiveTopicFollowed.value) {
      await apiFetch(`/topics/${encodeURIComponent(t)}/follow`, { method: 'DELETE' })
    } else {
      await apiFetch(`/topics/${encodeURIComponent(t)}/follow`, { method: 'POST' })
    }
    // Refresh discovery topics + followed list (cheap enough; keeps viewerFollows accurate).
    void refreshDiscover()
  } catch {
    // Soft-fail: ignore (user can retry; explore should not hard error).
  } finally {
    followBusy.value = false
  }
}

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

function selectTopic(topic: string) {
  const t = String(topic ?? '').trim()
  if (!t) return
  // Topic click: set a dedicated topic mode so we fetch topic-specific posts (not generic search).
  const nextQuery: Record<string, any> = { ...route.query }
  delete nextQuery.q
  // If the user is explicitly selecting a topic (not coming from category view),
  // drop category so the UI doesn't stay "pinned" to an unrelated category.
  if (!activeCategory.value) delete nextQuery.category
  nextQuery.topic = t
  // Use push so browser Back returns to Explore (not previous page).
  Promise.resolve(router.push({ path: route.path, query: nextQuery })).catch(() => {})
}

function selectCategory(category: string) {
  const c = String(category ?? '').trim()
  if (!c) return
  const nextQuery: Record<string, any> = { ...route.query }
  delete nextQuery.q
  delete nextQuery.topic
  nextQuery.category = c
  Promise.resolve(router.push({ path: route.path, query: nextQuery })).catch(() => {})
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

function dedupeById<T extends { id?: string | null }>(list: T[]): T[] {
  const out: T[] = []
  const seen = new Set<string>()
  for (const item of list) {
    const id = String(item?.id ?? '').trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(item)
  }
  return out
}

function onSearchPostDeleted(id: string) {
  const pid = String(id ?? '').trim()
  if (!pid) return
  // Immediately remove from search results so the list feels responsive.
  posts.value = posts.value.filter((p) => p.id !== pid)
}

function onSearchPostEdited(payload: { id: string; post: import('~/types/api').FeedPost }) {
  const pid = String(payload?.id ?? '').trim()
  if (!pid) return
  posts.value = posts.value.map((p) => (p.id === pid ? payload.post : p))
}

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
      users.value = dedupeById([...users.value, ...newUsers])
      posts.value = dedupeById([...posts.value, ...newPosts])
    } else {
      users.value = dedupeById(newUsers)
      posts.value = dedupeById(newPosts)
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

// Topic feed (uses API endpoint specifically for topics)
const topicPosts = ref<FeedPost[]>([])
const topicNextCursor = ref<string | null>(null)
const topicLoading = ref(false)
const topicLoadingMore = ref(false)
const topicError = ref<string | null>(null)

const topicHasMore = computed(() => topicNextCursor.value !== null)

function clearTopic() {
  const nextQuery: Record<string, any> = { ...route.query }
  delete nextQuery.topic
  // Use push so browser Back returns to topic view if desired.
  Promise.resolve(router.push({ path: route.path, query: nextQuery })).catch(() => {})
}

// Category feed (uses API endpoint specifically for categories)
const categoryTopics = ref<Topic[]>([])
const categoryTopicsLoading = ref(false)
const categoryPosts = ref<FeedPost[]>([])
const categoryNextCursor = ref<string | null>(null)
const categoryLoading = ref(false)
const categoryLoadingMore = ref(false)
const categoryError = ref<string | null>(null)

const categoryHasMore = computed(() => categoryNextCursor.value !== null)

const activeCategoryLabel = computed(() => {
  const key = activeCategory.value
  if (!key) return null
  const row = (categories.value ?? []).find((c) => c.category === key)
  return row?.label ?? null
})

const categoryTopicsUi = computed(() => {
  const raw = (categoryTopics.value ?? []) as Topic[]
  return raw
    .filter((t) => (t.postCount ?? 0) > 0)
    .sort((a, b) => (b.postCount ?? 0) - (a.postCount ?? 0) || (b.score ?? 0) - (a.score ?? 0) || a.topic.localeCompare(b.topic))
    .slice(0, 24)
    .map((t) => ({
      value: t.topic,
      label: topicLabelByValue.value.get(t.topic) ?? t.topic,
    }))
})

function clearCategory() {
  const nextQuery: Record<string, any> = { ...route.query }
  delete nextQuery.category
  Promise.resolve(router.push({ path: route.path, query: nextQuery })).catch(() => {})
}

function selectTopicInCategory(topic: string) {
  const t = String(topic ?? '').trim()
  if (!t) return
  const nextQuery: Record<string, any> = { ...route.query }
  delete nextQuery.q
  nextQuery.topic = t
  // Keep category pinned for breadcrumb/back behavior.
  if (!nextQuery.category && activeCategory.value) nextQuery.category = activeCategory.value
  Promise.resolve(router.push({ path: route.path, query: nextQuery })).catch(() => {})
}

async function fetchCategoryTopics() {
  const c = activeCategory.value
  if (!c) return
  if (categoryTopicsLoading.value) return
  categoryTopicsLoading.value = true
  try {
    const res = await apiFetch<GetCategoryTopicsData>(`/topics/categories/${encodeURIComponent(c)}/topics`, { method: 'GET' })
    categoryTopics.value = (res.data ?? []) as Topic[]
  } catch {
    categoryTopics.value = []
  } finally {
    categoryTopicsLoading.value = false
  }
}

async function fetchCategoryPage(params: { append: boolean }) {
  const c = activeCategory.value
  if (!c) return
  const isAppend = params.append
  if (isAppend) categoryLoadingMore.value = true
  else categoryLoading.value = true
  categoryError.value = null
  try {
    const query: Record<string, string> = { limit: '30' }
    if (isAppend && categoryNextCursor.value) query.cursor = categoryNextCursor.value
    const res = await apiFetch<GetCategoryPostsData>(`/topics/categories/${encodeURIComponent(c)}/posts`, { method: 'GET', query })
    const data = (res.data ?? []) as FeedPost[]
    const next = (res.pagination as { nextCursor?: string | null } | undefined)?.nextCursor ?? null
    if (isAppend) categoryPosts.value = [...categoryPosts.value, ...data]
    else categoryPosts.value = data
    categoryNextCursor.value = next
  } catch (e: unknown) {
    categoryError.value = getApiErrorMessage(e) || 'Failed to load category posts.'
    if (!isAppend) {
      categoryPosts.value = []
      categoryNextCursor.value = null
    }
  } finally {
    categoryLoading.value = false
    categoryLoadingMore.value = false
  }
}

async function loadMoreCategory() {
  if (categoryLoadingMore.value || !categoryNextCursor.value) return
  await fetchCategoryPage({ append: true })
}

async function fetchTopicPage(params: { append: boolean }) {
  const topic = activeTopic.value
  if (!topic) return
  const isAppend = params.append
  if (isAppend) topicLoadingMore.value = true
  else topicLoading.value = true
  topicError.value = null

  try {
    const query: Record<string, string> = { limit: '30' }
    if (isAppend && topicNextCursor.value) query.cursor = topicNextCursor.value

    const res = await apiFetch<GetPostsData>(`/topics/${encodeURIComponent(topic)}/posts`, {
      method: 'GET',
      query,
    })

    const data = (res.data ?? []) as FeedPost[]
    const next = (res.pagination as { nextCursor?: string | null } | undefined)?.nextCursor ?? null

    if (isAppend) topicPosts.value = [...topicPosts.value, ...data]
    else topicPosts.value = data
    topicNextCursor.value = next
  } catch (e: unknown) {
    topicError.value = getApiErrorMessage(e) || 'Failed to load topic posts.'
    if (!isAppend) {
      topicPosts.value = []
      topicNextCursor.value = null
    }
  } finally {
    topicLoading.value = false
    topicLoadingMore.value = false
  }
}

async function loadMoreTopic() {
  if (topicLoadingMore.value || !topicNextCursor.value) return
  await fetchTopicPage({ append: true })
}

watch(
  () => route.query.topic,
  (t) => {
    const topic = normalizeQueryParam(t)
    if (!topic) {
      topicPosts.value = []
      topicNextCursor.value = null
      topicError.value = null
      return
    }
    // Clear search UI when switching to topic mode
    if (searchQuery.value) searchQuery.value = ''
    clearSearchResults()
    void fetchTopicPage({ append: false })
  },
  { immediate: true },
)

watch(
  () => route.query.category,
  (cRaw) => {
    const c = normalizeQueryParam(cRaw)
    if (!c) {
      categoryTopics.value = []
      categoryPosts.value = []
      categoryNextCursor.value = null
      categoryError.value = null
      return
    }
    // Clear search UI when switching to category mode
    if (searchQuery.value) searchQuery.value = ''
    clearSearchResults()
    void fetchCategoryTopics()
    void fetchCategoryPage({ append: false })
  },
  { immediate: true },
)
</script>
