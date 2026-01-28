<template>
  <div class="w-full">
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
          @click="openImageViewer($event, profileBannerUrl, 'Banner', 'banner')"
        />
      </div>

      <div
        :class="[
          'absolute left-4 bottom-0 translate-y-1/2 transition-opacity duration-200',
          hideAvatarDuringBanner ? 'opacity-0 pointer-events-none' : 'opacity-100'
        ]"
      >
        <div class="group relative h-28 w-28 overflow-hidden rounded-full bg-gray-200 ring-4 ring-white dark:bg-zinc-800 dark:ring-black">
          <img
            v-if="profileAvatarUrl"
            v-show="!hideAvatarThumb"
            :src="profileAvatarUrl"
            alt=""
            class="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          >
          <div
            v-if="profileAvatarUrl"
            v-show="!hideAvatarThumb"
            class="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/20"
            aria-hidden="true"
          />
          <button
            v-if="profileAvatarUrl"
            v-show="!hideAvatarThumb"
            type="button"
            class="absolute inset-0 cursor-zoom-in"
            aria-label="View avatar"
            @click="openImageViewer($event, profileAvatarUrl, 'Avatar', 'avatar')"
          />
        </div>
      </div>
    </div>

    <div class="mx-auto max-w-3xl pb-5 pt-16">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <div class="flex items-center gap-2 min-w-0">
            <div class="text-2xl font-bold text-gray-900 dark:text-gray-50 truncate">
              {{ profileName }}
            </div>
            <AppVerifiedBadge :status="profile?.verifiedStatus" />
          </div>
          <div class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            @{{ profile?.username }}
          </div>
        </div>

        <div v-if="isSelf" class="shrink-0">
          <Button label="Edit profile" icon="pi pi-pencil" severity="secondary" @click="editOpen = true" />
        </div>
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
              {{ postCounts.all }}
            </span>
          </div>

          <div class="flex items-center gap-2 text-xs">
            <button
              type="button"
              class="rounded-full px-3 py-1 border transition-colors"
              :class="filterButtonClass('all')"
              @click="setFilter('all')"
            >
              All <span class="ml-1 tabular-nums opacity-80">{{ postCounts.all }}</span>
            </button>

            <button
              type="button"
              class="rounded-full px-3 py-1 border transition-colors"
              :class="filterButtonClass('public')"
              @click="setFilter('public')"
            >
              Public <span class="ml-1 tabular-nums opacity-80">{{ postCounts.public }}</span>
            </button>

            <button
              type="button"
              class="rounded-full px-3 py-1 border transition-colors flex items-center gap-1"
              :class="filterButtonClass('verifiedOnly')"
              @click="setFilter('verifiedOnly')"
            >
              Verified
              <span class="tabular-nums opacity-80">{{ postCounts.verifiedOnly }}</span>
              <i v-if="!viewerIsVerified" class="pi pi-lock text-[0.75rem] text-gray-400" aria-hidden="true" />
            </button>

            <button
              type="button"
              class="rounded-full px-3 py-1 border transition-colors flex items-center gap-1"
              :class="filterButtonClass('premiumOnly')"
              @click="setFilter('premiumOnly')"
            >
              Premium
              <span class="tabular-nums opacity-80">{{ postCounts.premiumOnly }}</span>
              <i v-if="!viewerIsPremium" class="pi pi-lock text-[0.75rem] text-gray-400" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div v-if="postsError" class="mt-3 text-sm text-red-700 dark:text-red-300">
          {{ postsError }}
        </div>

        <div v-else-if="ctaKind === 'verify'" class="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
          <div class="font-semibold text-gray-900 dark:text-gray-50">Verified members only</div>
          <div class="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Verify your account to view verified-only posts.
          </div>
          <div class="mt-3">
            <Button label="Go to settings" severity="secondary" @click="navigateTo('/settings')" />
          </div>
        </div>

        <div v-else-if="ctaKind === 'premium'" class="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
          <div class="font-semibold text-gray-900 dark:text-gray-50">Premium required</div>
          <div class="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Upgrade to premium to view premium-only posts.
          </div>
          <div class="mt-3">
            <Button label="Go to settings" severity="secondary" @click="navigateTo('/settings')" />
          </div>
        </div>

        <div v-else-if="profilePosts.length === 0" class="mt-3 text-sm text-gray-500 dark:text-gray-400">
          No posts yet.
        </div>

        <div v-else class="mt-3 -mx-4">
          <AppPostRow v-for="p in profilePosts" :key="p.id" :post="p" />
        </div>
      </div>
    </div>

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
                  class="mx-auto w-fit rounded-lg bg-black/45 px-2.5 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur-sm"
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
                  class="mx-auto w-fit rounded-lg bg-black/45 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm backdrop-blur-sm"
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
          <Textarea v-model="editBio" class="w-full" rows="4" autoResize :maxlength="160" />
          <div class="text-xs text-gray-500 dark:text-gray-400 flex justify-end">
            {{ editBio.trim().length }}/160
          </div>
        </div>

        <AppInlineAlert v-if="editError" severity="danger">
          {{ editError }}
        </AppInlineAlert>
      </div>
    </Dialog>

    <ClientOnly>
      <Teleport to="body">
        <div
          v-if="viewerVisible && viewerSrc && viewerTarget"
          class="fixed inset-0 z-[9999]"
          role="dialog"
          aria-modal="true"
          :aria-label="viewerAlt"
          @click="closeViewer"
        >
          <!-- Backdrop (fade in/out) -->
          <div
            class="absolute inset-0 bg-black/70 transition-opacity duration-200"
            :class="viewerBackdropVisible ? 'opacity-100' : 'opacity-0'"
            aria-hidden="true"
          />

          <button
            type="button"
            class="absolute right-4 top-4 z-10 rounded-full bg-black/45 p-2 text-white shadow-sm backdrop-blur-sm"
            aria-label="Close"
            @click.stop="closeViewer"
          >
            <i class="pi pi-times text-lg" aria-hidden="true" />
          </button>

          <div class="relative h-full w-full">
            <img
              :src="viewerSrc"
              :alt="viewerAlt"
              class="select-none object-cover will-change-transform"
              :style="viewerImageStyle"
              draggable="false"
              @click.stop
              @transitionend="onViewerTransitionEnd"
            >
          </div>
        </div>
      </Teleport>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Profile'
})

