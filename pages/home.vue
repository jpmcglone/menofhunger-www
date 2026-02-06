<template>
  <div>
    <!-- Layout: Composer at top, feed below. Wrapper ref used to detect when composer is in view (hides mobile FAB). -->
    <div ref="homeComposerEl" class="min-h-0">
      <AppPostComposer
        :create-post="createPostViaFeed"
        :allowed-visibilities="['public', 'verifiedOnly', 'premiumOnly']"
      />
    </div>

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
        @reset="() => void resetFilters()"
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

        <div class="relative">
          <!-- Loader: always in DOM, opacity 0/1, z-0 (below feed). Visible when loading and no posts. -->
          <div
            class="absolute inset-x-0 top-0 flex justify-center items-center min-h-[240px] transition-opacity duration-150 z-0"
            :class="showMainLoader ? 'opacity-100' : 'opacity-0 pointer-events-none'"
            :aria-hidden="!showMainLoader"
          >
            <AppLogoLoader />
          </div>

          <!-- Feed: always in flow (no movement), z-10 so above loader. Hidden when loader visible. -->
          <div
            class="relative z-10"
            :class="showMainLoader ? 'opacity-0 pointer-events-none' : 'opacity-100'"
          >
            <AppFeedFollowingEmptyState
              v-if="showFollowingEmptyState"
              :following-count="followingCount"
              @find-people="navigateTo('/explore')"
            />

            <div class="relative">
              <template v-for="item in displayItems" :key="item.kind === 'ad' ? item.key : item.post.id">
                <AppFeedFakeAdRow v-if="item.kind === 'ad'" />
                <AppFeedPostRow
                  v-else
                  :post="item.post"
                  :activate-video-on-mount="item.post.id === newlyPostedVideoPostId"
                  :collapsed-sibling-replies-count="collapsedSiblingReplyCountFor(item.post)"
                  :reply-count-for-parent-id="replyCountForParentId"
                  :replies-sort="feedSort"
                  @deleted="removePost"
                />
              </template>
            </div>

            <!-- Lazy-load sentinel + loader -->
            <div v-if="nextCursor" class="relative flex justify-center items-center px-4 py-6 min-h-12">
              <div
                ref="loadMoreSentinelEl"
                class="absolute bottom-0 left-0 right-0 h-px"
                aria-hidden="true"
              />
              <div
                class="transition-opacity duration-150"
                :class="loading ? 'opacity-100' : 'opacity-0 pointer-events-none'"
                :aria-hidden="!loading"
              >
                <AppLogoLoader compact />
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PostMediaKind, PostMediaSource, PostVisibility } from '~/types/api'
import { postBodyHasVideoEmbed } from '~/utils/link-utils'
import { MOH_HOME_COMPOSER_IN_VIEW_KEY } from '~/utils/injection-keys'
import { useMiddleScroller } from '~/composables/useMiddleScroller'

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

const homeComposerEl = ref<HTMLElement | null>(null)
const loadMoreSentinelEl = ref<HTMLElement | null>(null)
const homeComposerInViewRef = inject(MOH_HOME_COMPOSER_IN_VIEW_KEY)

const middleScrollerRef = useMiddleScroller()

onMounted(() => {
  if (!import.meta.client) return
  const el = homeComposerEl.value
  const root = middleScrollerRef.value
  if (!el || !root || !homeComposerInViewRef) return
  const obs = new IntersectionObserver(
    (entries) => {
      const e = entries[0]
      if (e) homeComposerInViewRef.value = e.isIntersecting
    },
    { root, rootMargin: '0px', threshold: 0 },
  )
  obs.observe(el)
  onBeforeUnmount(() => {
    obs.disconnect()
    homeComposerInViewRef.value = false
  })
})

const newlyPostedVideoPostId = ref<string | null>(null)
const {
  feedScope,
  feedFilter,
  feedSort,
  scopeTabs,
  posts,
  displayPosts,
  collapsedSiblingReplyCountFor,
  replyCountForParentId,
  nextCursor,
  loading,
  error,
  refresh,
  loadMore,
  addPost,
  addReply,
  removePost,
  followingCount,
  showFollowingEmptyState,
  viewerIsVerified,
  viewerIsPremium,
  feedCtaKind,
  displayItems,
  setFeedFilter,
  setFeedSort,
  resetFilters,
} = useHomeFeed()

// Lazy-load more posts when sentinel nears bottom of scroll area
let loadMoreObs: IntersectionObserver | null = null
watch(
  [loadMoreSentinelEl, middleScrollerRef, nextCursor],
  ([sentinel, scrollRoot]) => {
    if (!import.meta.client) return
    loadMoreObs?.disconnect()
    loadMoreObs = null
    const el = sentinel as HTMLElement | null
    const root = scrollRoot as HTMLElement | null
    if (!el || !root || !nextCursor.value) return
    loadMoreObs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { root, rootMargin: '400px', threshold: 0 },
    )
    loadMoreObs.observe(el)
  },
  { immediate: true, flush: 'post' },
)
onBeforeUnmount(() => {
  loadMoreObs?.disconnect()
  loadMoreObs = null
})

const showMainLoader = computed(() => loading.value && !posts.value.length)

const replyModal = useReplyModal()
onActivated(() => {
  if (!import.meta.client) return
  void refresh()
  replyModal.registerOnReplyPosted((payload) => {
    const parent = replyModal.parentPost.value
    if (!parent?.id || !payload.post) return
    addReply(parent.id, payload.post, parent)
  })
})
onDeactivated(() => {
  replyModal.unregisterOnReplyPosted()
})

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
  if (created?.id) {
    if (postBodyHasVideoEmbed(created.body ?? '', Boolean(created.media?.length))) {
      newlyPostedVideoPostId.value = created.id
      if (import.meta.client) {
        setTimeout(() => {
          newlyPostedVideoPostId.value = null
        }, 800)
      }
    }
    // Do not hard-refresh the whole feed after posting; `addPost` already prepends.
  }
  return created?.id ? { id: created.id } : null
}

function onFeedScopeChange(v: 'following' | 'all') {
  feedScope.value = v
}

if (import.meta.server) await refresh()
</script>
