<template>
  <Transition name="composer-slot" mode="out-in">
    <div :key="slot.empty ? `empty-${slot.index}` : slot.item!.localId">
      <button
        v-if="slot.empty && firstEmptySlotIndex === slot.index"
        type="button"
        class="rounded-lg border-2 border-dashed border-gray-300 bg-gray-100/50 text-gray-500 transition-colors hover:bg-gray-100 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:bg-zinc-800"
        :class="[tileSizeClass, canAddMore ? 'cursor-pointer' : 'cursor-not-allowed opacity-60']"
        :disabled="!canAddMore"
        aria-label="Add image"
        @click.stop="emit('add')"
      >
        <span class="text-2xl leading-none font-semibold" aria-hidden="true">+</span>
      </button>
      <div
        v-else-if="slot.empty"
        class="rounded-lg border-2 border-dashed border-gray-300 bg-gray-100/40 dark:border-zinc-700 dark:bg-zinc-800/30 opacity-40"
        :class="tileSizeClass"
        aria-hidden="true"
      />
      <div v-else class="flex flex-col gap-1">
        <div
          class="relative rounded-lg"
          :class="[
            draggable ? 'touch-none select-none cursor-grab active:cursor-grabbing' : '',
            draggingMediaId === slot.item!.localId ? 'opacity-0 pointer-events-none' : '',
          ]"
          :data-composer-media-id="slot.item!.localId"
          @pointerdown="onPointerDown(slot.item!.localId, $event)"
        >
          <img
            :src="slot.item!.previewUrl"
            class="rounded-lg border moh-border object-cover bg-black/5 dark:bg-white/5 pointer-events-none"
            :class="tileSizeClass"
            :alt="slot.item!.altText ?? ''"
            loading="lazy"
            draggable="false"
          />
          <button
            type="button"
            class="absolute -right-2 -top-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-zinc-800 dark:bg-black dark:text-gray-200 dark:hover:bg-zinc-900"
            :aria-label="removeLabelFor(slot.item!)"
            @click.stop="emit('remove', slot.item!.localId)"
          >
            <span class="text-[12px] leading-none" aria-hidden="true">×</span>
          </button>
          <button
            v-if="showAlt"
            type="button"
            class="absolute left-1 bottom-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm hover:bg-black/70 max-w-[70px] truncate"
            aria-label="Edit alt text"
            @click.stop="emit('edit-alt', slot.item!.localId)"
          >
            {{ altLabel(slot.item!) }}
          </button>

          <div
            v-if="slot.item!.source === 'upload' && slot.item!.uploadStatus && slot.item!.uploadStatus !== 'done'"
            class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5"
            :aria-label="uploadStatusLabel?.(slot.item!) ?? 'Uploading'"
          >
            <span
              v-if="uploadStatusLabel?.(slot.item!)"
              class="text-[10px] font-medium text-white drop-shadow-sm"
            >
              {{ uploadStatusLabel(slot.item!) }}
            </span>
            <div class="relative h-1.5 w-14 overflow-hidden rounded-full bg-black/25">
              <div
                v-if="slot.item!.uploadStatus === 'uploading' && typeof slot.item!.uploadProgress === 'number'"
                class="h-full rounded-full transition-[width] duration-300 ease-out"
                :style="{
                  width: `${Math.max(0, Math.min(100, slot.item!.uploadProgress ?? 0))}%`,
                  backgroundColor: uploadBarColor,
                }"
                aria-hidden="true"
              />
              <div
                v-else-if="slot.item!.uploadStatus === 'error'"
                class="h-full w-full rounded-full bg-red-500/90"
                aria-hidden="true"
              />
              <div
                v-else
                class="moh-upload-indeterminate absolute inset-y-0 left-0 w-1/2 rounded-full"
                :style="{ backgroundColor: uploadBarColor }"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import type { ComposerMediaItem } from '~/composables/useComposerMedia'

type Slot = { index: number; empty: boolean; item?: ComposerMediaItem }

const props = defineProps<{
  slot: Slot
  firstEmptySlotIndex: number | null
  canAddMore: boolean
  draggingMediaId: string | null
  uploadBarColor: string
  uploadStatusLabel?: (m: ComposerMediaItem) => string | null
  draggable?: boolean
  showAlt?: boolean
  removeLabelFor?: (item: ComposerMediaItem) => string
  altLabel?: (item: ComposerMediaItem) => string
  /** Tailwind classes controlling tile size. Default matches composer 4-slot size (h-20 w-20). */
  tileSizeClass?: string
}>()

const emit = defineEmits<{
  (e: 'add'): void
  (e: 'remove', localId: string): void
  (e: 'pointerdown', localId: string, ev: PointerEvent): void
  (e: 'edit-alt', localId: string): void
}>()

const slot = computed(() => props.slot)
const firstEmptySlotIndex = computed(() => (typeof props.firstEmptySlotIndex === 'number' ? props.firstEmptySlotIndex : null))
const canAddMore = computed(() => Boolean(props.canAddMore))
const draggingMediaId = computed(() => props.draggingMediaId ?? null)
const uploadBarColor = computed(() => props.uploadBarColor)
const uploadStatusLabel = computed(() => props.uploadStatusLabel)
const draggable = computed(() => props.draggable !== false)
const showAlt = computed(() => props.showAlt !== false)
const tileSizeClass = computed(() => (props.tileSizeClass ?? 'h-20 w-20').trim() || 'h-20 w-20')

function defaultRemoveLabelFor(item: ComposerMediaItem): string {
  if (item.source === 'upload' && (item.uploadStatus === 'queued' || item.uploadStatus === 'uploading' || item.uploadStatus === 'processing')) {
    return 'Cancel upload'
  }
  return 'Remove media'
}

function defaultAltLabel(item: ComposerMediaItem): string {
  const text = (item.altText ?? '').trim()
  if (!text) return 'Alt'
  return text.length > 16 ? `${text.slice(0, 16)}…` : text
}

function removeLabelFor(item: ComposerMediaItem) {
  return props.removeLabelFor?.(item) ?? defaultRemoveLabelFor(item)
}
function altLabel(item: ComposerMediaItem) {
  return props.altLabel?.(item) ?? defaultAltLabel(item)
}

function onPointerDown(localId: string, ev: PointerEvent) {
  if (!draggable.value) return
  emit('pointerdown', localId, ev)
}
</script>

