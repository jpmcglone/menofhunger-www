<template>
  <AppPageContent bottom="standard" class="relative">
    <AppRefreshIndicator :loading="(discoverLoading && !discoverInitialLoading) || (topicLoading && !topicLoadingInitial) || (categoryLoading && !categoryLoadingInitial)" />
  <div class="w-full explore-page">
    <!-- Sticky search bar (replaces layout title bar) -->
    <div class="sticky top-0 z-10 border-b moh-border moh-frosted">
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
        <AppBoardSearchResults :query="searchQueryTrimmed" />
      </template>
      <template v-else-if="isSearching">
        <AppExploreSearchResults
:users="users" :groups="searchGroups" :posts="posts" :articles="articles"
          :category="searchTab" :query="searchQueryTrimmed" :loading="loading" :error="searchError"
          :searched="searchedOnce" :has-more="hasMore" :loading-more="loadingMore"
          :gated-count="gatedResultCount" :joining-id="joinExploreGroupId" :topics="tagSuggestions"
          @category="selectSearchTab" @retry="fetchPage({ append: users.length + posts.length + articles.length + searchGroups.length > 0 })" @more="loadMore"
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

        <div v-else-if="topicLoadingInitial" class="flex justify-center py-12">
          <AppLogoLoader />
        </div>

        <div v-else-if="topicPosts.length > 0" class="space-y-0">
          <AppFeedPostRow
            v-for="p in topicPosts"
            :key="p.id"
            :post="p"
            collapse-ancestors
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
                class="min-h-11 px-4 shrink-0 rounded-full border moh-border bg-white/60 dark:bg-zinc-900/40 text-sm text-gray-800 dark:text-gray-100 hover:bg-white dark:hover:bg-zinc-900 transition whitespace-nowrap"
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

        <div v-else-if="categoryLoadingInitial" class="flex justify-center py-12">
          <AppLogoLoader />
        </div>

        <div v-else-if="categoryPosts.length > 0" class="space-y-0">
          <AppFeedPostRow
            v-for="p in categoryPosts"
            :key="p.id"
            :post="p"
            collapse-ancestors
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
        <div v-if="discoverError" class="px-4 space-y-3">
          <AppInlineAlert severity="warning">
            {{ discoverError }}
          </AppInlineAlert>
          <div class="flex justify-center">
            <Button
              label="Try again"
              severity="secondary"
              rounded
              :loading="discoverLoading"
              :disabled="discoverLoading"
              @click="refreshDiscover"
            />
          </div>
        </div>

        <div v-else-if="showDiscoverEmpty" class="px-4">
          <div class="rounded-xl border moh-border bg-gray-50/50 dark:bg-zinc-900/30 px-4 py-6 text-center">
            <p class="text-sm font-medium moh-text">
              Nothing to discover right now.
            </p>
            <p class="mt-1 text-sm moh-text-muted">
              Search for people, groups, and posts above.
            </p>
            <div v-if="!isAuthed" class="mt-4 flex justify-center">
              <Button as="NuxtLink" to="/login" label="Join now" rounded />
            </div>
          </div>
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
                class="min-h-11 px-4 shrink-0 rounded-full border moh-border bg-white/60 dark:bg-zinc-900/40 text-sm text-gray-800 dark:text-gray-100 hover:bg-white dark:hover:bg-zinc-900 transition whitespace-nowrap"
                @click="selectTopic(t.value)"
              >
                {{ t.label }}
              </button>
            </div>
          </AppHorizontalScroller>
        </section>

        <!-- Groups (featured + largest) -->
        <section v-if="discoverInitialLoading || exploreGroups.length > 0" class="space-y-3">
          <div class="px-4 flex items-center justify-between gap-3">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-50">
              Find your groups
            </h2>
            <NuxtLink
              v-if="isAuthed"
              to="/groups/explore"
              class="text-sm font-medium hover:underline underline-offset-2 text-[var(--p-primary-color)] moh-focus"
            >
              Browse groups
            </NuxtLink>
          </div>
          <div v-if="discoverInitialLoading && exploreGroups.length === 0" class="flex justify-center py-6">
            <AppLogoLoader />
          </div>
          <AppHorizontalScroller v-else-if="exploreGroups.length > 0" scroller-class="no-scrollbar px-4">
            <div class="flex gap-3 pb-2">
              <div
                v-for="g in exploreGroups"
                :key="`eg-${g.id}`"
                class="w-[min(100vw-2rem,22rem)] max-w-[22rem] shrink-0"
              >
                <AppGroupPreviewCard
                  :preview="shellToGroupPreview(g)" compact
                  :show-join="isAuthed"
                  :join-busy="joinExploreGroupId === g.id"
                  @join="joinExploreGroup(g)"
                />
              </div>
            </div>
          </AppHorizontalScroller>
        </section>

          <!-- People to follow -->
          <section v-if="isAuthed && (discoverInitialLoading || recommendedUsers.length > 0)" class="space-y-3">
            <div class="px-4 flex items-center justify-between gap-3">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-50">
                People to follow
              </h2>
              <Button
                label="Refresh"
                text
                severity="secondary"
                :disabled="discoverLoading"
                @click="refreshDiscover"
              />
            </div>

            <div v-if="discoverInitialLoading && recommendedUsers.length === 0" class="flex justify-center py-6">
              <AppLogoLoader />
            </div>

            <div v-else class="moh-divide">
              <AppUserRow v-for="u in recommendedUsers" :key="u.id" :user="u" show-follow-button discovery />
            </div>
          </section>

        <!-- Trending hashtags strip -->
        <section v-if="trendingHashtags.length > 0" class="space-y-2.5">
          <h2 class="px-4 text-sm font-semibold text-gray-900 dark:text-gray-50">
            Trending topics
          </h2>
          <AppHorizontalScroller scroller-class="no-scrollbar px-4">
            <div class="flex gap-2 pb-2">
              <NuxtLink
                v-for="tag in trendingHashtags.slice(0, 12)"
                :key="tag.value"
                :to="`/explore?q=${encodeURIComponent('#' + tag.value)}`"
                class="min-h-11 px-4 shrink-0 inline-flex items-center gap-1.5 rounded-full border moh-border bg-white/60 dark:bg-zinc-900/40 text-sm text-gray-800 dark:text-gray-100 hover:bg-white dark:hover:bg-zinc-900 transition whitespace-nowrap"
              >
                <span class="text-[var(--p-primary-color)]">#</span>{{ tag.label }}
              </NuxtLink>
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
                      class="min-h-11 px-4 shrink-0 rounded-full border moh-border bg-white/60 dark:bg-zinc-900/40 text-sm text-gray-800 dark:text-gray-100 hover:bg-white dark:hover:bg-zinc-900 transition whitespace-nowrap"
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
        <section v-if="discoverInitialLoading || featuredPosts.length > 0" class="space-y-3">
          <div class="px-4 flex items-center justify-between gap-3">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-50">
              Conversations worth joining
            </h2>
            <Button
              label="Refresh"
              text
              severity="secondary"
              :disabled="discoverLoading"
              @click="refreshDiscover"
            />
          </div>

          <div v-if="discoverInitialLoading && featuredPosts.length === 0" class="flex justify-center py-6">
            <AppLogoLoader />
          </div>

          <div v-else-if="featuredPosts.length > 0" class="space-y-0">
            <AppFeedPostRow
              v-for="p in featuredPosts"
              :key="p.id"
              :post="p"
              collapse-ancestors
            />
          </div>
        </section>

        <AppBoardExploreSection />

        <!-- Trending articles -->
        <section v-if="discoverInitialLoading || trendingArticles.length > 0" class="space-y-3">
          <div class="px-4 flex items-center justify-between gap-3">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-50">
              Worth a read
            </h2>
            <NuxtLink
              to="/articles?sort=trending"
              class="text-sm font-medium hover:underline underline-offset-2 text-[var(--p-primary-color)] moh-focus"
            >
              Browse all
            </NuxtLink>
          </div>

          <div v-if="discoverInitialLoading && trendingArticles.length === 0" class="flex justify-center py-6">
            <AppLogoLoader />
          </div>

          <div v-else-if="trendingArticles.length > 0" class="space-y-0">
            <AppArticleListCard
              v-for="article in trendingArticles"
              :key="article.id"
              :article="article"
            />
          </div>
        </section>

        <section v-if="shouldRenderCheckinSection" class="space-y-3">
          <h2 class="px-4 text-sm font-semibold text-gray-900 dark:text-gray-50">
            Daily check-in
          </h2>
          <ClientOnly>
          <AppFeedDailyCheckinCard
            v-if="showExploreCheckinCard"
            :prompt="displayCheckinPromptText"
            :streak="displayCheckinStreak"
            :has-checked-in-today="hasCheckedInToday"
            :error="checkinError"
            @check-in="openCheckinComposer"
          />
          <div v-else-if="checkinLoading" class="flex justify-center py-6">
            <AppLogoLoader />
          </div>
          </ClientOnly>
        </section>

        <!-- Verify-to-check-in CTA for authed-but-unverified users. Check-ins are
             verified-only, so we drive verification instead of the live card.
             Client-only (ClientOnly) so SSR stays empty and avoids hydration mismatch. -->
        <ClientOnly>
          <section v-if="didAttempt && isAuthed && !isPageAccount && !canAccessCheckins" class="space-y-3">
            <h2 class="px-4 text-sm font-semibold text-gray-900 dark:text-gray-50">
              Daily check-in
            </h2>
            <AppFeedDailyCheckinHero :prompt="verifyCtaPrompt" verify-cta />
          </section>
        </ClientOnly>

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

        <!-- People on Men of Hunger (logged-out viewers) -->
        <section v-if="!isAuthed && topUsers.length > 0" class="space-y-3">
          <div class="px-4 flex items-center justify-between gap-3">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-50">
              People on Men of Hunger
            </h2>
            <NuxtLink
              to="/login"
              class="text-sm font-medium hover:underline underline-offset-2 text-[var(--p-primary-color)] moh-focus"
            >
              Join to follow
            </NuxtLink>
          </div>
          <AppHorizontalScroller scroller-class="no-scrollbar px-4">
            <div class="flex gap-3 pb-2">
              <AppUserMiniCard
                v-for="u in topUsers.slice(0, 12)"
                :key="u.id"
                :user="u"
              />
            </div>
          </AppHorizontalScroller>
        </section>

        <template v-if="isAuthed">
          <!-- Trending from recommended -->
          <section v-if="discoverInitialLoading || trendingPosts.length > 0" class="space-y-3">
            <h2 class="px-4 text-sm font-semibold text-gray-900 dark:text-gray-50">
              Trending from people you might like
            </h2>

            <div v-if="discoverInitialLoading && trendingPosts.length === 0" class="flex justify-center py-6">
              <AppLogoLoader />
            </div>

            <div v-else-if="trendingPosts.length > 0" class="space-y-0">
              <div class="space-y-0">
                <AppFeedPostRow
                  v-for="p in trendingBefore"
                  :key="p.id"
                  :post="p"
                  collapse-ancestors
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
                  collapse-ancestors
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

          <p v-if="!showDiscoverEmpty" class="px-4 text-sm moh-text-muted">
            Or type in the search bar to search.
          </p>
        </template>

        <!-- Logged out: groups also appear in “Community groups” above; this is the search hint only -->
        <template v-else-if="!showDiscoverEmpty">
          <div class="px-4">
            <div class="rounded-xl border moh-border bg-gray-50/50 dark:bg-zinc-900/30 p-4">
              <p class="text-sm moh-text-muted">
                Use the search bar to find people, groups, and posts. Log in to join groups.
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
import AppCheckinPromptContext from '~/components/app/CheckinPromptContext.vue'
import AppGroupPreviewCard from '~/components/app/groups/AppGroupPreviewCard.vue'
import type {
  Article,
  CashtagResult,
  CommunityGroupShell,
  FeedPost,
  FollowListUser,
  SearchUserResult,
  SearchMixedResult,
  SearchMixedPagination,
  TaxonomyMatch,
  GetPostsData,
  GetCategoryPostsData,
  GetCategoryTopicsData,
  Topic,
  TopicCategory,
  PostVisibility,
  CheckinAllowedVisibility,
} from '~/types/api'
import {
  applyCommunityGroupJoin,
  communityGroupJoinToast,
  shellToGroupPreview,
} from '~/utils/community-group-preview'
import { getApiErrorMessage } from '~/utils/api-error'
import { MOH_OPEN_COMPOSER_KEY } from '~/utils/injection-keys'
import { pickCheckinPrompt } from '~/utils/checkin-prompts'
import type { PostsCallback } from '~/composables/usePresence'

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
const { apiFetch, apiFetchData } = useApiClient()
const { invalidate: invalidateMyGroups } = useMyGroups()
const { isAuthed, user: authUser, patchUser, isPageAccount, canAccessCheckins, didAttempt } = useAuth()
const toast = useAppToast()
const openComposer = inject(MOH_OPEN_COMPOSER_KEY, null)
const { dayKey: etDayKey } = useEasternMidnightRollover()

