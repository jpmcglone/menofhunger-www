<template>
  <AppPageContent bottom="standard">
    <div class="w-full">
      <div class="moh-gutter-x border-b moh-border pb-4 pt-4 space-y-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 class="moh-h1">Your Groups Feed</h1>
            <p class="mt-1 moh-meta max-w-xl">
              Posts and media from every group you're in.
            </p>
          </div>
          <div class="flex flex-wrap gap-2 shrink-0 sm:pt-1">
            <Button
              v-if="canCreateGroup"
              as="NuxtLink"
              to="/groups/new"
              label="Create group"
              rounded
            >
              <template #icon>
                <Icon name="tabler:plus" aria-hidden="true" />
              </template>
            </Button>
            <Button
              v-else-if="isAuthed"
              as="NuxtLink"
              to="/tiers"
              label="Upgrade to create"
              rounded
              severity="secondary"
            >
              <template #icon>
                <Icon name="tabler:sparkles" aria-hidden="true" />
              </template>
            </Button>
          </div>
        </div>

        <AppInlineAlert v-if="error" severity="danger">
          {{ error }}
        </AppInlineAlert>

        <div v-if="metaLoading" class="flex justify-center py-8">
          <AppLogoLoader />
        </div>
      </div>

      <template v-if="!isAuthed">
        <div class="moh-gutter-x py-12 text-center text-sm moh-text-muted">
          Log in to see posts from your groups.
        </div>
      </template>

      <template v-else-if="!metaLoading">
        <!-- Your groups — horizontal carousel -->
        <section
          v-if="mine.length > 0"
          class="border-b moh-border py-3"
          aria-labelledby="groups-mine-heading"
        >
          <div class="moh-gutter-x mb-3 flex items-baseline justify-between gap-3">
            <h2 id="groups-mine-heading" class="text-sm font-semibold uppercase tracking-wide moh-text-muted">
              Your groups
            </h2>
            <span class="text-xs moh-text-muted tabular-nums">
              {{ mine.length }}
            </span>
          </div>
          <AppHorizontalScroller
            ref="carouselEl"
            scroller-class="no-scrollbar snap-x snap-mandatory scroll-px-4 sm:scroll-px-6 px-4 sm:px-6 py-1.5"
          >
            <div class="flex gap-2">
              <AppGroupCompactCard
                v-for="g in mine"
                :key="g.id"
                :group="g"
                dense
              />
            </div>
          </AppHorizontalScroller>
        </section>

        <!-- Explore — spotlight surface -->
        <section
          v-if="spotlight.length > 0"
          class="border-b moh-border py-3"
          aria-labelledby="groups-explore-heading"
        >
          <div class="moh-gutter-x mb-3 flex items-baseline justify-between gap-3">
            <h2 id="groups-explore-heading" class="text-sm font-semibold uppercase tracking-wide moh-text-muted">
              Explore
            </h2>
            <NuxtLink
              to="/groups/explore"
              class="inline-flex items-center gap-0.5 text-xs font-semibold moh-text-muted transition-colors hover:text-[color:var(--moh-group)]"
            >
              See all
              <Icon name="tabler:chevron-right" class="text-sm" aria-hidden="true" />
            </NuxtLink>
          </div>
          <AppHorizontalScroller
            ref="otherCarouselEl"
            scroller-class="no-scrollbar snap-x snap-mandatory scroll-px-4 sm:scroll-px-6 px-4 sm:px-6 py-1.5"
          >
            <div class="flex gap-2">
              <AppGroupCompactCard
                v-for="g in spotlight"
                :key="g.id"
                :group="g"
                dense
              />
            </div>
          </AppHorizontalScroller>
        </section>

        <div v-if="!mine.length" class="moh-gutter-x py-10 space-y-4 text-center">
          <p class="text-sm moh-text-muted max-w-md mx-auto">
            You're not in any groups yet. Explore and join one — then posts will show up here.
          </p>
          <Button as="NuxtLink" to="/groups/explore" label="Explore groups" rounded />
        </div>

        <template v-if="mine.length">
          <!-- Filter bar (sort only) -->
          <div class="flex items-center justify-end px-3 py-1 border-b border-gray-200 dark:border-zinc-800">
            <AppFeedFiltersBar
              :sort="hubSort"
              :filter="'all'"
              :viewer-is-verified="false"
              :viewer-is-premium="false"
              :show-visibility-filter="false"
              :show-reset="hubSort !== 'new'"
              @update:sort="onHubSortChange"
              @reset="onHubSortReset"
            />
          </div>

          <!-- Animated tab bar -->
          <div ref="hubTabBarEl" class="relative flex gap-0 border-b border-gray-200 dark:border-zinc-800">
            <button
              v-for="tab in hubTabs"
              :key="tab.key"
              :ref="(el) => setHubTabButtonRef(tab.key, el as HTMLElement | null)"
              type="button"
              class="relative cursor-pointer px-5 py-3 text-sm font-semibold transition-colors"
              :class="activeHubTab === tab.key
                ? 'text-gray-900 dark:text-gray-100'
                : 'text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300'"
              @click="setHubTab(tab.key)"
            >
              {{ tab.label }}
            </button>
            <!-- Animated sliding underline -->
            <span
              class="absolute bottom-0 h-[2px] rounded-full"
              :class="hubUnderlineReady ? 'transition-[left,width] duration-250 ease-in-out' : ''"
              :style="{ left: `${hubUnderlineLeft}px`, width: `${hubUnderlineWidth}px`, backgroundColor: 'var(--moh-group)' }"
              aria-hidden="true"
            />
          </div>

          <!-- ─── Posts tab (top-level only) ─────────────────────────────── -->
          <div v-if="tabActivated.posts" v-show="activeHubTab === 'posts'" class="min-h-[75vh]">
            <AppInlineAlert v-if="postsFeedError" class="moh-gutter-x mt-3" severity="danger">
              {{ postsFeedError }}
            </AppInlineAlert>
            <AppSubtleSectionLoader :loading="postsFeedLoading && !postsFeedPosts.length" min-height-class="min-h-[200px]">
              <div v-if="!postsFeedPosts.length && !postsFeedLoading" class="px-3 py-10 text-center text-sm moh-text-muted sm:px-4">
                No posts in your groups yet.
              </div>
              <div v-else class="relative mt-3">
                <template v-for="item in postsFeedDisplayItems" :key="item.kind === 'ad' ? item.key : (item.post._localId ?? item.post.id)">
                  <AppFeedFakeAdRow v-if="item.kind === 'ad'" />
                  <AppFeedPostRow
                    v-else
                    :post="item.post"
                    :feed-group="shellForPost(item.post) ?? null"
                    subtle-border-bottom
                    :group-wall="null"
                    :collapsed-sibling-replies-count="postsFeedCollapsedSiblingReplyCountFor(item.post)"
                    :replies-sort="hubSort"
                    @deleted="postsFeedRemovePost"
                    @edited="onPostsTabEdited"
                    @group-pin-changed="onGroupPinChanged"
                  />
                </template>
              </div>
            </AppSubtleSectionLoader>
            <div v-if="postsFeedNextCursor" class="relative flex justify-center items-center py-6 min-h-12">
              <div ref="postsLoadMoreSentinelEl" class="absolute bottom-0 left-0 right-0 h-px" aria-hidden="true" />
              <div
                class="transition-opacity duration-150"
                :class="postsFeedLoadingMore ? 'opacity-100' : 'opacity-0 pointer-events-none'"
                :aria-hidden="!postsFeedLoadingMore"
              >
                <AppLogoLoader compact />
              </div>
            </div>
          </div>

          <!-- ─── Replies tab (all posts including replies) ──────────────── -->
          <div v-if="tabActivated.replies" v-show="activeHubTab === 'replies'" class="min-h-[75vh]">
            <AppInlineAlert v-if="repliesFeedError" class="moh-gutter-x mt-3" severity="danger">
              {{ repliesFeedError }}
            </AppInlineAlert>
            <AppSubtleSectionLoader :loading="repliesFeedLoading && !repliesFeedPosts.length" min-height-class="min-h-[200px]">
              <div v-if="!repliesFeedPosts.length && !repliesFeedLoading" class="px-3 py-10 text-center text-sm moh-text-muted sm:px-4">
                No posts in your groups yet.
              </div>
              <div v-else class="relative mt-3">
                <template v-for="item in repliesFeedDisplayItems" :key="item.kind === 'ad' ? item.key : (item.post._localId ?? item.post.id)">
                  <AppFeedFakeAdRow v-if="item.kind === 'ad'" />
                  <AppFeedPostRow
                    v-else
                    :post="item.post"
                    :feed-group="shellForPost(item.post) ?? null"
                    subtle-border-bottom
                    :group-wall="null"
                    :collapsed-sibling-replies-count="repliesFeedCollapsedSiblingReplyCountFor(item.post)"
                    :replies-sort="hubSort"
                    @deleted="repliesFeedRemovePost"
                    @edited="onRepliesTabEdited"
                    @group-pin-changed="onGroupPinChanged"
                  />
                </template>
              </div>
            </AppSubtleSectionLoader>
            <div v-if="repliesFeedNextCursor" class="relative flex justify-center items-center py-6 min-h-12">
              <div ref="repliesLoadMoreSentinelEl" class="absolute bottom-0 left-0 right-0 h-px" aria-hidden="true" />
              <div
                class="transition-opacity duration-150"
                :class="repliesFeedLoadingMore ? 'opacity-100' : 'opacity-0 pointer-events-none'"
                :aria-hidden="!repliesFeedLoadingMore"
              >
                <AppLogoLoader compact />
              </div>
            </div>
          </div>

          <!-- ─── Media tab ──────────────────────────────────────────────── -->
          <div v-if="tabActivated.media" v-show="activeHubTab === 'media'" class="min-h-[75vh]">
            <AppSubtleSectionLoader :loading="mediaFeed.loading.value && !mediaFeed.items.value.length" min-height-class="min-h-[200px]">
              <div v-if="mediaFeed.error.value" class="px-3 py-6 text-sm text-red-700 dark:text-red-300 sm:px-4">
                {{ mediaFeed.error.value }}
              </div>
              <div v-else class="relative mt-3">
                <TransitionGroup
                  name="media-grid"
                  tag="div"
                  class="grid gap-0.5 bg-gray-200 dark:bg-zinc-800"
                  style="grid-template-columns: repeat(auto-fill, minmax(min(120px, 100%), 1fr))"
                >
                  <NuxtLink
                    v-for="item in mediaFeed.items.value"
                    :key="item.id"
                    :to="`/p/${item.postId}`"
                    class="relative aspect-square overflow-hidden bg-gray-100 dark:bg-zinc-900 hover:opacity-90 transition-opacity"
                  >
                    <img
                      :src="item.kind === 'video' ? (item.thumbnailUrl ?? item.url ?? '') : (item.url ?? '')"
                      :alt="item.kind === 'video' ? 'Video' : 'Photo'"
                      class="absolute inset-0 h-full w-full object-cover moh-img-outline"
                      loading="lazy"
                    />
                    <div v-if="item.kind === 'video'" class="absolute inset-0 flex items-center justify-center">
                      <div class="rounded-full bg-black/50 p-2">
                        <Icon name="tabler:player-play-filled" class="text-white text-lg" aria-hidden="true" />
                      </div>
                    </div>
                  </NuxtLink>
                </TransitionGroup>
                <div v-if="mediaFeed.nextCursor.value" class="relative flex justify-center items-center py-6 min-h-12">
                  <div ref="mediaLoadMoreSentinelEl" class="absolute bottom-0 left-0 right-0 h-px" aria-hidden="true" />
                  <div
                    class="transition-opacity duration-150"
                    :class="mediaFeed.loadingMore.value ? 'opacity-100' : 'opacity-0 pointer-events-none'"
                    :aria-hidden="!mediaFeed.loadingMore.value"
                  >
                    <AppLogoLoader compact />
                  </div>
                </div>
                <p v-if="mediaFeed.hasLoadedOnce.value && mediaFeed.items.value.length === 0" class="py-12 text-center text-sm text-gray-400 dark:text-zinc-500">
                  No photos or videos in your groups yet.
                </p>
              </div>
            </AppSubtleSectionLoader>
          </div>
        </template>
      </template>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { CommunityGroupShell, FeedPost } from '~/types/api'
