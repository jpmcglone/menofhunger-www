<template>
  <!-- ─── Articles tab ─────────────────────────────────────────────── -->
  <div v-if="!effectiveProfileCtaKind && tabActivated.articles" v-show="activeProfileTab === 'articles'" class="min-h-[75vh]">
    <AppSubtleSectionLoader :loading="articlesInitialLoading" :refreshing="profileArticlesFeed.loading.value && !articlesInitialLoading" min-height-class="min-h-[220px]">
      <div v-if="profileArticlesFeed.error.value" class="px-4 mt-3 text-sm text-red-700 dark:text-red-300">
        {{ profileArticlesFeed.error.value }}
      </div>
      <div v-else class="relative mt-3">
        <div>
        <TransitionGroup name="profile-articles-list" tag="div">
          <AppArticleListCard
            v-for="article in profileArticlesFeed.articles.value"
            :key="article.id"
            :article="article"
          />
        </TransitionGroup>
        </div>
        <button
          v-if="profileArticlesFeed.nextCursor.value"
          type="button"
          class="w-full border-t border-gray-200 dark:border-zinc-800 py-3 text-sm text-gray-500 transition-colors hover:bg-gray-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
          :disabled="profileArticlesFeed.loadingMore.value"
          @click="profileArticlesFeed.loadMore()"
        >
          {{ profileArticlesFeed.loadingMore.value ? 'Loading…' : 'Load more' }}
        </button>
        <p v-if="profileArticlesFeed.articles.value.length === 0" class="py-12 text-center text-sm text-gray-400 dark:text-zinc-500">
          No articles yet.
        </p>
      </div>
    </AppSubtleSectionLoader>
  </div>

  <!-- ─── Board tab ─────────────────────────────────────────────────── -->
  <div v-if="!effectiveProfileCtaKind && tabActivated.board" v-show="activeProfileTab === 'board'" class="min-h-[75vh]">
    <AppBoardProfileTab :username="normalizedUsername" />
  </div>

  <!-- ─── Media tab ─────────────────────────────────────────────────── -->
  <div v-if="!effectiveProfileCtaKind && tabActivated.media" v-show="activeProfileTab === 'media'" class="min-h-[75vh]">
    <AppSubtleSectionLoader :loading="mediaInitialLoading" :refreshing="profileMediaFeed.loading.value && !mediaInitialLoading" min-height-class="min-h-[220px]">
      <div v-if="profileMediaFeed.error.value" class="px-4 mt-3 text-sm text-red-700 dark:text-red-300">
        {{ profileMediaFeed.error.value }}
      </div>
      <div v-else class="relative mt-3">
        <div>
        <TransitionGroup
          name="media-grid"
          tag="div"
          class="grid gap-0.5 bg-gray-200 dark:bg-zinc-800"
          style="grid-template-columns: repeat(auto-fill, minmax(min(120px, 100%), 1fr))"
        >
          <NuxtLink
            v-for="item in profileMediaFeed.items.value"
            :key="item.id"
            :to="`/p/${item.postId}`"
            class="relative aspect-square overflow-hidden bg-gray-100 dark:bg-zinc-900 hover:opacity-90 transition-opacity"
          >
            <img
              :src="item.kind === 'video' ? (item.thumbnailUrl ?? item.url ?? '') : (item.url ?? '')"
              :alt="item.kind === 'video' ? 'Video' : 'Photo'"
              class="absolute inset-0 h-full w-full object-cover moh-img-outline"
              :class="item.viewerCanAccess === false ? 'blur-sm scale-110' : ''"
              loading="lazy"
            >
            <!-- Video play overlay -->
            <div v-if="item.kind === 'video' && item.viewerCanAccess !== false" class="absolute inset-0 flex items-center justify-center">
              <div class="rounded-full bg-black/50 p-2">
                <Icon name="tabler:player-play-filled" class="text-white text-lg" aria-hidden="true" />
              </div>
            </div>
            <!-- Restricted overlay -->
            <div v-if="item.viewerCanAccess === false" class="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
              <Icon
                :name="item.visibility === 'premiumOnly' ? 'tabler:crown' : 'tabler:rosette-discount-check'"
                :class="item.visibility === 'premiumOnly' ? 'text-amber-400' : 'text-blue-400'"
                size="22"
                aria-hidden="true"
              />
            </div>
          </NuxtLink>
        </TransitionGroup>
        </div>
        <!-- Load more -->
        <div v-if="profileMediaFeed.nextCursor.value" class="relative flex justify-center items-center px-4 py-6 min-h-12">
          <div ref="mediaLoadMoreSentinelEl" class="absolute bottom-0 left-0 right-0 h-px" aria-hidden="true" />
          <div class="transition-opacity duration-150" :class="profileMediaFeed.loadingMore.value ? 'opacity-100' : 'opacity-0 pointer-events-none'">
            <AppLogoLoader compact />
          </div>
        </div>
        <p v-if="profileMediaFeed.hasLoadedOnce.value && profileMediaFeed.items.value.length === 0" class="py-12 text-center text-sm text-gray-400 dark:text-zinc-500">
          No photos or videos yet.
        </p>
      </div>
    </AppSubtleSectionLoader>
  </div>
</template>

<script setup lang="ts">
import { useProfilePageContext } from '~/composables/pages/profile/useProfilePage'

const {
  effectiveProfileCtaKind,
  tabActivated,
  articlesInitialLoading,
  profileArticlesFeed,
  activeProfileTab,
  normalizedUsername,
  mediaInitialLoading,
  profileMediaFeed,
  mediaLoadMoreSentinelEl,
} = useProfilePageContext()
</script>

<style scoped>
.profile-articles-list-enter-active,
.profile-articles-list-leave-active {
  transition: opacity 0.2s ease;
}

.profile-articles-list-enter-from,
.profile-articles-list-leave-to {
  opacity: 0;
}

.profile-articles-list-move {
  transition: transform 0.25s ease;
}

.media-grid-enter-active,
.media-grid-leave-active {
  transition: opacity 0.2s ease;
}

.media-grid-enter-from,
.media-grid-leave-to {
  opacity: 0;
}

.media-grid-move {
  transition: transform 0.25s ease;
}
</style>
