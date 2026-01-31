<template>
  <div class="w-full">
    <div v-if="notFound" class="mx-auto max-w-3xl py-10">
      <div class="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
        This account doesn’t exist
      </div>
      <div class="mt-2 text-sm text-gray-600 dark:text-gray-300">
        Check the username and try again.
      </div>
    </div>

    <template v-else>
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

      <!-- Posts -->
      <div class="mx-auto max-w-3xl pb-5">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">
            Posts
            <span class="ml-2 text-xs font-medium text-gray-500 dark:text-gray-400">
              {{ userPosts.counts.value.all }}
            </span>
          </div>

          <AppFeedFiltersBar
            :sort="userPosts.sort.value"
            :filter="userPosts.filter.value"
            :viewer-is-verified="userPosts.viewerIsVerified.value"
            :viewer-is-premium="userPosts.viewerIsPremium.value"
            :show-reset="userPosts.filter.value !== 'all' || userPosts.sort.value !== 'new'"
            @update:sort="onUserPostsSortChange"
            @update:filter="onUserPostsFilterChange"
            @reset="onUserPostsReset"
          />
        </div>

        <div v-if="userPosts.error.value" class="mt-3 text-sm text-red-700 dark:text-red-300">
          {{ userPosts.error.value }}
        </div>

        <div v-else-if="userPosts.ctaKind.value === 'verify'" class="mt-4">
          <AppAccessGateCard kind="verify" />
        </div>

        <div v-else-if="userPosts.ctaKind.value === 'premium'" class="mt-4">
          <AppAccessGateCard kind="premium" />
        </div>

        <div v-else-if="userPosts.posts.value.length === 0" class="mt-3 text-sm text-gray-500 dark:text-gray-400">
          No posts yet.
        </div>

        <div v-else class="relative mt-3 -mx-4">
          <div v-for="p in userPosts.posts.value" :key="p.id">
            <AppFeedPostRow :post="p" @deleted="userPosts.removePost" />
          </div>
        </div>
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

    </template>
  </div>
</template>

<script setup lang="ts">
import { siteConfig } from '~/config/site'
import { excerpt, normalizeForMeta } from '~/utils/text'

definePageMeta({
  layout: 'app',
  title: 'Profile'
})

type PublicProfile = {
  id: string
  username: string | null
  name: string | null
  bio: string | null
  premium: boolean
  verifiedStatus: 'none' | 'identity' | 'manual'
  avatarUrl?: string | null
  bannerUrl?: string | null
}

const route = useRoute()
const usernameParam = computed(() => String(route.params.username || ''))
const normalizedUsername = computed(() => usernameParam.value.trim().toLowerCase())

const { apiFetchData } = useApiClient()
import type { FollowListUser, FollowRelationship, FollowSummaryResponse, GetFollowsListResponse } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { filterPillClasses } from '~/utils/post-visibility'

const { data, error } = await useAsyncData(`public-profile:${normalizedUsername.value}`, async () => {
  const result = await apiFetchData<{ user: PublicProfile }>(
    `/users/${encodeURIComponent(normalizedUsername.value)}`,
    { method: 'GET' }
  )
  return result.user
})

const profile = computed(() => data.value ?? null)
const notFound = computed(() => {
  const e: any = error.value
  if (!e) return false
  if (e?.statusCode === 404) return true
  const msg = (getApiErrorMessage(e) || e?.message || '').toString()
  return /not found/i.test(msg)
})

const canonicalPath = computed(() => `/u/${encodeURIComponent(normalizedUsername.value)}`)

const seoTitle = computed(() => {
  if (notFound.value) return 'User not found'
  const u = (profile.value?.username ?? normalizedUsername.value).trim()
  const name = (profile.value?.name ?? '').trim()
  if (u && name) return `${name} (@${u})`
  if (u) return `@${u}`
  return 'Profile'
})

const seoDescription = computed(() => {
  if (notFound.value) return 'This profile does not exist.'
  const bio = (profile.value?.bio ?? '').trim()
  if (bio) return excerpt(bio, 220)
  const u = (profile.value?.username ?? normalizedUsername.value).trim()
  return u ? `View @${u} on ${siteConfig.name}.` : `View a profile on ${siteConfig.name}.`
})

