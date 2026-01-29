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
    <!-- Full-bleed profile header (cancel app layout padding) -->
    <div class="-mx-4 -mt-4 relative">
      <div class="group relative aspect-[3/1] w-full bg-gray-200 dark:bg-zinc-900">
        <img
          v-if="profileBannerUrl"
          v-show="!hideBannerThumb"
          :src="profileBannerUrl"
          alt=""
          class="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        >
        <div
          v-if="profileBannerUrl"
          v-show="!hideBannerThumb"
          class="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/20"
          aria-hidden="true"
        />
        <button
          v-if="profileBannerUrl"
          v-show="!hideBannerThumb"
          type="button"
          class="absolute inset-0 cursor-zoom-in"
          aria-label="View banner"
          @click="openFromEvent($event, profileBannerUrl, 'Banner', 'banner')"
        />
      </div>

      <div
        :class="[
          'absolute left-4 bottom-0 translate-y-1/2 transition-opacity duration-200',
          hideAvatarDuringBanner ? 'opacity-0 pointer-events-none' : 'opacity-100'
        ]"
      >
        <div class="group relative ring-4 ring-white dark:ring-black rounded-full">
          <AppAvatarCircle
            v-show="!hideAvatarThumb"
            :src="profileAvatarUrl"
            :name="profile?.name ?? null"
            :username="profile?.username ?? null"
            size-class="h-28 w-28"
            bg-class="bg-gray-200 dark:bg-zinc-800"
          />
          <div
            v-if="profileAvatarUrl"
            v-show="!hideAvatarThumb"
            class="pointer-events-none absolute inset-0 rounded-full bg-black/0 transition-colors duration-200 group-hover:bg-black/20"
            aria-hidden="true"
          />
          <button
            v-if="profileAvatarUrl"
            v-show="!hideAvatarThumb"
            type="button"
            class="absolute inset-0 cursor-zoom-in"
            aria-label="View avatar"
            @click="openFromEvent($event, profileAvatarUrl, 'Avatar', 'avatar')"
          />
        </div>
      </div>
    </div>

    <div class="mx-auto max-w-3xl pb-5 pt-16">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <div class="flex items-center gap-2 min-w-0">
            <div class="text-2xl font-bold leading-none text-gray-900 dark:text-gray-50 truncate">
              {{ profileName }}
            </div>
            <AppVerifiedBadge :status="profile?.verifiedStatus" :premium="profile?.premium" />
          </div>
          <div class="mt-1 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <div class="truncate">
              @{{ profile?.username }}
            </div>
            <span
              v-if="relationshipTagLabel"
              class="shrink-0 inline-flex items-center rounded-md bg-gray-200/70 px-2.5 py-1 text-[10px] font-semibold leading-none text-gray-800 dark:bg-zinc-800/80 dark:text-zinc-200"
            >
              {{ relationshipTagLabel }}
            </span>
          </div>
        </div>

        <div class="shrink-0">
          <Button
            v-if="isSelf"
            label="Edit profile"
            icon="pi pi-pencil"
            severity="secondary"
            rounded
            @click="editOpen = true"
          />
          <AppFollowButton
            v-else-if="profile?.id"
            :user-id="profile.id"
            :username="profile.username"
            :initial-relationship="followRelationship"
            @followed="onFollowed"
            @unfollowed="onUnfollowed"
          />
        </div>
      </div>

      <div v-if="showFollowCounts" class="mt-4 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
        <button type="button" class="hover:underline" @click="openFollowers">
          <span class="font-semibold text-gray-900 dark:text-gray-50 tabular-nums">{{ followSummary?.followerCount ?? 0 }}</span>
          Followers
        </button>
        <button type="button" class="hover:underline" @click="openFollowing">
          <span class="font-semibold text-gray-900 dark:text-gray-50 tabular-nums">{{ followSummary?.followingCount ?? 0 }}</span>
          Following
        </button>
      </div>

      <div v-if="profile?.bio" class="mt-4 whitespace-pre-wrap text-gray-800 dark:text-gray-200">
        {{ profile.bio }}
      </div>
      <div v-else class="mt-4 text-sm text-gray-500 dark:text-gray-400">
        No bio yet.
      </div>

      <!-- Posts -->
      <div class="mt-8">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">
            Posts
            <span class="ml-2 text-xs font-medium text-gray-500 dark:text-gray-400">
              {{ userPosts.counts.value.all }}
            </span>
          </div>

          <div class="flex items-center gap-2 text-xs">
            <button
              type="button"
              class="rounded-full px-3 py-1 border transition-colors"
              :class="filterButtonClass('all')"
              @click="userPosts.setFilter('all')"
            >
              All <span class="ml-1 tabular-nums opacity-80">{{ userPosts.counts.value.all }}</span>
            </button>

            <button
              type="button"
              class="rounded-full px-3 py-1 border transition-colors"
              :class="filterButtonClass('public')"
              @click="userPosts.setFilter('public')"
            >
              Public <span class="ml-1 tabular-nums opacity-80">{{ userPosts.counts.value.public }}</span>
            </button>

            <button
              type="button"
              class="rounded-full px-3 py-1 border transition-colors flex items-center gap-1"
              :class="filterButtonClass('verifiedOnly')"
              @click="userPosts.setFilter('verifiedOnly')"
            >
              Verified
              <span class="tabular-nums opacity-80">{{ userPosts.counts.value.verifiedOnly }}</span>
              <span
                v-if="!userPosts.viewerIsVerified.value"
                class="ml-1 font-mono text-[10px] leading-none opacity-80"
                aria-hidden="true"
              >
                LOCKED
              </span>
            </button>

            <button
              type="button"
              class="rounded-full px-3 py-1 border transition-colors flex items-center gap-1"
              :class="filterButtonClass('premiumOnly')"
              @click="userPosts.setFilter('premiumOnly')"
            >
              Premium
              <span class="tabular-nums opacity-80">{{ userPosts.counts.value.premiumOnly }}</span>
              <span
                v-if="!userPosts.viewerIsPremium.value"
                class="ml-1 font-mono text-[10px] leading-none opacity-80"
                aria-hidden="true"
              >
                LOCKED
              </span>
            </button>
          </div>
        </div>

        <div v-if="userPosts.error.value" class="mt-3 text-sm text-red-700 dark:text-red-300">
          {{ userPosts.error.value }}
        </div>

        <div v-else-if="userPosts.ctaKind.value === 'verify'" class="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
          <div class="font-semibold text-gray-900 dark:text-gray-50">Verified members only</div>
          <div class="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Verify your account to view verified-only posts.
          </div>
          <div class="mt-3">
            <Button label="Go to settings" severity="secondary" @click="navigateTo('/settings')" />
          </div>
        </div>

        <div v-else-if="userPosts.ctaKind.value === 'premium'" class="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
          <div class="font-semibold text-gray-900 dark:text-gray-50">Premium required</div>
          <div class="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Upgrade to premium to view premium-only posts.
          </div>
          <div class="mt-3">
            <Button label="Go to settings" severity="secondary" @click="navigateTo('/settings')" />
          </div>
        </div>

        <div v-else-if="userPosts.posts.value.length === 0" class="mt-3 text-sm text-gray-500 dark:text-gray-400">
          No posts yet.
        </div>

        <div v-else class="relative mt-3 -mx-4">
          <div v-for="p in userPosts.posts.value" :key="p.id">
            <AppPostRow :post="p" @deleted="userPosts.removePost" />
          </div>
        </div>
      </div>
    </div>

    <Dialog v-model:visible="followersOpen" modal header="Followers" :draggable="false" :style="{ width: 'min(38rem, 96vw)' }">
      <div class="space-y-3">
        <AppInlineAlert v-if="followersError" severity="danger">
          {{ followersError }}
        </AppInlineAlert>

        <div v-else-if="followersLoading && followers.length === 0" class="text-sm text-gray-600 dark:text-gray-300">
          Loading…
        </div>

        <div v-else-if="followers.length === 0" class="text-sm text-gray-600 dark:text-gray-300">
          No followers yet.
        </div>

        <div v-else class="-mx-4 divide-y divide-gray-200 dark:divide-zinc-800">
          <AppUserRow v-for="u in followers" :key="u.id" :user="u" />
        </div>

        <div v-if="followersNextCursor" class="flex justify-center pt-2">
          <Button
            label="Load more"
            severity="secondary"
            :loading="followersLoading"
            :disabled="followersLoading"
            @click="loadMoreFollowers"
          />
        </div>
      </div>
    </Dialog>

    <Dialog v-model:visible="followingOpen" modal header="Following" :draggable="false" :style="{ width: 'min(38rem, 96vw)' }">
      <div class="space-y-3">
        <AppInlineAlert v-if="followingError" severity="danger">
          {{ followingError }}
        </AppInlineAlert>

        <div v-else-if="followingLoading && following.length === 0" class="text-sm text-gray-600 dark:text-gray-300">
          Loading…
        </div>

        <div v-else-if="following.length === 0" class="text-sm text-gray-600 dark:text-gray-300">
          Not following anyone yet.
        </div>

        <div v-else class="-mx-4 divide-y divide-gray-200 dark:divide-zinc-800">
          <AppUserRow v-for="u in following" :key="u.id" :user="u" />
        </div>

        <div v-if="followingNextCursor" class="flex justify-center pt-2">
          <Button
            label="Load more"
            severity="secondary"
            :loading="followingLoading"
            :disabled="followingLoading"
            @click="loadMoreFollowing"
          />
        </div>
      </div>
    </Dialog>

    <Dialog
      v-model:visible="editOpen"
      modal
      :draggable="false"
      :closable="false"
      :style="{ width: 'min(46rem, 96vw)' }"
    >
      <template #header>
        <div class="flex w-full items-center justify-between gap-3">
          <Button
            icon="pi pi-times"
            text
            severity="secondary"
            aria-label="Close"
            :disabled="saving"
            @click="editOpen = false"
          />
          <div class="text-lg font-semibold text-gray-900 dark:text-gray-50">
            Edit profile
          </div>
          <Button
            label="Save"
            severity="secondary"
            :loading="saving"
            :disabled="saving"
            @click="saveProfile"
          />
        </div>
      </template>

      <div class="space-y-4">
        <!-- Keep the banner clipped/rounded, but let the avatar overflow (like the real profile header). -->
        <div class="relative rounded-2xl border border-gray-200 bg-white dark:border-zinc-800 dark:bg-black/20">
          <div class="overflow-hidden rounded-2xl">
            <div class="relative">
              <div class="aspect-[3/1] w-full bg-gray-200 dark:bg-zinc-900">
                <img
                  v-if="editBannerPreviewUrl"
                  :src="editBannerPreviewUrl"
                  alt=""
                  class="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                >
              </div>

              <div class="absolute right-3 top-3">
                <Button
                  :icon="pendingBannerFile ? 'pi pi-times' : 'pi pi-camera'"
                  rounded
                  severity="secondary"
                  :aria-label="pendingBannerFile ? 'Reset banner change' : 'Edit banner'"
                  :disabled="saving"
                  @click="pendingBannerFile ? clearPendingBanner() : openBannerPicker()"
                />
              </div>

              <div
                v-if="pendingBannerFile"
                class="absolute inset-x-0 bottom-0 px-3 py-2"
              >
                <div
                  class="mx-auto w-fit rounded-lg bg-black/45 px-2.5 py-1 text-xs font-semibold text-white shadow-sm"
                  style="text-shadow: 0 1px 2px rgba(0,0,0,.55);"
                >
                  Pending
                </div>
              </div>
            </div>
          </div>

          <div class="absolute left-4 bottom-0 z-10 translate-y-1/2">
            <div class="relative h-28 w-28 overflow-hidden rounded-full bg-gray-200 ring-4 ring-white dark:bg-zinc-800 dark:ring-black">
              <img
                v-if="editAvatarPreviewUrl"
                :src="editAvatarPreviewUrl"
                alt=""
                class="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              >

              <div class="absolute inset-0 flex items-center justify-center">
                <Button
                  :icon="pendingAvatarFile ? 'pi pi-times' : 'pi pi-camera'"
                  rounded
                  severity="secondary"
                  :aria-label="pendingAvatarFile ? 'Reset avatar change' : 'Edit avatar'"
                  :disabled="saving"
                  @click="pendingAvatarFile ? clearPendingAvatar() : openAvatarPicker()"
                />
              </div>

              <div
                v-if="pendingAvatarFile"
                class="absolute inset-x-0 bottom-0 px-2 pb-2"
              >
                <div
                  class="mx-auto w-fit rounded-lg bg-black/45 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm"
                  style="text-shadow: 0 1px 2px rgba(0,0,0,.55);"
                >
                  Pending
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Spacer so the form doesn't sit under the overhanging avatar -->
        <div class="h-16" aria-hidden="true" />

        <input
          ref="bannerInputEl"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          class="hidden"
          @change="onBannerInputChange"
        >
        <input
          ref="avatarInputEl"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          class="hidden"
          @change="onAvatarInputChange"
        >

        <Dialog v-model:visible="cropOpen" modal header="Crop avatar" :draggable="false" :style="{ width: 'min(60rem, 96vw)' }">
          <div class="grid gap-4 sm:grid-cols-[1fr_16rem]">
            <div class="min-w-0 rounded-xl border border-gray-200 bg-white p-3 dark:border-zinc-800 dark:bg-black/20">
              <ClientOnly>
                <Cropper
                  v-if="cropSrc"
                  ref="cropperRef"
                  class="h-[24rem] w-full min-w-0"
                  :src="cropSrc"
                  :stencil-component="CircleStencil"
                  :stencil-props="{ aspectRatio: 1 }"
                  :canvas="{ width: 640, height: 640 }"
                  image-restriction="stencil"
                  :default-size="avatarDefaultSize"
                  :default-position="avatarDefaultPosition"
                  @ready="onCropperReady"
                  @change="onCropChange"
                />
              </ClientOnly>
            </div>

            <div class="space-y-3">
              <div class="text-sm font-medium text-gray-800 dark:text-gray-200">
                Preview
              </div>
              <div class="mx-auto h-32 w-32 overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-800">
                <img v-if="cropPreviewUrl" :src="cropPreviewUrl" alt="" class="h-full w-full object-cover" />
              </div>
              <AppInlineAlert severity="info" title="Tip">
                We recommend using <span class="font-semibold">Auto</span> to frame your face.
              </AppInlineAlert>
              <div class="flex justify-center">
                <Button
                  label="Auto (recommended)"
                  icon="pi pi-bolt"
                  severity="success"
                  class="w-full"
                  :loading="faceDetecting"
                  :disabled="saving || !cropSrc || faceDetecting"
                  @click="autoCropFace"
                />
              </div>
              <AppInlineAlert v-if="faceDetectError" severity="warning">
                {{ faceDetectError }}
              </AppInlineAlert>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                This is how your avatar will appear. The saved image remains a square (best for future layouts), but it’s displayed as a circle.
              </div>
            </div>
          </div>

          <template #footer>
            <Button label="Cancel" text severity="secondary" :disabled="saving" @click="cancelCrop" />
            <Button label="Apply" icon="pi pi-check" severity="secondary" :disabled="!cropHasSelection || saving" @click="applyCrop" />
          </template>
        </Dialog>

        <Dialog v-model:visible="bannerCropOpen" modal header="Crop banner" :draggable="false" :style="{ width: 'min(72rem, 96vw)' }">
          <div class="space-y-3">
            <div class="min-w-0 rounded-xl border border-gray-200 bg-white p-3 dark:border-zinc-800 dark:bg-black/20">
              <ClientOnly>
                <Cropper
                  v-if="bannerCropSrc"
                  ref="bannerCropperRef"
                  class="h-[22rem] w-full min-w-0"
                  :src="bannerCropSrc"
                  :stencil-props="{ aspectRatio: 3 }"
                  :canvas="{ width: 1500, height: 500 }"
                  image-restriction="stencil"
                  :default-size="bannerDefaultSize"
                  :default-position="bannerDefaultPosition"
                  @ready="onBannerCropperReady"
                  @change="onBannerCropChange"
                />
              </ClientOnly>
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              Banners must be 3:1. We’ll save a 1500×500 image.
            </div>
          </div>

          <template #footer>
            <Button label="Cancel" text severity="secondary" :disabled="saving" @click="cancelBannerCrop" />
            <Button label="Apply" icon="pi pi-check" severity="secondary" :disabled="!bannerCropHasSelection || saving" @click="applyBannerCrop" />
          </template>
        </Dialog>

        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Name</label>
          <InputText v-model="editName" class="w-full" :maxlength="50" />
          <div class="text-xs text-gray-500 dark:text-gray-400 flex justify-end">
            {{ editName.trim().length }}/50
          </div>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Bio</label>
          <Textarea
            v-model="editBio"
            class="w-full"
            rows="4"
            autoResize
            :maxlength="160"
            placeholder="Tell people a bit about yourself…"
          />
          <div class="text-xs text-gray-500 dark:text-gray-400 flex justify-end">
            {{ editBio.trim().length }}/160
          </div>
        </div>

        <AppInlineAlert v-if="editError" severity="danger">
          {{ editError }}
        </AppInlineAlert>
      </div>
    </Dialog>

    <AppImageLightbox
      :visible="viewer.visible.value"
      :backdrop-visible="viewer.backdropVisible.value"
      :src="viewer.src.value"
      :alt="viewer.alt.value"
      :target="viewer.target.value"
      :image-style="viewer.imageStyle.value"
      :on-close="viewer.close"
      :on-transition-end="viewer.onTransitionEnd"
    />
    </template>
  </div>
