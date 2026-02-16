<template>
  <div class="flex flex-wrap gap-2">
    <div
      v-for="slot in slots"
      :key="slot.index"
      class="composer-media-slot"
      :data-composer-slot-index="slot.index"
    >
      <AppComposerMediaSlotTile
        :slot="slot"
        :first-empty-slot-index="firstEmptySlotIndex"
        :can-add-more="canAddMore"
        :dragging-media-id="draggingMediaId"
        :upload-bar-color="uploadBarColor"
        :upload-status-label="uploadStatusLabel"
        :draggable="true"
        :show-alt="true"
        :remove-label-for="removeLabelFor"
        :alt-label="altLabel"
        @add="emit('add')"
        @remove="(id) => emit('remove', id)"
        @pointerdown="(id, ev) => emit('pointerdown', id, ev)"
        @edit-alt="(id) => openAltModalById(id)"
      />
    </div>
  </div>

  <AppFormModal
    v-model="altModalOpen"
    title="Alt text"
    :show-submit="true"
    submit-label="Save"
    :can-submit="true"
    @submit="saveAltText"
  >
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-center rounded-xl border moh-border bg-black/5 dark:bg-white/5">
        <img
          v-if="altModalPreviewUrl"
          :src="altModalPreviewUrl"
          alt=""
          class="max-h-64 w-auto object-contain"
          loading="lazy"
          decoding="async"
        >
      </div>
      <div>
        <label class="mb-1 block text-sm font-semibold text-gray-900 dark:text-gray-100">
          Alt text (optional)
        </label>
        <input
          v-model="altModalValue"
          type="text"
          class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-100 dark:placeholder:text-zinc-500"
          maxlength="500"
          placeholder="Describe the image for screen readers"
        >
      </div>
    </div>
  </AppFormModal>
</template>

<script setup lang="ts">
import type { ComposerMediaItem } from '~/composables/useComposerMedia'

type Slot = { index: number; empty: boolean; item?: ComposerMediaItem }

const props = defineProps<{
  slots: Slot[]
  firstEmptySlotIndex: number | null
  canAddMore: boolean
  draggingMediaId: string | null
  uploadBarColor: string
  uploadStatusLabel?: (m: ComposerMediaItem) => string | null
}>()

const emit = defineEmits<{
  (e: 'add'): void
  (e: 'remove', localId: string): void
  (e: 'pointerdown', localId: string, ev: PointerEvent): void
  (e: 'update-alt', localId: string, value: string): void
}>()

const slots = computed(() => props.slots ?? [])
const firstEmptySlotIndex = computed(() => (typeof props.firstEmptySlotIndex === 'number' ? props.firstEmptySlotIndex : null))
const canAddMore = computed(() => Boolean(props.canAddMore))
const draggingMediaId = computed(() => props.draggingMediaId ?? null)
const uploadBarColor = computed(() => props.uploadBarColor)
const uploadStatusLabel = computed(() => props.uploadStatusLabel)
const altModalOpen = ref(false)
const altModalId = ref<string | null>(null)
const altModalPreviewUrl = ref<string | null>(null)
const altModalValue = ref('')

function removeLabelFor(item: ComposerMediaItem): string {
  if (item.source === 'upload' && (item.uploadStatus === 'queued' || item.uploadStatus === 'uploading' || item.uploadStatus === 'processing')) {
    return 'Cancel upload'
  }
  return 'Remove media'
}

function altLabel(item: ComposerMediaItem): string {
  const text = (item.altText ?? '').trim()
  if (!text) return 'Alt'
  return text.length > 16 ? `${text.slice(0, 16)}…` : text
}

function openAltModal(item: ComposerMediaItem) {
  altModalId.value = item.localId
  altModalPreviewUrl.value = item.previewUrl
  altModalValue.value = item.altText ?? ''
  altModalOpen.value = true
}

function openAltModalById(localId: string) {
  const item = (slots.value ?? []).find((s) => !s.empty && s.item?.localId === localId)?.item ?? null
  if (!item) return
  openAltModal(item)
}

function saveAltText() {
  if (!altModalId.value) return
  emit('update-alt', altModalId.value, altModalValue.value)
  altModalOpen.value = false
}
</script>

