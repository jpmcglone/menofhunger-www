<template>
  <AppPageContent bottom="standard" class="px-4 py-4 space-y-4">
    <AppPageHeader title="Media review" icon="pi-images" description="Review and delete uploaded images and videos.">
      <template #leading>
        <Button
          class="md:hidden"
          text
          severity="secondary"
          icon="pi pi-chevron-left"
          aria-label="Back"
          @click="navigateTo('/admin')"
        />
      </template>
    </AppPageHeader>

    <div class="flex flex-wrap items-center gap-2">
      <Select
        v-model="mediaKindFilter"
        :options="kindOptions"
        option-label="label"
        option-value="value"
        placeholder="Filter by type"
        class="w-[8.5rem]"
      />
      <InputText v-model="mediaQuery" class="w-full sm:w-72" placeholder="Search by key…" @keydown.enter.prevent="loadMedia(true)" />
      <div class="flex items-center gap-2">
        <label class="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input v-model="mediaShowDeleted" type="checkbox" class="accent-current" />
          Show deleted
        </label>
        <label class="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input v-model="mediaOnlyOrphans" type="checkbox" class="accent-current" />
          Orphans only
        </label>
      </div>
      <Button
        label="Search"
        icon="pi pi-search"
        severity="secondary"
        :loading="mediaLoading"
        :disabled="mediaLoading"
        @click="loadMedia(true)"
      />
      <Button
        label="Sync"
        icon="pi pi-refresh"
        text
        severity="secondary"
        :loading="mediaSyncing"
        :disabled="mediaLoading || mediaSyncing"
        v-tooltip.bottom="{ value: 'Index recent objects from storage', class: 'moh-tooltip-tiny', position: 'bottom' }"
        @click="syncMedia()"
      />
    </div>

    <AppInlineAlert v-if="mediaError" severity="danger">
      {{ mediaError }}
    </AppInlineAlert>

    <div v-else class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      <button
        v-for="it in mediaItems"
        :key="it.id"
        type="button"
        class="group relative aspect-square overflow-hidden rounded-xl border moh-border moh-surface hover:opacity-95 transition-opacity"
        :aria-label="`View ${it.kind === 'video' ? 'video' : 'media'} ${it.id}`"
        @click="openDetails(it.id)"
      >
        <template v-if="it.kind === 'video'">
          <video
            v-if="it.publicUrl"
            :src="it.publicUrl"
            class="absolute inset-0 h-full w-full object-cover"
            muted
            playsinline
            preload="metadata"
            aria-hidden="true"
          />
          <div
            v-else
            class="absolute inset-0 flex items-center justify-center bg-black/30"
            aria-hidden="true"
          >
            <i class="pi pi-video text-2xl text-white opacity-80" aria-hidden="true" />
          </div>
          <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
            <i class="pi pi-play text-2xl text-white drop-shadow" aria-hidden="true" />
          </div>
        </template>
        <template v-else>
          <img
            v-if="it.publicUrl"
            :src="it.publicUrl"
            class="absolute inset-0 h-full w-full object-cover"
            alt=""
            loading="lazy"
            decoding="async"
          />
          <div
            v-else
            class="absolute inset-0 flex items-center justify-center"
            aria-hidden="true"
          >
            <div class="text-center text-xs moh-text-muted px-3">
              <i class="pi pi-image text-xl opacity-70" aria-hidden="true" />
              <div class="mt-2 font-semibold">No preview</div>
            </div>
          </div>
        </template>

        <div class="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-2">
          <div class="pointer-events-none flex items-center justify-between gap-2">
            <span class="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold moh-border moh-bg moh-text">
              {{ it.belongsToSummary }}
            </span>
            <span v-if="it.kind" class="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold moh-border moh-bg moh-text">
              {{ it.kind }}
            </span>
            <span
              v-if="it.deletedAt"
              class="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold moh-border moh-bg moh-text"
            >
              Deleted
            </span>
          </div>
          <div
            v-if="(it.postId && it.authorUsername) || it.profileUsername"
            class="flex flex-wrap gap-1 text-[10px] moh-text-muted truncate pointer-events-auto"
            @click.stop
          >
            <NuxtLink
              v-if="it.postId && it.authorUsername"
              :to="`/p/${encodeURIComponent(it.postId)}`"
              class="hover:underline shrink-0"
            >
              Post by @{{ it.authorUsername }}
            </NuxtLink>
            <NuxtLink
              v-if="it.profileUsername"
              :to="`/u/${encodeURIComponent(it.profileUsername)}`"
              class="hover:underline shrink-0"
            >
              Profile @{{ it.profileUsername }}
            </NuxtLink>
          </div>
        </div>
      </button>
    </div>

    <div class="flex items-center justify-center pt-2">
      <Button
        v-if="mediaNextCursor"
        label="Load more"
        severity="secondary"
        :loading="mediaLoadingMore"
        :disabled="mediaLoading || mediaLoadingMore"
        @click="loadMoreMedia()"
      />
      <div v-else-if="!mediaLoading && mediaItems.length === 0" class="text-sm moh-text-muted">
        No media found.
      </div>
    </div>

  <Dialog
    v-model:visible="detailsOpen"
    modal
    header="Media details"
    :draggable="false"
    class="w-[min(72rem,calc(100vw-2rem))]"
    @hide="onDetailsClosed"
  >
    <div class="space-y-4">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="text-xs moh-text-muted">Asset ID</div>
          <div class="mt-1 font-mono text-xs moh-text break-all">{{ details?.asset.id || '—' }}</div>
          <div class="mt-2 text-xs moh-text-muted">R2 key</div>
          <div class="mt-1 font-mono text-xs moh-text break-all">{{ details?.asset.r2Key || '—' }}</div>
        </div>
        <div class="shrink-0 flex items-center gap-2">
          <Button
            v-if="details?.asset.id"
            label="Open page"
            text
            severity="secondary"
            icon="pi pi-external-link"
            @click="navigateTo(`/admin/media-review/${encodeURIComponent(details.asset.id)}`)"
          />
        </div>
      </div>

      <AppInlineAlert v-if="detailsError" severity="danger">
        {{ detailsError }}
      </AppInlineAlert>

      <div v-else-if="detailsLoading" class="text-sm moh-text-muted">Loading…</div>

      <div v-else-if="details" class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div class="space-y-3">
          <div class="overflow-hidden rounded-2xl border moh-border moh-surface">
            <video
              v-if="details.asset.kind === 'video' && details.asset.publicUrl"
              :src="details.asset.publicUrl"
              class="block w-full max-h-[70vh] object-contain bg-black"
              controls
              playsinline
              preload="metadata"
              aria-label="Video"
            />
            <img
              v-else-if="details.asset.publicUrl"
              :src="details.asset.publicUrl"
              class="block w-full max-h-[70vh] object-contain bg-black/5 dark:bg-white/5"
              alt=""
              loading="lazy"
              decoding="async"
            />
            <div v-else class="flex items-center justify-center h-[22rem]">
              <div class="text-center text-sm moh-text-muted">
                <i :class="details.asset.kind === 'video' ? 'pi pi-video' : 'pi pi-image'" class="text-3xl opacity-70" aria-hidden="true" />
                <div class="mt-2 font-semibold">{{ details.asset.deletedAt ? 'Deleted' : 'No preview' }}</div>
              </div>
            </div>
          </div>

          <div class="rounded-2xl border moh-border p-3 moh-surface">
            <div class="text-xs font-semibold moh-text-muted">References</div>
            <div class="mt-2 space-y-3 text-sm">
              <div>
                <div class="font-semibold">Posts</div>
                <div v-if="details.references.posts.length === 0" class="moh-text-muted">None</div>
                <div v-else class="mt-1 space-y-1">
                  <NuxtLink
                    v-for="p in details.references.posts"
                    :key="p.postMediaId"
                    :to="`/p/${encodeURIComponent(p.postId)}`"
                    class="block rounded-lg border moh-border px-2 py-2 moh-surface-hover"
                    @click="detailsOpen = false"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <div class="min-w-0">
                        <div class="text-xs moh-text-muted">Post</div>
                        <div class="font-mono text-xs truncate">{{ p.postId }}</div>
                        <div class="mt-1 text-xs moh-text-muted truncate">
                          <span class="mr-1">by</span>
                          <span v-if="p.author.username">@{{ p.author.username }}</span>
                          <span v-else class="font-mono">{{ p.author.id }}</span>
                          <span class="mx-2">·</span>
                          <span class="font-mono">{{ formatDateTime(p.postCreatedAt) }}</span>
                        </div>
                      </div>
                      <div class="shrink-0 text-right">
                        <div class="text-xs moh-text-muted">{{ p.postVisibility }}</div>
                        <div v-if="p.deletedAt" class="text-[10px] font-semibold text-red-700 dark:text-red-300">Deleted</div>
                      </div>
                    </div>
                  </NuxtLink>
                </div>
              </div>

              <div class="pt-2 border-t moh-border">
                <div class="font-semibold">Profiles</div>
                <div v-if="details.references.users.length === 0" class="moh-text-muted">None</div>
                <div v-else class="mt-1 space-y-1">
                  <NuxtLink
                    v-for="u in details.references.users"
                    :key="u.id"
                    :to="u.username ? `/u/${encodeURIComponent(u.username)}` : '/admin/users'"
                    class="block rounded-lg border moh-border px-2 py-2 moh-surface-hover"
                    @click="detailsOpen = false"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <div class="min-w-0">
                        <div class="font-semibold truncate">{{ u.name || u.username || u.id }}</div>
                        <div class="text-xs moh-text-muted truncate">@{{ u.username || '—' }}</div>
                      </div>
                      <div class="shrink-0 flex items-center gap-2">
                        <AppVerifiedBadge :status="u.verifiedStatus" :premium="u.premium" :premium-plus="u.premiumPlus" />
                      </div>
                    </div>
                  </NuxtLink>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <div class="rounded-2xl border moh-border p-3 moh-surface">
            <div class="text-xs font-semibold moh-text-muted">Metadata</div>
            <div class="mt-2 space-y-2 text-sm">
              <div class="flex items-center justify-between gap-2">
                <div class="moh-text-muted">Kind</div>
                <div class="font-mono text-xs">{{ details.asset.kind ?? '—' }}</div>
              </div>
              <div class="flex items-center justify-between gap-2">
                <div class="moh-text-muted">Last modified</div>
                <div class="font-mono text-xs">{{ details.asset.lastModified }}</div>
              </div>
              <div class="flex items-center justify-between gap-2">
                <div class="moh-text-muted">Bytes</div>
                <div class="font-mono text-xs">{{ details.asset.bytes ?? '—' }}</div>
              </div>
              <div class="flex items-center justify-between gap-2">
                <div class="moh-text-muted">Content-Type</div>
                <div class="font-mono text-xs">{{ details.asset.contentType ?? '—' }}</div>
              </div>
              <div class="flex items-center justify-between gap-2">
                <div class="moh-text-muted">Dimensions</div>
                <div class="font-mono text-xs">
                  {{
                    details.asset.width && details.asset.height
                      ? `${details.asset.width}×${details.asset.height}`
                      : '—'
                  }}
                </div>
              </div>
              <div class="flex items-center justify-between gap-2">
                <div class="moh-text-muted">Deleted</div>
                <div class="font-mono text-xs">{{ details.asset.deletedAt ? 'yes' : 'no' }}</div>
              </div>
              <div class="flex items-center justify-between gap-2">
                <div class="moh-text-muted">R2 deleted</div>
                <div class="font-mono text-xs">{{ details.asset.r2DeletedAt ? 'yes' : 'no' }}</div>
              </div>
              <div v-if="details.asset.deleteReason" class="pt-2 border-t moh-border">
                <div class="text-xs font-semibold moh-text-muted">Delete reason</div>
                <div class="mt-1 text-sm moh-text">{{ details.asset.deleteReason }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <Button label="Close" severity="secondary" @click="detailsOpen = false" />
    </template>
  </Dialog>
  </AppPageContent>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Media review',
  middleware: 'admin',
})

