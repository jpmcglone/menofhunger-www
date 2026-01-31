<template>
  <div>
    <AppBookmarkFolderTiles
      :collections="collections"
      :active-slug="activeSlug"
      :unorganized-count="unorganizedCount"
      @new-folder="newFolderOpen = true"
    />

    <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-stretch">
      <IconField iconPosition="left" class="w-full">
        <InputIcon class="pi pi-search" />
        <InputText v-model="q" class="w-full" :placeholder="searchPlaceholder" />
      </IconField>
    </div>

    <div v-if="error" class="mt-4">
      <AppInlineAlert severity="danger">
        {{ error }}
      </AppInlineAlert>
    </div>

    <div v-else class="mt-4">
      <div v-if="loading && !items.length" class="moh-text-muted text-sm">Loading…</div>

      <div v-else-if="folderNotFound" class="moh-text-muted text-sm">
        Folder not found.
      </div>

      <div v-else-if="!items.length" class="moh-text-muted text-sm">No saved posts yet.</div>

      <div v-else class="space-y-0">
        <div v-for="b in items" :key="b.bookmarkId">
          <AppPostRow :post="b.post" />
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
    </div>

    <Dialog
      v-model:visible="newFolderOpen"
      modal
      header="New folder"
      :draggable="false"
      class="w-[min(30rem,calc(100vw-2rem))]"
    >
      <div class="space-y-2">
        <div class="text-sm moh-text-muted">Folders are private by default.</div>
        <InputText v-model="newFolderName" class="w-full" placeholder="Folder name" />
      </div>
      <template #footer>
        <Button label="Cancel" severity="secondary" text @click="newFolderOpen = false" />
        <Button label="Create" :loading="creatingFolder" :disabled="creatingFolder" @click="createFolder" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import type { SearchBookmarksResponse } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({
  layout: 'app',
  title: 'Bookmarks',
})

const route = useRoute()
const slug = computed(() => String(route.params.slug || '').trim())
const activeSlug = computed(() => (slug.value ? slug.value : null))

const { apiFetchData } = useApiClient()
const toast = useAppToast()

const { collections, unorganizedCount, ensureLoaded: ensureCollectionsLoaded, createCollection } = useBookmarkCollections()

const folder = computed(() => {
  const s = slug.value
  if (!s || s === 'unorganized') return null
  return collections.value.find((c) => c.slug === s) ?? null
})

const folderNotFound = computed(() => {
  const s = slug.value
  if (!s) return false
  if (s === 'unorganized') return false
  return Boolean(collections.value.length && !folder.value)
})

const searchPlaceholder = computed(() => {
  if (!slug.value) return 'Search saved posts…'
  if (slug.value === 'unorganized') return 'Search unorganized…'
  if (folder.value) return `Search ${folder.value.name}…`
  return 'Search saved posts…'
})

usePageSeo({
  title: computed(() => {
    if (!slug.value) return 'Bookmarks'
    if (slug.value === 'unorganized') return 'Unorganized bookmarks'
    return folder.value?.name || 'Bookmarks'
  }),
  description: computed(() => {
    if (slug.value === 'unorganized') return 'Your saved posts with no folders.'
    return 'Your saved posts.'
  }),
  canonicalPath: computed(() => (slug.value ? `/bookmarks/${encodeURIComponent(slug.value)}` : '/bookmarks')),
  noindex: true,
  ogType: 'website',
  image: '/images/banner.png',
})

const q = ref('')
const debouncedQ = ref('')
let qTimer: number | null = null
watch(
  q,
  (v) => {
    if (!import.meta.client) return
    if (qTimer != null) window.clearTimeout(qTimer)
    qTimer = window.setTimeout(() => {
      debouncedQ.value = v
    }, 200)
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  if (!import.meta.client) return
  if (qTimer != null) window.clearTimeout(qTimer)
  qTimer = null
})

const items = ref<SearchBookmarksResponse['bookmarks']>([])
const nextCursor = ref<string | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

async function fetchPage(params: { cursor: string | null; append: boolean }) {
  if (loading.value) return
  loading.value = true
  error.value = null
  try {
    // If slug is present but doesn't map to a folder, don't fetch the wrong feed.
    if (folderNotFound.value) {
      if (!params.append) items.value = []
      nextCursor.value = null
      return
    }

    const isUnorganized = slug.value === 'unorganized'
    const cid = folder.value?.id ?? null

    const res = await apiFetchData<SearchBookmarksResponse>('/search', {
      method: 'GET',
      query: {
        type: 'bookmarks',
        q: (debouncedQ.value ?? '').trim() || undefined,
        ...(isUnorganized ? { unorganized: '1' } : {}),
        ...(!isUnorganized && cid ? { collectionId: cid } : {}),
        limit: 20,
        cursor: params.cursor ?? undefined,
      },
    })

    const rows = res.bookmarks ?? []
    if (params.append) items.value = [...items.value, ...rows]
    else items.value = rows
    nextCursor.value = res.nextCursor ?? null
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to load bookmarks.'
    if (!params.append) items.value = []
    nextCursor.value = null
  } finally {
    loading.value = false
  }
}

async function refresh() {
  nextCursor.value = null
  await fetchPage({ cursor: null, append: false })
}

async function loadMore() {
  if (!nextCursor.value) return
  await fetchPage({ cursor: nextCursor.value, append: true })
}

watch([debouncedQ, folder, slug], () => void refresh(), { flush: 'post' })

const newFolderOpen = ref(false)
const newFolderName = ref('')
const creatingFolder = ref(false)

async function createFolder() {
  const name = newFolderName.value.trim()
  if (!name) return
  if (creatingFolder.value) return
  creatingFolder.value = true
  try {
    const created = await createCollection(name)
    if (!created?.id) throw new Error('Failed to create folder.')
    newFolderOpen.value = false
    newFolderName.value = ''
    await ensureCollectionsLoaded({ force: true })
  } catch (e: unknown) {
    toast.push({ title: getApiErrorMessage(e) || 'Failed to create folder.', tone: 'error', durationMs: 2200 })
  } finally {
    creatingFolder.value = false
  }
}

try {
  await ensureCollectionsLoaded()
} catch (e: unknown) {
  toast.push({ title: getApiErrorMessage(e) || 'Failed to load folders.', tone: 'error', durationMs: 2200 })
}
await refresh()
</script>