import { useLoadMoreObserver } from '~/composables/useLoadMoreObserver'
import { useMiddleScroller } from '~/composables/useMiddleScroller'
import { useGroupsHubMedia } from '~/composables/useGroupsHubMedia'
import { getApiErrorMessage } from '~/utils/api-error'
import AppGroupCompactCard from '~/components/app/groups/AppGroupCompactCard.vue'

definePageMeta({
  layout: 'app',
  title: 'Your Groups Feed',
  hideTopBar: true,
  alias: ['/groups/posts', '/groups/replies', '/groups/media'],
})

usePageSeo({
  title: 'Your Groups Feed',
    description: "Posts and media from every group you're in.",
  canonicalPath: '/groups',
  noindex: true,
})

const route = useRoute()
const { apiFetchData } = useApiClient()
const { user, isAuthed } = useAuth()

const metaLoading = ref(true)
const error = ref<string | null>(null)
const mine = ref<CommunityGroupShell[]>([])
const spotlight = ref<CommunityGroupShell[]>([])

// ─── URL-backed sort ───────────────────────────────────────────────────────────
const { sort: hubSort } = useUrlFeedFilters({ historyBacked: true })

function onHubSortChange(next: 'new' | 'trending') {
  hubSort.value = next
}

function onHubSortReset() {
  hubSort.value = 'new'
}

