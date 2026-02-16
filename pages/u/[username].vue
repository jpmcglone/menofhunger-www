<template>
  <!-- Profile pages use the app-standard gutter (px-4). Banner cancels it for full-bleed. -->
  <AppPageContent bottom="standard">
  <div class="w-full">
    <div v-if="notFound" class="px-4 mx-auto max-w-3xl py-10">
      <div class="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
        This account doesn't exist
      </div>
      <div class="mt-2 text-sm text-gray-600 dark:text-gray-300">
        Check the username and try again.
      </div>
    </div>

    <div v-else-if="apiError" class="px-4 mx-auto max-w-3xl py-10">
      <div class="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
        Something went wrong
      </div>
      <div class="mt-2 text-sm text-gray-700 dark:text-gray-300">
        We couldn't load this profile. Please try again.
      </div>
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <NuxtLink to="/status" class="text-sm font-medium moh-text underline underline-offset-2">
          Check status
        </NuxtLink>
        <button
          type="button"
          class="text-sm font-medium moh-text-muted hover:opacity-90 underline underline-offset-2"
          @click="reloadPage"
        >
          Try again
        </button>
      </div>
    </div>

    <div v-else>
      <!-- Client-only: header uses UI primitives (tooltips/menus/dialogs) that can SSR-hydrate inconsistently. -->
      <ClientOnly>
        <template #fallback>
          <div>
            <div class="aspect-[3.25/1] w-full bg-gray-200 dark:bg-zinc-900" />
            <div class="mx-auto max-w-3xl px-4 pb-5 pt-14">
              <div class="h-20" />
            </div>
          </div>
        </template>
        <AppProfileHeader
          :profile="profile"
          :profile-name="profileName"
          :profile-avatar-url="profileAvatarUrl"
          :profile-banner-url="profileBannerUrl"
          :hide-banner-thumb="hideBannerThumb"
          :hide-avatar-thumb="hideAvatarThumb"
          :hide-avatar-during-banner="hideAvatarDuringBanner"
          :relationship-tag-label="relationshipTagLabel"
          :is-self="isSelf"
          :follow-relationship="followRelationship"
          :nudge="followSummary?.nudge ?? null"
          :show-follow-counts="showFollowCounts"
          :follower-count="followSummary?.followerCount ?? 0"
          :following-count="followSummary?.followingCount ?? 0"
          @open-image="onOpenProfileImage"
          @edit="editOpen = true"
          @open-followers="goToFollowers"
          @open-following="goToFollowing"
          @followed="onFollowed"
          @unfollowed="onUnfollowed"
          @nudge-updated="onNudgeUpdated"
        />
      </ClientOnly>

      <!-- Pinned post -->
      <div class="mt-3 mb-4">
        <ClientOnly>
          <template #fallback>
            <div class="min-h-0" aria-hidden="true" />
          </template>
          <template v-if="pinnedPostForDisplay">
            <div class="flex flex-col gap-0">
              <div class="flex flex-wrap items-center justify-between gap-2 px-4 pt-0 pb-1">
                <NuxtLink
                  v-if="pinnedReplyToUsername"
                  :to="`/p/${pinnedPostForDisplay.id}`"
                  class="text-sm text-gray-500 hover:underline dark:text-gray-400"
                >
                  Replying to @{{ pinnedReplyToUsername }}
                  <span class="ml-1 text-xs opacity-80">View thread</span>
                </NuxtLink>
                <span v-else class="flex-1" />
                <span
                  :class="['rounded border px-2 py-0.5 text-[11px] font-semibold', pinnedBadgeClasses(pinnedPostForDisplay.visibility)]"
                >
                  Pinned
                </span>
              </div>
              <div
                :class="['rounded-none overflow-hidden', postHighlightClasses(pinnedPostForDisplay.visibility)]"
              >
                <AppFeedPostRow :post="pinnedPostForDisplay" @deleted="onPinnedPostDeleted" @edited="onProfilePostEdited" />
              </div>
            </div>
          </template>
          <div v-else class="min-h-0" aria-hidden="true" />
        </ClientOnly>
      </div>

      <!-- Posts -->
      <div class="mx-auto max-w-3xl">
        <div class="px-4">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">
              Posts
              <span v-if="profileHasLoadedOnce" class="ml-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                {{ profileCounts?.all ?? 0 }}
              </span>
            </div>

            <AppFeedFiltersBar
              :sort="profileSort ?? 'new'"
              :filter="profileFilter ?? 'all'"
              :viewer-is-verified="profileViewerIsVerified ?? false"
              :viewer-is-premium="profileViewerIsPremium ?? false"
              :show-reset="(profileFilter ?? 'all') !== 'all' || (profileSort ?? 'new') !== 'new'"
              @update:sort="onUserPostsSortChange"
              @update:filter="onUserPostsFilterChange"
              @reset="onUserPostsReset"
            />
          </div>
        </div>

        <ClientOnly>
          <template #fallback>
            <div class="flex justify-center pt-12 pb-8">
              <AppLogoLoader />
            </div>
          </template>
          <div>
            <div v-if="profileError" class="px-4 mt-3 text-sm text-red-700 dark:text-red-300">
              {{ profileError }}
            </div>

            <div v-else-if="profileCtaKind === 'verify'" class="px-4 mt-4">
              <AppAccessGateCard kind="verify" />
            </div>

            <div v-else-if="profileCtaKind === 'premium'" class="px-4 mt-4">
              <AppAccessGateCard kind="premium" />
            </div>

            <div v-else-if="profileLoading && profilePosts.length === 0" class="flex justify-center pt-12 pb-8">
              <AppLogoLoader />
            </div>

            <div v-else-if="profileHasLoadedOnce && profilePosts.length === 0 && !pinnedPost" class="px-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
              No posts yet.
            </div>

            <div v-else class="relative mt-3">
              <template v-for="item in itemsWithoutPinned" :key="item.kind === 'ad' ? item.key : item.post.id">
                <AppFeedFakeAdRow v-if="item.kind === 'ad'" />
                <AppFeedPostRow
                  v-else
                  :post="item.post"
                  :collapsed-sibling-replies-count="profileCollapsedSiblingReplyCountFor(item.post)"
                  :reply-count-for-parent-id="profileReplyCountForParentId"
                  :replies-sort="profileSort ?? 'new'"
                  @deleted="profileRemovePost"
                  @edited="onProfilePostEdited"
                />
              </template>

              <!-- Load more when sentinel nears bottom of scroll area -->
              <div v-if="profileNextCursor" class="relative flex justify-center items-center px-4 py-6 min-h-12">
                <div
                  ref="profileLoadMoreSentinelEl"
                  class="absolute bottom-0 left-0 right-0 h-px"
                  aria-hidden="true"
                />
                <div
                  class="transition-opacity duration-150"
                  :class="profileLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'"
                  :aria-hidden="!profileLoading"
                >
                  <AppLogoLoader compact />
                </div>
              </div>
            </div>
          </div>
        </ClientOnly>
      </div>

      <AppProfileFollowListDialog
        v-model="followersOpen"
        header="Followers"
        :users="followers"
        :loading="followersLoading"
        :error="followersError"
        empty-text="No followers yet."
        :next-cursor="followersNextCursor"
        :expected-total-count="showFollowCounts ? (followSummary?.followerCount ?? null) : null"
        @load-more="loadMoreFollowers"
      />

      <AppProfileFollowListDialog
        v-model="followingOpen"
        header="Following"
        :users="following"
        :loading="followingLoading"
        :error="followingError"
        empty-text="Not following anyone yet."
        :next-cursor="followingNextCursor"
        :expected-total-count="showFollowCounts ? (followSummary?.followingCount ?? null) : null"
        @load-more="loadMoreFollowing"
      />

      <AppProfileEditProfileDialog
        v-model="editOpen"
        :profile="profile"
        :is-self="isSelf"
        :profile-avatar-url="profileAvatarUrl"
        :profile-banner-url="profileBannerUrl"
        @patch-profile="patchPublicProfile"
      />
    </div>
  </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { PublicProfile } from '~/composables/usePublicProfile'

