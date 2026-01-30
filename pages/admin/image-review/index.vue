<template>
  <div class="px-4 py-4 space-y-4">
    <AppPageHeader title="Image review" icon="pi-images" description="Review and delete uploaded images.">
      <template #actions>
        <Button label="Back" severity="secondary" text icon="pi pi-arrow-left" @click="navigateTo('/admin')" />
      </template>
    </AppPageHeader>

    <div class="flex flex-wrap items-center gap-2">
      <InputText v-model="imgQuery" class="w-full sm:w-72" placeholder="Search by key…" @keydown.enter.prevent="loadImages(true)" />
      <div class="flex items-center gap-2">
        <label class="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input v-model="imgShowDeleted" type="checkbox" class="accent-current" />
          Show deleted
        </label>
        <label class="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input v-model="imgOnlyOrphans" type="checkbox" class="accent-current" />
          Orphans only
        </label>
      </div>
      <Button
        label="Search"
        icon="pi pi-search"
        severity="secondary"
        :loading="imgLoading"
        :disabled="imgLoading"
        @click="loadImages(true)"
      />
      <Button
        label="Sync"
        icon="pi pi-refresh"
        text
        severity="secondary"
        :loading="imgSyncing"
        :disabled="imgLoading || imgSyncing"
        v-tooltip.bottom="{ value: 'Index recent objects from storage', class: 'moh-tooltip-tiny', position: 'bottom' }"
        @click="syncImages()"
      />
    </div>

    <AppInlineAlert v-if="imgError" severity="danger">
      {{ imgError }}
    </AppInlineAlert>

    <div v-else class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      <button
        v-for="it in imgItems"
        :key="it.id"
        type="button"
        class="group relative aspect-square overflow-hidden rounded-xl border moh-border moh-surface hover:opacity-95 transition-opacity"
        :aria-label="`View image ${it.id}`"
        @click="openDetails(it.id)"
      >
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

        <div class="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-2">
          <span class="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold moh-border moh-bg moh-text">
            {{ it.belongsToSummary }}
          </span>
          <span
            v-if="it.deletedAt"
            class="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold moh-border moh-bg moh-text"
          >
            Deleted
          </span>
        </div>
      </button>
    </div>

    <div class="flex items-center justify-center pt-2">
      <Button
        v-if="imgNextCursor"
        label="Load more"
        severity="secondary"
        :loading="imgLoadingMore"
        :disabled="imgLoading || imgLoadingMore"
        @click="loadMoreImages()"
      />
      <div v-else-if="!imgLoading && imgItems.length === 0" class="text-sm moh-text-muted">
        No images found.
      </div>
    </div>
  </div>

  <Dialog
    v-model:visible="detailsOpen"
    modal
    header="Image details"
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
            @click="navigateTo(`/admin/image-review/${encodeURIComponent(details.asset.id)}`)"
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
            <img
              v-if="details.asset.publicUrl"
              :src="details.asset.publicUrl"
              class="block w-full max-h-[70vh] object-contain bg-black/5 dark:bg-white/5"
              alt=""
              loading="lazy"
              decoding="async"
            />
            <div v-else class="flex items-center justify-center h-[22rem]">
              <div class="text-center text-sm moh-text-muted">
                <i class="pi pi-image text-3xl opacity-70" aria-hidden="true" />
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
                          <span class="font-mono">{{ formatIso(p.postCreatedAt) }}</span>
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
                <div class="font-semibold">Users</div>
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
                        <AppVerifiedBadge :status="u.verifiedStatus" :premium="u.premium" />
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
                <div class="moh-text-muted">Kind</div>
                <div class="font-mono text-xs">{{ details.asset.kind ?? '—' }}</div>
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
</template>

<script setup lang="ts">
definePageMeta({
  title: 'Image review',
})

usePageSeo({
  title: 'Image review',
  description: 'Admin image review.',
  canonicalPath: '/admin/image-review',
  noindex: true,
})

const { apiFetchData } = useApiClient()
import { getApiErrorMessage } from '~/utils/api-error'
import type { AdminImageReviewDetailResponse, AdminImageReviewListItem, AdminImageReviewListResponse } from '~/types/api'