// ─── Tab state ─────────────────────────────────────────────────────────────────
type HubTabKey = 'posts' | 'replies' | 'media'

const basePath = '/groups'

function tabFromRoute(path: string): HubTabKey {
  if (/\/groups\/replies\/?$/.test(path)) return 'replies'
  if (/\/groups\/media\/?$/.test(path)) return 'media'
  return 'posts'
}

// currentPathname tracks real browser URL for pushState-based tab routing
const currentPathname = ref(import.meta.client ? location.pathname : route.path)
watch(() => route.path, (path) => { currentPathname.value = path })
if (import.meta.client) {
  const onPopState = () => { currentPathname.value = location.pathname }
  onMounted(() => window.addEventListener('popstate', onPopState))
  onBeforeUnmount(() => window.removeEventListener('popstate', onPopState))
}

const activeHubTab = computed<HubTabKey>(() => tabFromRoute(currentPathname.value))

const tabActivated = reactive<Record<HubTabKey, boolean>>({
  posts: true,
  replies: tabFromRoute(route.path) === 'replies',
  media: tabFromRoute(route.path) === 'media',
})

watch(activeHubTab, (tab) => {
  if (!tabActivated[tab]) tabActivated[tab] = true
  nextTick(updateHubUnderline)
}, { immediate: true })

