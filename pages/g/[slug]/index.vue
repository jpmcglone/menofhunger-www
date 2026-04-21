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
          @open-image="onOpenGroupImage"
        />

        <AppGroupsEditGroupDialog
          v-model="editOpen"
          :shell="shell"
          :is-owner="isOwner"
          @updated="onGroupShellUpdated"
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

        <template v-if="isMember">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b moh-border px-3 py-2 sm:px-4">
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
              v-if="isMod && shell.joinPolicy === 'approval'"
              :to="`/g/${encodeURIComponent(slug)}/pending`"
              class="text-xs font-medium hover:underline moh-text"
            >
              Pending requests
            </NuxtLink>
          </div>

          <AppInlineAlert v-if="feedError" class="moh-gutter-x mt-3" severity="danger">
            {{ feedError }}
          </AppInlineAlert>

          <AppSubtleSectionLoader :loading="feedLoading && !posts.length" min-height-class="min-h-[200px]">
            <div v-if="!posts.length && !feedLoading" class="px-3 py-6 text-sm moh-text-muted sm:px-4">
              No posts yet. Start the thread above.
            </div>
            <div v-else class="relative mt-3">
              <template v-for="item in displayItems" :key="item.kind === 'ad' ? item.key : item.post.id">
                <AppFeedFakeAdRow v-if="item.kind === 'ad'" />
                <AppFeedPostRow
                  v-else
                  :post="item.post"
                  :group-wall="
                    shell && isOwner
                      ? { groupId: shell.id, viewerIsOwner: true }
                      : null
                  "
                  :collapsed-sibling-replies-count="collapsedSiblingReplyCountFor(item.post)"
                  :replies-sort="feedSort"
                  @deleted="removePost"
                  @edited="onEdited"
                  @group-pin-changed="onGroupPinChanged"
                />
              </template>
            </div>
          </AppSubtleSectionLoader>

          <div v-if="nextCursor" class="relative flex justify-center items-center py-6 min-h-12">
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
})

// SSR-friendly shell fetch: data is serialized in the page payload for immediate hydration.
// The reactive key re-fetches when navigating between group pages (SPA navigation).
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

const feedSort = ref<'new' | 'trending'>('new')

const isMember = computed(() => shell.value?.viewerMembership?.status === 'active')
const groupFeedEnabled = computed(() => Boolean(shell.value?.id && isMember.value))

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
  feedStateKey: 'group-wall-feed',
  cursorFeedStateMode: 'local',
  localInsertsStateKey: 'group-wall-feed-local-inserts',
  communityGroupId: computed(() => shell.value?.id ?? null),
  enabled: groupFeedEnabled,
  sort: feedSort,
  visibility: ref('all'),
  followingOnly: ref(false),
  showAds: ref(false),
})

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

const viewer = useImageLightbox()
const { openFromEvent } = viewer
const hideBannerThumb = computed(() => viewer.visible.value && viewer.kind.value === 'banner')
const hideAvatarThumb = computed(() => viewer.visible.value && viewer.kind.value === 'avatar')
const hideAvatarDuringBanner = computed(() => viewer.visible.value && viewer.kind.value === 'banner')

const editOpen = ref(false)

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

// SEO: use the group avatar as the OG image when available, fall back to site logo.
const seoImage = computed(() => {
  const avatar = shell.value?.avatarImageUrl
  const cover = shell.value?.coverImageUrl
  return avatar || cover || '/images/logo-black-bg.png'
})

const seoDescription = computed(() => {
  const s = shell.value
  if (!s) return siteConfig.meta.description
  const memberStr = `${s.memberCount.toLocaleString()} member${s.memberCount === 1 ? '' : 's'}`
  const policy = s.joinPolicy === 'approval' ? 'approval required' : 'open to join'
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
  // Groups are public pages — allow indexing for shareability.
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

async function doJoin() {
  const s = shell.value
  if (!s || joinBusy.value) return
  joinBusy.value = true
  try {
    await apiFetchData(`/groups/${encodeURIComponent(s.id)}/join`, { method: 'POST', body: {} })
    await loadShell()
    if (isMember.value) await feedRefresh()
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
    posts.value = []
    nextCursor.value = null
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
    posts.value = [post, ...posts.value]
    return post?.id ? { id: post.id } : null
  } catch (e: unknown) {
    console.error(getApiErrorMessage(e) || 'Failed to post.')
    throw e
  }
}

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

function onEdited(payload: { id: string; post: FeedPost }) {
  replacePost(payload.post)
}

async function onGroupPinChanged() {
  await feedRefresh()
}

function setFeedSort(s: 'new' | 'trending') {
  if (feedSort.value === s) return
  feedSort.value = s
}

const loadMoreSentinelEl = ref<HTMLElement | null>(null)
const middleScrollerRef = useMiddleScroller()
useLoadMoreObserver(
  loadMoreSentinelEl,
  middleScrollerRef,
  computed(() => Boolean(isMember.value && nextCursor.value)),
  () => void loadMore(),
)

const replyModal = useReplyModal()
const pendingPosts = usePendingPostsManager()
let unregisterReplyPending: null | (() => void) = null
let stopAutoSoftRefresh: null | (() => void) = null

function registerReplyPostedHandler() {
  if (!import.meta.client || unregisterReplyPending) return
  // Optimistic replies: slot the optimistic row into the parent's position via
  // `addReply` and route the network call through pendingPosts so retry/discard
  // is wired up.
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

function startGroupFeedAutoRefresh() {
  if (stopAutoSoftRefresh) return
  stopAutoSoftRefresh = startAutoSoftRefresh({ everyMs: 12_000 }) ?? null
}

function stopGroupFeedAutoRefresh() {
  stopAutoSoftRefresh?.()
  stopAutoSoftRefresh = null
}

/**
 * Visiting a group surfaces every group_* notification (join requests, etc.), so
 * clear them in one shot whenever the shell resolves to a group the viewer can see.
 * Watching `shell.id` (instead of just running once on mount) keeps SPA navigation
 * between groups honest.
 */
watch(
  () => shell.value?.id ?? null,
  (groupId) => {
    if (!import.meta.client) return
    if (!groupId) return
    void markReadBySubject({ group_id: groupId })
  },
  { immediate: true },
)

onMounted(() => {
  if (!import.meta.client) return
  // Shell is already hydrated via useAsyncData, so usePostsFeed's internal watcher
  // never fires for the initial load (it only reacts to changes). Kick off the feed
  // explicitly if we're already a member.
  if (groupFeedEnabled.value && !posts.value.length) {
    void feedRefresh()
  }
  registerReplyPostedHandler()
  startGroupFeedAutoRefresh()
})

onActivated(() => {
  if (!import.meta.client) return
  registerReplyPostedHandler()
  startGroupFeedAutoRefresh()
  if (posts.value.length > 0) {
    setTimeout(() => void softRefreshNewer(), 300)
  } else if (groupFeedEnabled.value) {
    void feedRefresh()
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
