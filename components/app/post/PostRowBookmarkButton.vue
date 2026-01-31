<template>
  <div class="relative">
    <button
      type="button"
      class="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors moh-surface-hover"
      :class="loading ? 'cursor-default opacity-60' : (viewerCanInteract ? 'cursor-pointer' : 'cursor-default opacity-60')"
      :aria-label="hasBookmarked ? 'Edit bookmark' : 'Save post'"
      v-tooltip.bottom="bookmarkTooltip"
      @click.stop="onClick"
    >
      <i
        :class="hasBookmarked ? 'pi pi-bookmark-fill' : 'pi pi-bookmark'"
        class="text-[18px]"
        aria-hidden="true"
        :style="hasBookmarked ? { color: 'var(--p-primary-color)' } : undefined"
      />
    </button>

    <Popover ref="popoverRef">
      <div class="w-[min(20rem,calc(100vw-3rem))] p-2">
        <div class="px-2 py-1 text-[11px] font-semibold moh-text-muted">Folders</div>

        <button
          type="button"
          class="w-full rounded-lg px-2 py-2 text-left text-sm transition-colors moh-surface-hover"
          :class="loading ? 'cursor-default opacity-60' : 'cursor-pointer'"
          @click="setBookmarkFolderIds([])"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0 truncate">Unorganized</div>
            <i
              v-if="hasBookmarked && collectionIds.length === 0"
              class="pi pi-check text-xs"
              aria-hidden="true"
            />
          </div>
        </button>

        <div v-if="collectionsLoading" class="px-2 py-2 text-xs moh-text-muted">Loading folders…</div>

        <button
          v-for="c in collections"
          :key="c.id"
          type="button"
          class="w-full rounded-lg px-2 py-2 text-left text-sm transition-colors moh-surface-hover"
          :class="loading ? 'cursor-default opacity-60' : 'cursor-pointer'"
          @click="toggleFolder(c.id)"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0 truncate">{{ c.name }}</div>
            <i
              v-if="hasBookmarked && collectionIds.includes(c.id)"
              class="pi pi-check text-xs"
              aria-hidden="true"
            />
          </div>
        </button>

        <div v-if="hasBookmarked" class="mt-2 border-t moh-border pt-2 px-1">
          <button
            type="button"
            class="w-full rounded-lg px-2 py-2 text-left text-sm font-semibold transition-colors moh-surface-hover text-red-600 dark:text-red-400"
            :class="loading ? 'cursor-default opacity-60' : 'cursor-pointer'"
            @click="removeBookmark"
          >
            <i class="pi pi-trash mr-2 text-xs" aria-hidden="true" />
            Remove bookmark
          </button>
        </div>

        <div class="mt-2 border-t moh-border pt-2">
          <div v-if="!createOpen" class="px-1">
            <button
              type="button"
              class="w-full rounded-lg px-2 py-2 text-left text-sm font-semibold transition-colors moh-surface-hover"
              @click="createOpen = true"
            >
              <i class="pi pi-plus mr-2 text-xs" aria-hidden="true" />
              Create folder
            </button>
          </div>
          <div v-else class="flex items-center gap-2 px-1">
            <InputText
              v-model="createName"
              class="w-full"
              placeholder="Folder name"
              @keydown.enter.prevent="createFolderAndSave"
            />
            <Button
              label="Save"
              size="small"
              :loading="creating"
              :disabled="creating || !createName.trim()"
              @click="createFolderAndSave"
            />
          </div>
        </div>
      </div>
    </Popover>
  </div>
</template>

<script setup lang="ts">
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { getApiErrorMessage } from '~/utils/api-error'
import { useBookmarkCollections } from '~/composables/useBookmarkCollections'

const props = defineProps<{
  postId: string
  viewerCanInteract: boolean
  initialHasBookmarked: boolean
  initialCollectionIds: string[]
}>()

const postId = computed(() => props.postId)
const viewerCanInteract = computed(() => Boolean(props.viewerCanInteract))

const { user } = useAuth()
const isAuthed = computed(() => Boolean(user.value?.id))
const { show: showAuthActionModal } = useAuthActionModal()
const { apiFetchData } = useApiClient()
const toast = useAppToast()

const loading = ref(false)
const hasBookmarked = ref(Boolean(props.initialHasBookmarked))
const collectionIds = ref<string[]>((props.initialCollectionIds ?? []).filter(Boolean))

const popoverRef = ref<any>(null)
const createOpen = ref(false)
const createName = ref('')
const creating = ref(false)

