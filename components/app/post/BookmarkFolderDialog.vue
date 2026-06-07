<template>
  <ClientOnly>
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-150 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-100 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="open"
          class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 backdrop-blur-sm px-4"
          role="presentation"
          @click.self="close"
        >
          <Transition
            appear
            enter-active-class="transition-[opacity,transform] duration-200 ease-out"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition-[opacity,transform] duration-150 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <section
              v-if="open"
              class="relative w-full max-w-xs rounded-2xl bg-white shadow-[0_24px_80px_rgba(0,0,0,0.35)] ring-1 ring-black/10 dark:bg-[color:var(--moh-surface-2)] dark:ring-white/15"
              role="dialog"
              aria-modal="true"
              :aria-labelledby="titleId"
              @click.stop
            >
              <header class="flex items-center justify-between gap-3 px-4 pt-4 pb-1">
                <h2 :id="titleId" class="text-base font-semibold tracking-tight text-gray-900 dark:text-gray-50">
                  Save to folder
                </h2>
                <button
                  type="button"
                  class="-mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-black/5 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-50"
                  aria-label="Close"
                  @click="close"
                >
                  <Icon name="tabler:x" aria-hidden="true" />
                </button>
              </header>

              <AppPostBookmarkFolderList
                v-if="post"
                :loading="bookmark.loading.value"
                :has-bookmarked="bookmark.hasBookmarked.value"
                :collection-ids="bookmark.collectionIds.value"
                :collections="bookmark.collections.value"
                :collections-loading="bookmark.collectionsLoading.value"
                :create-open="bookmark.createOpen.value"
                :create-name="bookmark.createName.value"
                :creating="bookmark.creating.value"
                @update:create-open="bookmark.createOpen.value = $event"
                @update:create-name="bookmark.createName.value = $event"
                @set-folder-ids="bookmark.setBookmarkFolderIds($event)"
                @toggle-folder="bookmark.toggleFolder($event)"
                @remove-bookmark="bookmark.removeBookmark()"
                @create-folder="bookmark.createFolderAndSave()"
              />
            </section>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import { usePostBookmark } from '~/composables/usePostBookmark'

const dialog = useBookmarkDialog()
const { open, post, hasBookmarked, collectionIds, onChange } = dialog

const titleId = `moh-bookmark-dialog-${useId()}`

// Drive usePostBookmark with reactive refs so watchers are set up once
// at component mount time and just react to dialog state changes.
const bookmark = usePostBookmark({
  postId: computed(() => post.value?.id ?? ''),
  initialHasBookmarked: computed(() => hasBookmarked.value),
  initialCollectionIds: computed(() => collectionIds.value),
  viewerCanInteract: computed(() => true),
  onChange(state, delta) {
    onChange.value?.(state, delta)
  },
})

function close() {
  dialog.close()
}

useModalEscape(open, close)

watch(open, (isOpen) => {
  if (!import.meta.client) return
  if (isOpen) {
    document.documentElement.style.overflow = 'hidden'
    bookmark.openPicker()
  } else {
    document.documentElement.style.overflow = ''
  }
})

onBeforeUnmount(() => {
  if (!import.meta.client) return
  document.documentElement.style.overflow = ''
})
</script>
