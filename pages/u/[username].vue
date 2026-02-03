<template>
  <div class="w-full">
    <div v-if="notFound" class="mx-auto max-w-3xl py-10">
      <div class="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
        This account doesn't exist
      </div>
      <div class="mt-2 text-sm text-gray-600 dark:text-gray-300">
        Check the username and try again.
      </div>
    </div>

    <div v-else-if="apiError" class="mx-auto max-w-3xl py-10">
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
        :show-follow-counts="showFollowCounts"
        :follower-count="followSummary?.followerCount ?? 0"
        :following-count="followSummary?.followingCount ?? 0"
        @open-image="(p) => openFromEvent(p.event, p.url, p.title, p.kind)"
        @edit="editOpen = true"
        @open-followers="openFollowers"
        @open-following="openFollowing"
        @followed="onFollowed"
        @unfollowed="onUnfollowed"
      />

      <!-- Pinned post -->
      <div class="-mx-4 mt-3 mb-4">
        <ClientOnly>
          <template #fallback>
            <div class="min-h-0" aria-hidden="true" />
          </template>
          <template v-if="pinnedPostForDisplay">
            <div class="flex flex-col gap-0">
              <div class="flex flex-wrap items-center justify-between gap-2 pl-4 pr-1 pt-0 pb-1">
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
                <AppFeedPostRow :post="pinnedPostForDisplay" @deleted="onPinnedPostDeleted" />
              </div>
            </div>
          </template>
          <div v-else class="min-h-0" aria-hidden="true" />
        </ClientOnly>
      </div>

      <!-- Posts -->
      <div class="mx-auto max-w-3xl pb-5">
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

        <ClientOnly>
          <template #fallback>
            <div class="flex justify-center pt-12 pb-8">
              <AppLogoLoader />
            </div>
          </template>
          <div>
            <div v-if="profileError" class="mt-3 text-sm text-red-700 dark:text-red-300">
              {{ profileError }}
            </div>

            <div v-else-if="profileCtaKind === 'verify'" class="mt-4">
              <AppAccessGateCard kind="verify" />
            </div>

            <div v-else-if="profileCtaKind === 'premium'" class="mt-4">
              <AppAccessGateCard kind="premium" />
            </div>

            <div v-else-if="profileLoading && profilePosts.length === 0" class="flex justify-center pt-12 pb-8">
              <AppLogoLoader />
            </div>

            <div v-else-if="profileHasLoadedOnce && profilePosts.length === 0 && !pinnedPost" class="mt-3 text-sm text-gray-500 dark:text-gray-400">
              No posts yet.
            </div>

            <div v-else class="relative mt-3 -mx-4">
              <div v-for="p in postsWithoutPinned" :key="p.id">
                <AppFeedPostRow :post="p" @deleted="profileRemovePost" />
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
</template>

<script setup lang="ts">
import type { PublicProfile } from '~/composables/usePublicProfile'

import type { FollowRelationship } from '~/types/api'
import type { ProfilePostsFilter } from '~/utils/post-visibility'
import { visibilityTagClasses, postHighlightClasses } from '~/utils/post-visibility'

definePageMeta({
  layout: 'app',
  title: 'Profile'
})

const route = useRoute()
const usernameParam = computed(() => String(route.params.username || ''))
const normalizedUsername = computed(() => usernameParam.value.trim().toLowerCase())

const { profile, data, notFound, apiError } = await usePublicProfile(normalizedUsername)
useProfileSeo({ profile, normalizedUsername, notFound })

const { header: appHeader } = useAppHeader()
const profileName = computed(() => profile.value?.name || profile.value?.username || 'User')
if (!notFound.value && profile.value) {
  appHeader.value = {
    title: profileName.value,
    verifiedStatus: profile.value.verifiedStatus ?? null,
    premium: profile.value.premium ?? null,
    postCount: null,
  }
}

const { user: authUser, me: refetchMe } = useAuth()
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

const {
  posts: profilePosts,
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
  hasLoadedOnce: profileHasLoadedOnce,
} = useUserPosts(normalizedUsername, {
  enabled: computed(() => !notFound.value),
  defaultToNewestAndAll: true,
})

const {
  pinnedPost,
  pinnedPostForDisplay,
  pinnedReplyToUsername,
  pinnedPostData,
  refreshPinnedPost,
} = useProfilePinnedPost({ normalizedUsername, effectivePinnedPostId, profilePosts })

const postsWithoutPinned = computed(() => {
  const list = profilePosts.value ?? []
  const pid = effectivePinnedPostId.value
  if (!pid) return list
  return list.filter((p) => p.id !== pid)
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
  return { viewerFollowsUser: s.viewerFollowsUser, userFollowsViewer: s.userFollowsViewer }
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

const middleScrollerEl = useMiddleScroller()
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
function patchPublicProfile(patch: Partial<Pick<PublicProfile, 'name' | 'bio' | 'avatarUrl' | 'bannerUrl'>>) {
  if (!data.value) return
  data.value = { ...(data.value as PublicProfile), ...patch }
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