usePageSeo({
  title: 'Profile',
  description: 'User profile.',
  noindex: true
})

type PublicProfile = {
  id: string
  username: string | null
  name: string | null
  bio: string | null
  verifiedStatus: 'none' | 'identity' | 'manual'
  avatarKey?: string | null
  avatarUpdatedAt?: string | null
  bannerKey?: string | null
  bannerUpdatedAt?: string | null
}

const route = useRoute()
const usernameParam = computed(() => String(route.params.username || ''))
const normalizedUsername = computed(() => usernameParam.value.trim().toLowerCase())

const { apiFetchData } = useApiClient()
import { getApiErrorMessage } from '~/utils/api-error'

const { data, error } = await useAsyncData(`public-profile:${normalizedUsername.value}`, async () => {
  const result = await apiFetchData<{ user: PublicProfile }>(
    `/users/${encodeURIComponent(normalizedUsername.value)}`,
    { method: 'GET' }
  )
  return result.user
})

const profile = computed(() => data.value ?? null)

import type { FeedPost, GetUserPostsResponse } from '~/types/api'

type ProfilePostsFilter = 'all' | 'public' | 'verifiedOnly' | 'premiumOnly'

const filter = ref<ProfilePostsFilter>('all')

const emptyCounts: GetUserPostsResponse['counts'] = {
  all: 0,
  public: 0,
  verifiedOnly: 0,
  premiumOnly: 0,
}

const { data: initialPostsData, error: initialPostsErr } = await useAsyncData(
  `profile-posts:${normalizedUsername.value}`,
  async () => {
    return await apiFetchData<GetUserPostsResponse>(
      `/posts/user/${encodeURIComponent(normalizedUsername.value)}`,
      { method: 'GET', query: { limit: 30, visibility: 'all' } }
    )
  }
)

const profilePosts = ref<FeedPost[]>(initialPostsData.value?.posts ?? [])
const postCounts = ref<GetUserPostsResponse['counts']>(initialPostsData.value?.counts ?? emptyCounts)
const postsError = ref<string | null>(
  initialPostsErr.value ? (getApiErrorMessage(initialPostsErr.value) || 'Failed to load posts.') : null
)
const postsLoading = ref(false)

const { user: authUser } = useAuth()
const { assetUrl } = useAssets()

const isSelf = computed(() => Boolean(authUser.value?.id && profile.value?.id && authUser.value.id === profile.value.id))

const viewerIsVerified = computed(() => Boolean(authUser.value?.verifiedStatus && authUser.value.verifiedStatus !== 'none'))
const viewerIsPremium = computed(() => Boolean(authUser.value?.premium))

const ctaKind = computed<null | 'verify' | 'premium'>(() => {
  if (filter.value === 'verifiedOnly' && !viewerIsVerified.value) return 'verify'
  if (filter.value === 'premiumOnly' && !viewerIsPremium.value) return 'premium'
  return null
})

