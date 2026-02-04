<template>
  <div>
    <div class="sticky z-10 shrink-0 moh-bg border-b moh-border px-4 pt-4 pb-3" style="top: var(--moh-title-bar-height, 4rem);">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <IconField iconPosition="left" class="flex-1 min-w-0 moh-bg rounded">
          <InputIcon class="pi pi-search" />
          <InputText v-model="q" class="w-full" :placeholder="searchPlaceholder" />
        </IconField>
        <AppBookmarkFolderSelect
          :collections="collections"
          :active-slug="activeSlug"
          :unorganized-count="unorganizedCount"
          @new-folder="newFolderOpen = true"
        />
      </div>
    </div>

    <div v-if="error" class="mt-4 px-4">
      <AppInlineAlert severity="danger">
        {{ error }}
      </AppInlineAlert>
    </div>

    <div v-else class="mt-4 px-4">
      <div v-if="loading && !items.length" class="flex justify-center pt-12 pb-8">
        <AppLogoLoader />
      </div>

      <div v-else-if="folderNotFound" class="moh-text-muted text-sm">
        Folder not found.
      </div>

      <div v-else-if="!items.length" class="moh-text-muted text-sm">No saved posts yet.</div>

      <div v-else class="space-y-0 -mx-4">
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
import type { SearchBookmarkItem } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { useCursorFeed } from '~/composables/useCursorFeed'

definePageMeta({
  layout: 'app',
  title: 'Bookmarks',
})

const route = useRoute()
const slug = computed(() => String(route.params.slug || '').trim())
const activeSlug = computed(() => (slug.value ? slug.value : null))

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

const feed = useCursorFeed<SearchBookmarkItem>({
  stateKey: 'bookmarks-feed',
  buildRequest: (cursor) => {
    const isUnorganized = slug.value === 'unorganized'
    const cid = folder.value?.id ?? null
    return {
      path: '/search',
      query: {
        type: 'bookmarks',
        q: (debouncedQ.value ?? '').trim() || undefined,
        ...(isUnorganized ? { unorganized: '1' } : {}),
        ...(!isUnorganized && cid ? { collectionId: cid } : {}),
        limit: 20,
        ...(cursor ? { cursor } : {}),
      },
    }
  },
  defaultErrorMessage: 'Failed to load bookmarks.',
})

const items = feed.items
const nextCursor = feed.nextCursor
const loading = feed.loading
const error = feed.error

async function refresh() {
  if (folderNotFound.value) {
    items.value = []
    nextCursor.value = null
    error.value = null
    return
  }
  await feed.refresh()
}

async function loadMore() {
  if (!nextCursor.value) return
  await feed.loadMore()
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