</template>

<script setup lang="ts">
import { siteConfig } from '~/config/site'

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

function normalizeForMeta(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

function excerpt(text: string, maxLen: number) {
  const t = normalizeForMeta(text)
  if (t.length <= maxLen) return t
  return `${t.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`
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

const userPosts = await useUserPosts(normalizedUsername, { enabled: computed(() => !notFound.value) })
const { header: appHeader } = useAppHeader()

function filterButtonClass(kind: Parameters<typeof userPosts.setFilter>[0]) {
  return filterPillClasses(kind, userPosts.filter.value === kind)
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
const editName = ref('')
const editBio = ref('')
const editError = ref<string | null>(null)
const saving = ref(false)

import { Cropper, CircleStencil } from 'vue-advanced-cropper'

// We stage avatar changes locally (preview) and only upload/commit when the user hits Save.
const avatarInputEl = ref<HTMLInputElement | null>(null)
const pendingAvatarFile = ref<File | null>(null)
const pendingAvatarPreviewUrl = ref<string | null>(null)

// Banner staged upload
const bannerInputEl = ref<HTMLInputElement | null>(null)
const pendingBannerFile = ref<File | null>(null)
const pendingBannerPreviewUrl = ref<string | null>(null)

// Crop step (Twitter-like): choose file -> crop -> stage cropped file
const cropOpen = ref(false)
const cropSrc = ref<string | null>(null)
const cropPreviewUrl = ref<string | null>(null)
const cropHasSelection = ref(false)
const cropOriginalFile = ref<File | null>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cropperRef = ref<any>(null)
let cropPreviewRaf: number | null = null
const autoFaceOnOpen = ref(true)

const faceDetecting = ref(false)
const faceDetectError = ref<string | null>(null)
let faceDetector: any | null = null

// Default crop: as large as possible and centered.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const avatarDefaultSize = ({ imageSize }: any) => {
  const size = Math.floor(Math.min(imageSize.width, imageSize.height) * 0.98)
  return { width: size, height: size }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const avatarDefaultPosition = ({ coordinates, imageSize }: any) => {
  return {
    left: Math.round(imageSize.width / 2 - coordinates.width / 2),
    top: Math.round(imageSize.height / 2 - coordinates.height / 2),
  }
}

const pendingAvatarFileName = computed(() => pendingAvatarFile.value?.name ?? null)
const editAvatarPreviewUrl = computed(() => pendingAvatarPreviewUrl.value || profileAvatarUrl.value)
const pendingBannerFileName = computed(() => pendingBannerFile.value?.name ?? null)
const editBannerPreviewUrl = computed(() => pendingBannerPreviewUrl.value || profileBannerUrl.value)

function clearPendingAvatar() {
  pendingAvatarFile.value = null
  if (pendingAvatarPreviewUrl.value) {
    URL.revokeObjectURL(pendingAvatarPreviewUrl.value)
    pendingAvatarPreviewUrl.value = null
  }
  if (avatarInputEl.value) avatarInputEl.value.value = ''
}

function clearPendingBanner() {
  pendingBannerFile.value = null
  if (pendingBannerPreviewUrl.value) {
    URL.revokeObjectURL(pendingBannerPreviewUrl.value)
    pendingBannerPreviewUrl.value = null
  }
  if (bannerInputEl.value) bannerInputEl.value.value = ''
}

function clearCropState() {
  cropOpen.value = false
  cropHasSelection.value = false
  cropOriginalFile.value = null
  faceDetectError.value = null
  autoFaceOnOpen.value = true
  if (cropPreviewRaf) {
    cancelAnimationFrame(cropPreviewRaf)
    cropPreviewRaf = null
  }
  if (cropSrc.value) {
    URL.revokeObjectURL(cropSrc.value)
    cropSrc.value = null
  }
  if (cropPreviewUrl.value) {
    URL.revokeObjectURL(cropPreviewUrl.value)
    cropPreviewUrl.value = null
  }
  cropperRef.value = null
}

function stageAvatarFile(file: File) {
  // Clean up old preview URL (if any).
  if (pendingAvatarPreviewUrl.value) URL.revokeObjectURL(pendingAvatarPreviewUrl.value)
  pendingAvatarFile.value = file
  pendingAvatarPreviewUrl.value = URL.createObjectURL(file)
}

function stageBannerFile(file: File) {
  if (pendingBannerPreviewUrl.value) URL.revokeObjectURL(pendingBannerPreviewUrl.value)
  pendingBannerFile.value = file
  pendingBannerPreviewUrl.value = URL.createObjectURL(file)
}

// Banner crop state
const bannerCropOpen = ref(false)
const bannerCropSrc = ref<string | null>(null)
const bannerCropHasSelection = ref(false)
const bannerCropOriginalFile = ref<File | null>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const bannerCropperRef = ref<any>(null)
const bannerMaxOnOpen = ref(true)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const bannerDefaultSize = ({ imageSize }: any) => {
  // Use the largest possible 3:1 crop (max area), constrained by the image bounds.
  const width = Number(imageSize?.width ?? 0)
  const height = Number(imageSize?.height ?? 0)
  if (!width || !height) return { width: 0, height: 0 }

  // Maximum 3:1 rectangle that fits inside the image.
  const w = Math.floor(Math.min(width, height * 3))
  const h = Math.floor(w / 3)
  return { width: w, height: h }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const bannerDefaultPosition = ({ coordinates, imageSize }: any) => {
  return {
    left: Math.round(imageSize.width / 2 - coordinates.width / 2),
    top: Math.round(imageSize.height / 2 - coordinates.height / 2),
  }
}

function clearBannerCropState() {
  bannerCropOpen.value = false
  bannerCropHasSelection.value = false
  bannerCropOriginalFile.value = null
  bannerMaxOnOpen.value = true
  if (bannerCropSrc.value) {
    URL.revokeObjectURL(bannerCropSrc.value)
    bannerCropSrc.value = null
  }
  bannerCropperRef.value = null
}

function openBannerCropForFile(file: File) {
  clearBannerCropState()
  bannerCropOriginalFile.value = file
  bannerCropSrc.value = URL.createObjectURL(file)
  bannerCropOpen.value = true
  bannerCropHasSelection.value = true
  bannerMaxOnOpen.value = true
}

async function onBannerCropperReady() {
  // Ensure the 3:1 crop starts at the absolute max size.
  if (!bannerMaxOnOpen.value) return
  bannerMaxOnOpen.value = false

  const cropper = bannerCropperRef.value
  if (!cropper?.setCoordinates) return

  cropper.setCoordinates(({ imageSize, coordinates }: any) => {
    const width = Number(imageSize?.width ?? 0)
    const height = Number(imageSize?.height ?? 0)
    if (!width || !height) return coordinates

    // Maximum 3:1 rectangle inside the image.
    const w = Math.floor(Math.min(width, height * 3))
    const h = Math.floor(w / 3)
    return {
      width: w,
      height: h,
      left: Math.round(width / 2 - w / 2),
      top: Math.round(height / 2 - h / 2),
    }
  })
}

function openBannerPicker() {
  bannerInputEl.value?.click()
}

function onBannerInputChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  if (!file) return
  handleBannerSelectedFile(file)
}

function handleBannerSelectedFile(file: File) {
  if (!isSelf.value) return

  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp'])
  if (!allowed.has(file.type)) {
    editError.value = 'Unsupported image type. Please upload a JPG, PNG, or WebP.'
    clearPendingBanner()
    return
  }
  if (file.size > 8 * 1024 * 1024) {
    editError.value = 'Banner is too large (max 8MB).'
    clearPendingBanner()
    return
  }

  editError.value = null
  openBannerCropForFile(file)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function onBannerCropChange(e: any) {
  const canvas: HTMLCanvasElement | null = e?.canvas ?? null
  bannerCropHasSelection.value = Boolean(canvas)
}

function cancelBannerCrop() {
  clearBannerCropState()
  clearPendingBanner()
}

async function applyBannerCrop() {
  if (!bannerCropHasSelection.value) return
  const cropper = bannerCropperRef.value
  const result = cropper?.getResult?.()
  const canvas: HTMLCanvasElement | null = result?.canvas ?? null
  if (!canvas) return

  const original = bannerCropOriginalFile.value
  const outType = (original?.type === 'image/png' || original?.type === 'image/webp') ? original.type : 'image/jpeg'

  const blob: Blob | null = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), outType, outType === 'image/jpeg' ? 0.9 : undefined)
  })
  if (!blob) {
    editError.value = 'Failed to crop banner.'
    return
  }

  const ext = outType === 'image/png' ? 'png' : outType === 'image/webp' ? 'webp' : 'jpg'
  const filename = `banner.${ext}`
  const croppedFile = new File([blob], filename, { type: outType })
  stageBannerFile(croppedFile)
  clearBannerCropState()
}

