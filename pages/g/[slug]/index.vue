<template>
  <AppPageContent bottom="standard">
    <div class="w-full">
      <AppInlineAlert v-if="shellError" class="moh-gutter-x mt-3" severity="danger">
        {{ shellError }}
      </AppInlineAlert>

      <div v-if="shellLoading" class="flex justify-center py-16">
        <AppLogoLoader />
      </div>

      <template v-else-if="shell">
        <AppGroupProfileHeader
          :shell="shell"
          :is-member="isMember"
          :is-owner="isOwner"
          :can-leave="canLeave"
          :cover-url="shell.coverImageUrl"
          :avatar-url="shell.avatarImageUrl"
          :join-busy="joinBusy"
          :leave-busy="leaveBusy"
          :cancel-busy="cancelBusy"
          :show-settings-link="false"
          :hide-banner-thumb="hideBannerThumb"
          :hide-avatar-thumb="hideAvatarThumb"
          :hide-avatar-during-banner="hideAvatarDuringBanner"
          :viewer-is-logged-in="isAuthed"
          :viewer-is-verified="isVerified"
          @join="doJoin"
          @leave="doLeave"
          @cancel-request="doCancelRequest"
          @edit="editOpen = true"
          @invite="inviteOpen = true"
          @open-image="onOpenGroupImage"
        />

        <AppGroupsEditGroupDialog
          v-model="editOpen"
          :shell="shell"
          :is-owner="isOwner"
          @updated="onGroupShellUpdated"
        />

        <AppGroupsInviteToGroupDialog
          v-if="isMod"
          v-model="inviteOpen"
          :shell="shell"
        />

        <!-- Logged-out CTA -->
        <div v-if="!isAuthed" class="px-4 py-6 border-b moh-border">
          <div class="rounded-xl border moh-border bg-[var(--moh-surface-2)] px-5 py-6 text-center max-w-lg mx-auto">
            <p class="text-sm font-medium moh-text mb-3">
              Log in to join <span class="font-bold">{{ shell.name }}</span> and see what members are posting.
            </p>
            <div class="flex justify-center gap-2 flex-wrap">
              <NuxtLink
                :to="`/login?redirect=${encodeURIComponent(route.fullPath)}`"
                class="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--moh-group)] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
              >
                Log in
              </NuxtLink>
              <NuxtLink
                to="/login?tab=signup"
                class="inline-flex items-center gap-1.5 rounded-full border moh-border px-5 py-2 text-sm font-semibold moh-text hover:bg-[var(--moh-surface-2)] transition-colors"
              >
                Sign up
              </NuxtLink>
            </div>
          </div>
        </div>

        <!-- Logged-in but not verified CTA -->
        <div v-else-if="!isVerified && !isMember" class="px-4 py-6 border-b moh-border">
          <div class="rounded-xl border moh-border bg-[var(--moh-surface-2)] px-5 py-6 text-center max-w-lg mx-auto">
            <p class="text-sm font-medium moh-text mb-1">
              Verification required to join.
            </p>
            <p class="text-xs moh-text-muted mb-3">
              Verify your identity to join <span class="font-semibold">{{ shell.name }}</span> and participate.
            </p>
            <NuxtLink
              to="/settings/verification"
              class="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--moh-group)] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
            >
              Get verified
            </NuxtLink>
          </div>
        </div>

        <div v-if="isMember" class="border-b moh-border">
          <AppPostComposer
            :create-post="createGroupPost"
            :allowed-visibilities="['public']"
            locked-visibility="public"
            hide-visibility-picker
            group-composer
            :group-name="shell?.name"
            disable-poll
            :persist-key="shell ? `group-${shell.id}` : 'group-draft'"
            :register-unsaved-guard="false"
            placeholder="Post to this group…"
            show-divider
          />
        </div>
        <!--
          Open-group reader CTA: verified, signed-in non-members can read the
          feed but cannot post until they join. Keep the bar compact so the
          feed below still leads.
        -->
        <div
          v-else-if="canReadFeed"
          class="flex items-center justify-between gap-3 border-b moh-border px-4 py-3"
        >
          <p class="text-sm moh-text-muted">
            Join to post in this group.
          </p>
          <Button
            label="Join group"
            rounded
            size="small"
            :loading="joinBusy"
            @click="doJoin"
          />
        </div>

        <template v-if="canReadFeed">
          <!-- Filter bar (sort only, no visibility) -->
          <div class="flex items-center justify-between px-3 py-1 border-b border-gray-200 dark:border-zinc-800">
            <NuxtLink
              v-if="isMod && shell.joinPolicy === 'approval'"
              :to="`/g/${encodeURIComponent(slug)}/pending`"
              class="text-xs font-medium hover:underline moh-text"
            >
              Pending requests
            </NuxtLink>
            <div v-else class="flex-1" />
            <AppFeedFiltersBar
              :sort="groupSort"
              :filter="'all'"
              :viewer-is-verified="false"
              :viewer-is-premium="false"
              :show-visibility-filter="false"
              :show-reset="groupSort !== 'new'"
              @update:sort="onGroupSortChange"
              @reset="onGroupSortReset"
            />
          </div>

          <!-- Animated tab bar -->
          <div ref="groupTabBarEl" class="relative flex gap-0 border-b border-gray-200 dark:border-zinc-800">
            <button
              v-for="tab in groupTabs"
              :key="tab.key"
              :ref="(el) => setGroupTabButtonRef(tab.key, el as HTMLElement | null)"
              type="button"
              class="relative cursor-pointer px-5 py-3 text-sm font-semibold transition-colors"
              :class="activeGroupTab === tab.key
                ? 'text-gray-900 dark:text-gray-100'
                : 'text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300'"
              @click="setGroupTab(tab.key)"
            >
              {{ tab.label }}
            </button>
            <!-- Animated sliding underline -->
            <span
              class="absolute bottom-0 h-[2px] rounded-full"
              :class="groupUnderlineReady ? 'transition-[left,width] duration-250 ease-in-out' : ''"
              :style="{ left: `${groupUnderlineLeft}px`, width: `${groupUnderlineWidth}px`, backgroundColor: 'var(--moh-group)' }"
              aria-hidden="true"
            />
          </div>

          <!-- ─── Posts tab (top-level only) ─────────────────────────────── -->
          <div v-if="tabActivated.posts" v-show="activeGroupTab === 'posts'" class="min-h-[75vh]">
            <AppInlineAlert v-if="postsFeedError" class="moh-gutter-x mt-3" severity="danger">
              {{ postsFeedError }}
            </AppInlineAlert>
            <AppSubtleSectionLoader :loading="postsFeedLoading && !postsFeedPosts.length" min-height-class="min-h-[200px]">
              <div v-if="!postsFeedPosts.length && !postsFeedLoading" class="px-3 py-6 text-sm moh-text-muted sm:px-4">
                No posts yet. Start the thread above.
              </div>
              <div v-else class="relative mt-3">
                <template v-for="item in postsFeedDisplayItems" :key="item.kind === 'ad' ? item.key : (item.post._localId ?? item.post.id)">
                  <AppFeedFakeAdRow v-if="item.kind === 'ad'" />
                  <AppFeedPostRow
                    v-else
                    :post="item.post"
                    :group-wall="shell && isOwner ? { groupId: shell.id, viewerIsOwner: true } : null"
                    :collapsed-sibling-replies-count="postsFeedCollapsedSiblingReplyCountFor(item.post)"
                    :replies-sort="groupSort"
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

          <!-- ─── Replies tab (all posts including replies) ─────────────── -->
          <div v-if="tabActivated.replies" v-show="activeGroupTab === 'replies'" class="min-h-[75vh]">
            <AppInlineAlert v-if="repliesFeedError" class="moh-gutter-x mt-3" severity="danger">
              {{ repliesFeedError }}
            </AppInlineAlert>
            <AppSubtleSectionLoader :loading="repliesFeedLoading && !repliesFeedPosts.length" min-height-class="min-h-[200px]">
              <div v-if="!repliesFeedPosts.length && !repliesFeedLoading" class="px-3 py-6 text-sm moh-text-muted sm:px-4">
                No posts yet.
              </div>
              <div v-else class="relative mt-3">
                <template v-for="item in repliesFeedDisplayItems" :key="item.kind === 'ad' ? item.key : (item.post._localId ?? item.post.id)">
                  <AppFeedFakeAdRow v-if="item.kind === 'ad'" />
                  <AppFeedPostRow
                    v-else
                    :post="item.post"
                    :group-wall="shell && isOwner ? { groupId: shell.id, viewerIsOwner: true } : null"
                    :collapsed-sibling-replies-count="repliesFeedCollapsedSiblingReplyCountFor(item.post)"
                    :replies-sort="groupSort"
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
          <div v-if="tabActivated.media" v-show="activeGroupTab === 'media'" class="min-h-[75vh]">
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
                  No photos or videos yet.
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
import AppGroupProfileHeader from '~/components/app/groups/AppGroupProfileHeader.vue'
import type {
  CommunityGroupShell,
  CreatePostData,
  FeedPost,
  PostVisibility,
} from '~/types/api'
import type { CreateMediaPayload } from '~/composables/useComposerMedia'
import type { ComposerPollPayload } from '~/composables/composer/types'
import { useLoadMoreObserver } from '~/composables/useLoadMoreObserver'
import { useMiddleScroller } from '~/composables/useMiddleScroller'
import { useGroupMedia } from '~/composables/useGroupMedia'
import { getApiErrorMessage } from '~/utils/api-error'
import { MOH_GROUP_COMPOSER_KEY } from '~/utils/injection-keys'
import { siteConfig } from '~/config/site'

