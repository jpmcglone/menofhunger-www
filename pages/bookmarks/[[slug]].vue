<template>
  <AppPageContent bottom="standard">
  <div>
    <div class="sticky z-10 shrink-0 moh-bg border-b moh-border px-4 pt-4 pb-3" style="top: var(--moh-title-bar-height, 4rem);">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <IconField iconPosition="left" class="flex-1 min-w-0 moh-bg rounded">
          <InputIcon>
            <Icon name="tabler:search" class="text-lg opacity-70" aria-hidden="true" />
          </InputIcon>
          <InputText
            v-model="q"
            id="bookmarks-search"
            name="q"
            aria-label="Search bookmarks"
            class="w-full"
            :placeholder="searchPlaceholder"
          />
        </IconField>
        <AppBookmarkFolderSelect
          :collections="collections"
          :active-slug="activeSlug"
          :unorganized-count="unorganizedCount"
          @new-folder="newFolderOpen = true"
        />
        <Button
          v-if="folder"
          severity="secondary"
          outlined
          aria-label="Manage folder"
          v-tooltip.bottom="'Manage folder'"
          @click="openManageFolder"
        >
          <template #icon>
            <Icon name="tabler:settings" aria-hidden="true" />
          </template>
        </Button>
      </div>
    </div>

    <div v-if="error" class="mt-4 px-4">
      <AppInlineAlert severity="danger">
        {{ error }}
      </AppInlineAlert>
    </div>

    <div v-else class="mt-4">
      <div v-if="loading && !items.length" class="flex justify-center pt-12 pb-8">
        <AppLogoLoader />
      </div>

      <div v-else-if="folderNotFound" class="px-4 moh-text-muted text-sm">
        Folder not found.
      </div>

      <div v-else-if="!items.length" class="px-4 moh-text-muted text-sm">No saved posts yet.</div>

      <div v-else class="space-y-0">
        <div v-for="b in items" :key="b.bookmarkId">
          <AppPostRow
            :post="b.post"
            @deleted="onBookmarkPostDeleted(b.post.id)"
            @edited="onBookmarkPostEdited(b.bookmarkId, $event.post)"
            @bookmark-updated="onBookmarkUpdated(b.bookmarkId, $event)"
          />
        </div>
      </div>

      <div v-if="nextCursor" class="px-4 pt-6 pb-0 sm:pb-6 flex justify-center">
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

    <Dialog
      v-model:visible="manageFolderOpen"
      modal
      header="Manage folder"
      :draggable="false"
      class="w-[min(34rem,calc(100vw-2rem))]"
    >
      <div class="space-y-4">
        <div class="space-y-2">
          <div class="text-sm font-semibold moh-text">Rename</div>
          <InputText v-model="manageFolderName" class="w-full" placeholder="Folder name" />
        </div>

        <div class="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900/40 dark:bg-red-950/25">
          <div class="text-sm font-semibold text-red-800 dark:text-red-200">Delete folder</div>
          <div class="mt-1 text-sm text-red-700 dark:text-red-300">
            Saved posts in this folder will remain bookmarked, but will become unorganized.
          </div>
          <div class="mt-3 flex justify-end">
            <Button
              label="Delete folder"
              severity="danger"
              :loading="deletingFolder"
              :disabled="deletingFolder"
              @click="deleteFolder"
            >
              <template #icon>
                <Icon name="tabler:trash" aria-hidden="true" />
              </template>
            </Button>
          </div>
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" severity="secondary" text :disabled="renamingFolder || deletingFolder" @click="manageFolderOpen = false" />
        <Button
          label="Save"
          severity="secondary"
          :loading="renamingFolder"
          :disabled="renamingFolder || deletingFolder || !manageFolderName.trim()"
          @click="renameFolder"
        >
          <template #icon>
            <Icon name="tabler:check" aria-hidden="true" />
          </template>
        </Button>
      </template>
    </Dialog>
  </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { SearchBookmarkItem } from '~/types/api'
import { useCursorFeed } from '~/composables/useCursorFeed'

definePageMeta({
  layout: 'app',
  title: 'Bookmarks',
})

const route = useRoute()
const slug = computed(() => String(route.params.slug || '').trim())
const activeSlug = computed(() => (slug.value ? slug.value : null))