function openCropForFile(file: File) {
  clearCropState()
  cropOriginalFile.value = file
  cropSrc.value = URL.createObjectURL(file)
  cropOpen.value = true
  cropHasSelection.value = true
  // Auto-face by default when opening.
  autoFaceOnOpen.value = true
}

async function ensureFaceDetector() {
  if (faceDetector) return faceDetector
  // Lazy-load on client only.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import('@mediapipe/tasks-vision')
  const FilesetResolver = mod.FilesetResolver
  const FaceDetector = mod.FaceDetector

  const vision = await FilesetResolver.forVisionTasks(
    // WASM root
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
  )

  // BlazeFace short range model hosted by Google. (Client-only; no server involvement.)
  faceDetector = await FaceDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
    },
    runningMode: 'IMAGE',
    minDetectionConfidence: 0.5,
  })

  return faceDetector
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

async function onCropperReady() {
  // When the cropper opens, default to smart face crop if possible.
  if (!autoFaceOnOpen.value) return
  autoFaceOnOpen.value = false
  await autoCropFace()
}

async function autoCropFace() {
  if (!cropSrc.value) return
  if (!cropperRef.value?.setCoordinates) return

  faceDetecting.value = true
  faceDetectError.value = null
  try {
    const detector = await ensureFaceDetector()

    // Load the selected image into an ImageBitmap for detection.
    const srcFile = cropOriginalFile.value
    if (!srcFile) {
      faceDetectError.value = 'Auto crop is unavailable. You can still crop manually.'
      return
    }
    const bitmap = await createImageBitmap(srcFile)

    const res = detector.detect(bitmap)
    // Pick the most confident face (fallback to largest if scores missing).
    const detections = res?.detections ?? []
    if (!detections.length) {
      faceDetectError.value = 'No face detected. You can still crop manually.'
      return
    }

    const best = detections
      .slice()
      .sort((a: any, b: any) => {
        const sa = a?.categories?.[0]?.score ?? 0
        const sb = b?.categories?.[0]?.score ?? 0
        if (sb !== sa) return sb - sa
        const ba = a?.boundingBox
        const bb = b?.boundingBox
        const aa = (ba?.width ?? 0) * (ba?.height ?? 0)
        const ab = (bb?.width ?? 0) * (bb?.height ?? 0)
        return ab - aa
      })[0]

    const bb = best?.boundingBox
    const x = bb?.originX ?? bb?.origin_x ?? bb?.x ?? 0
    const y = bb?.originY ?? bb?.origin_y ?? bb?.y ?? 0
    const w = bb?.width ?? 0
    const h = bb?.height ?? 0

    if (!w || !h) {
      faceDetectError.value = 'Face detected, but crop info was unavailable. You can still crop manually.'
      return
    }

    // Build a square crop centered on the face, padded so it includes head/shoulders.
    const cx = x + w / 2
    const cy = y + h / 2
    const padding = 2.2 // Twitter-ish: face + some context
    let size = Math.max(w, h) * padding
    size = Math.min(size, bitmap.width, bitmap.height)

    let left = cx - size / 2
    let top = cy - size / 2
    left = clamp(left, 0, bitmap.width - size)
    top = clamp(top, 0, bitmap.height - size)

    cropperRef.value.setCoordinates({
      width: Math.round(size),
      height: Math.round(size),
      left: Math.round(left),
      top: Math.round(top),
    })
  } catch (e: unknown) {
    faceDetectError.value =
      'Auto crop is unavailable in this browser/session. You can still crop manually.'
  } finally {
    faceDetecting.value = false
  }
}