const route = useRoute()
const { apiFetchData } = useApiClient()
const { isAuthed, isVerified } = useAuth()
const { markReadBySubject } = useNotifications()

const slug = computed(() => String(route.params.slug ?? '').trim())

definePageMeta({
  layout: 'app',
  title: 'Group',
  hideTopBar: false,
  alias: ['/g/:slug/posts', '/g/:slug/replies', '/g/:slug/media'],
})

// ── currentPathname tracks the real browser URL (for tab routing via pushState) ──
const currentPathname = ref(import.meta.client ? location.pathname : route.path)
watch(() => route.path, (path) => { currentPathname.value = path })
if (import.meta.client) {
  const onPopState = () => { currentPathname.value = location.pathname }
  onMounted(() => window.addEventListener('popstate', onPopState))
  onBeforeUnmount(() => window.removeEventListener('popstate', onPopState))
}

// SSR-friendly shell fetch
const {
  data: shell,
  error: shellFetchError,
  status: shellFetchStatus,
  refresh: refreshShell,
} = await useAsyncData<CommunityGroupShell | null>(
  () => `group-shell-${slug.value}`,
  async () => {
    if (!slug.value) return null
    return await apiFetchData<CommunityGroupShell>(`/groups/by-slug/${encodeURIComponent(slug.value)}`)
  },
)

