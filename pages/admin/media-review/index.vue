<template>
  <AppPageContent bottom="standard" class="space-y-4">
    <AppPageHeader sticky class="px-4 pt-4 pb-3" title="Media review" description="Every upload, who it belongs to, and whether anything still uses it.">
      <template #leading>
        <div class="md:hidden">
          <Button as="NuxtLink" to="/admin" text severity="secondary" aria-label="Back">
            <template #icon><Icon name="tabler:chevron-left" aria-hidden="true" /></template>
          </Button>
        </div>
      </template>
    </AppPageHeader>

    <div class="px-4 space-y-3">
      <div class="flex items-center gap-2">
        <InputText v-model="mediaQuery" class="w-full" placeholder="Search by file key" aria-label="Search media" @keydown.enter.prevent="loadMedia(true)" />
        <Button label="Search" severity="secondary" :loading="mediaLoading" :disabled="mediaLoading" @click="loadMedia(true)">
          <template #icon><Icon name="tabler:search" aria-hidden="true" /></template>
        </Button>
        <Button
          v-tooltip.bottom="{ value: 'Index recent objects from storage', class: 'moh-tooltip-tiny', position: 'bottom' }"
          label="Sync"
          text
          severity="secondary"
          :loading="mediaSyncing"
          :disabled="mediaLoading || mediaSyncing"
          @click="syncMedia()"
        >
          <template #icon><Icon name="tabler:refresh" aria-hidden="true" /></template>
        </Button>
      </div>

      <div class="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Media filters">
        <button
          v-for="option in kindOptions"
          :key="option.value"
          type="button"
          class="moh-focus inline-flex min-h-9 items-center rounded-full border px-3 text-sm font-medium transition-colors"
          :class="mediaKindFilter === option.value ? 'border-transparent bg-[var(--moh-text)] text-[var(--moh-bg)]' : 'moh-border moh-surface moh-text moh-surface-hover'"
          :aria-pressed="mediaKindFilter === option.value"
          @click="mediaKindFilter = option.value"
        >
          {{ option.label }}
        </button>
        <span class="h-5 w-px moh-border border-l" aria-hidden="true" />
        <button
          type="button"
          class="moh-focus inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors"
          :class="mediaOnlyOrphans ? 'border-transparent bg-amber-500 text-white' : 'moh-border moh-surface moh-text moh-surface-hover'"
          :aria-pressed="mediaOnlyOrphans"
          @click="toggleOrphans"
        >
          <Icon name="tabler:unlink" size="14" aria-hidden="true" />
          Unused
        </button>
        <button
          type="button"
          class="moh-focus inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors"
          :class="mediaShowDeleted ? 'border-transparent bg-red-600 text-white' : 'moh-border moh-surface moh-text moh-surface-hover'"
          :aria-pressed="mediaShowDeleted"
          @click="toggleShowDeleted"
        >
          <Icon name="tabler:trash" size="14" aria-hidden="true" />
          Deleted
        </button>
      </div>
    </div>

    <AppInlineAlert v-if="mediaError" severity="danger" class="mx-4">
      {{ mediaError }}
    </AppInlineAlert>

    <div v-else class="px-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <div v-for="it in mediaItems" :key="it.id" class="group relative">
        <NuxtLink
          :to="`/admin/media-review/${encodeURIComponent(it.id)}`"
          class="moh-focus block overflow-hidden rounded-2xl border moh-border moh-surface transition-shadow hover:shadow-md"
          :class="selectedIds.has(it.id) ? 'ring-2 ring-[var(--moh-text)]' : ''"
        >
          <div class="relative aspect-[4/3] overflow-hidden bg-black/5 dark:bg-white/5">
            <template v-if="it.kind === 'video'">
              <video v-if="it.publicUrl" :src="it.publicUrl" class="absolute inset-0 h-full w-full object-cover" muted playsinline preload="metadata" aria-hidden="true" />
              <div v-else class="absolute inset-0 flex items-center justify-center bg-black/30" aria-hidden="true">
                <Icon name="tabler:video" class="text-2xl text-white opacity-80" aria-hidden="true" />
              </div>
              <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
                <Icon name="tabler:player-play-filled" class="text-2xl text-white drop-shadow" aria-hidden="true" />
              </div>
            </template>
            <img v-else-if="it.publicUrl" :src="it.publicUrl" class="absolute inset-0 h-full w-full object-cover" alt="" loading="lazy" decoding="async">
            <div v-else class="absolute inset-0 flex flex-col items-center justify-center gap-1 px-3 text-center text-xs moh-text-muted">
              <Icon :name="describe(it).protectedMedia ? 'tabler:lock' : 'tabler:photo-off'" class="text-xl opacity-70" aria-hidden="true" />
              {{ describe(it).protectedMedia ? 'Private to channel members' : it.deletedAt ? 'Deleted' : 'No preview' }}
            </div>
            <span class="absolute bottom-2 left-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="MEDIA_REVIEW_TONE_CLASS[describe(it).tone]">
              {{ describe(it).label }}
            </span>
            <span v-if="it.deletedAt" class="absolute bottom-2 right-2 inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white">Deleted</span>
          </div>
          <div class="space-y-0.5 p-3">
            <div class="truncate text-sm font-semibold moh-text">{{ describe(it).title }}</div>
            <div class="truncate text-xs moh-text-muted">{{ itemSubtitle(it) }}</div>
          </div>
        </NuxtLink>
        <button
          type="button"
          class="moh-focus absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full"
          :aria-label="`${selectedIds.has(it.id) ? 'Deselect' : 'Select'} ${describe(it).title}`"
          :aria-pressed="selectedIds.has(it.id)"
          @click="toggleSelect(it.id)"
        >
          <span
            class="flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 transition-opacity"
            :class="selectedIds.has(it.id)
              ? 'border-[var(--moh-text)] bg-[var(--moh-text)] text-[var(--moh-bg)] opacity-100'
              : 'border-white bg-black/30 text-transparent opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100'"
          >
            <Icon name="tabler:check" size="13" aria-hidden="true" />
          </span>
        </button>
      </div>
    </div>

    <div class="px-4 flex items-center justify-center pt-2">
      <Button v-if="mediaNextCursor" label="Load more" severity="secondary" :loading="mediaLoadingMore" :disabled="mediaLoading || mediaLoadingMore" @click="loadMoreMedia()" />
      <div v-else-if="!mediaLoading && mediaItems.length === 0" class="text-sm moh-text-muted">No media found.</div>
    </div>

    <Transition
      enter-active-class="transition-all duration-150"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-100"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div v-if="selectedIds.size > 0" class="sticky bottom-4 z-20 mx-4 flex flex-wrap items-center gap-3 rounded-2xl bg-[var(--moh-text)] px-4 py-3 text-[var(--moh-bg)] shadow-lg">
        <span class="text-sm font-semibold">{{ selectedIds.size }} selected</span>
        <span class="text-sm opacity-70">{{ selectedUnused }} unused · {{ selectedIds.size - selectedUnused }} in use</span>
        <div class="flex-1" />
        <Button v-if="unusedLoaded.length" label="Select unused" size="small" severity="secondary" @click="selectUnused" />
        <Button label="Clear" size="small" text severity="secondary" class="!text-[var(--moh-bg)]" @click="clearSelection" />
        <Button :label="`Delete ${selectedIds.size}`" severity="danger" size="small" :loading="bulkDeleting" :disabled="bulkDeleting" @click="confirmBulkDelete">
          <template #icon><Icon name="tabler:trash" aria-hidden="true" /></template>
        </Button>
      </div>
    </Transition>

    <Dialog v-model:visible="bulkDeleteConfirmOpen" modal header="Delete selected media" :draggable="false" class="w-[min(32rem,calc(100vw-2rem))]">
      <div class="space-y-4">
        <p class="text-sm moh-text">
          You're about to permanently delete <strong>{{ selectedIds.size }}</strong> media asset{{ selectedIds.size === 1 ? '' : 's' }}.
        </p>
        <AppInlineAlert v-if="selectedIds.size - selectedUnused > 0" severity="warning">
          {{ selectedIds.size - selectedUnused }} of these {{ selectedIds.size - selectedUnused === 1 ? 'is' : 'are' }} still in use. Their posts, messages or profiles will show a removed placeholder.
        </AppInlineAlert>
        <div class="space-y-1">
          <label class="text-sm font-medium moh-text" for="bulk-delete-reason">Reason</label>
          <InputText id="bulk-delete-reason" v-model="bulkDeleteReason" class="w-full" placeholder="e.g. Orphan cleanup" :disabled="bulkDeleting" @keydown.enter.prevent="executeBulkDelete" />
        </div>
        <AppInlineAlert v-if="bulkDeleteError" severity="danger">{{ bulkDeleteError }}</AppInlineAlert>
      </div>
      <template #footer>
        <Button label="Cancel" severity="secondary" :disabled="bulkDeleting" @click="bulkDeleteConfirmOpen = false" />
        <Button :label="`Delete ${selectedIds.size}`" severity="danger" :loading="bulkDeleting" :disabled="bulkDeleting || !bulkDeleteReason.trim()" @click="executeBulkDelete">
          <template #icon><Icon name="tabler:trash" aria-hidden="true" /></template>
        </Button>
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