function openAvatarPicker() {
  avatarInputEl.value?.click()
}

function onAvatarInputChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  if (!file) return
  handleAvatarSelectedFile(file)
}

function handleAvatarSelectedFile(file: File) {
  if (!isSelf.value) return

  // Basic client-side checks (server also validates).
  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp'])
  if (!allowed.has(file.type)) {
    editError.value = 'Unsupported image type. Please upload a JPG, PNG, or WebP.'
    clearPendingAvatar()
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    editError.value = 'Avatar is too large (max 5MB).'
    clearPendingAvatar()
    return
  }

  editError.value = null
  // Route through cropper before staging.
  openCropForFile(file)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function onCropChange(e: any) {
  // `e.canvas` is an HTMLCanvasElement representing the current crop (square),
  // we render a smaller circle preview for UX.
  const canvas: HTMLCanvasElement | null = e?.canvas ?? null
  cropHasSelection.value = Boolean(canvas)
  if (!canvas) return

  if (cropPreviewRaf) cancelAnimationFrame(cropPreviewRaf)
  cropPreviewRaf = requestAnimationFrame(() => {
    try {
      const previewCanvas = document.createElement('canvas')
      const size = 256
      previewCanvas.width = size
      previewCanvas.height = size
      const ctx = previewCanvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, size, size)
      ctx.drawImage(canvas, 0, 0, size, size)

      if (cropPreviewUrl.value) URL.revokeObjectURL(cropPreviewUrl.value)
      previewCanvas.toBlob((blob) => {
        if (!blob) return
        cropPreviewUrl.value = URL.createObjectURL(blob)
      }, 'image/jpeg', 0.92)
    } finally {
      cropPreviewRaf = null
    }
  })
}