const hubTabs = computed<Array<{ key: HubTabKey; label: string }>>(() => [
  { key: 'posts', label: 'Posts' },
  { key: 'replies', label: 'Replies' },
  { key: 'media', label: 'Media' },
])

// ─── Animated tab underline ────────────────────────────────────────────────────
const hubTabBarEl = ref<HTMLElement | null>(null)
const hubTabButtonEls = new Map<HubTabKey, HTMLElement>()
const hubUnderlineLeft = ref(0)
const hubUnderlineWidth = ref(0)
const hubUnderlineReady = ref(false)

function setHubTabButtonRef(key: HubTabKey, el: HTMLElement | null) {
  if (el) hubTabButtonEls.set(key, el)
  else hubTabButtonEls.delete(key)
}

function updateHubUnderline() {
  if (!import.meta.client) return
  const bar = hubTabBarEl.value
  const btn = hubTabButtonEls.get(activeHubTab.value)
  if (!bar || !btn) return
  const barRect = bar.getBoundingClientRect()
  const btnRect = btn.getBoundingClientRect()
  hubUnderlineLeft.value = Math.round(btnRect.left - barRect.left)
  hubUnderlineWidth.value = Math.round(btnRect.width)
}

function pushHubPath(path: string) {
  const qs: Record<string, string> = {}
  if (import.meta.client) {
    new URLSearchParams(location.search).forEach((value, key) => { qs[key] = value })
  }
  currentPathname.value = path
  if (!import.meta.client) return
  const search = new URLSearchParams(qs)
  const newUrl = search.toString() ? `${path}?${search}` : path
  const state = {
    ...history.state,
    back: history.state?.current ?? null,
    current: newUrl,
    forward: null,
  }
  history.pushState(state, '', newUrl)
}

