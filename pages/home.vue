<template>
  <div>
    <!-- Composer -->
    <div class="border-b border-gray-200 px-4 py-4 dark:border-zinc-800">
      <div v-if="isAuthed" class="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3">
        <!-- Row 1: visibility picker (above, right-aligned) -->
        <div class="col-start-2 flex justify-end items-end mb-3 sm:mb-2">
          <div ref="composerVisibilityWrapEl" class="relative">
            <button
              type="button"
              class="inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold leading-none transition-colors"
              :class="composerVisibilityPillClass"
              aria-label="Select post visibility"
              :disabled="!viewerIsVerified"
              @click="viewerIsVerified ? toggleVisibilityPopover() : null"
            >
              <i v-if="visibility === 'public'" class="pi pi-globe mr-1 text-[10px] opacity-80" aria-hidden="true" />
              <AppVerifiedBadge
                v-else-if="visibility === 'verifiedOnly'"
                class="mr-1"
                status="identity"
                :premium="false"
                :show-tooltip="false"
              />
              <AppVerifiedBadge
                v-else-if="visibility === 'premiumOnly'"
                class="mr-1"
                status="identity"
                :premium="true"
                :show-tooltip="false"
              />
              <i v-else-if="visibility === 'onlyMe'" class="pi pi-eye-slash mr-1 text-[10px] opacity-80" aria-hidden="true" />
              {{ composerVisibilityLabel }}
              <i v-if="viewerIsVerified" class="pi pi-chevron-down ml-1 text-[9px] opacity-80" aria-hidden="true" />
            </button>

            <!-- Custom visibility picker -->
            <div
              v-if="composerVisibilityPopoverOpen"
              class="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-black"
              role="menu"
              aria-label="Post visibility"
            >
              <button
                v-if="allowedComposerVisibilities.includes('public')"
                type="button"
                class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors text-gray-900 hover:bg-gray-50 dark:text-gray-50 dark:hover:bg-zinc-900"
                role="menuitem"
                @click="setComposerVisibility('public')"
              >
                <span class="inline-flex items-center gap-2">
                  <i class="pi pi-globe text-[12px] opacity-80" aria-hidden="true" />
                  <span>Public</span>
                </span>
              </button>

              <button
                v-if="allowedComposerVisibilities.includes('verifiedOnly')"
                type="button"
                class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors moh-menuitem-verified"
                role="menuitem"
                @click="setComposerVisibility('verifiedOnly')"
              >
                <span class="inline-flex items-center gap-2">
                  <AppVerifiedBadge status="identity" :premium="false" :show-tooltip="false" />
                  <span>Verified only</span>
                </span>
              </button>

              <button
                v-if="allowedComposerVisibilities.includes('premiumOnly')"
                type="button"
                :disabled="!isPremium"
                :class="[
                  'w-full text-left px-3 py-2 text-sm font-semibold transition-colors',
                  isPremium
                    ? 'moh-menuitem-premium'
                    : 'text-gray-400 dark:text-zinc-600 cursor-not-allowed'
                ]"
                role="menuitem"
                @click="isPremium ? setComposerVisibility('premiumOnly') : null"
              >
                <span class="inline-flex items-center gap-2">
                  <AppVerifiedBadge status="identity" :premium="true" :show-tooltip="false" />
                  <span>Premium only</span>
                </span>
                <span v-if="!isPremium" class="ml-2 font-mono text-[10px] opacity-80" aria-hidden="true">LOCKED</span>
              </button>

              <button
                v-if="allowedComposerVisibilities.includes('onlyMe')"
                type="button"
                class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors moh-menuitem-onlyme"
                role="menuitem"
                @click="setComposerVisibility('onlyMe')"
              >
                <span class="inline-flex items-center gap-2">
                  <i class="pi pi-eye-slash text-[12px]" aria-hidden="true" />
                  <span>Only me</span>
                </span>
              </button>
            </div>
          </div>
        </div>

        <!-- Row 2: avatar + textarea start aligned -->
        <NuxtLink
          v-if="myProfilePath"
          :to="myProfilePath"
          class="row-start-1 sm:row-start-2 col-start-1 mb-3 sm:mb-0 group shrink-0"
          aria-label="View your profile"
        >
          <div class="transition-opacity duration-200 group-hover:opacity-80">
            <AppAvatarCircle
              :src="meAvatarUrl"
              :name="user?.name ?? null"
              :username="user?.username ?? null"
              size-class="h-8 w-8 sm:h-10 sm:w-10"
            />
          </div>
        </NuxtLink>
        <div v-else class="row-start-1 sm:row-start-2 col-start-1 mb-3 sm:mb-0 shrink-0" aria-hidden="true">
          <AppAvatarCircle
            :src="meAvatarUrl"
            :name="user?.name ?? null"
            :username="user?.username ?? null"
            size-class="h-8 w-8 sm:h-10 sm:w-10"
          />
        </div>

        <div class="row-start-2 col-span-2 sm:col-span-1 sm:col-start-2 min-w-0 moh-composer-tint">
          <input
            ref="mediaFileInputEl"
            type="file"
            accept="image/*"
            class="hidden"
            multiple
            @change="onMediaFilesSelected"
          />

          <textarea
            ref="composerTextareaEl"
            v-model="draft"
            rows="3"
            class="moh-composer-textarea w-full resize-none overflow-hidden rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-[15px] leading-6 text-gray-900 placeholder:text-gray-500 focus:outline-none dark:border-zinc-700 dark:text-gray-50 dark:placeholder:text-zinc-500"
            :style="composerTextareaVars"
            placeholder="What’s happening?"
            :maxlength="postMaxLen"
            @keydown="onComposerKeydown"
          />
          <AppInlineAlert v-if="submitError" class="mt-3" severity="danger">
            {{ submitError }}
          </AppInlineAlert>

          <div v-if="composerMedia.length" class="mt-3 flex flex-wrap gap-2">
            <div v-for="m in composerMedia" :key="m.localId" class="relative">
              <img
                :src="m.previewUrl"
                class="h-20 w-20 rounded-lg border moh-border object-cover bg-black/5 dark:bg-white/5"
                alt=""
                loading="lazy"
              />
              <button
                type="button"
                class="absolute -right-2 -top-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-zinc-800 dark:bg-black dark:text-gray-200 dark:hover:bg-zinc-900"
                :aria-label="m.source === 'upload' && (m.uploadStatus === 'queued' || m.uploadStatus === 'uploading' || m.uploadStatus === 'processing') ? 'Cancel upload' : 'Remove media'"
                @click="removeComposerMedia(m.localId)"
              >
                <span class="text-[12px] leading-none" aria-hidden="true">×</span>
              </button>
              <div
                v-if="m.source === 'upload' && m.uploadStatus && m.uploadStatus !== 'done'"
                class="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-lg bg-black/35 text-white"
                :aria-label="composerUploadStatusLabel(m) ?? 'Uploading'"
              >
                <i
                  v-if="m.uploadStatus === 'uploading' || m.uploadStatus === 'processing'"
                  class="pi pi-spin pi-spinner text-[16px]"
                  aria-hidden="true"
                />
                <span class="text-[10px] font-semibold tracking-wide opacity-95" aria-hidden="true">
                  {{ composerUploadStatusLabel(m) }}
                </span>
                <span
                  v-if="m.uploadStatus === 'uploading' && typeof m.uploadProgress === 'number'"
                  class="text-[10px] font-mono tabular-nums opacity-90"
                  aria-hidden="true"
                >
                  {{ Math.max(0, Math.min(100, Math.round(m.uploadProgress))) }}%
                </span>
                <span v-if="m.uploadStatus === 'error' && m.uploadError" class="px-2 text-center text-[10px] opacity-90">
                  {{ m.uploadError }}
                </span>
              </div>
            </div>
          </div>

          <div class="mt-3 flex items-center justify-between">
            <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <Button
                icon="pi pi-image"
                text
                rounded
                severity="secondary"
                aria-label="Add media"
                :disabled="!canAddMoreMedia"
                v-tooltip.bottom="tinyTooltip(canAddMoreMedia ? 'Add image/GIF' : 'Max 4 attachments')"
                @click="openMediaPicker"
              />
              <Button
                text
                severity="secondary"
                class="!rounded-xl"
                aria-label="Add GIF"
                :disabled="!canAddMoreMedia"
                v-tooltip.bottom="tinyTooltip(canAddMoreMedia ? 'Add GIF (Giphy)' : 'Max 4 attachments')"
                @click="openGiphyPicker"
              >
                <template #icon>
                  <span
                    class="inline-flex h-[22px] w-[22px] items-center justify-center rounded-md border border-current/30 bg-transparent text-[10px] font-black leading-none"
                    aria-hidden="true"
                  >
                    GIF
                  </span>
                </template>
              </Button>
            </div>
            <div class="flex items-center gap-2">
              <div class="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                {{ postCharCount }}/{{ postMaxLen }}
              </div>
              <Button
                label="Post"
                rounded
                :outlined="postButtonOutlined"
                severity="secondary"
                :class="postButtonClass"
                :disabled="submitting || !canPost || (!(draft.trim() || composerMedia.length) ) || postCharCount > postMaxLen || composerUploading"
                :loading="submitting"
                @click="submit"
              />
            </div>
          </div>
        </div>
      </div>

      <button
        v-else
        type="button"
        class="w-full text-left rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 hover:bg-gray-100 dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:bg-zinc-900/40"
        @click="goLogin"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="space-y-1">
            <div class="font-semibold text-gray-900 dark:text-gray-50">Log in to post</div>
            <div class="text-sm text-gray-600 dark:text-gray-300">
              Join the conversation and share updates with the brotherhood.
            </div>
          </div>
          <i class="pi pi-angle-right text-gray-500 dark:text-gray-400" aria-hidden="true" />
        </div>
      </button>
    </div>

    <!-- Posts -->
    <div>
      <div class="sticky top-0 z-20 border-b moh-border moh-bg p-0">
        <div class="moh-feed-header-inner flex items-stretch justify-between gap-3 px-4 py-2">
          <!-- Scope tabs (left-aligned) -->
          <AppTabSelector v-model="feedScope" aria-label="Feed scope" :tabs="scopeTabs" />

          <!-- Controls (right-aligned) -->
          <AppFeedFiltersBar
            :sort="feedSort"
            :filter="feedFilter"
            :viewer-is-verified="viewerIsVerified"
            :viewer-is-premium="viewerIsPremium"
            :show-reset="feedFilter !== 'all' || feedSort !== 'new'"
            @update:sort="setFeedSort"
            @update:filter="setFeedFilter"
            @reset="
              () => {
                setFeedFilter('all')
                setFeedSort('new')
              }
            "
          />
        </div>
      </div>

      <div v-if="feedCtaKind === 'verify'" class="mx-4 mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
        <div class="font-semibold text-gray-900 dark:text-gray-50">Verified members only</div>
        <div class="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Verify your account to view verified-only posts.
        </div>
        <div class="mt-3">
          <Button label="Go to settings" severity="secondary" @click="navigateTo('/settings')" />
        </div>
      </div>

      <div v-else-if="feedCtaKind === 'premium'" class="mx-4 mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
        <div class="font-semibold text-gray-900 dark:text-gray-50">Premium required</div>
        <div class="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Upgrade to premium to view premium-only posts.
        </div>
        <div class="mt-3">
          <Button label="Go to settings" severity="secondary" @click="navigateTo('/settings')" />
        </div>
      </div>

      <template v-else>
        <AppInlineAlert v-if="error" class="mx-4 mt-4" severity="danger">
          {{ error }}
        </AppInlineAlert>

        <div v-else>
          <div
            v-if="showFollowingEmptyState"
            class="mx-4 mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40"
          >
            <div class="font-semibold text-gray-900 dark:text-gray-50">Nothing here yet</div>
            <div class="mt-1 text-sm text-gray-600 dark:text-gray-300">
              <template v-if="followingCount === 0">
                Your Following feed shows posts from people you follow (plus you). Follow a few people to see posts here.
              </template>
              <template v-else-if="followingCount !== null">
                You’re following people, but none of them have posted yet. Follow some more active accounts to fill your feed.
              </template>
              <template v-else>
                Your Following feed shows posts from people you follow (plus you). Follow a few people to see posts here.
              </template>
            </div>
            <div class="mt-3">
              <Button label="Find people" severity="secondary" @click="navigateTo('/explore')" />
            </div>
          </div>

          <div class="relative">
            <div v-for="p in posts" :key="p.id">
              <AppPostRow :post="p" @deleted="removePost" />
            </div>
          </div>
        </div>

        <div v-if="nextCursor" class="px-4 py-6 flex justify-center">
          <Button
            label="Load more"
            severity="secondary"
            rounded
            :loading="loading"
            :disabled="loading"
            @click="loadMore"
          />
        </div>
      </template>
    </div>
  </div>

  <Dialog
    v-if="giphyOpen"
    v-model:visible="giphyOpen"
    modal
    header="Add a GIF"
    :draggable="false"
    class="w-[min(44rem,calc(100vw-2rem))]"
  >
    <div class="flex items-center gap-2">
      <InputText
        ref="giphyInputRef"
        v-model="giphyQuery"
        class="w-full"
        placeholder="Search Giphy…"
        aria-label="Search Giphy"
        @keydown.enter.prevent="searchGiphy"
      />
      <Button label="Search" severity="secondary" :loading="giphyLoading" :disabled="giphyLoading" @click="searchGiphy" />
    </div>

    <div v-if="giphyError" class="mt-3 text-sm text-red-600 dark:text-red-400">
      {{ giphyError }}
    </div>

    <div class="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-2">
      <button
        v-for="gif in giphyItems"
        :key="gif.id"
        type="button"
        class="overflow-hidden rounded-lg border moh-border bg-black/5 dark:bg-white/5 hover:opacity-90 transition-opacity"
        :disabled="!canAddMoreMedia"
        :aria-label="`Add GIF ${gif.title || ''}`"
        @click="selectGiphyGif(gif)"
      >
        <img :src="gif.url" class="h-24 w-full object-cover" alt="" loading="lazy" />
      </button>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import type { GiphySearchResponse, PostMediaKind, PostMediaSource, PostVisibility } from '~/types/api'