function cancelCrop() {
  // If user cancels cropping, do not stage anything.
  clearCropState()
  clearPendingAvatar()
}

async function applyCrop() {
  if (!cropHasSelection.value) return
  const cropper = cropperRef.value
  const result = cropper?.getResult?.()
  const canvas: HTMLCanvasElement | null = result?.canvas ?? null
  if (!canvas) return

  const original = cropOriginalFile.value
  const outType = (original?.type === 'image/png' || original?.type === 'image/webp') ? original.type : 'image/jpeg'

  const blob: Blob | null = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), outType, outType === 'image/jpeg' ? 0.92 : undefined)
  })
  if (!blob) {
    editError.value = 'Failed to crop image.'
    return
  }

  const ext = outType === 'image/png' ? 'png' : outType === 'image/webp' ? 'webp' : 'jpg'
  const filename = `avatar.${ext}`
  const croppedFile = new File([blob], filename, { type: outType })
  stageAvatarFile(croppedFile)
  clearCropState()
}

watch(
  () => editOpen.value,
  (open) => {
    if (!open) {
      clearCropState()
      clearBannerCropState()
      clearPendingAvatar()
      clearPendingBanner()
      return
    }
    editError.value = null
    editName.value = profile.value?.name || ''
    editBio.value = profile.value?.bio || ''
    clearCropState()
    clearBannerCropState()
    clearPendingAvatar()
    clearPendingBanner()
  }
)

