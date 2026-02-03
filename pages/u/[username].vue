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

    <div v-else-if="apiError" class="mx-auto max-w-3xl py-10">
      <div class="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
        Something went wrong
      </div>
      <div class="mt-2 text-sm text-gray-600 dark:text-gray-300">
        We couldn’t load this profile. Please try again.
      </div>
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <NuxtLink to="/status" class="text-sm font-medium moh-text underline underline-offset-2">
          Check status
        </NuxtLink>
        <button
          type="button"
          class="text-sm font-medium moh-text-muted hover:opacity-90 underline underline-offset-2"
          @click="() => window.location.reload()"
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

      <!-- Pinned post: edge-to-edge (no horizontal margin), same highlight (left bar + tint) as selected post on /p/:id. -->
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
            <!-- Match loader markup so SSR and first client paint are identical (avoids hydration mismatch). -->
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
  pinnedPostId?: string | null
}

const route = useRoute()
const usernameParam = computed(() => String(route.params.username || ''))
const normalizedUsername = computed(() => usernameParam.value.trim().toLowerCase())

const { apiFetch, apiFetchData } = useApiClient()
import type { FollowListUser, FollowRelationship, FollowSummaryResponse, GetFollowsListData, PostVisibility } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { filterPillClasses, postHighlightClasses, visibilityTagClasses } from '~/utils/post-visibility'

const { data, error } = await useAsyncData(`public-profile:${normalizedUsername.value}`, async () => {
  return await apiFetchData<PublicProfile>(
    `/users/${encodeURIComponent(normalizedUsername.value)}`,
    { method: 'GET' }
  )
})

const profile = computed(() => data.value ?? null)
const notFound = computed(() => {
  const e: any = error.value
  if (!e) return false
  if (e?.statusCode === 404) return true
  const msg = (getApiErrorMessage(e) || e?.message || '').toString()
  return /not found/i.test(msg)
})

const apiError = computed(() => {
  if (!error.value) return false
  if (notFound.value) return false
  return true
})

if (import.meta.server && error.value && !notFound.value) {
  const e: any = error.value
  const status = Number(e?.statusCode ?? e?.status ?? e?.response?.status ?? 0)
  if (status >= 500 || status === 0) {
    const event = useRequestEvent()
    if (event) setResponseStatus(event, 503)
  }
}

const { header: appHeader } = useAppHeader()
const profileName = computed(() => profile.value?.name || profile.value?.username || 'User')
// Set header as soon as we have profile so layout title matches on SSR (avoids "Profile" vs "John McGlone" hydration mismatch).
if (!notFound.value && profile.value) {
  appHeader.value = {
    title: profileName.value,
    verifiedStatus: profile.value.verifiedStatus ?? null,
    premium: profile.value.premium ?? null,
    postCount: null,
  }
}

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
  const u = (profile.value?.username ?? normalizedUsername.value).trim()
  const verified = profile.value?.verifiedStatus && profile.value.verifiedStatus !== 'none'
  const premium = profile.value?.premium === true
  const badges: string[] = []
  if (verified) badges.push('Verified')
  if (premium) badges.push('Premium')
  const badgeSuffix = badges.length ? ` ${badges.join(' · ')}.` : ''
  if (bio) return `${excerpt(bio, 220)}${badgeSuffix}`
  if (u) return `View @${u} on ${siteConfig.name}.${badgeSuffix}`
  return `View a profile on ${siteConfig.name}.${badgeSuffix}`
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

const { user: authUser, me: refetchMe } = useAuth()

// Mark notifications whose subject is this user as read (fire-and-forget)
const { markReadBySubject } = useNotifications()
watch(
  () => [profile.value?.id, authUser.value?.id] as const,
  ([profileId, uid]) => {
    if (profileId && uid) markReadBySubject({ user_id: profileId })
  },
  { immediate: true },
)

const isSelf = computed(() => Boolean(authUser.value?.id && profile.value?.id && authUser.value.id === profile.value.id))

// Pinned post: use auth user's value when viewing own profile (so pin/unpin updates without refetch).
const effectivePinnedPostId = computed(() => {
  const profilePid = profile.value?.pinnedPostId ?? null
  // When viewing your own profile, auth state is the source of truth for immediate pin/unpin UX.
  // `pinnedPostId` can be:
  // - string (pinned)
  // - null (explicitly unpinned)
  // - undefined (not loaded yet; fall back to profile)
  if (isSelf.value && authUser.value?.pinnedPostId !== undefined) {
    return authUser.value.pinnedPostId ?? null
  }
  return profilePid
})