import { getApiErrorMessage } from '~/utils/api-error'
import { formatDateOnly, formatRelativeTime } from '~/utils/time-format'
import type { AdminImageReviewListItem, AdminImageReviewListData } from '~/types/api'
import { describeMediaItem, MEDIA_REVIEW_TONE_CLASS } from '~/utils/media-review'

const { apiFetch, apiFetchData } = useApiClient()

const kindOptions = [
  { label: 'All', value: 'all' },
  { label: 'Images', value: 'image' },
  { label: 'Video', value: 'video' },
] as const

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

const selectedIds = ref(new Set<string>())
const itemById = computed(() => new Map(mediaItems.value.map((it) => [it.id, it])))
const selectedItems = computed(() => [...selectedIds.value].map((id) => itemById.value.get(id)).filter((it): it is AdminImageReviewListItem => Boolean(it)))
const selectedUnused = computed(() => selectedItems.value.filter((it) => it.belongsToSummary === 'orphan').length)
const unusedLoaded = computed(() => mediaItems.value.filter((it) => it.belongsToSummary === 'orphan' && !it.deletedAt))

function describe(it: AdminImageReviewListItem) {
  return describeMediaItem(it)
}

function itemSubtitle(it: AdminImageReviewListItem) {
  const d = describeMediaItem(it)
  const when = Date.now() - new Date(it.lastModified).getTime() < 86_400_000 ? formatRelativeTime(it.lastModified, { fallback: '' }) : formatDateOnly(it.lastModified)
  const parts = [d.subtitle, it.belongsToSummary === 'orphan' ? `Uploaded ${when}` : when].filter(Boolean)
  return parts.join(' · ')
}

