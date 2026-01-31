<template>
  <div>
    <!-- Layout: Composer at top, feed below -->
    <AppPostComposer :create-post="createPostViaFeed" />

    <!-- Feed: header + content -->
    <div>
      <AppFeedHomeFeedHeader
        :scope="feedScope"
        :sort="feedSort"
        :filter="feedFilter"
        :scope-tabs="scopeTabs"
        :viewer-is-verified="viewerIsVerified"
        :viewer-is-premium="viewerIsPremium"
        :show-reset="feedFilter !== 'all' || feedSort !== 'new'"
        @update:scope="onFeedScopeChange"
        @update:sort="setFeedSort"
        @update:filter="setFeedFilter"
        @reset="
          () => {
            setFeedFilter('all')
            setFeedSort('new')
          }
        "
      />

      <div v-if="feedCtaKind === 'verify'" class="mx-4 mt-4">
        <AppAccessGateCard kind="verify" />
      </div>

      <div v-else-if="feedCtaKind === 'premium'" class="mx-4 mt-4">
        <AppAccessGateCard kind="premium" />
      </div>

      <template v-else>
        <AppInlineAlert v-if="error" class="mx-4 mt-4" severity="danger">
          {{ error }}
        </AppInlineAlert>

        <div v-else>
          <AppFeedFollowingEmptyState
            v-if="showFollowingEmptyState"
            :following-count="followingCount"
            @find-people="navigateTo('/explore')"
          />

          <div class="relative">
            <div v-for="p in posts" :key="p.id">
              <AppFeedPostRow
                :post="p"
                :activate-video-on-mount="p.id === newlyPostedVideoPostId"
                @deleted="removePost"
              />
            </div>
          </div>
        </div>

        <div v-if="nextCursor" class="flex justify-center px-4 py-6">
          <Button
            label="Load more"
            severity="secondary"
            rounded
            :loading="loading"
            :disabled="loading"
            @click="loadMore"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PostMediaKind, PostMediaSource, PostVisibility } from '~/types/api'
import { postBodyHasVideoEmbed } from '~/utils/link-utils'

definePageMeta({
  layout: 'app',
  title: 'Home',
  hideTopBar: true,
  keepalive: true,
})

usePageSeo({
  title: 'Home',
  description: 'Your Men of Hunger feed — posts are shown in simple chronological order.',
  canonicalPath: '/home',
  noindex: true,
  ogType: 'website',
  image: '/images/banner.png',
})

const newlyPostedVideoPostId = ref<string | null>(null)
const {
  feedScope,
  feedFilter,
  feedSort,
  scopeTabs,
  posts,
  nextCursor,
  loading,
  error,
  refresh,
  loadMore,
  addPost,
  removePost,
  followingCount,
  showFollowingEmptyState,
  viewerIsVerified,
  viewerIsPremium,
  feedCtaKind,
  setFeedFilter,
  setFeedSort,
} = useHomeFeed()

async function createPostViaFeed(
  body: string,
  visibility: PostVisibility,
  media?: Array<{
    source: PostMediaSource
    kind: PostMediaKind
    r2Key?: string
    url?: string
    mp4Url?: string | null
    width?: number | null
    height?: number | null
  }> | null,
): Promise<{ id: string } | null> {
  const created = await addPost(body, visibility, media ?? null)
  if (created?.id && postBodyHasVideoEmbed(created.body ?? '', Boolean(created.media?.length))) {
    newlyPostedVideoPostId.value = created.id
    if (import.meta.client) {
      setTimeout(() => {
        newlyPostedVideoPostId.value = null
      }, 800)
    }
  }
  return created?.id ? { id: created.id } : null
}

function onFeedScopeChange(v: 'following' | 'all') {
  feedScope.value = v
}

if (import.meta.server) {
  await refresh()
} else {
  onMounted(() => void refresh())
}
</script>