const seoImage = computed(() => {
  if (!profile.value) return '/images/banner.png'
  // Prefer avatar for "this is a person" previews.
  return profile.value.avatarUrl || profile.value.bannerUrl || '/images/banner.png'
})

const seoImageAlt = computed(() => {
  const u = (profile.value?.username ?? normalizedUsername.value).trim()
  if (!u) return `Profile on ${siteConfig.name}`
  const name = (profile.value?.name ?? '').trim()
  return name ? `${name} (@${u})` : `@${u}`
})

const twitterCard = computed(() => {
  // If we're using an avatar, use the square `summary` card (looks much better than stretching into 1200x630).
  const img = (seoImage.value || '').toString()
  const avatar = (profile.value?.avatarUrl ?? '').toString()
  if (avatar && img === avatar) return 'summary' as const
  return 'summary_large_image' as const
})

const jsonLdGraph = computed(() => {
  if (notFound.value || !profile.value?.username) return []

  const u = profile.value.username.trim()
  const url = `${siteConfig.url}/u/${encodeURIComponent(u)}`
  const bio = (profile.value.bio ?? '').trim()

  return [
    {
      '@type': 'Person',
      '@id': `${url}#person`,
      url,
      name: (profile.value.name ?? `@${u}`).trim(),
      description: bio ? excerpt(bio, 300) : undefined,
      image: profile.value.avatarUrl || undefined,
    }
  ]
})

usePageSeo({
  title: seoTitle,
  description: seoDescription,
  canonicalPath,
  ogType: 'profile',
  image: seoImage,
  imageAlt: seoImageAlt,
  twitterCard,
  noindex: computed(() => notFound.value),
  jsonLdGraph,
})

useHead({
  meta: computed(() => {
    if (notFound.value) return []
    const u = (profile.value?.username ?? normalizedUsername.value).trim()
    if (!u) return []
    // OpenGraph "profile" hints (harmless if crawlers ignore it).
    return [{ property: 'profile:username', content: u }]
  }),
})

const { user: authUser } = useAuth()

const isSelf = computed(() => Boolean(authUser.value?.id && profile.value?.id && authUser.value.id === profile.value.id))

const followState = useFollowState()

const {
  data: followSummaryData,
  refresh: refreshFollowSummary,
} = await useAsyncData(`follow-summary:${normalizedUsername.value}`, async () => {
  // If profile doesn't exist, don't fetch follow summary.
  if (notFound.value) return null
  const res = await apiFetchData<FollowSummaryResponse>(`/follows/summary/${encodeURIComponent(normalizedUsername.value)}`, {
    method: 'GET'
  })
  return res
})

watch(
  () => authUser.value?.id ?? null,
  () => {
    // Follow summary is viewer-relative; refresh on login/logout.
    void refreshFollowSummary()
  },
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

// Keep the follow-state store in sync for the profile user (so buttons across the app match).
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
  if (!s) return
  if (s.followerCount === null) return
  followSummaryData.value = { ...s, viewerFollowsUser: true, followerCount: s.followerCount + 1 }
}

function onUnfollowed() {
  const s = followSummary.value
  if (!s) return
  if (s.followerCount === null) return
  followSummaryData.value = { ...s, viewerFollowsUser: false, followerCount: Math.max(0, s.followerCount - 1) }
}

const userPosts = await useUserPosts(normalizedUsername, {
  enabled: computed(() => !notFound.value),
  defaultToNewestAndAll: true,
})
const { header: appHeader } = useAppHeader()

// Filter UI is handled by AppFeedFiltersBar (shared with Home).
const middleScrollerEl = useMiddleScroller()

async function preserveMiddleScrollAfter<T>(fn: () => Promise<T>): Promise<T> {
  if (!import.meta.client) return await fn()
  const scroller = middleScrollerEl.value
  if (!scroller) return await fn()

  const prevTop = scroller.scrollTop
  const res = await fn()
  await nextTick()

  // If the content got shorter, clamp to the new max scrollTop.
  const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
  scroller.scrollTop = Math.min(prevTop, maxTop)
  return res
}

async function onUserPostsSortChange(next: 'new' | 'trending') {
  await preserveMiddleScrollAfter(async () => {
    await userPosts.setSort(next)
  })
}

