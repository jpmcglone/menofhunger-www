<template>
  <AppPageContent bottom="standard" class="relative">
    <AppRefreshIndicator :loading="(discoverLoading && !discoverInitialLoading) || (topicLoading && !topicLoadingInitial) || (categoryLoading && !categoryLoadingInitial)" />
  <div class="w-full explore-page">
    <!-- Sticky search bar (replaces layout title bar) -->
    <div class="sticky top-[var(--moh-title-bar-height,0px)] z-10 border-b moh-border moh-frosted">
      <div class="px-4 py-4 sm:px-6 sm:py-6 space-y-3">
        <h1 class="text-[28px] leading-9 font-semibold moh-text">Explore</h1>
        <p v-if="!isSearching && !searchActive" class="text-[15px] moh-text-muted">Find your people. Find your next conversation.</p>
        <div class="flex items-center gap-2">
          <AppSearchTypeahead
ref="searchInputRef" v-model="searchQuery" class="min-w-0 flex-1"
            placeholder="Search people, groups, posts…" pill inline-recents
            @focus="beginSearch" @submit="flushDebounceAndSearch" />
          <Button v-if="isSearching || searchActive" label="Cancel" text severity="secondary" @click="cancelSearch" />
        </div>
      </div>
      <nav v-if="isSearching" aria-label="Search categories" class="flex overflow-x-auto no-scrollbar">
        <NuxtLink
v-for="tab in searchTabs" :key="tab.key"
          :to="{ path: route.path, query: { ...route.query, tab: tab.key === 'all' ? undefined : tab.key } }"
          :aria-current="searchTab === tab.key ? 'page' : undefined"
          class="min-h-12 shrink-0 px-5 py-3 text-sm font-semibold border-b-[3px] moh-focus"
          :class="searchTab === tab.key ? 'border-[var(--moh-marv)] text-[var(--moh-marv)]' : 'border-transparent moh-text-muted'">
          {{ tab.label }}
        </NuxtLink>
      </nav>
    </div>

    <div class="pt-4 pb-0 sm:pb-4 space-y-4">

      <!-- Cashtag stock card: identity + TradingView quote/chart + timeframe · no trade -->
      <AppCashtagStockCard
        v-if="cashtagHeaderSymbol"
        :symbol="cashtagHeaderSymbol"
        :name="cashtagName"
      />

      <!-- Min length hint -->
      <div v-if="searchQueryTrimmed && searchQueryTrimmed.length < 2" class="px-4">
        <div class="rounded-xl border moh-border bg-gray-50/50 dark:bg-zinc-900/30 p-4">
          <p class="text-sm moh-text-muted">
            Enter at least 2 characters to search.
          </p>
        </div>
      </div>

    <!-- Search results -->
      <template v-if="isSearching && searchTab === 'board'">
        <AppBoardSearchResults :query="committedSearchQuery" />
      </template>
      <template v-else-if="isSearching">
        <AppExploreSearchResults
:users="users" :groups="searchGroups" :posts="posts" :articles="articles"
          :category="searchTab" :query="searchQueryTrimmed" :loading="loading" :error="searchError"
          :searched="searchedOnce" :has-more="hasMore" :loading-more="loadingMore"
          :gated-count="gatedResultCount" :joining-id="joinExploreGroupId" :topics="tagSuggestions"
          @category="selectSearchTab" @retry="exploreSearch.fetchPage({ append: users.length + posts.length + articles.length + searchGroups.length > 0 })" @more="loadMore"
          @clear="clearSearch" @join="joinExploreGroup" @deleted="onSearchPostDeleted" @edited="onSearchPostEdited" />
        <div v-if="isCheckinQuery && canShowSearchCheckinHint" class="px-4 py-3">
          <AppCheckinPromptContext :prompt="displayCheckinPromptText" compact />
          <Button
:label="hasCheckedInToday ? 'See answers' : 'Answer'" text
            @click="hasCheckedInToday ? goToCheckinsFeed() : openCheckinComposer()" />
        </div>
      </template>
      <AppExploreRecentSearches
v-else-if="searchActive && !activeTopic && !activeCategory"
        @submit="flushDebounceAndSearch" />

      <!-- Topic mode (set by clicking a topic chip) -->
      <template v-else-if="activeTopic">
        <AppExplorePageTopic />
      </template>

      <!-- Category mode (set by clicking a category chip) -->
      <template v-else-if="activeCategory">
        <AppExplorePageCategory />
      </template>

      <!-- No (valid) search query: discovery sections -->
      <template v-else>
        <AppExplorePageDiscoverFeatured />

        <AppExplorePageDiscoverPeople />
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
import AppCheckinPromptContext from '~/components/app/dialogs/CheckinPromptContext.vue'
import { useExplorePage } from '~/composables/pages/explore/useExplorePage'

definePageMeta({
  layout: 'app',
  title: 'Explore',
  hideTopBar: true,
})

const {
  route,
  searchInputRef,
  searchQuery,
  searchQueryTrimmed,
  committedSearchQuery,
  isSearching,
  searchActive,
  searchTabs,
  searchTab,
  selectSearchTab,
  beginSearch,
  activeTopic,
  activeCategory,
  discoverLoading,
  discoverInitialLoading,
  joinExploreGroupId,
  hasCheckedInToday,
  displayCheckinPromptText,
  isCheckinQuery,
  cashtagHeaderSymbol,
  cashtagName,
  editInterestsOpen,
  editInterestsInput,
  editInterestsSaving,
  editInterestsError,
  saveEditInterests,
  clearSearch,
  cancelSearch,
  joinExploreGroup,
  flushDebounceAndSearch,
  exploreSearch,
  users,
  articles,
  posts,
  searchGroups,
  loading,
  loadingMore,
  searchError,
  searchedOnce,
  tagSuggestions,
  gatedResultCount,
  hasMore,
  loadMore,
  onSearchPostDeleted,
  onSearchPostEdited,
  topicLoading,
  topicLoadingInitial,
  categoryLoading,
  categoryLoadingInitial,
  openCheckinComposer,
  goToCheckinsFeed,
  canShowSearchCheckinHint,
} = useExplorePage()
</script>

<style scoped>
.explore-page :deep(section > h2), .explore-page :deep(section > div > h2) { font-size: 20px; line-height: 28px; font-weight: 600; }
</style>
