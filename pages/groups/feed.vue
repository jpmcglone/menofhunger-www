<template>
  <AppPageContent bottom="standard">
    <div class="w-full">
      <div class="moh-gutter-x border-b moh-border pb-4 pt-4 space-y-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <NuxtLink
                to="/groups"
                class="moh-tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full moh-surface-hover"
                aria-label="Back to groups"
              >
                <Icon name="tabler:chevron-left" class="text-lg" aria-hidden="true" />
              </NuxtLink>
              <h1 class="moh-h1">
                Groups feed
              </h1>
            </div>
            <p class="mt-1 moh-meta max-w-xl">
              Newest and trending posts from every group you’re in — same layout as home, scoped to your groups.
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

        <template v-else-if="isAuthed">
          <div class="flex flex-wrap items-center gap-2">
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
            <NuxtLink
              to="/groups?tab=my"
              class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors moh-border hover:bg-[color:rgba(var(--moh-group-rgb),0.08)]"
              style="border-color: rgba(var(--moh-group-rgb), 0.35); color: var(--moh-group)"
            >
              <Icon name="tabler:users-group" class="text-sm opacity-90" aria-hidden="true" />
              My groups
            </NuxtLink>
          </div>
        </template>
      </div>

      <template v-if="!isAuthed">
        <div class="moh-gutter-x py-12 text-center text-sm moh-text-muted">
          Log in to see posts from your groups.
        </div>
      </template>

      <template v-else-if="!metaLoading">
        <AppInlineAlert v-if="feedError" class="moh-gutter-x mt-3" severity="danger">
          {{ feedError }}
        </AppInlineAlert>

        <div v-if="!mine.length" class="moh-gutter-x py-10 space-y-4 text-center">
          <p class="text-sm moh-text-muted max-w-md mx-auto">
            You’re not in any groups yet. Explore and join one — then posts will show up here.
          </p>
          <Button as="NuxtLink" to="/groups" label="Explore groups" rounded />
        </div>

        <AppSubtleSectionLoader v-else :loading="feedLoading && !posts.length" min-height-class="min-h-[200px]">
          <div v-if="!posts.length && !feedLoading" class="px-3 py-10 text-center text-sm moh-text-muted sm:px-4">
            No posts in your groups yet.
          </div>
          <div v-else class="relative mt-3">
            <template v-for="item in displayItems" :key="item.kind === 'ad' ? item.key : item.post.id">
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

definePageMeta({
  layout: 'app',
  title: 'Groups feed',
  hideTopBar: true,
})

usePageSeo({
  title: 'Groups feed',
  description: 'Posts from every group you’re in.',
  canonicalPath: '/groups/feed',
  noindex: true,
})

const route = useRoute()
const { apiFetchData } = useApiClient()
const { user, isAuthed } = useAuth()

const metaLoading = ref(true)
const error = ref<string | null>(null)
const mine = ref<CommunityGroupShell[]>([])

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

/** Legacy `/groups/feed?group=<id>` → canonical `/g/:slug`. */
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
  await navigateTo({ path: '/groups/feed', query: {}, replace: true })
  return true
}

async function loadMeta() {
  metaLoading.value = true
  error.value = null
  try {
    const m = await apiFetchData<CommunityGroupShell[]>('/groups/me')
    mine.value = Array.isArray(m) ? m : []
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to load your groups.'
    mine.value = []
  } finally {
    metaLoading.value = false
  }
}

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
      posts.value = []
      nextCursor.value = null
      return
    }
    await loadMeta()
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