// Pinned post and posts load after the page (client-only). Profile metadata above is SSR-only.
const pinnedPostKey = computed(() => `profile-pinned-post:${normalizedUsername.value}:${effectivePinnedPostId.value ?? ''}`)
const {
  data: pinnedPostData,
  refresh: refreshPinnedPost,
} = useLazyAsyncData(
  () => pinnedPostKey.value,
  async () => {
    const id = effectivePinnedPostId.value
    if (!id) return null
    try {
      return await apiFetchData<import('~/types/api').FeedPost>(
        `/posts/${encodeURIComponent(id)}`,
        { method: 'GET' }
      )
    } catch {
      return null
    }
  },
  { server: false, watch: [pinnedPostKey] }
)
const pinnedPost = computed(() => pinnedPostData.value ?? null)

/** Pinned post for display: when it's a reply, omit parent so we show only the reply (no thread). */
const pinnedPostForDisplay = computed(() => {
  const p = pinnedPost.value
  if (!p) return null
  if (!p.parent) return p
  const { parent: _parent, ...rest } = p
  return { ...rest } as import('~/types/api').FeedPost
})

/** When the pinned post is a reply, the parent author's username (for "Replying to @username"). */
const pinnedReplyToUsername = computed(() => {
  const p = pinnedPost.value
  const username = p?.parent?.author?.username
  return typeof username === 'string' && username.trim() ? username.trim() : null
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

// If the pinned post is already in the feed, show it immediately (no wait for refetch).
watch(
  effectivePinnedPostId,
  (pid) => {
    if (!pid) {
      pinnedPostData.value = null
      return
    }
    const list = profilePosts.value ?? []
    const post = list.find((p) => p.id === pid)
    if (post) pinnedPostData.value = post
  },
  { immediate: true }
)

const postsWithoutPinned = computed(() => {
  const list = profilePosts.value ?? []
  const pid = effectivePinnedPostId.value
  if (!pid) return list
  return list.filter((p) => p.id !== pid)
})

function pinnedBadgeClasses(visibility: PostVisibility): string {
  const tag = visibilityTagClasses(visibility)
  if (tag) return tag
  return 'border border-gray-400/50 bg-gray-800/70 text-white dark:border-gray-500/50 dark:bg-gray-200/20 dark:text-gray-100'
}

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

// Filter UI is handled by AppFeedFiltersBar (shared with Home).
const middleScrollerEl = useMiddleScroller()

async function preserveMiddleScrollAfter<T>(fn: () => Promise<T>): Promise<T> {
  if (!import.meta.client) return await fn()
  const scroller = middleScrollerEl.value
  if (!scroller) return await fn()

  const prevTop = scroller.scrollTop
  const res = await fn()
  await nextTick()

  // Don't mutate DOM if scroller was unmounted during the update (avoids parentNode null errors).
  const el = middleScrollerEl.value
  if (!el?.parentNode) return res
  const maxTop = Math.max(0, el.scrollHeight - el.clientHeight)
  el.scrollTop = Math.min(prevTop, maxTop)
  return res
}

async function onUserPostsSortChange(next: 'new' | 'trending') {
  await preserveMiddleScrollAfter(async () => {
    await profileSetSort(next)
  })
}

async function onUserPostsFilterChange(next: ProfilePostsFilter) {
  // Profile feeds should not expose "Only me" (private) as a filter option.
  // If it ever comes through (e.g. shared component typing), coerce to a safe default.
  if (next === 'onlyMe') next = 'all'
  await preserveMiddleScrollAfter(async () => {
    await profileSetFilter(next as 'all' | 'public' | 'verifiedOnly' | 'premiumOnly')
  })
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
    const res = await apiFetch<GetFollowsListData>(`/follows/${encodeURIComponent(normalizedUsername.value)}/followers`, {
      method: 'GET',
      query: { limit: 30, ...(cursor ? { cursor } : {}) }
    })
    const users = res.data ?? []
    followState.ingest(users)
    if (reset) followers.value = users
    else followers.value = [...followers.value, ...users]
    followersNextCursor.value = res.pagination?.nextCursor ?? null
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
    const res = await apiFetch<GetFollowsListData>(`/follows/${encodeURIComponent(normalizedUsername.value)}/following`, {
      method: 'GET',
      query: { limit: 30, ...(cursor ? { cursor } : {}) }
    })
    const users = res.data ?? []
    followState.ingest(users)
    if (reset) following.value = users
    else following.value = [...following.value, ...users]
    followingNextCursor.value = res.pagination?.nextCursor ?? null
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

const editOpen = ref(false)
function patchPublicProfile(patch: Partial<Pick<PublicProfile, 'name' | 'bio' | 'avatarUrl' | 'bannerUrl'>>) {
  if (!data.value) return
  data.value = { ...(data.value as PublicProfile), ...patch }
}

onBeforeUnmount(() => {
  if (appHeader.value?.title === profileName.value) appHeader.value = null
})
</script>