function selectUnused() {
  selectedIds.value = new Set(unusedLoaded.value.map((it) => it.id))
}

function clearSelection() {
  selectedIds.value = new Set()
}

function toggleSelect(id: string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

// Bulk delete
const bulkDeleteConfirmOpen = ref(false)
const bulkDeleteReason = ref('Orphan cleanup')
const bulkDeleting = ref(false)
const bulkDeleteError = ref<string | null>(null)

function confirmBulkDelete() {
  bulkDeleteError.value = null
  bulkDeleteConfirmOpen.value = true
}

async function executeBulkDelete() {
  if (!bulkDeleteReason.value.trim()) return
  if (bulkDeleting.value) return
  bulkDeleting.value = true
  bulkDeleteError.value = null
  try {
    const ids = [...selectedIds.value]
    const result = await apiFetchData<{ deleted: number; skipped: number; errors: Array<{ id: string; message: string }> }>('/admin/media-review/bulk-delete', {
      method: 'POST',
      body: { ids, reason: bulkDeleteReason.value.trim(), onlyOrphans: selectedUnused.value === ids.length },
    })
    // The API can reject individual stale/protected selections. Keep those visible
    // and selected, and surface their reasons instead of claiming all were deleted.
    const failedIds = new Set(result.errors.map((error) => error.id))
    const deletedSet = new Set(ids.filter((id) => !failedIds.has(id)))
    mediaItems.value = mediaItems.value.filter((item) => !deletedSet.has(item.id))
    selectedIds.value = failedIds
    if (result.errors.length) {
      bulkDeleteError.value = `${result.errors.length} could not be deleted. ${[...new Set(result.errors.map((error) => error.message))].join(' ')}`
    } else {
      bulkDeleteConfirmOpen.value = false
    }
  } catch (e: unknown) {
    bulkDeleteError.value = getApiErrorMessage(e) || 'Bulk delete failed.'
  } finally {
    bulkDeleting.value = false
  }
}

// Filters
function toggleOrphans() {
  mediaOnlyOrphans.value = !mediaOnlyOrphans.value
  void loadMedia(true)
}

function toggleShowDeleted() {
  mediaShowDeleted.value = !mediaShowDeleted.value
  void loadMedia(true)
}

const didInitialLoad = ref(false)
onMounted(() => {
  if (didInitialLoad.value) return
  didInitialLoad.value = true
  void loadMedia(true)
})

watch(mediaKindFilter, () => void loadMedia(true))

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
      selectedIds.value = new Set()
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
