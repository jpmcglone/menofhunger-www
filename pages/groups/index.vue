<template>
  <AppPageContent bottom="standard">
    <div class="w-full">
      <div class="moh-gutter-x border-b moh-border pb-4 pt-4 space-y-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 class="moh-h1">Groups</h1>
            <p class="mt-1 moh-meta max-w-xl">
              Newest and trending posts from every group you’re in.
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
        <!-- Your groups — horizontal carousel of groups the viewer is in.
             Edge-to-edge: padding hugs the gutter on first/last items so
             cards align with the page gutter while the scroll surface
             bleeds to the viewport edge. -->
        <section
          v-if="mine.length > 0"
          class="border-b moh-border py-5"
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
          <!-- py-1.5 leaves vertical breathing room: `overflow-x: auto`
               implies `overflow-y: auto` per spec, which would otherwise
               clip the card's hover-lift (`-translate-y-0.5`) and any
               future shadow. AppHorizontalScroller adds the paging arrows
               so non-trackpad users can navigate sideways. -->
          <AppHorizontalScroller
            ref="carouselEl"
            scroller-class="no-scrollbar snap-x snap-mandatory scroll-px-4 sm:scroll-px-6 px-4 sm:px-6 py-1.5"
          >
            <div class="flex gap-3">
              <AppGroupCompactCard
                v-for="g in mine"
                :key="g.id"
                :group="g"
              />
            </div>
          </AppHorizontalScroller>
        </section>

        <!-- Explore — same spotlight surface as /groups/explore (with
             search-less defaults), capped to a horizontal scroller. The
             "See all" anchor opens the full discover surface. -->
        <section
          v-if="spotlight.length > 0"
          class="border-b moh-border py-5"
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
            <div class="flex gap-3">
              <AppGroupCompactCard
                v-for="g in spotlight"
                :key="g.id"
                :group="g"
              />
            </div>
          </AppHorizontalScroller>
        </section>

        <AppInlineAlert v-if="feedError" class="moh-gutter-x mt-3" severity="danger">
          {{ feedError }}
        </AppInlineAlert>

        <div v-if="!mine.length" class="moh-gutter-x py-10 space-y-4 text-center">
          <p class="text-sm moh-text-muted max-w-md mx-auto">
            You’re not in any groups yet. Explore and join one — then posts will show up here.
          </p>
          <Button as="NuxtLink" to="/groups/explore" label="Explore groups" rounded />
        </div>

        <!-- Feed section header — owns the Newest/Trending toggle. -->
        <div
          v-if="mine.length"
          class="moh-gutter-x flex items-center justify-between gap-3 border-b moh-border py-3"
        >
          <h2 class="text-sm font-semibold uppercase tracking-wide moh-text-muted">
            Feed
          </h2>
          <div class="flex gap-1 rounded-full border moh-border p-0.5 bg-[var(--moh-surface)]">
            <button
              type="button"
              class="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
              :class="feedSort === 'new' ? 'bg-[color:rgba(var(--moh-group-rgb),0.2)] text-[color:var(--moh-group)]' : 'moh-text-muted'"
              @click="setFeedSort('new')"
            >
              Newest
            </button>
            <button
              type="button"
              class="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
              :class="feedSort === 'trending' ? 'bg-[color:rgba(var(--moh-group-rgb),0.2)] text-[color:var(--moh-group)]' : 'moh-text-muted'"
              @click="setFeedSort('trending')"
            >
              Trending
            </button>
          </div>
        </div>

        <AppSubtleSectionLoader v-if="mine.length" :loading="feedLoading && !posts.length" min-height-class="min-h-[200px]">
          <div v-if="!posts.length && !feedLoading" class="px-3 py-10 text-center text-sm moh-text-muted sm:px-4">
            No posts in your groups yet.
          </div>
          <div v-else class="relative mt-3">
            <template v-for="item in displayItems" :key="item.kind === 'ad' ? item.key : (item.post._localId ?? item.post.id)">
              <AppFeedFakeAdRow v-if="item.kind === 'ad'" />
              <AppFeedPostRow
                v-else
                :post="item.post"
                :feed-group="shellForPost(item.post) ?? null"
                subtle-border-bottom
                :group-wall="null"
                :collapsed-sibling-replies-count="collapsedSiblingReplyCountFor(item.post)"
                :replies-sort="feedSort"
                @deleted="removePost"
                @edited="onEdited"
                @group-pin-changed="onGroupPinChanged"
              />
            </template>
          </div>
        </AppSubtleSectionLoader>

        <div v-if="mine.length && nextCursor" class="relative flex justify-center items-center py-6 min-h-12">
          <div ref="loadMoreSentinelEl" class="absolute bottom-0 left-0 right-0 h-px" aria-hidden="true" />
          <div
            class="transition-opacity duration-150"
            :class="loadingMore ? 'opacity-100' : 'opacity-0 pointer-events-none'"
            :aria-hidden="!loadingMore"
          >
            <AppLogoLoader compact />
          </div>
        </div>
      </template>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { CommunityGroupShell, FeedPost } from '~/types/api'