async function saveProfile() {
  if (!isSelf.value) return
  editError.value = null
  saving.value = true
  try {
    // If a banner is staged, upload + commit it first.
    if (pendingBannerFile.value) {
      const file = pendingBannerFile.value
      const init = await apiFetchData<{ key: string; uploadUrl: string; headers: Record<string, string>; maxBytes?: number }>(
        '/uploads/banner/init',
        {
          method: 'POST',
          body: { contentType: file.type }
        }
      )

      const putRes = await fetch(init.uploadUrl, {
        method: 'PUT',
        headers: init.headers,
        body: file,
      })
      if (!putRes.ok) throw new Error('Failed to upload banner.')

      const committed = await apiFetchData<{ user: any }>('/uploads/banner/commit', {
        method: 'POST',
        body: { key: init.key },
      })

      authUser.value = committed.user ?? authUser.value
      data.value = {
        ...(data.value as PublicProfile),
        bannerUrl: committed.user?.bannerUrl ?? null,
      }
      clearPendingBanner()
    }

    // If an avatar is staged, upload + commit it first.
    if (pendingAvatarFile.value) {
      const file = pendingAvatarFile.value
      const init = await apiFetchData<{ key: string; uploadUrl: string; headers: Record<string, string>; maxBytes?: number }>(
        '/uploads/avatar/init',
        {
          method: 'POST',
          body: { contentType: file.type }
        }
      )

      const putRes = await fetch(init.uploadUrl, {
        method: 'PUT',
        headers: init.headers,
        body: file,
      })
      if (!putRes.ok) throw new Error('Failed to upload avatar.')

      const committed = await apiFetchData<{ user: any }>('/uploads/avatar/commit', {
        method: 'POST',
        body: { key: init.key },
      })

      authUser.value = committed.user ?? authUser.value
      data.value = {
        ...(data.value as PublicProfile),
        avatarUrl: committed.user?.avatarUrl ?? null,
      }
      // Avatar is now persisted; clear staged state so UI reflects "applied".
      clearPendingAvatar()
    }

    const result = await apiFetchData<{ user: any }>('/users/me/profile', {
      method: 'PATCH',
      body: {
        name: editName.value,
        bio: editBio.value
      }
    })

    // Update profile state (public view) and auth user state (self).
    data.value = {
      ...(data.value as PublicProfile),
      name: result.user?.name ?? null,
      bio: result.user?.bio ?? null
    }
    authUser.value = result.user ?? authUser.value
    editOpen.value = false
  } catch (e: unknown) {
    editError.value = getApiErrorMessage(e) || 'Failed to save profile.'
  } finally {
    saving.value = false
  }
}

onBeforeUnmount(() => {
  if (appHeader.value?.title === profileName.value) appHeader.value = null
  clearCropState()
  clearBannerCropState()
  if (pendingAvatarPreviewUrl.value) URL.revokeObjectURL(pendingAvatarPreviewUrl.value)
  if (pendingBannerPreviewUrl.value) URL.revokeObjectURL(pendingBannerPreviewUrl.value)
})
</script>