import type { ProfilePostsFilter } from '~/utils/post-visibility'
import { filterPillClasses } from '~/utils/post-visibility'
import { PRIMARY_PREMIUM_ORANGE, PRIMARY_TEXT_DARK, PRIMARY_TEXT_LIGHT, PRIMARY_VERIFIED_BLUE, primaryPaletteToCssVars } from '~/utils/theme-tint'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({
  layout: 'app',
  title: 'Home',
  hideTopBar: true,
})

usePageSeo({
  title: 'Home',
  description: 'Your Men of Hunger feed — posts are shown in simple chronological order.',
  canonicalPath: '/home',
  noindex: true,
  ogType: 'website',
  image: '/images/banner.png',
})

const { user } = useAuth()
const isAuthed = computed(() => Boolean(user.value?.id))
const { apiFetchData } = useApiClient()
const toast = useAppToast()
const middleScrollerEl = useMiddleScroller()

const feedFilter = useCookie<ProfilePostsFilter>('moh.feed.filter.v1', {
  default: () => 'all',
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
})

const feedScope = useCookie<'following' | 'all'>('moh.home.scope.v1', {
  default: () => 'all',
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
})

const scopeTabs = computed(() => [
  { key: 'all', label: 'All', disabled: false },
  { key: 'following', label: 'Following', disabled: !isAuthed.value },
])