const searchInputRef = ref<{ focus: () => void; blur: () => void } | null>(null)
const hydrated = ref(false)

function onGlobalKeyDown(e: KeyboardEvent) {
  if (e.key !== '/') return
  const target = e.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
  e.preventDefault()
  searchInputRef.value?.focus()
}

// ─── Realtime: presence online feed + post rows ─────────────────────────────
// Patch onlineUsers in place while the page is open so "Online now" stays
// current without a manual refresh. Post subscriptions keep search / topic /
// category / discover rows live via the global post cache.
const {
  addOnlineFeedCallback,
  removeOnlineFeedCallback,
  subscribeOnlineFeed,
  unsubscribeOnlineFeed,
  addPostsCallback,
  removePostsCallback,
  subscribePosts,
  unsubscribePosts,
} = usePresence()

const onlineFeedCb = {
  onOnline: (payload: { userId: string; user?: FollowListUser }) => {
    const u = payload?.user
    if (!u?.id) return
    if (!onlineUsers.value.some((x) => x.id === u.id)) {
      onlineUsers.value = [u as any, ...onlineUsers.value]
    }
  },
  onOffline: (payload: { userId: string }) => {
    const id = payload?.userId
    if (id) onlineUsers.value = onlineUsers.value.filter((x) => x.id !== id)
  },
}