import type { FollowRelationship } from '~/types/api'
import type { ProfilePostsFilter } from '~/utils/post-visibility'
import { visibilityTagClasses, postHighlightClasses } from '~/utils/post-visibility'

definePageMeta({
  layout: 'app',
  title: 'Profile',
})

const route = useRoute()
const usernameParam = computed(() => String(route.params.username || ''))
const normalizedUsername = computed(() => usernameParam.value.trim().toLowerCase())
const baseProfilePath = computed(() => `/u/${encodeURIComponent(usernameParam.value)}`)
const isFollowersRoute = computed(() => /\/followers\/?$/.test(route.path))
const isFollowingRoute = computed(() => /\/following\/?$/.test(route.path))

const { profile, data, notFound, apiError } = await usePublicProfile(normalizedUsername)
useProfileSeo({ profile, normalizedUsername, notFound })

const { header: appHeader } = useAppHeader()
const profileName = computed(() => profile.value?.name || profile.value?.username || 'User')
if (!notFound.value && profile.value) {
  appHeader.value = {
    title: profileName.value,
    verifiedStatus: profile.value.verifiedStatus ?? null,
    premium: profile.value.premium ?? null,
    premiumPlus: profile.value.premiumPlus ?? null,
    stewardBadgeEnabled: profile.value.stewardBadgeEnabled ?? null,
    postCount: null,
  }
}