async function fetchPosts(nextFilter: ProfilePostsFilter) {
  if (postsLoading.value) return
  postsError.value = null
  if (nextFilter === 'verifiedOnly' && !viewerIsVerified.value) {
    profilePosts.value = []
    return
  }
  if (nextFilter === 'premiumOnly' && !viewerIsPremium.value) {
    profilePosts.value = []
    return
  }

  postsLoading.value = true
  try {
    const res = await apiFetchData<GetUserPostsResponse>(
      `/posts/user/${encodeURIComponent(normalizedUsername.value)}`,
      { method: 'GET', query: { limit: 30, visibility: nextFilter } }
    )
    profilePosts.value = res.posts
    postCounts.value = res.counts
  } catch (e: unknown) {
    postsError.value = getApiErrorMessage(e) || 'Failed to load posts.'
  } finally {
    postsLoading.value = false
  }
}

function setFilter(next: ProfilePostsFilter) {
  filter.value = next
  void fetchPosts(next)
}

function filterButtonClass(kind: ProfilePostsFilter) {
  const isActive = filter.value === kind

  // All: “inverted” chip
  if (kind === 'all') {
    return isActive
      ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
      : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-900'
  }

  // Public: regular
  if (kind === 'public') {
    return isActive
      ? 'border-gray-300 bg-gray-50 text-gray-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-50'
      : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-900'
  }

  // Verified: blue
  if (kind === 'verifiedOnly') {
    return isActive
      ? 'border-sky-600 bg-sky-600 text-white dark:border-sky-500 dark:bg-sky-500 dark:text-black'
      : 'border-sky-200 text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:text-sky-300 dark:hover:bg-sky-950/40'
  }

  // Premium: orange
  return isActive
    ? 'border-amber-600 bg-amber-600 text-white dark:border-amber-500 dark:bg-amber-500 dark:text-black'
    : 'border-amber-200 text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/40'
}

const profileName = computed(() => profile.value?.name || profile.value?.username || 'User')
const profileAvatarUrl = computed(() => {
  const base = assetUrl(profile.value?.avatarKey)
  if (!base) return null
  const v = profile.value?.avatarUpdatedAt || ''
  return v ? `${base}?v=${encodeURIComponent(v)}` : base
})
const profileBannerUrl = computed(() => {
  const base = assetUrl(profile.value?.bannerKey)
  if (!base) return null
  const v = profile.value?.bannerUpdatedAt || ''
  return v ? `${base}?v=${encodeURIComponent(v)}` : base
})

type ViewerKind = 'avatar' | 'banner'
type ViewerRect = { left: number; top: number; width: number; height: number }

const viewerVisible = ref(false)
const viewerBackdropVisible = ref(false)
const viewerSrc = ref<string | null>(null)
const viewerAlt = ref<string>('Image')
const viewerKind = ref<ViewerKind>('banner')
const viewerOrigin = ref<ViewerRect | null>(null)
const viewerTarget = ref<ViewerRect | null>(null)
const viewerTransform = ref<string>('translate(0px, 0px) scale(1, 1)')
const viewerBorderRadius = ref<string>('0px')
const viewerTransition = ref<string>('none')
let viewerRequestId = 0

function initialRadius(kind: ViewerKind) {
  return kind === 'avatar' ? '9999px' : '0px'
}

function targetRadius(kind: ViewerKind) {
  // Avatars should remain circular even in full-screen.
  return kind === 'avatar' ? '9999px' : '0px'
}

const hideBannerThumb = computed(() => viewerVisible.value && viewerKind.value === 'banner')
const hideAvatarThumb = computed(() => viewerVisible.value && viewerKind.value === 'avatar')
const hideAvatarDuringBanner = computed(() => viewerVisible.value && viewerKind.value === 'banner')

function calcTargetRect(aspect: number) {
  const pad = 16 // px
  const vw = window.innerWidth
  const vh = window.innerHeight
  const maxW = Math.max(1, vw - pad * 2)
  const maxH = Math.max(1, vh - pad * 2)

  let width = maxW
  let height = width / aspect
  if (height > maxH) {
    height = maxH
    width = height * aspect
  }

  const left = (vw - width) / 2
  const top = (vh - height) / 2
  return { left, top, width, height }
}

async function preloadAspect(src: string): Promise<number> {
  if (!import.meta.client) return 1
  return await new Promise((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      const w = Number(img.naturalWidth || 0)
      const h = Number(img.naturalHeight || 0)
      resolve(w && h ? w / h : 1)
    }
    img.onerror = () => resolve(1)
    img.src = src
  })
}