const feedSort = useCookie<'new' | 'trending'>('moh.home.sort.v1', {
  default: () => 'new',
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
})

// Clamp cookie to allowed values (SSR-safe).
watch(
  feedFilter,
  (v) => {
    if (v === 'all' || v === 'public' || v === 'verifiedOnly' || v === 'premiumOnly') return
    feedFilter.value = 'all'
  },
  { immediate: true }
)

watch(
  feedScope,
  (v) => {
    if (v === 'following' || v === 'all') return
    feedScope.value = 'all'
  },
  { immediate: true }
)

watch(
  feedSort,
  (v) => {
    if (v === 'new' || v === 'trending') return
    feedSort.value = 'new'
  },
  { immediate: true }
)

const followingOnly = computed(() => Boolean(isAuthed.value && feedScope.value === 'following'))

const { posts, nextCursor, loading, error, refresh, softRefreshNewer, startAutoSoftRefresh, loadMore, addPost, removePost } = usePostsFeed({
  visibility: feedFilter,
  followingOnly,
  sort: feedSort,
})

// Background “soft refresh” that preserves scroll position.
onMounted(() => startAutoSoftRefresh({ everyMs: 10_000 }))

const followingCount = ref<number | null>(null)
const followingCountLoading = ref(false)
const showFollowingEmptyState = computed(() => {
  return Boolean(followingOnly.value && !loading.value && !error.value && posts.value.length === 0)
})

