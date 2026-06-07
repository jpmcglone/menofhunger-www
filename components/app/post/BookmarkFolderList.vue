<template>
  <div class="p-2">
    <div class="px-2 py-1 text-[11px] font-semibold moh-text-muted">Folders</div>

    <button
      type="button"
      class="w-full rounded-lg px-2 py-2 text-left text-sm transition-colors moh-surface-hover"
      :class="loading ? 'cursor-default opacity-60' : 'cursor-pointer'"
      @click="setBookmarkFolderIds([])"
    >
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0 truncate">Unorganized</div>
        <Icon
          v-if="hasBookmarked && collectionIds.length === 0"
          name="tabler:check"
          class="text-xs"
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
        <Icon
          v-if="hasBookmarked && collectionIds.includes(c.id)"
          name="tabler:check"
          class="text-xs"
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
        <Icon name="tabler:trash" class="mr-2 text-xs" aria-hidden="true" />
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
          <Icon name="tabler:plus" class="mr-2 text-xs" aria-hidden="true" />
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
</template>

<script setup lang="ts">
import type { BookmarkCollection } from '~/types/api'

const props = defineProps<{
  loading: boolean
  hasBookmarked: boolean
  collectionIds: readonly string[]
  collections: BookmarkCollection[]
  collectionsLoading: boolean
  createOpen: boolean
  createName: string
  creating: boolean
}>()

const emit = defineEmits<{
  (e: 'update:createOpen', v: boolean): void
  (e: 'update:createName', v: string): void
  (e: 'setFolderIds', ids: string[]): void
  (e: 'toggleFolder', id: string): void
  (e: 'removeBookmark'): void
  (e: 'createFolder'): void
}>()

const createOpen = computed({
  get: () => props.createOpen,
  set: (v) => emit('update:createOpen', v),
})
const createName = computed({
  get: () => props.createName,
  set: (v) => emit('update:createName', v),
})

function setBookmarkFolderIds(ids: string[]) {
  emit('setFolderIds', ids)
}

function toggleFolder(id: string) {
  emit('toggleFolder', id)
}

function removeBookmark() {
  emit('removeBookmark')
}

function createFolderAndSave() {
  emit('createFolder')
}
</script>