const toast = useAppToast()

const {
  collections,
  unorganizedCount,
  ensureLoaded: ensureCollectionsLoaded,
  createCollection,
  renameCollection,
  deleteCollection,
} = useBookmarkCollections()

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

const bookmarksFeedBump = useState<number>('moh.bookmarks.feed.bump.v1', () => 0)

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
watch(bookmarksFeedBump, () => void refresh(), { flush: 'post' })
onActivated(() => {
  void refresh()
})

function onBookmarkPostDeleted(postId: string) {
  const pid = (postId ?? '').trim()
  if (!pid) return
  items.value = items.value.filter((b) => b.post?.id !== pid)
}

function onBookmarkPostEdited(bookmarkId: string, post: SearchBookmarkItem['post']) {
  const bid = (bookmarkId ?? '').trim()
  if (!bid) return
  items.value = items.value.map((b) => (b.bookmarkId === bid ? { ...b, post } : b))
}

function onBookmarkUpdated(
  bookmarkId: string,
  payload: { postId: string; hasBookmarked: boolean; collectionIds: string[] },
) {
  const bid = (bookmarkId ?? '').trim()
  if (!bid) return
  const nextHas = Boolean(payload?.hasBookmarked)
  const nextCollectionIds = Array.isArray(payload?.collectionIds) ? payload.collectionIds.filter(Boolean) : []
  const currentFolderId = folder.value?.id ?? null
  const inUnorganized = slug.value === 'unorganized'

  const shouldKeep =
    slug.value === ''
      ? nextHas
      : inUnorganized
        ? nextHas && nextCollectionIds.length === 0
        : Boolean(currentFolderId && nextHas && nextCollectionIds.includes(currentFolderId))

  if (!shouldKeep) {
    items.value = items.value.filter((b) => b.bookmarkId !== bid)
    return
  }

  items.value = items.value.map((b) => {
    if (b.bookmarkId !== bid) return b
    return {
      ...b,
      collectionIds: nextCollectionIds,
      post: {
        ...b.post,
        viewerHasBookmarked: nextHas,
        viewerBookmarkCollectionIds: nextCollectionIds,
      },
    }
  })
}

const newFolderOpen = ref(false)
const newFolderName = ref('')
const creatingFolder = ref(false)

const manageFolderOpen = ref(false)
const manageFolderName = ref('')
const renamingFolder = ref(false)
const deletingFolder = ref(false)

function openManageFolder() {
  if (!folder.value) return
  manageFolderName.value = folder.value.name ?? ''
  manageFolderOpen.value = true
}

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
    toast.pushError(e, 'Failed to create folder.')
  } finally {
    creatingFolder.value = false
  }
}

async function renameFolder() {
  const f = folder.value
  if (!f?.id) return
  const name = manageFolderName.value.trim()
  if (!name) return
  if (renamingFolder.value) return
  renamingFolder.value = true
  try {
    const updated = await renameCollection(f.id, name)
    if (!updated?.id) throw new Error('Failed to rename folder.')
    await ensureCollectionsLoaded({ force: true })
    // If slug changed, move to the new route.
    if (updated.slug && updated.slug !== slug.value) {
      await navigateTo(`/bookmarks/${encodeURIComponent(updated.slug)}`)
    }
    manageFolderOpen.value = false
  } catch (e: unknown) {
    toast.pushError(e, 'Failed to rename folder.')
  } finally {
    renamingFolder.value = false
  }
}

async function deleteFolder() {
  const f = folder.value
  if (!f?.id) return
  if (deletingFolder.value) return
  deletingFolder.value = true
  try {
    const ok = await deleteCollection(f.id)
    if (!ok) throw new Error('Failed to delete folder.')
    await ensureCollectionsLoaded({ force: true })
    manageFolderOpen.value = false
    await navigateTo('/bookmarks')
  } catch (e: unknown) {
    toast.pushError(e, 'Failed to delete folder.')
  } finally {
    deletingFolder.value = false
  }
}

try {
  await ensureCollectionsLoaded()
} catch (e: unknown) {
  toast.pushError(e, 'Failed to load folders.')
}
await refresh()
</script>