watchEffect(() => {
  if (!import.meta.client) return
  if (!isAuthed.value) return
  if (!showFollowingEmptyState.value) return
  if (followingCount.value !== null) return
  if (followingCountLoading.value) return

  followingCountLoading.value = true
  void apiFetchData<{ followingCount: number }>('/follows/me/following-count')
    .then((res) => {
      const n = Number((res as { followingCount?: unknown } | null)?.followingCount ?? 0)
      followingCount.value = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0
    })
    .catch(() => {
      // Fall back to generic copy.
      followingCount.value = null
    })
    .finally(() => {
      followingCountLoading.value = false
    })
})
const draft = ref('')
const isPremium = computed(() => Boolean(user.value?.premium))

type UploadStatus = 'queued' | 'uploading' | 'processing' | 'done' | 'error'

type ComposerMediaItem = {
  localId: string
  source: PostMediaSource
  kind: PostMediaKind
  // For UI preview (object URLs for uploads; direct URLs for Giphy).
  previewUrl: string
  // For API payload:
  r2Key?: string
  url?: string
  mp4Url?: string | null
  width?: number | null
  height?: number | null
  // Upload lifecycle (uploads only). Giphy items are always "done".
  uploadStatus?: UploadStatus
  uploadError?: string | null
  // Only used for uploads: we keep the File around until commit succeeds.
  file?: File | null
  abortController?: AbortController | null
  uploadProgress?: number | null
}

const composerMedia = ref<ComposerMediaItem[]>([])
const canAddMoreMedia = computed(() => composerMedia.value.length < 4)
const composerUploading = computed(() => {
  return composerMedia.value.some((m) => {
    if (m.source !== 'upload') return false
    return m.uploadStatus === 'queued' || m.uploadStatus === 'uploading' || m.uploadStatus === 'processing'
  })
})

const mediaFileInputEl = ref<HTMLInputElement | null>(null)

function makeLocalId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `m_${Date.now()}_${Math.random().toString(16).slice(2)}`
  }
}

function openMediaPicker() {
  if (!canAddMoreMedia.value) return
  mediaFileInputEl.value?.click()
}

function removeComposerMedia(localId: string) {
  const id = (localId ?? '').trim()
  if (!id) return
  const idx = composerMedia.value.findIndex((m) => m.localId === id)
  if (idx < 0) return
  const item = composerMedia.value[idx]

  // Cancel any in-flight upload immediately.
  try {
    item?.abortController?.abort?.()
  } catch {
    // ignore
  }

  if (item?.source === 'upload' && item.previewUrl?.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(item.previewUrl)
    } catch {
      // ignore
    }
  }
  composerMedia.value.splice(idx, 1)
}

function composerUploadStatusLabel(m: ComposerMediaItem): string | null {
  if (m.source !== 'upload') return null
  if (m.uploadStatus === 'queued') return 'Queued'
  if (m.uploadStatus === 'uploading') return 'Uploading'
  if (m.uploadStatus === 'processing') return 'Processing'
  if (m.uploadStatus === 'error') return 'Failed'
  return null
}

const uploadWorkerRunning = ref(false)
const uploadInFlight = ref(0)
const UPLOAD_CONCURRENCY = 3

function patchComposerMedia(localId: string, patch: Partial<ComposerMediaItem>) {
  const idx = composerMedia.value.findIndex((m) => m.localId === localId)
  if (idx < 0) return
  const cur = composerMedia.value[idx]
  if (!cur) return
  composerMedia.value[idx] = { ...cur, ...patch }
}