async function openImageViewer(e: MouseEvent, src: string | null, label: string, kind: ViewerKind) {
  if (!import.meta.client) return
  if (!src) return

  const el = e.currentTarget as HTMLElement | null
  const rect = el?.getBoundingClientRect?.()
  if (!rect) return

  viewerRequestId += 1
  const reqId = viewerRequestId

  viewerKind.value = kind
  viewerAlt.value = label
  viewerSrc.value = src
  viewerOrigin.value = { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
  viewerTarget.value = null

  viewerVisible.value = true
  viewerBackdropVisible.value = false
  setScrollLocked(true)

  const aspect = await preloadAspect(src)
  if (reqId !== viewerRequestId) return

  viewerTarget.value = calcTargetRect(aspect)
  viewerBorderRadius.value = initialRadius(kind)
  viewerTransition.value = 'none'

  await nextTick()
  startOpenAnimation()
}

function startOpenAnimation() {
  if (!import.meta.client) return
  const o = viewerOrigin.value
  const t = viewerTarget.value
  if (!o || !t) return

  const ox = o.left + o.width / 2
  const oy = o.top + o.height / 2
  const tx = t.left + t.width / 2
  const ty = t.top + t.height / 2

  const dx = ox - tx
  const dy = oy - ty
  const sx = o.width / t.width
  const sy = o.height / t.height

  viewerTransform.value = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`
  viewerTransition.value = 'none'

  requestAnimationFrame(() => {
    viewerBackdropVisible.value = true
    viewerTransition.value =
      'transform 320ms cubic-bezier(0.22, 1, 0.36, 1), border-radius 320ms cubic-bezier(0.22, 1, 0.36, 1)'
    viewerTransform.value = 'translate(0px, 0px) scale(1, 1)'
    viewerBorderRadius.value = targetRadius(viewerKind.value)
  })
}

function startCloseAnimation() {
  if (!import.meta.client) return
  const o = viewerOrigin.value
  const t = viewerTarget.value
  if (!o || !t) {
    finalizeClose()
    return
  }

  const ox = o.left + o.width / 2
  const oy = o.top + o.height / 2
  const tx = t.left + t.width / 2
  const ty = t.top + t.height / 2

  const dx = ox - tx
  const dy = oy - ty
  const sx = o.width / t.width
  const sy = o.height / t.height

  viewerBackdropVisible.value = false
  viewerTransition.value =
    'transform 220ms cubic-bezier(0.4, 0, 0.2, 1), border-radius 220ms cubic-bezier(0.4, 0, 0.2, 1)'
  viewerTransform.value = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`
  viewerBorderRadius.value = initialRadius(viewerKind.value)
}

function closeViewer() {
  // Cancel any in-flight open.
  viewerRequestId += 1
  if (!viewerVisible.value) return
  startCloseAnimation()
}

function finalizeClose() {
  viewerVisible.value = false
  viewerBackdropVisible.value = false
  viewerSrc.value = null
  viewerAlt.value = 'Image'
  viewerOrigin.value = null
  viewerTarget.value = null
  viewerTransition.value = 'none'
  viewerTransform.value = 'translate(0px, 0px) scale(1, 1)'
  viewerBorderRadius.value = '0px'
  setScrollLocked(false)
}

function onViewerTransitionEnd(e: TransitionEvent) {
  if (!import.meta.client) return
  if (e.propertyName !== 'transform') return
  if (viewerBackdropVisible.value) return // opening finished
  // closing finished
  finalizeClose()
}

function setScrollLocked(locked: boolean) {
  if (!import.meta.client) return
  document.documentElement.style.overflow = locked ? 'hidden' : ''
  document.body.style.overflow = locked ? 'hidden' : ''
}

function onViewerKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeViewer()
}

onBeforeUnmount(() => {
  finalizeClose()
  if (!import.meta.client) return
  window.removeEventListener('keydown', onViewerKeydown)
})

watch(
  viewerVisible,
  (open) => {
    if (!import.meta.client) return
    if (open) window.addEventListener('keydown', onViewerKeydown)
    else window.removeEventListener('keydown', onViewerKeydown)
  },
  { flush: 'post' }
)

const viewerImageStyle = computed(() => {
  const t = viewerTarget.value
  if (!t) return {}
  return {
    position: 'fixed',
    left: `${t.left}px`,
    top: `${t.top}px`,
    width: `${t.width}px`,
    height: `${t.height}px`,
    transform: viewerTransform.value,
    transition: viewerTransition.value,
    borderRadius: viewerBorderRadius.value,
  } as const
})

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
        bannerKey: committed.user?.bannerKey ?? null,
        bannerUpdatedAt: committed.user?.bannerUpdatedAt ?? null,
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
        avatarKey: committed.user?.avatarKey ?? null,
        avatarUpdatedAt: committed.user?.avatarUpdatedAt ?? null,
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
  clearCropState()
  clearBannerCropState()
  if (pendingAvatarPreviewUrl.value) URL.revokeObjectURL(pendingAvatarPreviewUrl.value)
  if (pendingBannerPreviewUrl.value) URL.revokeObjectURL(pendingBannerPreviewUrl.value)
})
</script>