const { user: authUser, me: refetchMe } = useAuth()
const usersStore = useUsersStore()
const { invalidateUserPreviewCache } = useUserPreview()
const { markReadBySubject } = useNotifications()
watch(
  () => [profile.value?.id, authUser.value?.id] as const,
  ([profileId, uid]) => {
    if (profileId && uid) markReadBySubject({ user_id: profileId })
  },
  { immediate: true },
)

const isSelf = computed(() => Boolean(authUser.value?.id && profile.value?.id && authUser.value.id === profile.value.id))

const effectivePinnedPostId = computed(() => {
  const profilePid = profile.value?.pinnedPostId ?? null
  if (isSelf.value && authUser.value?.pinnedPostId !== undefined) {
    return authUser.value.pinnedPostId ?? null
  }
  return profilePid
})

const showAds = computed(() => !authUser.value?.premium)

const {
  posts: profilePosts,
  displayPosts: profileDisplayPosts,
  displayItems: profileDisplayItems,
  collapsedSiblingReplyCountFor: profileCollapsedSiblingReplyCountFor,
  replyCountForParentId: profileReplyCountForParentId,
  counts: profileCounts,
  loading: profileLoading,
  error: profileError,
  filter: profileFilter,
  sort: profileSort,
  viewerIsVerified: profileViewerIsVerified,
  viewerIsPremium: profileViewerIsPremium,
  ctaKind: profileCtaKind,
  setFilter: profileSetFilter,
  setSort: profileSetSort,
  removePost: profileRemovePost,
  replacePost: profileReplacePost,
  hasLoadedOnce: profileHasLoadedOnce,
  nextCursor: profileNextCursor,
  loadMore: profileLoadMore,
} = useUserPosts(normalizedUsername, {
  enabled: computed(() => !notFound.value),
  defaultToNewestAndAll: true,
  showAds,
})

function onProfilePostEdited(payload: { id: string; post: import('~/types/api').FeedPost }) {
  profileReplacePost(payload.post)
}