async function uploadOne(id: string) {
  const next = composerMedia.value.find((m) => m.localId === id) ?? null
  if (!next || next.source !== 'upload' || next.uploadStatus !== 'queued') return
  const file = next.file
  if (!file) {
    patchComposerMedia(id, { uploadStatus: 'error', uploadError: 'Missing file.' })
    return
  }

  const controller = new AbortController()
  patchComposerMedia(id, { uploadStatus: 'uploading', uploadError: null, abortController: controller, uploadProgress: 0 })

  try {
    const init = await apiFetchData<{ key: string; uploadUrl: string; headers: Record<string, string>; maxBytes?: number }>(
      '/uploads/post-media/init',
      {
        method: 'POST',
        body: { contentType: file.type },
        signal: controller.signal,
      },
    )

    const maxBytes = typeof init.maxBytes === 'number' ? init.maxBytes : null
    if (maxBytes && file.size > maxBytes) throw new Error('File is too large.')

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', init.uploadUrl)
      for (const [k, v] of Object.entries(init.headers ?? {})) {
        try {
          xhr.setRequestHeader(k, v)
        } catch {
          // ignore
        }
      }
      xhr.upload.onprogress = (e) => {
        const total = e.total || file.size || 0
        if (!total) return
        const pct = Math.max(0, Math.min(100, (e.loaded / total) * 100))
        patchComposerMedia(id, { uploadProgress: pct })
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve()
        else reject(new Error('Failed to upload.'))
      }
      xhr.onerror = () => reject(new Error('Failed to upload.'))
      xhr.onabort = () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }))
      controller.signal.addEventListener(
        'abort',
        () => {
          try {
            xhr.abort()
          } catch {
            // ignore
          }
        },
        { once: true },
      )
      xhr.send(file)
    })

    patchComposerMedia(id, { uploadStatus: 'processing', uploadProgress: 100 })

    const committed = await apiFetchData<{
      key: string
      contentType: string
      kind: PostMediaKind
      width: number | null
      height: number | null
    }>('/uploads/post-media/commit', {
      method: 'POST',
      body: { key: init.key },
      signal: controller.signal,
    })

    patchComposerMedia(id, {
      uploadStatus: 'done',
      abortController: null,
      file: null,
      uploadProgress: 100,
      r2Key: committed.key,
      kind: committed.kind,
      width: committed.width ?? null,
      height: committed.height ?? null,
    })
  } catch (err: unknown) {
    if (controller.signal.aborted) return
    const msg = String((err as Error)?.message ?? err) || 'Upload failed.'
    patchComposerMedia(id, { uploadStatus: 'error', uploadError: msg, abortController: null })
  }
}

function processComposerUploadQueue() {
  if (uploadWorkerRunning.value) return
  uploadWorkerRunning.value = true

  const pump = () => {
    while (uploadInFlight.value < UPLOAD_CONCURRENCY) {
      const next = composerMedia.value.find((m) => m.source === 'upload' && m.uploadStatus === 'queued') ?? null
      if (!next) break
      uploadInFlight.value += 1
      void uploadOne(next.localId)
        .catch(() => {
          // per-item error handling
        })
        .finally(() => {
          uploadInFlight.value = Math.max(0, uploadInFlight.value - 1)
          pump()
        })
    }

    const queued = composerMedia.value.some((m) => m.source === 'upload' && m.uploadStatus === 'queued')
    if (!queued && uploadInFlight.value === 0) {
      uploadWorkerRunning.value = false
    }
  }

  pump()
}

async function onMediaFilesSelected(e: Event) {
  if (!import.meta.client) return
  const input = e.target as HTMLInputElement | null
  const files = Array.from(input?.files ?? [])
  // reset so selecting the same file again triggers change
  if (input) input.value = ''
  if (!files.length) return

  // Create all slots immediately (so multi-select feels instant), then upload sequentially in background.
  for (const file of files) {
    if (!canAddMoreMedia.value) break
    if (!file) continue
    const ct = (file.type ?? '').toLowerCase()
    if (!ct.startsWith('image/')) continue

    const previewUrl = URL.createObjectURL(file)
    const localId = makeLocalId()

    const slot: ComposerMediaItem = {
      localId,
      source: 'upload',
      kind: ct === 'image/gif' ? 'gif' : 'image',
      previewUrl,
      uploadStatus: 'queued',
      uploadError: null,
      file,
      abortController: null,
      uploadProgress: 0,
    }
    composerMedia.value.push(slot)
  }

  // Kick off uploads (parallel with a small cap).
  processComposerUploadQueue()
}

const giphyOpen = ref(false)
const giphyQuery = ref('')
const giphyLoading = ref(false)
const giphyError = ref<string | null>(null)
const giphyItems = ref<GiphySearchResponse['items']>([])
const giphyInputRef = ref<any>(null)
const giphyRequestId = ref(0)

function resetGiphyPickerState() {
  giphyQuery.value = ''
  giphyItems.value = []
  giphyError.value = null
  giphyLoading.value = false
}

function focusGiphyInput() {
  if (!import.meta.client) return
  try {
    // PrimeVue InputText exposes the underlying input as its $el.
    const root = (giphyInputRef.value?.$el ?? giphyInputRef.value) as HTMLElement | null
    const input = (root?.tagName === 'INPUT' ? (root as HTMLInputElement) : (root?.querySelector?.('input') as HTMLInputElement | null)) ?? null
    input?.focus()
    input?.select?.()
  } catch {
    // ignore
  }
}

function openGiphyPicker() {
  if (!canAddMoreMedia.value) return
  // Always start fresh (don't keep stale state around).
  resetGiphyPickerState()

  // Update the search field immediately (before the modal renders).
  giphyQuery.value = deriveGiphyQueryFromDraft(draft.value) ?? ''
  giphyOpen.value = true

  // Focus immediately once mounted.
  void nextTick().then(() => focusGiphyInput())

  // Immediately show results (best UX): either trending, or the derived query.
  void primeGiphyResults()
}