async function onUserPostsFilterChange(next: ProfilePostsFilter) {
  // Profile feeds should not expose "Only me" (private) as a filter option.
  // If it ever comes through (e.g. shared component typing), coerce to a safe default.
  if (next === 'onlyMe') next = 'all'
  await preserveMiddleScrollAfter(async () => {
    await userPosts.setFilter(next as Parameters<typeof userPosts.setFilter>[0])
  })
}

async function onUserPostsReset() {
  await preserveMiddleScrollAfter(async () => {
    await userPosts.setFilter('all')
    await userPosts.setSort('new')
  })
}

const profileName = computed(() => profile.value?.name || profile.value?.username || 'User')
const profileAvatarUrl = computed(() => profile.value?.avatarUrl ?? null)
const profileBannerUrl = computed(() => profile.value?.bannerUrl ?? null)

const viewer = useImageLightbox()
const { openFromEvent } = viewer

const hideBannerThumb = computed(() => viewer.visible.value && viewer.kind.value === 'banner')
const hideAvatarThumb = computed(() => viewer.visible.value && viewer.kind.value === 'avatar')
const hideAvatarDuringBanner = computed(() => viewer.visible.value && viewer.kind.value === 'banner')

const followersOpen = ref(false)
const followers = ref<FollowListUser[]>([])
const followersNextCursor = ref<string | null>(null)
const followersLoading = ref(false)
const followersError = ref<string | null>(null)

const followingOpen = ref(false)
const following = ref<FollowListUser[]>([])
const followingNextCursor = ref<string | null>(null)
const followingLoading = ref(false)
const followingError = ref<string | null>(null)

async function loadFollowers(reset = false) {
  if (followersLoading.value) return
  followersLoading.value = true
  followersError.value = null
  try {
    const cursor = reset ? null : followersNextCursor.value
    const res = await apiFetchData<GetFollowsListResponse>(`/follows/${encodeURIComponent(normalizedUsername.value)}/followers`, {
      method: 'GET',
      query: { limit: 30, ...(cursor ? { cursor } : {}) }
    })
    followState.ingest(res.users)
    if (reset) followers.value = res.users
    else followers.value = [...followers.value, ...res.users]
    followersNextCursor.value = res.nextCursor
  } catch (e: unknown) {
    followersError.value = getApiErrorMessage(e) || 'Failed to load followers.'
  } finally {
    followersLoading.value = false
  }
}

async function loadFollowing(reset = false) {
  if (followingLoading.value) return
  followingLoading.value = true
  followingError.value = null
  try {
    const cursor = reset ? null : followingNextCursor.value
    const res = await apiFetchData<GetFollowsListResponse>(`/follows/${encodeURIComponent(normalizedUsername.value)}/following`, {
      method: 'GET',
      query: { limit: 30, ...(cursor ? { cursor } : {}) }
    })
    followState.ingest(res.users)
    if (reset) following.value = res.users
    else following.value = [...following.value, ...res.users]
    followingNextCursor.value = res.nextCursor
  } catch (e: unknown) {
    followingError.value = getApiErrorMessage(e) || 'Failed to load following.'
  } finally {
    followingLoading.value = false
  }
}

function openFollowers() {
  followersOpen.value = true
  if (followers.value.length === 0) void loadFollowers(true)
}

function openFollowing() {
  followingOpen.value = true
  if (following.value.length === 0) void loadFollowing(true)
}

function loadMoreFollowers() {
  if (!followersNextCursor.value) return
  void loadFollowers(false)
}

function loadMoreFollowing() {
  if (!followingNextCursor.value) return
  void loadFollowing(false)
}

watch(
  [notFound, profileName, () => profile.value?.verifiedStatus, () => profile.value?.premium, () => userPosts.counts.value.all],
  ([nf, name, status, premium, count]) => {
    if (nf) {
      appHeader.value = { title: 'Account not found', verifiedStatus: null, postCount: null }
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

const editOpen = ref(false)
function patchPublicProfile(patch: Partial<Pick<PublicProfile, 'name' | 'bio' | 'avatarUrl' | 'bannerUrl'>>) {
  if (!data.value) return
  data.value = { ...(data.value as PublicProfile), ...patch }
}

onBeforeUnmount(() => {
  if (appHeader.value?.title === profileName.value) appHeader.value = null
})
</script>