onMounted(() => {
  hydrated.value = true
  window.addEventListener('keydown', onGlobalKeyDown)
  document.addEventListener('visibilitychange', onVisibilityChange)
  addOnlineFeedCallback(onlineFeedCb)
  subscribeOnlineFeed()
  addPostsCallback(explorePostsCb)
  syncExplorePostSubscriptions()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeyDown)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  removeOnlineFeedCallback(onlineFeedCb)
  unsubscribeOnlineFeed()
  removePostsCallback(explorePostsCb)
  if (exploreSubscribedPostIds.value.length) unsubscribePosts(exploreSubscribedPostIds.value)
  searchFetchSeq++
  if (debounceTimer != null) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
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
const searchActive = ref(false)
const searchTabs = [{ key: 'all', label: 'All' }, { key: 'people', label: 'People' }, { key: 'groups', label: 'Groups' }, { key: 'posts', label: 'Posts' }, { key: 'articles', label: 'Articles' }, { key: 'board', label: 'Board' }]
const searchTab = computed(() => searchTabs.some(t => t.key === route.query.tab) ? String(route.query.tab) : 'all')
function selectSearchTab(tab: string) {
  void router.replace({ query: { ...route.query, tab: tab === 'all' ? undefined : tab } })
}
function beginSearch() { searchActive.value = true }
function clearSearch() { searchQuery.value = ''; clearSearchResults(); searchInputRef.value?.focus() }
function cancelSearch() {
  searchActive.value = false
  searchQuery.value = ''
  clearSearchResults()
  searchInputRef.value?.blur()
  void router.replace({ query: { ...route.query, q: undefined, tab: undefined } })
}



const activeTopic = computed(() => normalizeQueryParam(route.query.topic))
const activeCategory = computed(() => normalizeQueryParam(route.query.category))

const {
  featuredPosts,
  trendingArticles,
  categories,
  followedTopics,
  onlineUsers,
  recommendedUsers,
  newestUsers,
  trendingPosts,
  exploreGroups,
  trendingHashtags,
  topUsers,
  loading: discoverLoading,
  hasLoadedOnce: discoverHasLoadedOnce,
  error: discoverError,
  refresh: refreshDiscover,
  removeUserById: removeDiscoverUser,
} = useExploreRecommendations({
  enabled: computed(() => !isSearching.value),
  isAuthed: computed(() => isAuthed.value),
})
const discoverInitialLoading = computed(() => !discoverHasLoadedOnce.value && !discoverError.value)

const joinExploreGroupId = ref<string | null>(null)

async function joinExploreGroup(g: CommunityGroupShell) {
  if (!isAuthed.value || joinExploreGroupId.value) return
  const id = (g?.id ?? '').trim()
  if (!id) return
  joinExploreGroupId.value = id
  try {
    const result = await apiFetchData<{ ok: boolean; status: 'active' | 'pending' }>(
      `/groups/${encodeURIComponent(id)}/join`,
      { method: 'POST', body: {} },
    )
    const status = result?.status === 'pending' ? 'pending' : 'active'
    exploreGroups.value = exploreGroups.value.map((row) =>
      row.id === id ? applyCommunityGroupJoin(row, status) : row,
    )
    searchGroups.value = searchGroups.value.map((row) =>
      row.id === id ? applyCommunityGroupJoin(row, status) : row,
    )
    invalidateMyGroups()
    toast.push(communityGroupJoinToast(status, g.name))
    void refreshDiscover()
    if (isSearching.value) void fetchPage({ append: false })
  } catch (e: unknown) {
    toast.pushError(e, 'Could not join group.')
  } finally {
    joinExploreGroupId.value = null
  }
}

const {
  state: checkinState,
  loading: checkinLoading,
  error: checkinError,
  refresh: refreshCheckin,
  create: createCheckin,
} = useDailyCheckin()
const { isOpen: checkinWindowOpen } = useCheckinWindow()

const hasCheckedInToday = computed(() => (hydrated.value ? Boolean(checkinState.value?.hasCheckedInToday) : false))

const checkinAllowedVisibilities = computed<CheckinAllowedVisibility[]>(() => {
  const allowed = checkinState.value?.allowedVisibilities ?? []
  return Array.isArray(allowed) ? allowed : []
})

const showExploreCheckinCard = computed(() => {
  if (!isAuthed.value || !canAccessCheckins.value) return false
  if (!checkinState.value) return false
  if (checkinState.value.hasCheckedInToday) return false
  return checkinAllowedVisibilities.value.length > 0
})

const shouldRenderCheckinSection = computed(() => {
  if (!isAuthed.value || !canAccessCheckins.value) return false
  if (checkinLoading.value) return true
  if (!checkinState.value) return false
  if (checkinState.value.hasCheckedInToday) return false
  return showExploreCheckinCard.value || Boolean(checkinError.value)
})

const canOpenCheckinComposer = computed(() => checkinWindowOpen.value && Boolean(openComposer) && checkinAllowedVisibilities.value.length > 0)

const checkinPromptText = computed(() => {
  const p = (checkinState.value?.prompt ?? '').trim()
  return p || 'Write a check-in…'
})

const displayCheckinPromptText = computed(() => (hydrated.value ? checkinPromptText.value : 'Write a check-in…'))
const displayCheckinStreak = computed(() => (hydrated.value ? (checkinState.value?.checkinStreakDays ?? 0) : 0))

// Verify-CTA prompt: unverified users never load /checkins/today, so derive today's
// question client-side (deterministic, mirrors the API) for the CTA headline.
const verifyCtaPrompt = computed(() => {
  const p = (checkinState.value?.prompt ?? '').trim()
  if (p) return p
  return hydrated.value ? pickCheckinPrompt().prompt : 'Write a check-in…'
})

function onVisibilityChange() {
  if (!import.meta.client || document.hidden) return
  if (!isAuthed.value || !canAccessCheckins.value) return
  void refreshCheckin()
}

watch(
  [isAuthed, canAccessCheckins, etDayKey],
  ([authed, canAccess]) => {
    // Unverified users never hit /checkins/today (it 403s); they see the
    // verify-CTA hero instead.
    if (!authed || !canAccess) {
      checkinState.value = null
      return
    }
    void refreshCheckin()
  },
  { immediate: true },
)

async function createCheckinViaComposer(
  snapshot: { prompt: string; dayKey: string },
  body: string,
  _visibility: PostVisibility,
  _media?: unknown[] | null,
  _poll?: unknown,
): Promise<{ id: string } | FeedPost | null> {
  const trimmed = body.trim()
  if (!trimmed) return null
  // Answer always posts verifiedOnly; modal locks that and leaves the session
  // composer preference untouched.
  const res = await createCheckin({ body: trimmed, visibility: 'verifiedOnly', ...snapshot })
  void refreshCheckin()
  return res.post
}

function openCheckinComposer() {
  const current = checkinState.value
  if (!current?.prompt) return
  const snapshot = { prompt: current.prompt, dayKey: current.dayKey }
  if (!checkinWindowOpen.value) return
  if (!canOpenCheckinComposer.value) return
  openComposer?.({
    checkinPrompt: snapshot.prompt,
    allowedVisibilities: ['verifiedOnly'],
    disableMedia: true,
    createPost: (body, visibility) => createCheckinViaComposer(snapshot, body, visibility),
  })
}

function goToCheckinsFeed() {
  void navigateTo('/check-ins/trending')
}

const isCheckinQuery = computed(() => /\b(check[\s-]?in|streak|prompt|daily)\b/i.test(searchQueryTrimmed.value))

// ─── Cashtag header: $SPY · company name ────────────────────────────────────
const cashtagHeaderSymbol = computed(() => {
  const m = searchQueryTrimmed.value.match(/^\$([A-Za-z]{1,6})$/)
  const sym = m?.[1]
  return sym ? sym.toUpperCase() : null
})

const cashtagName = ref<string | null>(null)
watch(cashtagHeaderSymbol, async (sym) => {
  if (!sym) { cashtagName.value = null; return }
  try {
    const result = await apiFetchData<CashtagResult>(`/cashtags/${encodeURIComponent(sym)}`)
    cashtagName.value = result?.name ?? null
  } catch {
    cashtagName.value = null
  }
}, { immediate: true })
const canShowSearchCheckinHint = computed(
  () => Boolean(canAccessCheckins.value && checkinState.value && (hasCheckedInToday.value || canOpenCheckinComposer.value)),
)

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

const showVerifyCheckinCta = computed(
  () => didAttempt.value && isAuthed.value && !isPageAccount.value && !canAccessCheckins.value,
)

const discoverHasContent = computed(() => {
  if (discoverInitialLoading.value) return true
  if (shouldRenderCheckinSection.value) return true
  if (showVerifyCheckinCta.value) return true
  if (followedTopicsUi.value.length > 0) return true
  if (trendingHashtags.value.length > 0) return true
  if (exploreGroups.value.length > 0) return true
  if (displayCategories.value.length > 0) return true
  if (featuredPosts.value.length > 0) return true
  if (trendingArticles.value.length > 0) return true
  if (onlineUsers.value.length > 0) return true
  if (recommendedUsers.value.length > 0) return true
  if (trendingPosts.value.length > 0) return true
  if (newestUsers.value.length > 0) return true
  if (!isAuthed.value && topUsers.value.length > 0) return true
  return false
})

const showDiscoverEmpty = computed(
  () => discoverHasLoadedOnce.value && !discoverInitialLoading.value && !discoverError.value && !discoverHasContent.value,
)

const editInterestsOpen = ref(false)
const editInterestsInput = ref<string[]>([])
const editInterestsSaving = ref(false)
const editInterestsError = ref<string | null>(null)

const { content: exploreRailContent, interestsRequest } = useExploreRail()
watch([followedTopicsUi, displayCategories], () => {
  exploreRailContent.value = {
    topics: followedTopicsUi.value.length ? followedTopicsUi.value : displayCategories.value,
    categories: !followedTopicsUi.value.length,
  }
}, { immediate: true })
watch(interestsRequest, () => openEditInterests())

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
    patchUser(result.data.user)
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
  searchFetchSeq++
  loading.value = false
  loadingMore.value = false
  searchGroups.value = []
  users.value = []
  articles.value = []
  posts.value = []
  tagSuggestions.value = []
  gatedResultCount.value = 0
  nextUserCursor.value = null
  nextArticleCursor.value = null
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
  else { delete nextQuery.q; delete nextQuery.tab }

  isUpdatingRouteFromInput = true
  Promise.resolve(router.replace({ path: route.path, query: nextQuery }))
    .catch(() => {
      // ignore: route updates should never break typing
    })
    .finally(() => {
      isUpdatingRouteFromInput = false
    })
}