function setHubTab(key: HubTabKey) {
  if (activeHubTab.value === key) return
  const path = key === 'posts' ? basePath : `${basePath}/${key}`
  pushHubPath(path)
}

onMounted(() => nextTick(() => {
  updateHubUnderline()
  requestAnimationFrame(() => { hubUnderlineReady.value = true })
}))

// ─── Posts feed (top-level only) ──────────────────────────────────────────────
const groupsHubRef = ref(true)

const {
  posts: postsFeedPosts,
  displayItems: postsFeedDisplayItems,
  collapsedSiblingReplyCountFor: postsFeedCollapsedSiblingReplyCountFor,
  nextCursor: postsFeedNextCursor,
  loading: postsFeedLoading,
  loadingMore: postsFeedLoadingMore,
  error: postsFeedError,
  refresh: postsFeedRefresh,
  softRefreshNewer: postsFeedSoftRefreshNewer,
  startAutoSoftRefresh: postsFeedStartAutoSoftRefresh,
  loadMore: postsFeedLoadMore,
  removePost: postsFeedRemovePost,
  replacePost: postsFeedReplacePost,
  addReply: postsFeedAddReply,
  replaceOptimistic: postsFeedReplaceOptimistic,
  markOptimisticFailed: postsFeedMarkOptimisticFailed,
  markOptimisticPosting: postsFeedMarkOptimisticPosting,
  removeOptimistic: postsFeedRemoveOptimistic,
} = usePostsFeed({
  feedStateKey: 'groups-hub-posts',
  localInsertsStateKey: 'groups-hub-posts-inserts',
  groupsHub: groupsHubRef,
  enabled: computed(() => isAuthed.value && mine.value.length > 0 && tabActivated.posts),
  sort: hubSort,
  visibility: ref('all'),
  followingOnly: ref(false),
  showAds: ref(false),
  topLevelOnly: ref(true),
})

// ─── Replies feed (all posts including replies) ────────────────────────────────
const {
  posts: repliesFeedPosts,
  displayItems: repliesFeedDisplayItems,
  collapsedSiblingReplyCountFor: repliesFeedCollapsedSiblingReplyCountFor,
  nextCursor: repliesFeedNextCursor,
  loading: repliesFeedLoading,
  loadingMore: repliesFeedLoadingMore,
  error: repliesFeedError,
  refresh: repliesFeedRefresh,
  softRefreshNewer: repliesFeedSoftRefreshNewer,
  startAutoSoftRefresh: repliesFeedStartAutoSoftRefresh,
  loadMore: repliesFeedLoadMore,
  removePost: repliesFeedRemovePost,
  replacePost: repliesFeedReplacePost,
  addReply: repliesFeedAddReply,
  replaceOptimistic: repliesFeedReplaceOptimistic,
  markOptimisticFailed: repliesFeedMarkOptimisticFailed,
  markOptimisticPosting: repliesFeedMarkOptimisticPosting,
  removeOptimistic: repliesFeedRemoveOptimistic,
} = usePostsFeed({
  feedStateKey: 'groups-hub-replies',
  localInsertsStateKey: 'groups-hub-replies-inserts',
  groupsHub: groupsHubRef,
  enabled: computed(() => isAuthed.value && mine.value.length > 0 && tabActivated.replies),
  sort: hubSort,
  visibility: ref('all'),
  followingOnly: ref(false),
  showAds: ref(false),
})