usePageSeo({
  title: 'Media review',
  description: 'Admin media review.',
  canonicalPath: '/admin/media-review',
  noindex: true,
})

const { apiFetch, apiFetchData } = useApiClient()
import { getApiErrorMessage } from '~/utils/api-error'
import { formatDateTime } from '~/utils/time-format'
import type { AdminImageReviewDetailResponse, AdminImageReviewListItem, AdminImageReviewListData } from '~/types/api'

const kindOptions = [
  { label: 'All', value: 'all' },
  { label: 'Images', value: 'image' },
  { label: 'Videos', value: 'video' },
]

const mediaKindFilter = ref<'all' | 'image' | 'video'>('all')
const mediaQuery = ref('')
const mediaShowDeleted = ref(false)
const mediaOnlyOrphans = ref(false)
const mediaItems = ref<AdminImageReviewListItem[]>([])
const mediaNextCursor = ref<string | null>(null)
const mediaLoading = ref(false)
const mediaLoadingMore = ref(false)
const mediaSyncing = ref(false)
const mediaError = ref<string | null>(null)

const detailsOpen = ref(false)
const detailsId = ref<string | null>(null)
const detailsLoading = ref(false)
const detailsError = ref<string | null>(null)
const details = ref<AdminImageReviewDetailResponse | null>(null)