function flushDebounceAndSearch(submittedQuery?: string) {
  if (debounceTimer != null) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  // Use the explicitly submitted query (from the typeahead row click) if provided.
  const q = (submittedQuery ?? searchQueryTrimmed.value).trim()
  if (q) searchQuery.value = q
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

function selectCategory(category: string, source?: string) {
  const c = String(category ?? '').trim()
  if (!c) return
  if (source) {
    useNuxtApp().$posthog?.capture('explore_category_selected', { category: c, source })
  }
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
const articles = ref<Article[]>([])
const posts = ref<FeedPost[]>([])
const searchGroups = ref<CommunityGroupShell[]>([])
const nextUserCursor = ref<string | null>(null)
const nextArticleCursor = ref<string | null>(null)
const nextPostCursor = ref<string | null>(null)
const loading = ref(false)
const loadingMore = ref(false)
const searchError = ref<string | null>(null)
const searchedOnce = ref(false)
const activeSearchSource = ref<'explore' | 'external'>('external')
const tagSuggestions = ref<TaxonomyMatch[]>([])
const gatedResultCount = ref(0)
let searchFetchSeq = 0


const hasMore = computed(
  () => searchTab.value === 'groups' ? false
    : searchTab.value === 'people' ? nextUserCursor.value !== null
    : searchTab.value === 'posts' ? nextPostCursor.value !== null
    : searchTab.value === 'articles' ? nextArticleCursor.value !== null
    : nextUserCursor.value !== null || nextArticleCursor.value !== null || nextPostCursor.value !== null,
)

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

function chainIdsForPost(post: FeedPost): string[] {
  const ids: string[] = []
  let p: FeedPost | undefined = post
  while (p?.id) {
    ids.push(p.id)
    p = p.parent
  }
  return ids
}

function removePostFromExploreLists(postId: string) {
  const pid = String(postId ?? '').trim()
  if (!pid) return
  posts.value = posts.value.filter((p) => p.id !== pid)
  topicPosts.value = topicPosts.value.filter((p) => p.id !== pid)
  categoryPosts.value = categoryPosts.value.filter((p) => p.id !== pid)
  featuredPosts.value = featuredPosts.value.filter((p) => p.id !== pid)
  trendingPosts.value = trendingPosts.value.filter((p) => p.id !== pid)
}

const exploreSubscribedPostIds = ref<string[]>([])

const explorePostsCb: PostsCallback = {
  onLiveUpdated: (payload) => {
    const postId = String(payload?.postId ?? '').trim()
    if (!postId) return
    if (payload?.patch?.deletedAt) {
      removePostFromExploreLists(postId)
    }
  },
}

function collectExplorePostIds(): string[] {
  const ids = new Set<string>()
  for (const p of [
    ...posts.value,
    ...topicPosts.value,
    ...categoryPosts.value,
    ...featuredPosts.value,
    ...trendingPosts.value,
  ]) {
    for (const id of chainIdsForPost(p)) ids.add(id)
  }
  return [...ids]
}

function syncExplorePostSubscriptions() {
  const next = collectExplorePostIds()
  const prevSet = new Set(exploreSubscribedPostIds.value)
  const nextSet = new Set(next)
  const toSub = next.filter((id) => !prevSet.has(id))
  const toUnsub = exploreSubscribedPostIds.value.filter((id) => !nextSet.has(id))
  if (toUnsub.length) unsubscribePosts(toUnsub)
  if (toSub.length) subscribePosts(toSub)
  exploreSubscribedPostIds.value = next
}

async function fetchPage(params: { append: boolean }) {
  const seq = ++searchFetchSeq
  const q = searchQueryTrimmed.value
  if (q.length < 2) return

  const isAppend = params.append
  const cursors = { users: nextUserCursor.value, articles: nextArticleCursor.value, posts: nextPostCursor.value }
  if (isAppend) {
    loadingMore.value = true
  } else {
    users.value = []; articles.value = []; posts.value = []; searchGroups.value = []
    loading.value = true
  }
  searchError.value = null
  if (!isAppend) searchedOnce.value = true

  try {
    const query: Record<string, string> = {
      type: 'all',
      source: activeSearchSource.value,
      q,
      limit: '30',
    }
    if (isAppend && nextUserCursor.value) query.userCursor = nextUserCursor.value
    if (isAppend && nextArticleCursor.value) query.articleCursor = nextArticleCursor.value
    if (isAppend && nextPostCursor.value) query.postCursor = nextPostCursor.value

    const res = await apiFetch<SearchMixedResult>('/search', {
      method: 'GET',
      query,
    })
    if (seq !== searchFetchSeq || q !== searchQueryTrimmed.value) return

    const data = res.data as SearchMixedResult
    const pagination = res.pagination as SearchMixedPagination | undefined
    const newUsers = data.users ?? []
    const newArticles = data.articles ?? []
    const newPosts = data.posts ?? []
    const newGroups = data.groups ?? []

    if (isAppend) {
      if (cursors.users) users.value = dedupeById([...users.value, ...newUsers])
      if (cursors.articles) articles.value = dedupeById([...articles.value, ...newArticles])
      if (cursors.posts) posts.value = dedupeById([...posts.value, ...newPosts])
      searchGroups.value = dedupeById([...searchGroups.value, ...newGroups])
    } else {
      users.value = dedupeById(newUsers)
      articles.value = dedupeById(newArticles)
      posts.value = dedupeById(newPosts)
      searchGroups.value = dedupeById(newGroups)
      tagSuggestions.value = (data.taxonomyMatches ?? []).slice(0, 5)
      gatedResultCount.value = data.gatedResultCount ?? 0
    }

    if (!isAppend || cursors.users) nextUserCursor.value = pagination?.nextUserCursor ?? null
    if (!isAppend || cursors.articles) nextArticleCursor.value = pagination?.nextArticleCursor ?? null
    if (!isAppend || cursors.posts) nextPostCursor.value = pagination?.nextPostCursor ?? null
  } catch (e: unknown) {
    if (seq !== searchFetchSeq || q !== searchQueryTrimmed.value) return
    searchError.value = getApiErrorMessage(e) || 'Search failed.'
    if (!isAppend) {
      users.value = []
      articles.value = []
      posts.value = []
      searchGroups.value = []
      tagSuggestions.value = []
      nextUserCursor.value = null
      nextArticleCursor.value = null
      nextPostCursor.value = null
    }
  } finally {
    if (seq === searchFetchSeq) {
      loading.value = false
      loadingMore.value = false
    }
  }
}

async function loadMore() {
  if (loadingMore.value || (!nextUserCursor.value && !nextArticleCursor.value && !nextPostCursor.value)) return
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
      activeSearchSource.value = isUpdatingRouteFromInput ? 'explore' : 'external'
      void fetchPage({ append: false })
    } else {
      clearSearchResults()
    }
  },
  { immediate: true },
)

watch(searchQuery, () => {
  const trimmed = searchQueryTrimmed.value
  if (trimmed !== getRouteQ()) {
    clearSearchResults()
    loading.value = trimmed.length >= 2
    scheduleDebouncedSearch()
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

watch(
  [posts, topicPosts, categoryPosts, featuredPosts, trendingPosts],
  () => syncExplorePostSubscriptions(),
  { deep: true },
)

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
const topicLoadingInitial = useInitialLoading(topicLoading, () => topicPosts.value.length > 0, topicError)
const categoryLoadingInitial = useInitialLoading(categoryLoading, () => categoryPosts.value.length > 0, categoryError)
</script>

<style scoped>
.explore-page :deep(section > h2), .explore-page :deep(section > div > h2) { font-size: 20px; line-height: 28px; font-weight: 600; }
</style>