const {
  pinnedPost,
  pinnedPostForDisplay,
  pinnedReplyToUsername,
  pinnedPostData,
  refreshPinnedPost,
} = useProfilePinnedPost({ normalizedUsername, effectivePinnedPostId, profilePosts })

const itemsWithoutPinned = computed(() => {
  const list = profileDisplayItems.value ?? []
  const pid = effectivePinnedPostId.value
  if (!pid) return list
  return list.filter((item) => item.kind !== 'post' || item.post.id !== pid)
})

function pinnedBadgeClasses(visibility: import('~/types/api').PostVisibility): string {
  const tag = visibilityTagClasses(visibility)
  if (tag) return tag
  return 'border border-gray-400/50 bg-gray-800/70 text-white dark:border-gray-500/50 dark:bg-gray-200/20 dark:text-gray-100'
}

const { apiFetchData } = useApiClient()
async function onPinnedPostDeleted(id: string) {
  if (effectivePinnedPostId.value !== id) return
  try {
    await apiFetchData<{ pinnedPostId: null }>('/users/me/pinned-post', { method: 'DELETE' })
    await refetchMe()
  } catch {
    // ignore
  }
  refreshPinnedPost()
  profileRemovePost(id)
}

const { apiFetch } = useApiClient()
const {
  data: followSummaryData,
  refresh: refreshFollowSummary,
} = await useAsyncData(`follow-summary:${normalizedUsername.value}`, async () => {
  if (notFound.value) return null
  return await apiFetchData<import('~/types/api').FollowSummaryResponse>(
    `/follows/summary/${encodeURIComponent(normalizedUsername.value)}`,
    { method: 'GET' }
  )
})

watch(
  () => authUser.value?.id ?? null,
  () => void refreshFollowSummary(),
  { flush: 'post' }
)

const followSummary = computed(() => followSummaryData.value ?? null)
const followRelationship = computed<FollowRelationship | null>(() => {
  const s = followSummary.value
  if (!s) return null
  return {
    viewerFollowsUser: s.viewerFollowsUser,
    userFollowsViewer: s.userFollowsViewer,
    viewerPostNotificationsEnabled: s.viewerPostNotificationsEnabled,
  }
})

const relationshipTagLabel = computed(() => {
  if (isSelf.value) return null
  const s = followSummary.value
  if (!s) return null
  if (s.userFollowsViewer && s.viewerFollowsUser) return 'You follow each other'
  if (s.userFollowsViewer) return 'Follows you'
  return null
})

const followState = useFollowState()
watch(
  [() => profile.value?.id, followRelationship],
  ([id, rel]) => {
    if (!id || !rel) return
    followState.set(id, rel)
  },
  { immediate: true }
)

const showFollowCounts = computed(() => {
  if (!profile.value?.id) return false
  if (!followSummary.value) return false
  return isSelf.value || followSummary.value.canView
})

// Realtime nudges: if you are already viewing this user's profile and they nudge you,
// update the local followSummary.nudge immediately so the header shows "Nudge back",
// then refresh from the API to keep outbound/inbound state consistent.
const { addNotificationsCallback, removeNotificationsCallback } = usePresence()
const notificationsCb = {
  onNew: (payload: any) => {
    const n = payload?.notification ?? null
    if (!n || n.kind !== 'nudge') return
    const actorUsername = (n.actor?.username ?? '').trim().toLowerCase()
    if (!actorUsername) return
    if (actorUsername !== normalizedUsername.value) return
    if (isSelf.value) return

    const s = followSummaryData.value
    if (s) {
      const prev = s.nudge ?? { outboundPending: false, inboundPending: false, inboundNotificationId: null, outboundExpiresAt: null }
      followSummaryData.value = {
        ...s,
        nudge: {
          ...prev,
          inboundPending: true,
          inboundNotificationId: n.id ?? prev.inboundNotificationId ?? null,
        },
      }
    }

    void refreshFollowSummary()
  },
} as const

