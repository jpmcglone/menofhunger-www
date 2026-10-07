<template>
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
        to="/groups"
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
  <AppXNewsDigest v-if="isAuthed" />

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
</template>

<script setup lang="ts">
import AppGroupPreviewCard from '~/components/app/groups/AppGroupPreviewCard.vue'
import { shellToGroupPreview } from '~/utils/community-group-preview'
import { useExplorePageContext } from '~/composables/pages/explore/useExplorePage'

const {
  discoverError,
  discoverLoading,
  refreshDiscover,
  showDiscoverEmpty,
  isAuthed,
  followedTopicsUi,
  selectTopic,
  discoverInitialLoading,
  exploreGroups,
  joinExploreGroupId,
  joinExploreGroup,
  recommendedUsers,
  trendingHashtags,
  displayCategories,
  selectCategory,
  openEditInterests,
  featuredPosts,
  trendingArticles,
} = useExplorePageContext()
</script>