const {
  collections,
  loading: collectionsLoading,
  nameById,
  ensureLoaded,
  createCollection,
  bumpCounts,
} = useBookmarkCollections()

watch(
  () => [postId.value, props.initialHasBookmarked, props.initialCollectionIds] as const,
  () => {
    // Reset local state if the post changes.
    hasBookmarked.value = Boolean(props.initialHasBookmarked)
    collectionIds.value = (props.initialCollectionIds ?? []).filter(Boolean)
    loading.value = false
    creating.value = false
    createOpen.value = false
    createName.value = ''
  },
  { immediate: true },
)

watch(
  [hasBookmarked, collectionIds],
  ([saved, ids]) => {
    if (!import.meta.client) return
    if (!saved) return
    if (!Array.isArray(ids) || ids.length === 0) return
    void ensureLoaded()
  },
  { immediate: true },
)

const folderLabel = computed(() => {
  if (!hasBookmarked.value) return null
  const ids = collectionIds.value
  if (!ids.length) return 'Unorganized'
  if (ids.length === 1) return nameById.value.get(ids[0]!) ?? 'Folder'
  return `${ids.length} folders`
})

const bookmarkTooltip = computed(() => {
  if (!viewerCanInteract.value) return tinyTooltip('Save')
  if (!isAuthed.value) return tinyTooltip('Log in to save')
  if (hasBookmarked.value) {
    const label = folderLabel.value
    if (label === 'Unorganized') return tinyTooltip('Saved (no folder)')
    return label
      ? tinyTooltip(`Saved in ${label === `${collectionIds.value.length} folders` ? label : `'${label}'`}`)
      : tinyTooltip('Saved')
  }
  return tinyTooltip('Save')
})

function openPopover(event: Event) {
  createOpen.value = false
  createName.value = ''
  ;(popoverRef.value as any)?.toggle?.(event)
  if (import.meta.client) void ensureLoaded()
}

async function removeBookmark() {
  if (loading.value) return
  loading.value = true
  const prevHas = hasBookmarked.value
  const prevIds = collectionIds.value.slice()
  try {
    await apiFetchData('/bookmarks/' + encodeURIComponent(postId.value), { method: 'DELETE' })
    hasBookmarked.value = false
    collectionIds.value = []
    bumpCounts({ prevHas, prevCollectionIds: prevIds, nextHas: false, nextCollectionIds: [] })
  } catch (e: unknown) {
    toast.push({ title: getApiErrorMessage(e) || 'Failed to unsave post.', tone: 'error', durationMs: 2000 })
  } finally {
    loading.value = false
  }
}

async function setBookmarkFolderIds(nextIds: string[]) {
  if (loading.value) return
  if (!isAuthed.value) return
  loading.value = true
  const prevHas = hasBookmarked.value
  const prevCids = collectionIds.value.slice()
  try {
    const res = await apiFetchData<{ collectionIds: string[] }>(
      '/bookmarks/' + encodeURIComponent(postId.value),
      { method: 'POST', body: { collectionIds: nextIds } },
    )
    hasBookmarked.value = true
    collectionIds.value = (res?.collectionIds ?? []).filter(Boolean)
    bumpCounts({
      prevHas,
      prevCollectionIds: prevCids,
      nextHas: true,
      nextCollectionIds: collectionIds.value.slice(),
    })
  } catch (e: unknown) {
    toast.push({ title: getApiErrorMessage(e) || 'Failed to save post.', tone: 'error', durationMs: 2000 })
  } finally {
    loading.value = false
  }
}

async function toggleFolder(id: string) {
  if (!id) return
  const set = new Set(collectionIds.value)
  if (set.has(id)) set.delete(id)
  else set.add(id)
  await setBookmarkFolderIds(Array.from(set))
}

async function createFolderAndSave() {
  const name = createName.value.trim()
  if (!name) return
  if (creating.value || loading.value) return
  creating.value = true
  try {
    const created = await createCollection(name)
    if (!created?.id) throw new Error('Failed to create folder.')
    const next = new Set(collectionIds.value)
    next.add(created.id)
    await setBookmarkFolderIds(Array.from(next))
    createOpen.value = false
    createName.value = ''
  } catch (e: unknown) {
    toast.push({ title: getApiErrorMessage(e) || 'Failed to create folder.', tone: 'error', durationMs: 2200 })
  } finally {
    creating.value = false
  }
}

async function onClick(event: Event) {
  if (loading.value) return
  if (!viewerCanInteract.value) return
  if (!isAuthed.value) {
    showAuthActionModal({ kind: 'login', action: 'boost' })
    return
  }
  openPopover(event)
}
</script>

