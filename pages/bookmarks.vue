<template>
  <div>
    <div class="flex items-center justify-end gap-3">
      <Button
        label="New folder"
        icon="pi pi-plus"
        severity="secondary"
        rounded
        @click="newFolderOpen = true"
      />
    </div>

    <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-stretch">
      <Dropdown
        v-model="selectedCollectionId"
        :options="collectionOptions"
        optionLabel="label"
        optionValue="value"
        class="w-full sm:w-64"
        placeholder="All saved"
      />
      <IconField iconPosition="left" class="w-full">
        <InputIcon class="pi pi-search" />
        <InputText v-model="q" class="w-full" placeholder="Search saved posts…" />
      </IconField>
    </div>

    <div v-if="error" class="mt-4">
      <AppInlineAlert severity="danger">
        {{ error }}
      </AppInlineAlert>
    </div>

    <div v-else class="mt-4">
      <div v-if="loading && !items.length" class="moh-text-muted text-sm">Loading…</div>

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
import type {
  CreateBookmarkCollectionResponse,
  ListBookmarkCollectionsResponse,
  SearchBookmarksResponse,
} from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({
  layout: 'app',
  title: 'Bookmarks',
})

usePageSeo({
  title: 'Bookmarks',
  description: 'Your saved posts.',
  canonicalPath: '/bookmarks',
  noindex: true,
  ogType: 'website',
  image: '/images/banner.png',
})

const { apiFetchData } = useApiClient()
const toast = useAppToast()

const collections = ref<ListBookmarkCollectionsResponse['collections']>([])
const selectedCollectionId = ref<string | null>(null)

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

async function loadCollections() {
  try {
    const res = await apiFetchData<ListBookmarkCollectionsResponse>('/bookmarks/collections', { method: 'GET' })
    collections.value = res.collections ?? []
  } catch (e: unknown) {
    collections.value = []
    toast.push({ title: getApiErrorMessage(e) || 'Failed to load folders.', tone: 'error', durationMs: 2200 })
  }
}

const collectionOptions = computed(() => {
  const opts = [{ label: 'All saved', value: null as string | null }]
  for (const c of collections.value) {
    opts.push({ label: c.name, value: c.id })
  }
  return opts
})

async function fetchPage(params: { cursor: string | null; append: boolean }) {
  if (loading.value) return
  loading.value = true
  error.value = null
  try {
    const res = await apiFetchData<SearchBookmarksResponse>('/search', {
      method: 'GET',
      query: {
        type: 'bookmarks',
        q: (debouncedQ.value ?? '').trim() || undefined,
        collectionId: selectedCollectionId.value ?? undefined,
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

watch([selectedCollectionId, debouncedQ], () => void refresh(), { flush: 'post' })

const newFolderOpen = ref(false)
const newFolderName = ref('')
const creatingFolder = ref(false)

async function createFolder() {
  const name = newFolderName.value.trim()
  if (!name) return
  if (creatingFolder.value) return
  creatingFolder.value = true
  try {
    const res = await apiFetchData<CreateBookmarkCollectionResponse>('/bookmarks/collections', {
      method: 'POST',
      body: { name },
    })
    newFolderOpen.value = false
    newFolderName.value = ''
    await loadCollections()
    selectedCollectionId.value = res.collection?.id ?? selectedCollectionId.value
  } catch (e: unknown) {
    toast.push({ title: getApiErrorMessage(e) || 'Failed to create folder.', tone: 'error', durationMs: 2200 })
  } finally {
    creatingFolder.value = false
  }
}

await loadCollections()
await refresh()
</script>