function deriveGiphyQueryFromDraft(text: string): string | null {
  const rawOriginal = (text ?? '').toString().trim()
  if (!rawOriginal) return null

  // If it's already a short "hype phrase", keep it essentially as-is.
  // This avoids weird transformations like "Let's" -> "Let".
  const withoutUrls = rawOriginal.replace(/https?:\/\/\S+/g, ' ').replace(/\s+/g, ' ').trim()
  if (withoutUrls && withoutUrls.length <= 28) {
    // Trim trailing punctuation; keep contractions.
    const cleaned = withoutUrls.replace(/[!?.,;:]+$/g, '').trim()
    if (cleaned.length >= 2) return normalizeGiphyQuery(cleaned)
  }

  const raw = withoutUrls.toLowerCase()
  // Heuristic: grab a few meaningful tokens from the end.
  const stop = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'to',
    'of',
    'in',
    'on',
    'for',
    'with',
    'is',
    'it',
    'this',
    'that',
    'i',
    'im',
    "i'm",
    'you',
    'we',
    'they',
    'my',
    'your',
    'our',
  ])
  const tokens = raw
    // Keep apostrophes inside words ("let's") so we don't lose meaning.
    .match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)
    ?.map((t) => t.trim())
    .filter((t) => t.length >= 2 && !stop.has(t)) ?? []
  if (!tokens.length) return null
  const picked = tokens.slice(-4)
  const q = picked.join(' ').trim()
  return q.length >= 2 ? normalizeGiphyQuery(q) : null
}

function normalizeGiphyQuery(q: string): string {
  const s = (q ?? '').toString().trim()
  if (!s) return ''
  // Reduce extremely long repeated letters so searches stay sane (e.g. "goooo" -> "gooo").
  // Keep at most 3 repeats.
  const collapsed = s.replace(/([A-Za-z])\1{3,}/g, '$1$1$1')
  return collapsed.replace(/\s+/g, ' ').trim()
}

async function fetchTrendingGifs() {
  if (!isAuthed.value) return
  if (giphyLoading.value) return
  const reqId = (giphyRequestId.value += 1)
  giphyLoading.value = true
  giphyError.value = null
  try {
    const res = await apiFetchData<GiphySearchResponse>('/giphy/trending', {
      method: 'GET',
      query: { limit: 24 },
    })
    if (!giphyOpen.value || giphyRequestId.value !== reqId) return
    giphyItems.value = res.items ?? []
  } catch (e: unknown) {
    if (!giphyOpen.value || giphyRequestId.value !== reqId) return
    giphyError.value = getApiErrorMessage(e) || 'Failed to load trending GIFs.'
    giphyItems.value = []
  } finally {
    if (giphyRequestId.value === reqId) giphyLoading.value = false
  }
}

async function primeGiphyResults() {
  if (!isAuthed.value) return
  if (giphyLoading.value) return
  const existing = giphyQuery.value.trim()
  if (existing.length >= 2) {
    await searchGiphy()
    return
  }
  await fetchTrendingGifs()
}

async function searchGiphy() {
  if (!isAuthed.value) return
  const q = giphyQuery.value.trim()
  if (q.length < 2) {
    await fetchTrendingGifs()
    return
  }
  if (giphyLoading.value) return
  const reqId = (giphyRequestId.value += 1)
  giphyLoading.value = true
  giphyError.value = null
  try {
    const res = await apiFetchData<GiphySearchResponse>('/giphy/search', {
      method: 'GET',
      query: { q, limit: 24 },
    })
    if (!giphyOpen.value || giphyRequestId.value !== reqId) return
    giphyItems.value = res.items ?? []
  } catch (e: unknown) {
    if (!giphyOpen.value || giphyRequestId.value !== reqId) return
    giphyError.value = getApiErrorMessage(e) || 'Failed to search Giphy.'
    giphyItems.value = []
  } finally {
    if (giphyRequestId.value === reqId) giphyLoading.value = false
  }
}

function selectGiphyGif(gif: GiphySearchResponse['items'][number]) {
  if (!canAddMoreMedia.value) return
  const url = (gif?.url ?? '').trim()
  if (!url) return
  composerMedia.value.push({
    localId: makeLocalId(),
    source: 'giphy',
    kind: 'gif',
    previewUrl: url,
    url,
    mp4Url: gif.mp4Url ?? null,
    width: gif.width ?? null,
    height: gif.height ?? null,
    uploadStatus: 'done',
    uploadError: null,
    file: null,
    abortController: null,
  })
  giphyOpen.value = false
}

watch(
  giphyOpen,
  (open) => {
    if (!open) {
      // Invalidate in-flight requests.
      giphyRequestId.value += 1
      // When closed/used, don't keep state around.
      resetGiphyPickerState()
    }
  },
  { flush: 'post' },
)

const viewerIsVerified = computed(() => Boolean(user.value?.verifiedStatus && user.value.verifiedStatus !== 'none'))
const viewerIsPremium = computed(() => Boolean(isPremium.value))

// Unverified users can only post to "Only me".
const canPost = computed(() => Boolean(isAuthed.value && (viewerIsVerified.value || visibility.value === 'onlyMe')))

const feedCtaKind = computed<null | 'verify' | 'premium'>(() => {
  if (feedFilter.value === 'verifiedOnly' && !viewerIsVerified.value) return 'verify'
  if (feedFilter.value === 'premiumOnly' && !viewerIsPremium.value) return 'premium'
  return null
})

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

async function setFeedFilter(next: ProfilePostsFilter) {
  feedFilter.value = next
  if (feedCtaKind.value) return
  await preserveMiddleScrollAfter(async () => await refresh())
}