const didInitialLoad = ref(false)
onMounted(() => {
  if (didInitialLoad.value) return
  didInitialLoad.value = true
  void loadMedia(true)
})

watch(mediaKindFilter, () => void loadMedia(true))

watch(
  () => detailsId.value,
  () => {
    if (!detailsOpen.value) return
    void loadDetails()
  },
)

function queryParams(reset: boolean) {
  return {
    limit: 60,
    cursor: reset ? undefined : mediaNextCursor.value ?? undefined,
    q: mediaQuery.value.trim() || undefined,
    showDeleted: mediaShowDeleted.value ? '1' : undefined,
    onlyOrphans: mediaOnlyOrphans.value ? '1' : undefined,
    kind: mediaKindFilter.value,
  }
}

async function loadMedia(reset: boolean) {
  if (mediaLoading.value) return
  mediaError.value = null
  mediaLoading.value = true
  try {
    if (reset) {
      mediaItems.value = []
      mediaNextCursor.value = null
    }
    const res = await apiFetch<AdminImageReviewListData>('/admin/media-review', {
      method: 'GET',
      query: queryParams(reset) as Record<string, string | number | undefined>,
    })
    const list = res.data ?? []
    mediaItems.value = reset ? list : [...mediaItems.value, ...list]
    mediaNextCursor.value = res.pagination?.nextCursor ?? null
  } catch (e: unknown) {
    mediaError.value = getApiErrorMessage(e) || 'Failed to load media.'
  } finally {
    mediaLoading.value = false
  }
}