const imgQuery = ref('')
const imgShowDeleted = ref(false)
const imgOnlyOrphans = ref(false)
const imgItems = ref<AdminImageReviewListItem[]>([])
const imgNextCursor = ref<string | null>(null)
const imgLoading = ref(false)
const imgLoadingMore = ref(false)
const imgSyncing = ref(false)
const imgError = ref<string | null>(null)

// Details modal
const detailsOpen = ref(false)
const detailsId = ref<string | null>(null)
const detailsLoading = ref(false)
const detailsError = ref<string | null>(null)
const details = ref<AdminImageReviewDetailResponse | null>(null)

watchEffect(() => {
  if (!import.meta.client) return
  // Load once on first view.
  if (imgItems.value.length) return
  void loadImages(true)
})

watch(
  () => detailsId.value,
  () => {
    if (!detailsOpen.value) return
    void loadDetails()
  },
)

async function loadImages(reset: boolean) {
  if (imgLoading.value) return
  imgError.value = null
  imgLoading.value = true
  try {
    if (reset) {
      imgItems.value = []
      imgNextCursor.value = null
    }
    const res = await apiFetchData<AdminImageReviewListResponse>('/admin/image-review', {
      method: 'GET',
      query: {
        limit: 60,
        cursor: reset ? null : imgNextCursor.value,
        q: imgQuery.value.trim() || undefined,
        showDeleted: imgShowDeleted.value ? '1' : undefined,
        onlyOrphans: imgOnlyOrphans.value ? '1' : undefined,
      } as any,
    })
    imgItems.value = reset ? (res.items ?? []) : [...imgItems.value, ...(res.items ?? [])]
    imgNextCursor.value = res.nextCursor ?? null
  } catch (e: unknown) {
    imgError.value = getApiErrorMessage(e) || 'Failed to load images.'
  } finally {
    imgLoading.value = false
  }
}

async function loadMoreImages() {
  if (!imgNextCursor.value) return
  if (imgLoadingMore.value || imgLoading.value) return
  imgLoadingMore.value = true
  try {
    const res = await apiFetchData<AdminImageReviewListResponse>('/admin/image-review', {
      method: 'GET',
      query: {
        limit: 60,
        cursor: imgNextCursor.value,
        q: imgQuery.value.trim() || undefined,
        showDeleted: imgShowDeleted.value ? '1' : undefined,
        onlyOrphans: imgOnlyOrphans.value ? '1' : undefined,
      } as any,
    })
    imgItems.value = [...imgItems.value, ...(res.items ?? [])]
    imgNextCursor.value = res.nextCursor ?? null
  } catch (e: unknown) {
    imgError.value = getApiErrorMessage(e) || 'Failed to load more images.'
  } finally {
    imgLoadingMore.value = false
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
    details.value = await apiFetchData<AdminImageReviewDetailResponse>('/admin/image-review/' + encodeURIComponent(id), { method: 'GET' })
  } catch (e: unknown) {
    detailsError.value = getApiErrorMessage(e) || 'Failed to load image.'
  } finally {
    detailsLoading.value = false
  }
}

function formatIso(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const date = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit' }).format(d)
  const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(d)
  return `${date} · ${time}`
}

async function syncImages() {
  if (imgSyncing.value) return
  imgSyncing.value = true
  imgError.value = null
  try {
    const res = await apiFetchData<AdminImageReviewListResponse>('/admin/image-review', {
      method: 'GET',
      query: {
        limit: 60,
        cursor: null,
        q: imgQuery.value.trim() || undefined,
        showDeleted: imgShowDeleted.value ? '1' : undefined,
        onlyOrphans: imgOnlyOrphans.value ? '1' : undefined,
        sync: '1',
      } as any,
    })
    imgItems.value = res.items ?? []
    imgNextCursor.value = res.nextCursor ?? null
  } catch (e: unknown) {
    imgError.value = getApiErrorMessage(e) || 'Sync failed.'
  } finally {
    imgSyncing.value = false
  }
}
</script>