// ─── Media feed ───────────────────────────────────────────────────────────────
const mediaFeed = useGroupsHubMedia({
  enabled: computed(() => isAuthed.value && mine.value.length > 0 && tabActivated.media),
  sort: hubSort,
})

const canCreateGroup = computed(() => {
  const u = user.value
  if (!u) return false
  return Boolean(u.premium || u.premiumPlus || u.siteAdmin)
})

function shellForPost(p: FeedPost) {
  const id = p.communityGroupId ?? null
  if (!id) return null
  return mine.value.find((g) => g.id === id) ?? null
}

function onPostsTabEdited(payload: { id: string; post: FeedPost }) {
  postsFeedReplacePost(payload.post)
}

function onRepliesTabEdited(payload: { id: string; post: FeedPost }) {
  repliesFeedReplacePost(payload.post)
}

async function onGroupPinChanged() {
  await postsFeedRefresh()
  await repliesFeedRefresh()
}

/** Legacy `/groups?group=<id>` → canonical `/g/:slug`. */
async function redirectIfLegacyGroupQuery(): Promise<boolean> {
  if (!isAuthed.value || metaLoading.value) return false
  const raw = route.query.group
  const gid = typeof raw === 'string' && raw.trim() ? raw.trim() : null
  if (!gid) return false
  const shell = mine.value.find((g) => g.id === gid)
  if (shell) {
    await navigateTo(`/g/${encodeURIComponent(shell.slug)}`, { replace: true })
    return true
  }
  await navigateTo({ path: '/groups', query: {}, replace: true })
  return true
}

/** Legacy `/groups?tab=my` → `/groups/explore`. */
async function redirectIfLegacyMyTab(): Promise<boolean> {
  if (route.query.tab !== 'my') return false
  await navigateTo('/groups/explore', { replace: true })
  return true
}

async function loadMeta() {
  metaLoading.value = true
  error.value = null
  try {
    const [m, e] = await Promise.all([
      apiFetchData<CommunityGroupShell[]>('/groups/me'),
      apiFetchData<CommunityGroupShell[]>('/groups/explore?excludeMine=1&limit=24'),
    ])
    const rows = Array.isArray(m) ? m : []
    const rank = (g: CommunityGroupShell) => {
      const role = g.viewerMembership?.role
      if (role === 'owner') return 0
      if (role === 'moderator') return 1
      return 2
    }
    mine.value = [...rows].sort((a, b) => rank(a) - rank(b))
    spotlight.value = Array.isArray(e) ? e : []
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to load your groups.'
    mine.value = []
    spotlight.value = []
  } finally {
    metaLoading.value = false
  }
}

// Snap carousels back to first card on data changes
type ScrollerHandle = { scrollToStart: () => void } | null
const carouselEl = ref<ScrollerHandle>(null)
const otherCarouselEl = ref<ScrollerHandle>(null)
watch(
  () => mine.value.length,
  () => {
    if (!import.meta.client) return
    carouselEl.value?.scrollToStart()
  },
)
watch(
  () => spotlight.value.length,
  () => {
    if (!import.meta.client) return
    otherCarouselEl.value?.scrollToStart()
  },
)

// ─── Load-more sentinels ──────────────────────────────────────────────────────
const postsLoadMoreSentinelEl = ref<HTMLElement | null>(null)
const repliesLoadMoreSentinelEl = ref<HTMLElement | null>(null)
const mediaLoadMoreSentinelEl = ref<HTMLElement | null>(null)
const middleScrollerRef = useMiddleScroller()

useLoadMoreObserver(
  postsLoadMoreSentinelEl,
  middleScrollerRef,
  computed(() => Boolean(isAuthed.value && mine.value.length && postsFeedNextCursor.value)),
  () => void postsFeedLoadMore(),
)
useLoadMoreObserver(
  repliesLoadMoreSentinelEl,
  middleScrollerRef,
  computed(() => Boolean(isAuthed.value && mine.value.length && repliesFeedNextCursor.value)),
  () => void repliesFeedLoadMore(),
)
useLoadMoreObserver(
  mediaLoadMoreSentinelEl,
  middleScrollerRef,
  computed(() => Boolean(isAuthed.value && mine.value.length && mediaFeed.nextCursor.value)),
  () => void mediaFeed.loadMore(),
)

