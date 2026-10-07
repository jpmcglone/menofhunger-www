<template>
  <!-- ─── Posts tab (top-level only) ───────────────────────────────── -->
  <div v-if="!effectiveProfileCtaKind && tabActivated.posts" v-show="activeProfileTab === 'posts'" class="min-h-[75vh]">
    <ClientOnly>
      <template #fallback><div class="flex justify-center pt-12 pb-8"><AppLogoLoader /></div></template>
      <AppSubtleSectionLoader :loading="postsOnlyInitialLoading" :refreshing="postsOnlyLoading && !postsOnlyInitialLoading" min-height-class="min-h-[220px]">
        <div>
          <div v-if="postsOnlyError" class="px-4 mt-3 text-sm text-red-700 dark:text-red-300">{{ postsOnlyError }}</div>
          <div v-else-if="postsOnlyHasLoadedOnce && postsOnlyItems.length === 0" class="px-4 mt-3 text-sm text-gray-500 dark:text-gray-400">No posts yet.</div>
          <div v-else class="relative mt-3">
            <div>
            <template v-for="item in postsOnlyItems" :key="item.kind === 'ad' ? item.key : (item.post._localId ?? item.post.id)">
              <AppFeedFakeAdRow v-if="item.kind === 'ad'" />
              <AppFeedPostRow
                v-else
                :post="item.post"
                collapse-ancestors
                :show-collapsed-replies-footer="profileSort === 'trending'"
                :collapsed-sibling-replies-count="postsOnlyCollapsedSiblingReplyCountFor(item.post)"
                :replies-sort="profileSort"
                @deleted="postsOnlyRemovePost"
                @edited="(p) => postsOnlyReplacePost(p.post)"
              />
            </template>
            </div>
            <div v-if="postsOnlyNextCursor" class="relative flex justify-center items-center px-4 py-6 min-h-12">
              <div ref="postsOnlyLoadMoreSentinelEl" class="absolute bottom-0 left-0 right-0 h-px" aria-hidden="true" />
              <div class="transition-opacity duration-150" :class="postsOnlyLoadingMore ? 'opacity-100' : 'opacity-0 pointer-events-none'">
                <AppLogoLoader compact />
              </div>
            </div>
          </div>
        </div>
      </AppSubtleSectionLoader>
    </ClientOnly>
  </div>

  <!-- ─── Replies tab (all posts including replies) ─────────────────── -->
  <div v-if="!effectiveProfileCtaKind && tabActivated.replies" v-show="activeProfileTab === 'replies'" class="min-h-[75vh]">
    <ClientOnly>
      <template #fallback><div class="flex justify-center pt-12 pb-8"><AppLogoLoader /></div></template>
      <AppSubtleSectionLoader :loading="repliesInitialLoading" :refreshing="profileLoading && !repliesInitialLoading" min-height-class="min-h-[220px]">
        <div>
          <div v-if="profileError" class="px-4 mt-3 text-sm text-red-700 dark:text-red-300">{{ profileError }}</div>
          <div v-else-if="profileHasLoadedOnce && itemsWithoutPinned.length === 0 && !pinnedPostForDisplay" class="px-4 mt-3 text-sm text-gray-500 dark:text-gray-400">No posts yet.</div>
          <div v-else class="relative mt-3">
            <div>
            <template v-for="item in itemsWithoutPinned" :key="item.kind === 'ad' ? item.key : (item.post._localId ?? item.post.id)">
              <AppFeedFakeAdRow v-if="item.kind === 'ad'" />
              <AppFeedPostRow
                v-else
                :post="item.post"
                collapse-ancestors
                :show-collapsed-replies-footer="profileSort === 'trending'"
                :collapsed-sibling-replies-count="profileCollapsedSiblingReplyCountFor(item.post)"
                :replies-sort="profileSort"
                @deleted="profileRemovePost"
                @edited="onProfilePostEdited"
              />
            </template>
            </div>
            <div v-if="profileNextCursor" class="relative flex justify-center items-center px-4 py-6 min-h-12">
              <div ref="profileLoadMoreSentinelEl" class="absolute bottom-0 left-0 right-0 h-px" aria-hidden="true" />
              <div class="transition-opacity duration-150" :class="profileLoadingMore ? 'opacity-100' : 'opacity-0 pointer-events-none'">
                <AppLogoLoader compact />
              </div>
            </div>
          </div>
        </div>
      </AppSubtleSectionLoader>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { useProfilePageContext } from '~/composables/pages/profile/useProfilePage'

const {
  effectiveProfileCtaKind,
  tabActivated,
  postsOnlyInitialLoading,
  postsOnlyLoading,
  postsOnlyError,
  postsOnlyHasLoadedOnce,
  postsOnlyItems,
  profileSort,
  postsOnlyCollapsedSiblingReplyCountFor,
  postsOnlyRemovePost,
  postsOnlyReplacePost,
  postsOnlyNextCursor,
  postsOnlyLoadingMore,
  activeProfileTab,
  repliesInitialLoading,
  profileLoading,
  profileError,
  profileHasLoadedOnce,
  itemsWithoutPinned,
  pinnedPostForDisplay,
  profileCollapsedSiblingReplyCountFor,
  profileRemovePost,
  onProfilePostEdited,
  profileNextCursor,
  profileLoadingMore,
  postsOnlyLoadMoreSentinelEl,
  profileLoadMoreSentinelEl,
} = useProfilePageContext()
</script>