if (import.meta.client) {
  onMounted(() => addNotificationsCallback(notificationsCb as any))
  onBeforeUnmount(() => removeNotificationsCallback(notificationsCb as any))
}

function onFollowed() {
  const s = followSummary.value
  if (!s || s.followerCount === null) return
  followSummaryData.value = { ...s, viewerFollowsUser: true, followerCount: s.followerCount + 1 }
}

function onUnfollowed() {
  const s = followSummary.value
  if (!s || s.followerCount === null) return
  followSummaryData.value = { ...s, viewerFollowsUser: false, followerCount: Math.max(0, s.followerCount - 1) }
}

function onNudgeUpdated(next: import('~/types/api').NudgeState | null) {
  const s = followSummaryData.value
  if (!s) return
  followSummaryData.value = { ...s, nudge: next }
  // Reconcile with server state (cooldowns / inbound IDs) without a visible flicker.
  void refreshFollowSummary()
}

const {
  followersOpen,
  followers,
  followersNextCursor,
  followersLoading,
  followersError,
  followingOpen,
  following,
  followingNextCursor,
  followingLoading,
  followingError,
  openFollowers,
  openFollowing,
  loadMoreFollowers,
  loadMoreFollowing,
} = useProfileFollowDialogs(normalizedUsername)

function goToFollowers() {
  void navigateTo(`${baseProfilePath.value}/followers`)
}
function goToFollowing() {
  void navigateTo(`${baseProfilePath.value}/following`)
}

// Route-driven modal state:
// - Visiting /u/:username/followers or /following opens the correct modal immediately.
// - Closing the modal navigates back to /u/:username.
watch(
  [isFollowersRoute, isFollowingRoute],
  ([followersRoute, followingRoute]) => {
    if (followersRoute) {
      followingOpen.value = false
      openFollowers()
      return
    }
    if (followingRoute) {
      followersOpen.value = false
      openFollowing()
      return
    }
    // Base route: ensure both are closed.
    followersOpen.value = false
    followingOpen.value = false
  },
  { immediate: true },
)

watch(
  followersOpen,
  (open) => {
    if (open) return
    if (isFollowersRoute.value) void navigateTo(baseProfilePath.value)
  },
)
watch(
  followingOpen,
  (open) => {
    if (open) return
    if (isFollowingRoute.value) void navigateTo(baseProfilePath.value)
  },
)

const middleScrollerEl = useMiddleScroller()
const profileLoadMoreSentinelEl = ref<HTMLElement | null>(null)

let profileLoadMoreObs: IntersectionObserver | null = null
watch(
  [profileLoadMoreSentinelEl, middleScrollerEl, () => profileNextCursor.value],
  ([sentinel, scrollRoot]) => {
    if (!import.meta.client) return
    profileLoadMoreObs?.disconnect()
    profileLoadMoreObs = null
    const el = sentinel as HTMLElement | null
    const root = scrollRoot as HTMLElement | null
    if (!el || !root || !profileNextCursor.value) return
    profileLoadMoreObs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) profileLoadMore()
      },
      { root, rootMargin: '400px', threshold: 0 },
    )
    profileLoadMoreObs.observe(el)
  },
  { immediate: true, flush: 'post' },
)
onBeforeUnmount(() => {
  profileLoadMoreObs?.disconnect()
  profileLoadMoreObs = null
})

async function preserveMiddleScrollAfter<T>(fn: () => Promise<T>): Promise<T> {
  if (!import.meta.client) return await fn()
  const scroller = middleScrollerEl.value
  if (!scroller) return await fn()
  const prevTop = scroller.scrollTop
  const res = await fn()
  await nextTick()
  const el = middleScrollerEl.value
  if (!el?.parentNode) return res
  const maxTop = Math.max(0, el.scrollHeight - el.clientHeight)
  el.scrollTop = Math.min(prevTop, maxTop)
  return res
}

async function onUserPostsSortChange(next: 'new' | 'trending') {
  await preserveMiddleScrollAfter(() => profileSetSort(next))
}