const shellLoading = computed(() => shellFetchStatus.value === 'pending')
const shellError = computed(() =>
  shellFetchError.value ? getApiErrorMessage(shellFetchError.value) || 'Group not found.' : null,
)

async function loadShell() {
  await refreshShell()
}

const { header: appHeader } = useAppHeader()

const joinBusy = ref(false)
const leaveBusy = ref(false)
const cancelBusy = ref(false)

const isMember = computed(() => shell.value?.viewerMembership?.status === 'active')
const isOpenGroup = computed(() => shell.value?.joinPolicy === 'open')
const canReadFeed = computed(() =>
  Boolean(shell.value?.id && (isMember.value || (isOpenGroup.value && isAuthed.value && isVerified.value))),
)
const groupFeedEnabled = computed(() => Boolean(shell.value?.id && canReadFeed.value))

const isMod = computed(() => {
  const m = shell.value?.viewerMembership
  if (!m || m.status !== 'active') return false
  return m.role === 'owner' || m.role === 'moderator'
})
const isOwner = computed(() => shell.value?.viewerMembership?.role === 'owner')

const canLeave = computed(() => {
  const m = shell.value?.viewerMembership
  if (!m || m.status !== 'active') return false
  return m.role !== 'owner'
})

// ─── URL-backed sort ───────────────────────────────────────────────────────────
const { sort: groupSort } = useUrlFeedFilters({ historyBacked: true })

function onGroupSortChange(next: 'new' | 'trending') {
  groupSort.value = next
}

function onGroupSortReset() {
  groupSort.value = 'new'
}

// ─── Tab state ─────────────────────────────────────────────────────────────────
type GroupTabKey = 'posts' | 'replies' | 'media'

const baseGroupPath = computed(() => `/g/${encodeURIComponent(slug.value)}`)

function tabFromRoute(path: string): GroupTabKey {
  if (/\/replies\/?$/.test(path)) return 'replies'
  if (/\/media\/?$/.test(path)) return 'media'
  return 'posts'
}

const activeGroupTab = computed<GroupTabKey>(() => tabFromRoute(currentPathname.value))

const tabActivated = reactive<Record<GroupTabKey, boolean>>({
  posts: true,
  replies: tabFromRoute(route.path) === 'replies',
  media: tabFromRoute(route.path) === 'media',
})

