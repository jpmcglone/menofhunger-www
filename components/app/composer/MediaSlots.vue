<template>
  <div class="flex flex-wrap gap-2">
    <div
      v-for="slot in slots"
      :key="slot.index"
      class="composer-media-slot"
      :data-composer-slot-index="slot.index"
    >
      <Transition name="composer-slot" mode="out-in">
        <div :key="slot.empty ? `empty-${slot.index}` : slot.item!.localId">
          <button
            v-if="slot.empty && firstEmptySlotIndex === slot.index"
            type="button"
            class="h-20 w-20 rounded-lg border-2 border-dashed border-gray-300 bg-gray-100/50 text-gray-500 transition-colors hover:bg-gray-100 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:bg-zinc-800"
            :class="canAddMore ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'"
            :disabled="!canAddMore"
            aria-label="Add image"
            @click.stop="emit('add')"
          >
            <span class="text-2xl leading-none font-semibold" aria-hidden="true">+</span>
          </button>
          <div
            v-else-if="slot.empty"
            class="h-20 w-20 rounded-lg border-2 border-dashed border-gray-300 bg-gray-100/40 dark:border-zinc-700 dark:bg-zinc-800/30 opacity-40"
            aria-hidden="true"
          />
          <div
            v-else
            class="relative touch-none select-none cursor-grab active:cursor-grabbing rounded-lg"
            :class="draggingMediaId === slot.item!.localId ? 'opacity-0 pointer-events-none' : ''"
            :data-composer-media-id="slot.item!.localId"
            @pointerdown="emit('pointerdown', slot.item!.localId, $event)"
          >
            <img
              :src="slot.item!.previewUrl"
              class="h-20 w-20 rounded-lg border moh-border object-cover bg-black/5 dark:bg-white/5 pointer-events-none"
              alt=""
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
      </Transition>
    </div>
  </div>
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
}>()

const slots = computed(() => props.slots ?? [])
const firstEmptySlotIndex = computed(() => (typeof props.firstEmptySlotIndex === 'number' ? props.firstEmptySlotIndex : null))
const canAddMore = computed(() => Boolean(props.canAddMore))
const draggingMediaId = computed(() => props.draggingMediaId ?? null)
const uploadBarColor = computed(() => props.uploadBarColor)
const uploadStatusLabel = computed(() => props.uploadStatusLabel)

function removeLabelFor(item: ComposerMediaItem): string {
  if (item.source === 'upload' && (item.uploadStatus === 'queued' || item.uploadStatus === 'uploading' || item.uploadStatus === 'processing')) {
    return 'Cancel upload'
  }
  return 'Remove media'
}
</script>