async function onUserPostsFilterChange(next: ProfilePostsFilter) {
  const safeNext = next === 'onlyMe' ? 'all' : (next as 'all' | 'public' | 'verifiedOnly' | 'premiumOnly')
  await preserveMiddleScrollAfter(() => profileSetFilter(safeNext))
}

async function onUserPostsReset() {
  await preserveMiddleScrollAfter(async () => {
    await profileSetFilter('all')
    await profileSetSort('new')
  })
}

const profileAvatarUrl = computed(() => profile.value?.avatarUrl ?? null)
const profileBannerUrl = computed(() => profile.value?.bannerUrl ?? null)

const viewer = useImageLightbox()
const { openFromEvent } = viewer
const hideBannerThumb = computed(() => viewer.visible.value && viewer.kind.value === 'banner')
const hideAvatarThumb = computed(() => viewer.visible.value && viewer.kind.value === 'avatar')
const hideAvatarDuringBanner = computed(() => viewer.visible.value && viewer.kind.value === 'banner')

const editOpen = ref(false)

function onOpenProfileImage(payload: {
  event: MouseEvent
  url: string
  title: string
  kind: 'avatar' | 'banner'
  isOrganization?: boolean
}) {
  if (payload.kind === 'avatar') {
    void openFromEvent(payload.event, payload.url, payload.title, payload.kind, {
      avatarBorderRadius: payload.isOrganization ? '16%' : '9999px',
    })
    return
  }
  void openFromEvent(payload.event, payload.url, payload.title, payload.kind)
}

function patchPublicProfile(patch: Partial<Pick<
  PublicProfile,
  'name' | 'bio' | 'avatarUrl' | 'bannerUrl' | 'website' | 'locationDisplay' | 'locationCity' | 'locationCounty' | 'locationState' | 'locationCountry'
>>) {
  if (!data.value) return
  data.value = { ...(data.value as PublicProfile), ...patch }
  const profileId = profile.value?.id ?? authUser.value?.id ?? null
  if (profileId) {
    usersStore.upsert({
      id: profileId,
      username: profile.value?.username ?? authUser.value?.username ?? null,
      name: (patch.name ?? profile.value?.name ?? authUser.value?.name) ?? null,
      bio: (patch.bio ?? profile.value?.bio ?? authUser.value?.bio) ?? null,
      avatarUrl: (patch.avatarUrl ?? profile.value?.avatarUrl ?? authUser.value?.avatarUrl) ?? null,
      bannerUrl: (patch.bannerUrl ?? profile.value?.bannerUrl ?? authUser.value?.bannerUrl) ?? null,
      premium: profile.value?.premium ?? authUser.value?.premium,
      premiumPlus: profile.value?.premiumPlus ?? authUser.value?.premiumPlus,
      verifiedStatus: profile.value?.verifiedStatus ?? authUser.value?.verifiedStatus,
      pinnedPostId: profile.value?.pinnedPostId ?? authUser.value?.pinnedPostId ?? null,
    })
  }
  const currentUsername = normalizedUsername.value
  if (currentUsername) invalidateUserPreviewCache(currentUsername)
}

watch(
  [notFound, profileName, () => profile.value?.verifiedStatus, () => profile.value?.premium, () => profileCounts?.value?.all],
  ([nf, name, status, premium, count]) => {
    if (nf) {
      appHeader.value = { title: 'Account not found', verifiedStatus: null, premium: null, postCount: null }
      return
    }
    appHeader.value = {
      title: name,
      verifiedStatus: status ?? null,
      premium: premium ?? null,
      postCount: typeof count === 'number' ? count : null,
    }
  },
  { immediate: true }
)

function reloadPage() {
  if (import.meta.client) globalThis.location?.reload()
}

onBeforeUnmount(() => {
  if (appHeader.value?.title === profileName.value) appHeader.value = null
})
</script>