watch(activeGroupTab, (tab) => {
  if (!tabActivated[tab]) tabActivated[tab] = true
  nextTick(updateGroupUnderline)
}, { immediate: true })

const groupTabs = computed<Array<{ key: GroupTabKey; label: string }>>(() => [
  { key: 'posts', label: 'Posts' },
  { key: 'replies', label: 'Replies' },
  { key: 'media', label: 'Media' },
])

// ─── Animated tab underline ────────────────────────────────────────────────────
const groupTabBarEl = ref<HTMLElement | null>(null)
const groupTabButtonEls = new Map<GroupTabKey, HTMLElement>()
const groupUnderlineLeft = ref(0)
const groupUnderlineWidth = ref(0)
const groupUnderlineReady = ref(false)

function setGroupTabButtonRef(key: GroupTabKey, el: HTMLElement | null) {
  if (el) groupTabButtonEls.set(key, el)
  else groupTabButtonEls.delete(key)
}

function updateGroupUnderline() {
  if (!import.meta.client) return
  const bar = groupTabBarEl.value
  const btn = groupTabButtonEls.get(activeGroupTab.value)
  if (!bar || !btn) return
  const barRect = bar.getBoundingClientRect()
  const btnRect = btn.getBoundingClientRect()
  groupUnderlineLeft.value = Math.round(btnRect.left - barRect.left)
  groupUnderlineWidth.value = Math.round(btnRect.width)
}

function pushGroupPath(path: string) {
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

function setGroupTab(key: GroupTabKey) {
  if (activeGroupTab.value === key) return
  const path = key === 'posts' ? baseGroupPath.value : `${baseGroupPath.value}/${key}`
  pushGroupPath(path)
}

onMounted(() => nextTick(() => {
  updateGroupUnderline()
  requestAnimationFrame(() => { groupUnderlineReady.value = true })
}))

// ─── Posts feed (top-level only) ──────────────────────────────────────────────
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
  feedStateKey: 'group-wall-feed-top-level',
  cursorFeedStateMode: 'local',
  localInsertsStateKey: 'group-wall-feed-top-level-inserts',
  communityGroupId: computed(() => shell.value?.id ?? null),
  enabled: computed(() => groupFeedEnabled.value && tabActivated.posts),
  sort: groupSort,
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
  feedStateKey: 'group-wall-feed-with-replies',
  cursorFeedStateMode: 'local',
  localInsertsStateKey: 'group-wall-feed-replies-inserts',
  communityGroupId: computed(() => shell.value?.id ?? null),
  enabled: computed(() => groupFeedEnabled.value && tabActivated.replies),
  sort: groupSort,
  visibility: ref('all'),
  followingOnly: ref(false),
  showAds: ref(false),
})

// ─── Media feed ───────────────────────────────────────────────────────────────
const mediaFeed = useGroupMedia(slug, {
  enabled: computed(() => groupFeedEnabled.value && tabActivated.media),
  sort: groupSort,
})

// ─── Lightbox ─────────────────────────────────────────────────────────────────
const viewer = useImageLightbox()
const { openFromEvent } = viewer
const hideBannerThumb = computed(() => viewer.visible.value && viewer.kind.value === 'banner')
const hideAvatarThumb = computed(() => viewer.visible.value && viewer.kind.value === 'avatar')
const hideAvatarDuringBanner = computed(() => viewer.visible.value && viewer.kind.value === 'banner')

const editOpen = ref(false)
const inviteOpen = ref(false)

function onOpenGroupImage(payload: {
  event: MouseEvent
  url: string
  title: string
  kind: 'avatar' | 'banner'
  originRect?: { left: number; top: number; width: number; height: number }
}) {
  if (payload.kind === 'avatar') {
    void openFromEvent(payload.event, payload.url, payload.title, payload.kind, {
      avatarBorderRadius: '8%',
      originRect: payload.originRect,
    })
    return
  }
  void openFromEvent(payload.event, payload.url, payload.title, payload.kind, {
    originRect: payload.originRect,
  })
}

async function onGroupShellUpdated(_next: CommunityGroupShell) {
  await loadShell()
}

// ─── SEO ──────────────────────────────────────────────────────────────────────
const seoImage = computed(() => {
  const avatar = shell.value?.avatarImageUrl
  const cover = shell.value?.coverImageUrl
  return avatar || cover || '/images/logo-black-bg.png'
})