async function setFeedSort(next: 'new' | 'trending') {
  feedSort.value = next
  if (feedCtaKind.value) return
  await preserveMiddleScrollAfter(async () => await refresh())
}

watch(
  () => feedScope.value,
  () => {
    if (feedCtaKind.value) return
    void refresh()
  },
  { flush: 'post' }
)

// Sort/filter changes are handled via setFeedSort / setFeedFilter.

const feedScopeLabel = computed(() => {
  return feedScope.value === 'following' ? 'Following' : 'All'
})

// Feed filter UI is handled by AppFeedFiltersBar (shared with profile pages).

const myProfilePath = computed(() => {
  const username = (user.value?.username ?? '').trim()
  return username ? `/u/${encodeURIComponent(username)}` : null
})

const postMaxLen = computed(() => (isPremium.value ? 500 : 200))
const postCharCount = computed(() => draft.value.length)

const meAvatarUrl = computed(() => {
  return user.value?.avatarUrl ?? null
})

const visibility = useCookie<PostVisibility>('moh.post.visibility.v1', {
  default: () => 'public',
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
})

const colorMode = useColorMode()
const isDarkMode = computed(() => colorMode.value === 'dark')

const composerTintCss = computed(() => {
  // We need to beat the global html/html.dark `!important` theme tint overrides,
  // so we also apply `!important` and use a more specific selector.
  const baseSel = 'html .moh-composer-tint'
  const darkSel = 'html.dark .moh-composer-tint'

  if (visibility.value === 'verifiedOnly') {
    return (
      primaryPaletteToCssVars(PRIMARY_VERIFIED_BLUE, baseSel, '#ffffff') +
      primaryPaletteToCssVars(PRIMARY_VERIFIED_BLUE, darkSel, '#000000')
    )
  }
  if (visibility.value === 'premiumOnly') {
    return (
      primaryPaletteToCssVars(PRIMARY_PREMIUM_ORANGE, baseSel, '#ffffff') +
      primaryPaletteToCssVars(PRIMARY_PREMIUM_ORANGE, darkSel, '#000000')
    )
  }

  // Public: neutral (text tint) per mode.
  return (
    primaryPaletteToCssVars(PRIMARY_TEXT_LIGHT, baseSel, '#ffffff') +
    primaryPaletteToCssVars(PRIMARY_TEXT_DARK, darkSel, '#000000')
  )
})

useHead({
  style: [{ key: 'moh-composer-tint', textContent: composerTintCss }],
})

const composerTextareaEl = ref<HTMLTextAreaElement | null>(null)
let autosizeRaf: number | null = null