async function loadMoreMedia() {
  if (!mediaNextCursor.value) return
  if (mediaLoadingMore.value || mediaLoading.value) return
  mediaLoadingMore.value = true
  try {
    const res = await apiFetch<AdminImageReviewListData>('/admin/media-review', {
      method: 'GET',
      query: queryParams(false) as Record<string, string | number | undefined>,
    })
    const list = res.data ?? []
    mediaItems.value = [...mediaItems.value, ...list]
    mediaNextCursor.value = res.pagination?.nextCursor ?? null
  } catch (e: unknown) {
    mediaError.value = getApiErrorMessage(e) || 'Failed to load more media.'
  } finally {
    mediaLoadingMore.value = false
  }
}

function openDetails(id: string) {
  detailsId.value = id
  detailsOpen.value = true
  details.value = null
  detailsError.value = null
  void loadDetails()
}

function onDetailsClosed() {
  detailsLoading.value = false
  detailsError.value = null
  details.value = null
  detailsId.value = null
}

async function loadDetails() {
  const id = (detailsId.value ?? '').trim()
  if (!id) return
  if (detailsLoading.value) return
  detailsLoading.value = true
  detailsError.value = null
  try {
    details.value = await apiFetchData<AdminImageReviewDetailResponse>('/admin/media-review/' + encodeURIComponent(id), { method: 'GET' })
  } catch (e: unknown) {
    detailsError.value = getApiErrorMessage(e) || 'Failed to load media.'
  } finally {
    detailsLoading.value = false
  }
}


async function syncMedia() {
  if (mediaSyncing.value) return
  mediaSyncing.value = true
  mediaError.value = null
  try {
    const res = await apiFetch<AdminImageReviewListData>('/admin/media-review', {
      method: 'GET',
      query: { ...queryParams(true), sync: '1' } as Record<string, string | number | undefined>,
    })
    mediaItems.value = res.data ?? []
    mediaNextCursor.value = res.pagination?.nextCursor ?? null
  } catch (e: unknown) {
    mediaError.value = getApiErrorMessage(e) || 'Sync failed.'
  } finally {
    mediaSyncing.value = false
  }
}
</script>