const seoDescription = computed(() => {
  const s = shell.value
  if (!s) return siteConfig.meta.description
  const memberStr = `${s.memberCount.toLocaleString()} member${s.memberCount === 1 ? '' : 's'}`
  const policy = s.joinPolicy === 'approval' ? 'private group' : 'open group'
  const desc = (s.description ?? '').trim()
  if (desc) return `${desc.slice(0, 140)} · ${memberStr} · ${policy}`
  return `${s.name} on ${siteConfig.name} · ${memberStr} · ${policy}`
})

usePageSeo({
  title: computed(() => shell.value?.name ?? 'Group'),
  description: seoDescription,
  image: seoImage,
  imageAlt: computed(() => shell.value ? `${shell.value.name} group on ${siteConfig.name}` : siteConfig.name),
  twitterCard: computed(() => (shell.value?.avatarImageUrl ? 'summary' : 'summary_large_image')),
  canonicalPath: computed(() => `/g/${slug.value}`),
  ogType: 'website',
  noindex: false,
})

watch(
  [shell, shellError],
  ([s, err]) => {
    if (s) {
      appHeader.value = {
        title: s.name || 'Group',
        icon: 'tabler:users',
      }
      return
    }
    if (err) {
      appHeader.value = { title: 'Group', icon: 'tabler:users' }
      return
    }
    appHeader.value = { title: 'Group', icon: 'tabler:users' }
  },
  { immediate: true },
)

// ─── Join / leave / cancel ────────────────────────────────────────────────────
async function doJoin() {
  const s = shell.value
  if (!s || joinBusy.value) return
  joinBusy.value = true
  try {
    await apiFetchData(`/groups/${encodeURIComponent(s.id)}/join`, { method: 'POST', body: {} })
    await loadShell()
    if (isMember.value) await postsFeedRefresh()
  } catch (e: unknown) {
    console.error(getApiErrorMessage(e) || 'Could not join.')
  } finally {
    joinBusy.value = false
  }
}

async function doLeave() {
  const s = shell.value
  if (!s || leaveBusy.value) return
  leaveBusy.value = true
  try {
    await apiFetchData(`/groups/${encodeURIComponent(s.id)}/leave`, { method: 'POST', body: {} })
    postsFeedPosts.value = []
    postsFeedNextCursor.value = null
    repliesFeedPosts.value = []
    repliesFeedNextCursor.value = null
    await loadShell()
  } catch (e: unknown) {
    console.error(getApiErrorMessage(e) || 'Could not leave.')
  } finally {
    leaveBusy.value = false
  }
}

async function doCancelRequest() {
  const s = shell.value
  if (!s || cancelBusy.value) return
  cancelBusy.value = true
  try {
    await apiFetchData(`/groups/${encodeURIComponent(s.id)}/cancel-request`, { method: 'POST', body: {} })
    await loadShell()
  } catch (e: unknown) {
    console.error(getApiErrorMessage(e) || 'Could not cancel request.')
  } finally {
    cancelBusy.value = false
  }
}

// ─── Create post ──────────────────────────────────────────────────────────────
async function createGroupPost(
  body: string,
  visibility: PostVisibility,
  media?: CreateMediaPayload[] | null,
  _poll?: ComposerPollPayload | null,
): Promise<{ id: string } | FeedPost | null> {
  const s = shell.value
  if (!s) return null
  const trimmed = (body ?? '').trim()
  const filtered = (media ?? []).filter((m) => (m as { source?: string })?.source !== 'existing') as CreateMediaPayload[]
  const hasMedia = Boolean(filtered.length)
  if (!trimmed && !hasMedia) return null
  try {
    const result = await apiFetchData<CreatePostData>('/posts', {
      method: 'POST',
      body: {
        body: trimmed || '',
        visibility,
        community_group_id: s.id,
        ...(filtered.length ? { media: filtered } : {}),
      },
    })
    const post = result.post
    // Prepend into both posts (top-level) and replies feeds
    if (post) {
      postsFeedPosts.value = [post, ...postsFeedPosts.value]
      repliesFeedPosts.value = [post, ...repliesFeedPosts.value]
    }
    return post?.id ? { id: post.id } : null
  } catch (e: unknown) {
    console.error(getApiErrorMessage(e) || 'Failed to post.')
    throw e
  }
}