// ─── Reply pending handler ────────────────────────────────────────────────────
const replyModal = useReplyModal()
const pendingPosts = usePendingPostsManager()
let unregisterReplyPending: null | (() => void) = null
let stopAutoSoftRefreshPosts: null | (() => void) = null
let stopAutoSoftRefreshReplies: null | (() => void) = null

function registerReplyPostedHandler() {
  if (!import.meta.client || unregisterReplyPending) return
  const pendingCb = (payload: import('~/composables/useReplyModal').ReplyPendingPayload) => {
    postsFeedAddReply(payload.parentPost.id, payload.optimisticPost, payload.parentPost)
    repliesFeedAddReply(payload.parentPost.id, payload.optimisticPost, payload.parentPost)
    pendingPosts.submit({
      localId: payload.localId,
      optimisticPost: payload.optimisticPost,
      perform: payload.perform,
      callbacks: {
        insert: () => {},
        replace: (lid, real) => {
          postsFeedReplaceOptimistic(lid, real)
          repliesFeedReplaceOptimistic(lid, real)
        },
        markFailed: (lid, msg) => {
          postsFeedMarkOptimisticFailed(lid, msg)
          repliesFeedMarkOptimisticFailed(lid, msg)
        },
        markPosting: (lid) => {
          postsFeedMarkOptimisticPosting(lid)
          repliesFeedMarkOptimisticPosting(lid)
        },
        remove: (lid) => {
          postsFeedRemoveOptimistic(lid)
          repliesFeedRemoveOptimistic(lid)
        },
      },
    })
  }
  unregisterReplyPending = replyModal.registerOnReplyPending(pendingCb)
}

function unregisterReplyPostedHandler() {
  unregisterReplyPending?.()
  unregisterReplyPending = null
}

function startHubAutoRefresh() {
  if (!stopAutoSoftRefreshPosts) {
    stopAutoSoftRefreshPosts = postsFeedStartAutoSoftRefresh({ everyMs: 12_000 }) ?? null
  }
  if (!stopAutoSoftRefreshReplies) {
    stopAutoSoftRefreshReplies = repliesFeedStartAutoSoftRefresh({ everyMs: 12_000 }) ?? null
  }
}

function stopHubAutoRefresh() {
  stopAutoSoftRefreshPosts?.()
  stopAutoSoftRefreshPosts = null
  stopAutoSoftRefreshReplies?.()
  stopAutoSoftRefreshReplies = null
}

watch(
  isAuthed,
  async (a) => {
    if (!a) {
      mine.value = []
      spotlight.value = []
      postsFeedPosts.value = []
      postsFeedNextCursor.value = null
      repliesFeedPosts.value = []
      repliesFeedNextCursor.value = null
      return
    }
    await loadMeta()
    if (await redirectIfLegacyMyTab()) return
    if (await redirectIfLegacyGroupQuery()) return
    await postsFeedRefresh()
  },
  { immediate: true },
)

watch(
  () => route.query.group,
  async () => {
    if (!isAuthed.value || metaLoading.value) return
    if (await redirectIfLegacyGroupQuery()) return
  },
)

watch(
  () => route.query.tab,
  async () => {
    await redirectIfLegacyMyTab()
  },
)

onMounted(() => {
  if (!import.meta.client) return
  registerReplyPostedHandler()
  startHubAutoRefresh()
})

onActivated(() => {
  if (!import.meta.client) return
  registerReplyPostedHandler()
  startHubAutoRefresh()
  if (postsFeedPosts.value.length > 0) {
    setTimeout(() => void postsFeedSoftRefreshNewer(), 300)
  }
  if (repliesFeedPosts.value.length > 0) {
    setTimeout(() => void repliesFeedSoftRefreshNewer(), 300)
  }
})

onDeactivated(() => {
  unregisterReplyPostedHandler()
  stopHubAutoRefresh()
})

onBeforeUnmount(() => {
  unregisterReplyPostedHandler()
  stopHubAutoRefresh()
})
</script>
