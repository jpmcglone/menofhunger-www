<template>
  <div class="relative">
    <button
      v-tooltip.bottom="bookmarkTooltip"
      type="button"
      class="moh-tap moh-pressable inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full transition-colors moh-surface-hover"
      :class="bookmark.loading.value ? 'cursor-default opacity-60' : (viewerCanInteract ? 'cursor-pointer' : 'cursor-default opacity-60')"
      :aria-label="bookmark.hasBookmarked.value ? 'Edit bookmark' : 'Save post'"
      @click.stop="onButtonClick"
    >
      <Icon
        :name="bookmark.hasBookmarked.value ? 'tabler:bookmark-filled' : 'tabler:bookmark'"
        class="text-[18px]"
        aria-hidden="true"
        :style="bookmark.hasBookmarked.value ? { color: 'var(--p-primary-color)' } : undefined"
      />
    </button>

    <Popover ref="popoverRef">
      <div class="w-[min(20rem,calc(100vw-3rem))]">
        <AppPostBookmarkFolderList
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
      </div>
    </Popover>
  </div>
</template>

<script setup lang="ts">
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { usePostBookmark } from '~/composables/usePostBookmark'

const props = defineProps<{
  postId: string
  viewerCanInteract: boolean
  initialHasBookmarked: boolean
  initialCollectionIds: string[]
}>()

const emit = defineEmits<{
  (e: 'bookmarkCountDelta', delta: number): void
  (e: 'bookmarkStateChanged', payload: { hasBookmarked: boolean; collectionIds: string[] }): void
}>()

const { isAuthed } = useAuth()
const { show: showAuthActionModal } = useAuthActionModal()

const popoverRef = ref<any>(null)

const bookmark = usePostBookmark({
  postId: computed(() => props.postId),
  initialHasBookmarked: computed(() => props.initialHasBookmarked),
  initialCollectionIds: computed(() => props.initialCollectionIds),
  viewerCanInteract: computed(() => Boolean(props.viewerCanInteract)),
  onChange(state, delta) {
    emit('bookmarkStateChanged', { hasBookmarked: state.hasBookmarked, collectionIds: state.collectionIds })
    if (delta !== 0) emit('bookmarkCountDelta', delta)
  },
})

const bookmarkTooltip = computed(() => {
  if (!props.viewerCanInteract) return tinyTooltip('Save')
  if (!isAuthed.value) return tinyTooltip('Log in to save')
  if (bookmark.hasBookmarked.value) {
    const label = bookmark.folderLabel.value
    const ids = bookmark.collectionIds.value
    if (label === 'Unorganized') return tinyTooltip('Saved (no folder)')
    return label
      ? tinyTooltip(`Saved in ${label === `${ids.length} folders` ? label : `'${label}'`}`)
      : tinyTooltip('Saved')
  }
  return tinyTooltip('Save')
})

async function onButtonClick(event: Event) {
  if (bookmark.loading.value) return
  if (!props.viewerCanInteract) return
  if (!isAuthed.value) {
    showAuthActionModal({ kind: 'login', action: 'bookmark' })
    return
  }
  const result = await bookmark.onClick(event)
  if (result !== undefined) {
    // onClick returned the event — open the popover picker.
    bookmark.openPicker()
    ;(popoverRef.value as any)?.toggle?.(event)
  }
}
</script>