// ─── Composer injection for global layout ─────────────────────────────────────
const groupComposerRef = inject(MOH_GROUP_COMPOSER_KEY, ref(null))
watch(
  [shell, isMember],
  () => {
    const s = shell.value
    if (!s || !isMember.value) {
      groupComposerRef.value = null
      return
    }
    groupComposerRef.value = {
      groupId: s.id,
      groupName: s.name,
      createPost: createGroupPost as import('~/utils/injection-keys').GroupComposerContext['createPost'],
    }
  },
  { immediate: true },
)
onDeactivated(() => { groupComposerRef.value = null })
onBeforeUnmount(() => { groupComposerRef.value = null })

// ─── Edit handlers ────────────────────────────────────────────────────────────
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

// ─── Load-more sentinels ──────────────────────────────────────────────────────
const postsLoadMoreSentinelEl = ref<HTMLElement | null>(null)
const repliesLoadMoreSentinelEl = ref<HTMLElement | null>(null)
const mediaLoadMoreSentinelEl = ref<HTMLElement | null>(null)
const middleScrollerRef = useMiddleScroller()

useLoadMoreObserver(
  postsLoadMoreSentinelEl,
  middleScrollerRef,
  computed(() => Boolean(canReadFeed.value && postsFeedNextCursor.value)),
  () => void postsFeedLoadMore(),
)
useLoadMoreObserver(
  repliesLoadMoreSentinelEl,
  middleScrollerRef,
  computed(() => Boolean(canReadFeed.value && repliesFeedNextCursor.value)),
  () => void repliesFeedLoadMore(),
)
useLoadMoreObserver(
  mediaLoadMoreSentinelEl,
  middleScrollerRef,
  computed(() => Boolean(canReadFeed.value && mediaFeed.nextCursor.value)),
  () => void mediaFeed.loadMore(),
)

// ─── Reply pending handler ────────────────────────────────────────────────────
const replyModal = useReplyModal()
const pendingPosts = usePendingPostsManager()
let unregisterReplyPending: null | (() => void) = null

function registerReplyPostedHandler() {
  if (!import.meta.client || unregisterReplyPending) return
  const pendingCb = (payload: import('~/composables/useReplyModal').ReplyPendingPayload) => {
    // Replies go into both feeds
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

// ─── Auto soft-refresh ────────────────────────────────────────────────────────
let stopAutoSoftRefreshPosts: null | (() => void) = null
let stopAutoSoftRefreshReplies: null | (() => void) = null

function startGroupFeedAutoRefresh() {
  if (!stopAutoSoftRefreshPosts) {
    stopAutoSoftRefreshPosts = postsFeedStartAutoSoftRefresh({ everyMs: 12_000 }) ?? null
  }
  if (!stopAutoSoftRefreshReplies) {
    stopAutoSoftRefreshReplies = repliesFeedStartAutoSoftRefresh({ everyMs: 12_000 }) ?? null
  }
}

function stopGroupFeedAutoRefresh() {
  stopAutoSoftRefreshPosts?.()
  stopAutoSoftRefreshPosts = null
  stopAutoSoftRefreshReplies?.()
  stopAutoSoftRefreshReplies = null
}

// ─── Notification read-mark ───────────────────────────────────────────────────
watch(
  () => shell.value?.id ?? null,
  (groupId) => {
    if (!import.meta.client) return
    if (!groupId) return
    void markReadBySubject({ group_id: groupId })
  },
  { immediate: true },
)

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(() => {
  if (!import.meta.client) return
  if (groupFeedEnabled.value && !postsFeedPosts.value.length) {
    void postsFeedRefresh()
  }
  registerReplyPostedHandler()
  startGroupFeedAutoRefresh()
})

onActivated(() => {
  if (!import.meta.client) return
  registerReplyPostedHandler()
  startGroupFeedAutoRefresh()
  if (postsFeedPosts.value.length > 0) {
    setTimeout(() => void postsFeedSoftRefreshNewer(), 300)
  } else if (groupFeedEnabled.value) {
    void postsFeedRefresh()
  }
  if (repliesFeedPosts.value.length > 0) {
    setTimeout(() => void repliesFeedSoftRefreshNewer(), 300)
  }
})

onDeactivated(() => {
  unregisterReplyPostedHandler()
  stopGroupFeedAutoRefresh()
})

onBeforeUnmount(() => {
  unregisterReplyPostedHandler()
  stopGroupFeedAutoRefresh()
  if (appHeader.value?.title === (shell.value?.name || 'Group')) appHeader.value = null
})
</script>

<style scoped>
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