import { useLoadMoreObserver } from '~/composables/useLoadMoreObserver'
import { useMiddleScroller } from '~/composables/useMiddleScroller'
import { getApiErrorMessage } from '~/utils/api-error'
// Components in `components/app/groups/` are imported explicitly throughout
// this codebase — Nuxt's pathPrefix auto-import would mangle the name. See
// pages/groups/explore.vue for the same pattern.
import AppGroupCompactCard from '~/components/app/groups/AppGroupCompactCard.vue'

definePageMeta({
  layout: 'app',
  title: 'Groups',
  hideTopBar: true,
})

usePageSeo({
  title: 'Groups',
  description: 'Posts from every group you’re in.',
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

const feedSort = ref<'new' | 'trending'>('new')
const groupsHubRef = ref(true)

const {
  posts,
  displayItems,
  collapsedSiblingReplyCountFor,
  nextCursor,
  loading: feedLoading,
  loadingMore,
  error: feedError,
  refresh: feedRefresh,
  softRefreshNewer,
  startAutoSoftRefresh,
  loadMore,
  removePost,
  replacePost,
  addReply,
  replaceOptimistic,
  markOptimisticFailed,
  markOptimisticPosting,
  removeOptimistic,
} = usePostsFeed({
  feedStateKey: 'groups-hub-feed',
  localInsertsStateKey: 'groups-hub-feed-local-inserts',
  groupsHub: groupsHubRef,
  sort: feedSort,
  visibility: ref('all'),
  followingOnly: ref(false),
  showAds: ref(false),
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

function setFeedSort(s: 'new' | 'trending') {
  if (feedSort.value === s) return
  feedSort.value = s
}

function onEdited(payload: { id: string; post: FeedPost }) {
  replacePost(payload.post)
}

async function onGroupPinChanged() {
  await feedRefresh()
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
    // Both surfaces are independent; fetch in parallel so the page paints
    // in one round-trip. The "other groups" carousel mirrors the empty
    // state of /groups/explore (server-side excludeMine).
    const [m, e] = await Promise.all([
      apiFetchData<CommunityGroupShell[]>('/groups/me'),
      apiFetchData<CommunityGroupShell[]>('/groups/explore?excludeMine=1&limit=24'),
    ])
    const rows = Array.isArray(m) ? m : []
    // Owner first, then moderator, then member. Within each tier the API's
    // natural order (recently joined first) is preserved.
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

// Snap each carousel back to the first card when its set changes (e.g.
// login/logout swaps the data set out from under the user).
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

const loadMoreSentinelEl = ref<HTMLElement | null>(null)
const middleScrollerRef = useMiddleScroller()
useLoadMoreObserver(
  loadMoreSentinelEl,
  middleScrollerRef,
  computed(() => Boolean(isAuthed.value && mine.value.length && nextCursor.value)),
  () => void loadMore(),
)

const replyModal = useReplyModal()
const pendingPosts = usePendingPostsManager()
let unregisterReplyPending: null | (() => void) = null
let stopAutoSoftRefresh: null | (() => void) = null

function registerReplyPostedHandler() {
  if (!import.meta.client || unregisterReplyPending) return
  const pendingCb = (payload: import('~/composables/useReplyModal').ReplyPendingPayload) => {
    addReply(payload.parentPost.id, payload.optimisticPost, payload.parentPost)
    pendingPosts.submit({
      localId: payload.localId,
      optimisticPost: payload.optimisticPost,
      perform: payload.perform,
      callbacks: {
        insert: () => {},
        replace: (lid, real) => replaceOptimistic(lid, real),
        markFailed: (lid, msg) => markOptimisticFailed(lid, msg),
        markPosting: (lid) => markOptimisticPosting(lid),
        remove: (lid) => removeOptimistic(lid),
      },
    })
  }
  unregisterReplyPending = replyModal.registerOnReplyPending(pendingCb)
}

function unregisterReplyPostedHandler() {
  unregisterReplyPending?.()
  unregisterReplyPending = null
}

function startGroupsHubAutoRefresh() {
  if (stopAutoSoftRefresh) return
  stopAutoSoftRefresh = startAutoSoftRefresh({ everyMs: 12_000 }) ?? null
}

function stopGroupsHubAutoRefresh() {
  stopAutoSoftRefresh?.()
  stopAutoSoftRefresh = null
}

watch(
  isAuthed,
  async (a) => {
    if (!a) {
      mine.value = []
      spotlight.value = []
      posts.value = []
      nextCursor.value = null
      return
    }
    await loadMeta()
    if (await redirectIfLegacyMyTab()) return
    if (await redirectIfLegacyGroupQuery()) return
    await feedRefresh()
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
  startGroupsHubAutoRefresh()
})

onActivated(() => {
  if (!import.meta.client) return
  registerReplyPostedHandler()
  startGroupsHubAutoRefresh()
  if (posts.value.length > 0) {
    setTimeout(() => void softRefreshNewer(), 300)
  }
})

onDeactivated(() => {
  unregisterReplyPostedHandler()
  stopGroupsHubAutoRefresh()
})

onBeforeUnmount(() => {
  unregisterReplyPostedHandler()
  stopGroupsHubAutoRefresh()
})
</script>