function autosizeComposerTextarea() {
  if (!import.meta.client) return
  const el = composerTextareaEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

function scheduleAutosize() {
  if (!import.meta.client) return
  if (autosizeRaf != null) return
  autosizeRaf = requestAnimationFrame(() => {
    autosizeRaf = null
    autosizeComposerTextarea()
  })
}

function onComposerKeydown(e: KeyboardEvent) {
  // Cmd+Enter (macOS) / Ctrl+Enter (Windows/Linux) submits.
  // Keep plain Enter behavior (new line) intact.
  if (e.key !== 'Enter') return
  if ((e as unknown as { isComposing?: boolean }).isComposing) return
  if (!(e.metaKey || e.ctrlKey)) return
  e.preventDefault()
  void submit()
}

watch(
  draft,
  () => {
    // Draft changes can come from submit/reset as well as typing.
    scheduleAutosize()
  },
  { flush: 'post' }
)

onMounted(() => scheduleAutosize())

onBeforeUnmount(() => {
  if (autosizeRaf != null) cancelAnimationFrame(autosizeRaf)
  autosizeRaf = null
})

const composerTextareaVars = computed<Record<string, string>>(() => {
  if (visibility.value === 'verifiedOnly') {
    return {
      '--moh-compose-accent': 'var(--moh-verified)',
      '--moh-compose-ring': 'var(--moh-verified-ring)',
    }
  }
  if (visibility.value === 'premiumOnly') {
    return {
      '--moh-compose-accent': 'var(--moh-premium)',
      '--moh-compose-ring': 'var(--moh-premium-ring)',
    }
  }
  if (visibility.value === 'onlyMe') {
    return {
      '--moh-compose-accent': 'var(--moh-onlyme)',
      '--moh-compose-ring': 'var(--moh-onlyme-ring)',
    }
  }
  // Public: neutral (text color per mode).
  return isDarkMode.value
    ? { '--moh-compose-accent': 'rgba(255, 255, 255, 0.85)', '--moh-compose-ring': 'rgba(255, 255, 255, 0.25)' }
    : { '--moh-compose-accent': 'rgba(0, 0, 0, 0.85)', '--moh-compose-ring': 'rgba(0, 0, 0, 0.18)' }
})
const allowedComposerVisibilities = computed<PostVisibility[]>(() => {
  // Unverified: only-me only. Verified: public + verified-only (+ premium-only if premium).
  if (!isAuthed.value) return ['public']
  if (!viewerIsVerified.value) return ['onlyMe']
  return isPremium.value ? ['public', 'verifiedOnly', 'premiumOnly', 'onlyMe'] : ['public', 'verifiedOnly', 'onlyMe']
})

watch(
  allowedComposerVisibilities,
  (allowed) => {
    const set = new Set(allowed)
    if (!set.has(visibility.value)) visibility.value = allowed[0] ?? 'public'
  },
  { immediate: true }
)

const postButtonOutlined = computed(() => visibility.value === 'public')
const postButtonClass = computed(() => {
  if (visibility.value === 'verifiedOnly') return 'moh-btn-verified moh-btn-tone'
  if (visibility.value === 'premiumOnly') return 'moh-btn-premium moh-btn-tone'
  if (visibility.value === 'onlyMe') return 'moh-btn-onlyme moh-btn-tone'
  return 'moh-btn-public'
})

const composerVisibilityLabel = computed(() => {
  if (visibility.value === 'verifiedOnly') return 'Verified'
  if (visibility.value === 'premiumOnly') return 'Premium'
  if (visibility.value === 'onlyMe') return 'Only me'
  return 'Public'
})

const composerVisibilityPillClass = computed(() => {
  // Outline-only pill: colored text + border, clear background.
  // Reuse existing palette mapping, but use the "inactive" style (no bg).
  return `${filterPillClasses(visibility.value, false)} bg-transparent hover:bg-transparent dark:hover:bg-transparent`
})

const composerVisibilityWrapEl = ref<HTMLElement | null>(null)
const composerVisibilityPopoverOpen = ref(false)

function closeComposerVisibilityPopover() {
  composerVisibilityPopoverOpen.value = false
}

function toggleVisibilityPopover() {
  composerVisibilityPopoverOpen.value = !composerVisibilityPopoverOpen.value
}

function setComposerVisibility(v: PostVisibility) {
  visibility.value = v
  closeComposerVisibilityPopover()
}

watch(
  composerVisibilityPopoverOpen,
  (open) => {
    if (!import.meta.client) return

    const onPointerDown = (e: Event) => {
      const el = composerVisibilityWrapEl.value
      const target = e.target as Node | null
      if (!el || !target) return
      if (el.contains(target)) return
      closeComposerVisibilityPopover()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeComposerVisibilityPopover()
    }

    if (open) {
      window.addEventListener('mousedown', onPointerDown, true)
      window.addEventListener('touchstart', onPointerDown, true)
      window.addEventListener('keydown', onKeyDown)
    }

    return () => {
      window.removeEventListener('mousedown', onPointerDown, true)
      window.removeEventListener('touchstart', onPointerDown, true)
      window.removeEventListener('keydown', onKeyDown)
    }
  },
  { flush: 'post' }
)

const submitting = ref(false)
const submitError = ref<string | null>(null)

if (import.meta.server) {
  await refresh()
} else {
  onMounted(() => void refresh())
}

// If auth state changes (login/logout), refresh feed so visibility rules apply immediately.
watch(
  () => user.value?.id ?? null,
  () => {
    // When logging out, previously fetched (verified/premium) posts might still be in memory.
    // Re-fetch so the feed matches the viewer's permissions.
    void refresh()
  },
  { flush: 'post' }
)


const submit = async () => {
  if (!canPost.value) return
  if (submitting.value) return
  if (!(draft.value.trim() || composerMedia.value.length)) return
  if (postCharCount.value > postMaxLen.value) return
  if (composerUploading.value) return
  submitError.value = null
  submitting.value = true
  try {
    const mediaPayload = composerMedia.value
      .map((m) => {
        if (m.source === 'upload') {
          const r2Key = (m.r2Key ?? '').trim()
          if (!r2Key) return null
          return {
            source: 'upload' as const,
            kind: m.kind,
            r2Key,
            width: m.width ?? null,
            height: m.height ?? null,
          }
        }
        const url = (m.url ?? '').trim()
        if (!url) return null
        return {
          source: 'giphy' as const,
          kind: 'gif' as const,
          url,
          mp4Url: m.mp4Url ?? null,
          width: m.width ?? null,
          height: m.height ?? null,
        }
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x))

    const created = await addPost(draft.value, visibility.value, mediaPayload)
    draft.value = ''
    // Clear composer media (and release blob URLs) after successful post.
    for (const m of composerMedia.value) {
      if (m.source === 'upload' && m.previewUrl?.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(m.previewUrl)
        } catch {
          // ignore
        }
      }
    }
    composerMedia.value = []
    if (created?.id) {
      const to = `/p/${encodeURIComponent(created.id)}`
      const tone =
        visibility.value === 'premiumOnly'
          ? 'premiumOnly'
          : visibility.value === 'verifiedOnly'
            ? 'verifiedOnly'
            : visibility.value === 'onlyMe'
              ? 'onlyMe'
              : 'public'

      const detail =
        visibility.value === 'premiumOnly'
          ? 'Premium-only post · Tap to view.'
          : visibility.value === 'verifiedOnly'
            ? 'Verified-only post · Tap to view.'
            : visibility.value === 'onlyMe'
              ? 'Only you can see this · Tap to view.'
              : 'Tap to view.'

      toast.push({
        title: 'Posted',
        message: detail,
        tone,
        to,
        durationMs: 2600,
      })
    }
  } catch (e: unknown) {
    // If user is rate limited (posting too often), show a toast.
    const msg = getApiErrorMessage(e) || 'Failed to post.'
    submitError.value = msg
    toast.push({ title: msg, tone: 'error', durationMs: 2500 })
  } finally {
    submitting.value = false
  }
}

const goLogin = () => {
  const redirect = encodeURIComponent('/home')
  return navigateTo(`/login?redirect=${redirect}`)
}
</script>

