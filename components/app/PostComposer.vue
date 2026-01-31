<template>
  <!-- Composer -->
  <div
    :class="[
      'px-4 py-4',
      showDivider ? 'border-b border-gray-200 dark:border-zinc-800' : ''
    ]"
  >
    <div v-if="isAuthed" class="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3">
      <!-- Row 1: visibility picker (above, right-aligned) -->
      <div class="col-start-2 flex justify-end items-end mb-3 sm:mb-2">
        <div ref="composerVisibilityWrapEl" class="relative">
          <button
            type="button"
            class="inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold leading-none transition-colors"
            :class="composerVisibilityPillClass"
            aria-label="Select post visibility"
            :disabled="!viewerIsVerified"
            @click="viewerIsVerified ? toggleVisibilityPopover() : null"
          >
            <i v-if="visibility === 'public'" class="pi pi-globe mr-1 text-[10px] opacity-80" aria-hidden="true" />
            <AppVerifiedBadge
              v-else-if="visibility === 'verifiedOnly'"
              class="mr-1"
              status="identity"
              :premium="false"
              :show-tooltip="false"
            />
            <AppVerifiedBadge
              v-else-if="visibility === 'premiumOnly'"
              class="mr-1"
              status="identity"
              :premium="true"
              :show-tooltip="false"
            />
            <i v-else-if="visibility === 'onlyMe'" class="pi pi-eye-slash mr-1 text-[10px] opacity-80" aria-hidden="true" />
            {{ composerVisibilityLabel }}
            <i v-if="viewerIsVerified" class="pi pi-chevron-down ml-1 text-[9px] opacity-80" aria-hidden="true" />
          </button>

          <!-- Custom visibility picker -->
          <div
            v-if="composerVisibilityPopoverOpen"
            class="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-black"
            role="menu"
            aria-label="Post visibility"
          >
            <button
              v-if="allowedComposerVisibilities.includes('public')"
              type="button"
              class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors text-gray-900 hover:bg-gray-50 dark:text-gray-50 dark:hover:bg-zinc-900"
              role="menuitem"
              @click="setComposerVisibility('public')"
            >
              <span class="inline-flex items-center gap-2">
                <i class="pi pi-globe text-[12px] opacity-80" aria-hidden="true" />
                <span>Public</span>
              </span>
            </button>

            <button
              v-if="allowedComposerVisibilities.includes('verifiedOnly')"
              type="button"
              class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors moh-menuitem-verified"
              role="menuitem"
              @click="setComposerVisibility('verifiedOnly')"
            >
              <span class="inline-flex items-center gap-2">
                <AppVerifiedBadge status="identity" :premium="false" :show-tooltip="false" />
                <span>Verified only</span>
              </span>
            </button>

            <button
              v-if="allowedComposerVisibilities.includes('premiumOnly')"
              type="button"
              :disabled="!isPremium"
              :class="[
                'w-full text-left px-3 py-2 text-sm font-semibold transition-colors',
                isPremium
                  ? 'moh-menuitem-premium'
                  : 'text-gray-400 dark:text-zinc-600 cursor-not-allowed'
              ]"
              role="menuitem"
              @click="isPremium ? setComposerVisibility('premiumOnly') : null"
            >
              <span class="inline-flex items-center gap-2">
                <AppVerifiedBadge status="identity" :premium="true" :show-tooltip="false" />
                <span>Premium only</span>
              </span>
              <span v-if="!isPremium" class="ml-2 font-mono text-[10px] opacity-80" aria-hidden="true">LOCKED</span>
            </button>

            <button
              v-if="allowedComposerVisibilities.includes('onlyMe')"
              type="button"
              class="w-full text-left px-3 py-2 text-sm font-semibold transition-colors moh-menuitem-onlyme"
              role="menuitem"
              @click="setComposerVisibility('onlyMe')"
            >
              <span class="inline-flex items-center gap-2">
                <i class="pi pi-eye-slash text-[12px]" aria-hidden="true" />
                <span>Only me</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- Row 2: avatar + textarea start aligned -->
      <NuxtLink
        v-if="myProfilePath"
        :to="myProfilePath"
        class="row-start-1 sm:row-start-2 col-start-1 mb-3 sm:mb-0 group shrink-0"
        aria-label="View your profile"
      >
        <div class="transition-opacity duration-200 group-hover:opacity-80">
          <AppAvatarCircle
            :src="meAvatarUrl"
            :name="user?.name ?? null"
            :username="user?.username ?? null"
            size-class="h-8 w-8 sm:h-10 sm:w-10"
          />
        </div>
      </NuxtLink>
      <div v-else class="row-start-1 sm:row-start-2 col-start-1 mb-3 sm:mb-0 shrink-0" aria-hidden="true">
        <AppAvatarCircle
          :src="meAvatarUrl"
          :name="user?.name ?? null"
          :username="user?.username ?? null"
          size-class="h-8 w-8 sm:h-10 sm:w-10"
        />
      </div>

      <div class="row-start-2 col-span-2 sm:col-span-1 sm:col-start-2 min-w-0 moh-composer-tint">
        <input
          ref="mediaFileInputEl"
          type="file"
          accept="image/*"
          class="hidden"
          multiple
          @change="onMediaFilesSelected"
        />

        <!-- Drop zone: textarea + attachments -->
        <div
          class="relative"
          :style="composerTextareaVars"
          @dragenter="onComposerAreaDragEnter"
          @dragover="onComposerAreaDragOver"
          @dragleave="onComposerAreaDragLeave"
          @drop.prevent="onComposerDrop"
        >
          <!-- Textarea wrapper so the empty-state overlay only hugs the field -->
          <div class="relative">
            <textarea
              ref="composerTextareaEl"
              v-model="draft"
              rows="3"
              class="moh-composer-textarea w-full resize-none overflow-hidden rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-[15px] leading-6 text-gray-900 placeholder:text-gray-500 focus:outline-none dark:border-zinc-700 dark:text-gray-50 dark:placeholder:text-zinc-500"
              :style="composerTextareaVars"
              placeholder="What’s happening?"
              :maxlength="postMaxLen"
              @keydown="onComposerKeydown"
              @paste="onComposerPaste"
            />

            <!-- Drag overlay (no media): hug just the textarea -->
            <div
              v-if="dropOverlayVisible && !composerMedia.length"
              class="pointer-events-none absolute -inset-2 z-20 rounded-2xl"
              aria-hidden="true"
            >
              <div
                class="absolute inset-0 rounded-2xl border-2 border-dashed opacity-70"
                :style="{ borderColor: 'var(--moh-compose-accent)' }"
              />
              <div class="absolute inset-0 rounded-2xl bg-black/10 dark:bg-white/5" />
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="rounded-xl border moh-border moh-frosted px-4 py-3 text-center">
                  <div class="text-sm font-semibold moh-text">Drop images to attach</div>
                  <div class="mt-0.5 text-xs moh-text-muted">
                    <template v-if="remainingMediaSlots > 0">Up to {{ remainingMediaSlots }} more (max 4)</template>
                    <template v-else>Max 4 images</template>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <AppInlineAlert v-if="submitError" class="mt-3" severity="danger">
            {{ submitError }}
          </AppInlineAlert>

          <!-- Media slots: always 4 once any media exists (avoid layout/animation weirdness) -->
          <div v-if="composerMedia.length" class="mt-3 flex flex-wrap gap-2">
            <div
              v-for="slot in displaySlots"
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
                    :class="canAddMoreMedia ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'"
                    :disabled="!canAddMoreMedia"
                    aria-label="Add image"
                    @click.stop="openMediaPicker"
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
                    @pointerdown="onMediaTilePointerDown(slot.item!.localId, $event)"
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
                      :aria-label="slot.item!.source === 'upload' && (slot.item!.uploadStatus === 'queued' || slot.item!.uploadStatus === 'uploading' || slot.item!.uploadStatus === 'processing') ? 'Cancel upload' : 'Remove media'"
                      @click.stop="removeComposerMedia(slot.item!.localId)"
                    >
                      <span class="text-[12px] leading-none" aria-hidden="true">×</span>
                    </button>
                    <div
                      v-if="slot.item!.source === 'upload' && slot.item!.uploadStatus && slot.item!.uploadStatus !== 'done'"
                      class="pointer-events-none absolute inset-0 flex items-center justify-center"
                      :aria-label="composerUploadStatusLabel(slot.item!) ?? 'Uploading'"
                    >
                      <div class="relative h-1.5 w-14 overflow-hidden rounded-full bg-black/25">
                        <div
                          v-if="slot.item!.uploadStatus === 'uploading' && typeof slot.item!.uploadProgress === 'number'"
                          class="h-full rounded-full transition-[width] duration-150 ease-out"
                          :style="{
                            width: `${Math.max(0, Math.min(100, Math.round(slot.item!.uploadProgress ?? 0)))}%`,
                            backgroundColor: composerUploadBarColor,
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
                          :style="{ backgroundColor: composerUploadBarColor }"
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
          </div>

          <!-- Drag overlay (with media): hug textarea + slots -->
          <div
            v-if="dropOverlayVisible && composerMedia.length"
            class="pointer-events-none absolute -inset-2 z-20 rounded-2xl"
            aria-hidden="true"
          >
            <div
              class="absolute inset-0 rounded-2xl border-2 border-dashed opacity-70"
              :style="{ borderColor: 'var(--moh-compose-accent)' }"
            />
            <div class="absolute inset-0 rounded-2xl bg-black/10 dark:bg-white/5" />
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="rounded-xl border moh-border moh-frosted px-4 py-3 text-center">
                <div class="text-sm font-semibold moh-text">Drop images to attach</div>
                <div class="mt-0.5 text-xs moh-text-muted">
                  <template v-if="remainingMediaSlots > 0">Up to {{ remainingMediaSlots }} more (max 4)</template>
                  <template v-else>Max 4 images</template>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ClientOnly>
          <Teleport to="body">
            <div
              v-if="dragGhost"
              class="moh-drag-ghost"
              :style="dragGhostStyle"
              aria-hidden="true"
            >
              <img
                :src="dragGhost.src"
                class="h-full w-full rounded-lg border moh-border object-cover bg-black/5 dark:bg-white/5 shadow-2xl"
                alt=""
                draggable="false"
              />
            </div>
          </Teleport>
        </ClientOnly>

        <div class="mt-3 flex items-center justify-between">
          <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <Button
              icon="pi pi-image"
              text
              rounded
              severity="secondary"
              aria-label="Add media"
              :disabled="!canAddMoreMedia"
              v-tooltip.bottom="tinyTooltip(canAddMoreMedia ? 'Add image/GIF' : 'Max 4 attachments')"
              @click="openMediaPicker"
            />
            <Button
              text
              severity="secondary"
              class="!rounded-xl"
              aria-label="Add GIF"
              :disabled="!canAddMoreMedia"
              v-tooltip.bottom="tinyTooltip(canAddMoreMedia ? 'Add GIF (Giphy)' : 'Max 4 attachments')"
              @click="openGiphyPicker"
            >
              <template #icon>
                <span
                  class="inline-flex h-[22px] w-[22px] items-center justify-center rounded-md border border-current/30 bg-transparent text-[10px] font-black leading-none"
                  aria-hidden="true"
                >
                  GIF
                </span>
              </template>
            </Button>
          </div>
          <div class="flex items-center gap-2">
            <div class="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
              {{ postCharCount }}/{{ postMaxLen }}
            </div>
            <Button
              label="Post"
              rounded
              :outlined="postButtonOutlined"
              severity="secondary"
              :class="[postButtonClass, '!min-h-0 !py-1.5 !px-5 !text-sm !font-semibold']"
              :disabled="submitting || !canPost || (!(draft.trim() || composerMedia.length) ) || postCharCount > postMaxLen || composerUploading"
              :loading="submitting"
              @click="submit"
            />
          </div>
        </div>
      </div>
    </div>

    <button
      v-else
      type="button"
      class="w-full text-left rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 hover:bg-gray-100 dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:bg-zinc-900/40"
      @click="goLogin"
    >
      <div class="flex items-center justify-between gap-3">
        <div class="space-y-1">
          <div class="font-semibold text-gray-900 dark:text-gray-50">Log in to post</div>
          <div class="text-sm text-gray-600 dark:text-gray-300">
            Join the conversation and share updates with the brotherhood.
          </div>
        </div>
        <i class="pi pi-angle-right text-gray-500 dark:text-gray-400" aria-hidden="true" />
      </div>
    </button>
  </div>

  <Dialog v-model:visible="giphyOpen" modal header="Add a GIF" :style="{ width: '32rem' }">
    <div class="flex items-center gap-2">
      <InputText
        ref="giphyInputRef"
        v-model="giphyQuery"
        class="w-full"
        placeholder="Search Giphy…"
        aria-label="Search Giphy"
        @keyup.enter.prevent="searchGiphy"
      />
      <Button label="Search" severity="secondary" :loading="giphyLoading" :disabled="giphyLoading" @click="searchGiphy" />
    </div>

    <div v-if="giphyError" class="mt-3 text-sm text-red-600 dark:text-red-400">
      {{ giphyError }}
    </div>

    <div class="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-2">
      <button
        v-for="gif in giphyItems"
        :key="gif.id"
        type="button"
        class="overflow-hidden rounded-lg border moh-border bg-black/5 dark:bg-white/5 hover:opacity-90 transition-opacity"
        :disabled="!canAddMoreMedia"
        :aria-label="`Add GIF ${gif.title || ''}`"
        @click="selectGiphyGif(gif)"
      >
        <img :src="gif.url" class="h-24 w-full object-cover" alt="" loading="lazy" />
      </button>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import type { CreatePostResponse, GiphySearchResponse, PostMediaKind, PostMediaSource, PostVisibility } from '~/types/api'
import { filterPillClasses } from '~/utils/post-visibility'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { getApiErrorMessage } from '~/utils/api-error'

type UploadStatus = 'queued' | 'uploading' | 'processing' | 'done' | 'error'

type CreateMediaPayload =
  | {
      source: 'upload'
      kind: 'image' | 'gif'
      r2Key: string
      width: number | null
      height: number | null
    }
  | {
      source: 'giphy'
      kind: 'gif'
      url: string
      mp4Url: string | null
      width: number | null
      height: number | null
    }

type ComposerMediaItem = {
  localId: string
  source: PostMediaSource
  kind: PostMediaKind
  previewUrl: string
  r2Key?: string
  url?: string
  mp4Url?: string | null
  width?: number | null
  height?: number | null
  uploadStatus?: UploadStatus
  uploadError?: string | null
  file?: File | null
  abortController?: AbortController | null
  uploadProgress?: number | null
}

const emit = defineEmits<{
  (e: 'posted', payload: { id: string; visibility: PostVisibility }): void
}>()

const props = defineProps<{
  autoFocus?: boolean
  showDivider?: boolean
  // Optional override used on /home so the new post can be inserted optimistically.
  createPost?: (body: string, visibility: PostVisibility, media: CreateMediaPayload[]) => Promise<{ id: string } | null>
}>()

const route = useRoute()
const { user } = useAuth()
const { apiFetchData } = useApiClient()
const toast = useAppToast()

const isAuthed = computed(() => Boolean(user.value?.id))
const isPremium = computed(() => Boolean(user.value?.premium))
const viewerIsVerified = computed(() => (user.value?.verifiedStatus ?? 'none') !== 'none')
const showDivider = computed(() => props.showDivider !== false)

const myProfilePath = computed(() => {
  const username = (user.value?.username ?? '').trim()
  return username ? `/u/${encodeURIComponent(username)}` : null
})
const meAvatarUrl = computed(() => user.value?.avatarUrl ?? null)

const draft = ref('')
const composerMedia = ref<ComposerMediaItem[]>([])
const canAddMoreMedia = computed(() => composerMedia.value.length < 4)

const MEDIA_SLOTS = 4

const draggingMediaId = ref<string | null>(null)
const draggingPointerId = ref<number | null>(null)
const dragFromSlotIndex = ref<number | null>(null)
const dropTargetSlotIndex = ref<number | null>(null)
const dragGhost = ref<null | { src: string; x: number; y: number; w: number; h: number; offsetX: number; offsetY: number }>(null)
const dragGhostStyle = computed(() => {
  const g = dragGhost.value
  if (!g) return {}
  return {
    left: `${Math.round(g.x)}px`,
    top: `${Math.round(g.y)}px`,
    width: `${Math.round(g.w)}px`,
    height: `${Math.round(g.h)}px`,
  }
})

function reorderInsertAt<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return arr.slice()
  const item = arr[fromIndex]
  if (!item) return arr.slice()
  const rest = arr.filter((_, i) => i !== fromIndex)
  const insertAt = toIndex > fromIndex ? toIndex - 1 : toIndex
  rest.splice(insertAt, 0, item)
  return rest
}

const displayOrder = computed(() => {
  const list = composerMedia.value
  const from = dragFromSlotIndex.value
  const to = dropTargetSlotIndex.value
  if (from == null || to == null || from === to || draggingMediaId.value === null) return list
  return reorderInsertAt(list, from, to)
})

const displaySlots = computed(() => {
  const order = displayOrder.value
  const slots: Array<{ key: string; index: number; empty: boolean; item?: ComposerMediaItem }> = []
  for (let i = 0; i < MEDIA_SLOTS; i++) {
    if (i < order.length) {
      const item = order[i]
      if (item) {
        slots.push({ key: item.localId, index: i, empty: false, item })
      } else {
        slots.push({ key: `empty-${i}`, index: i, empty: true })
      }
    } else {
      slots.push({ key: `empty-${i}`, index: i, empty: true })
    }
  }
  return slots
})

const composerUploading = computed(() => {
  return composerMedia.value.some((m) => {
    if (m.source !== 'upload') return false
    return m.uploadStatus === 'queued' || m.uploadStatus === 'uploading' || m.uploadStatus === 'processing'
  })
})

const mediaFileInputEl = ref<HTMLInputElement | null>(null)
const composerTextareaEl = ref<HTMLTextAreaElement | null>(null)

const remainingMediaSlots = computed(() => Math.max(0, MEDIA_SLOTS - composerMedia.value.length))
const firstEmptySlotIndex = computed(() => {
  const idx = displaySlots.value.findIndex((s) => s.empty)
  return idx >= 0 ? idx : null
})
const dragOverDepth = ref(0)
const dropOverlayVisible = ref(false)

function dataTransferHasImages(dt: DataTransfer | null): boolean {
  if (!dt) return false
  const items = Array.from(dt.items ?? [])
  if (items.some((it) => it.kind === 'file' && (it.type ?? '').toLowerCase().startsWith('image/'))) return true
  const files = Array.from(dt.files ?? [])
  if (files.some((f) => ((f.type ?? '').toLowerCase().startsWith('image/')))) return true
  return false
}

function makeLocalId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `m_${Date.now()}_${Math.random().toString(16).slice(2)}`
  }
}

function openMediaPicker() {
  if (!canAddMoreMedia.value) return
  mediaFileInputEl.value?.click()
}

function addImageFiles(files: File[], source: 'picker' | 'drop' | 'paste') {
  if (!import.meta.client) return
  if (!files.length) return

  const remaining = Math.max(0, MEDIA_SLOTS - composerMedia.value.length)
  if (remaining <= 0) {
    toast.push({ title: 'You can attach up to 4 images.', tone: 'neutral', durationMs: 1600 })
    return
  }

  const imageFiles = files
    .filter(Boolean)
    .filter((f) => ((f.type ?? '').toLowerCase().startsWith('image/')))
    .slice(0, remaining)

  if (!imageFiles.length) return

  for (const file of imageFiles) {
    const ct = (file.type ?? '').toLowerCase()
    const previewUrl = URL.createObjectURL(file)
    const localId = makeLocalId()

    const slot: ComposerMediaItem = {
      localId,
      source: 'upload',
      kind: ct === 'image/gif' ? 'gif' : 'image',
      previewUrl,
      uploadStatus: 'queued',
      uploadError: null,
      file,
      abortController: null,
      uploadProgress: 0,
    }
    composerMedia.value.push(slot)
  }

  if (files.length > imageFiles.length) {
    const skipped = files.length - imageFiles.length
    // Only message for drop/paste; picker already visually indicates count.
    if (source !== 'picker') {
      toast.push({
        title: `Added ${imageFiles.length} image${imageFiles.length === 1 ? '' : 's'}.`,
        message: skipped > 0 ? `Ignored ${skipped} extra (max 4).` : undefined,
        tone: 'neutral',
        durationMs: 1600,
      })
    }
  }

  processComposerUploadQueue()
}

function onComposerDrop(e: DragEvent) {
  if (!import.meta.client) return
  const dt = e.dataTransfer
  if (!dt) return
  const files = Array.from(dt.files ?? [])
  if (!files.length) return
  addImageFiles(files, 'drop')
  // Keep focus in composer for a smooth flow.
  composerTextareaEl.value?.focus()
  dragOverDepth.value = 0
  dropOverlayVisible.value = false
}

function onComposerAreaDragEnter(e: DragEvent) {
  if (!import.meta.client) return
  const dt = e.dataTransfer
  if (!dataTransferHasImages(dt)) return
  dragOverDepth.value += 1
  dropOverlayVisible.value = true
}

function onComposerAreaDragOver(e: DragEvent) {
  if (!import.meta.client) return
  const dt = e.dataTransfer
  if (!dataTransferHasImages(dt)) {
    dropOverlayVisible.value = false
    return
  }
  try {
    e.preventDefault()
  } catch {
    // ignore
  }
  // Show overlay even if full; message will communicate the limit.
  dropOverlayVisible.value = true
  try {
    dt.dropEffect = remainingMediaSlots.value > 0 ? 'copy' : 'none'
  } catch {
    // ignore
  }
}

function onComposerAreaDragLeave(e: DragEvent) {
  if (!import.meta.client) return
  const dt = e.dataTransfer
  if (!dataTransferHasImages(dt)) return
  dragOverDepth.value = Math.max(0, dragOverDepth.value - 1)
  if (dragOverDepth.value === 0) dropOverlayVisible.value = false
}

function onComposerPaste(e: ClipboardEvent) {
  if (!import.meta.client) return
  const cd = e.clipboardData
  if (!cd) return

  const out: File[] = []

  // Prefer items API (supports multiple images).
  const items = Array.from(cd.items ?? [])
  for (const it of items) {
    if (it.kind !== 'file') continue
    const type = (it.type ?? '').toLowerCase()
    if (!type.startsWith('image/')) continue
    const f = it.getAsFile()
    if (f) out.push(f)
  }

  // Fallback: some browsers populate files list.
  if (!out.length) {
    out.push(...Array.from(cd.files ?? []).filter(Boolean))
  }

  const hasImage = out.some((f) => ((f.type ?? '').toLowerCase().startsWith('image/')))
  if (!hasImage) return

  // Prevent default paste (otherwise the image may paste as text/blank).
  try {
    e.preventDefault()
  } catch {
    // ignore
  }
  addImageFiles(out, 'paste')
}

function patchComposerMedia(localId: string, patch: Partial<ComposerMediaItem>) {
  const idx = composerMedia.value.findIndex((m) => m.localId === localId)
  if (idx < 0) return
  const cur = composerMedia.value[idx]
  if (!cur) return
  composerMedia.value[idx] = { ...cur, ...patch }
}

function removeComposerMedia(localId: string) {
  const id = (localId ?? '').trim()
  if (!id) return
  const idx = composerMedia.value.findIndex((m) => m.localId === id)
  if (idx < 0) return
  const item = composerMedia.value[idx]

  // Cancel any in-flight upload immediately.
  try {
    item?.abortController?.abort?.()
  } catch {
    // ignore
  }

  if (item?.source === 'upload' && item.previewUrl?.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(item.previewUrl)
    } catch {
      // ignore
    }
  }
  composerMedia.value.splice(idx, 1)
}

function onMediaTilePointerDown(id: string, e: PointerEvent) {
  const target = e.target as HTMLElement | null
  if (target?.closest('button')) return

  const pid = (id ?? '').trim()
  if (!pid) return

  const slotEl = (e.currentTarget as HTMLElement | null)?.closest?.('[data-composer-slot-index]') as HTMLElement | null
  const slotIndex = slotEl ? parseInt(slotEl.dataset.composerSlotIndex ?? '', 10) : -1
  if (slotIndex < 0 || slotIndex >= MEDIA_SLOTS) return

  try {
    e.preventDefault()
  } catch {
    // ignore
  }

  draggingMediaId.value = pid
  draggingPointerId.value = e.pointerId
  dragFromSlotIndex.value = slotIndex
  dropTargetSlotIndex.value = slotIndex

  const item = composerMedia.value.find((m) => m.localId === pid) ?? null
  const src = item?.previewUrl ?? ''
  const rect = (e.currentTarget as HTMLElement | null)?.getBoundingClientRect?.()
  if (src && rect) {
    dragGhost.value = {
      src,
      w: rect.width,
      h: rect.height,
      x: rect.left,
      y: rect.top,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    }
  } else {
    dragGhost.value = null
  }

  try {
    ;(e.currentTarget as HTMLElement | null)?.setPointerCapture?.(e.pointerId)
  } catch {
    // ignore
  }

  const onMove = (ev: PointerEvent) => {
    if (draggingPointerId.value !== ev.pointerId) return
    if (!draggingMediaId.value) return

    if (dragGhost.value) {
      dragGhost.value = {
        ...dragGhost.value,
        x: ev.clientX - dragGhost.value.offsetX,
        y: ev.clientY - dragGhost.value.offsetY,
      }
    }

    const under = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null
    const slotUnder = under?.closest?.('[data-composer-slot-index]') as HTMLElement | null
    const toSlot = slotUnder ? parseInt(slotUnder.dataset.composerSlotIndex ?? '', 10) : null
    if (toSlot != null && toSlot >= 0 && toSlot < MEDIA_SLOTS) {
      dropTargetSlotIndex.value = toSlot
    }
  }

  const onUpOrCancel = (ev: PointerEvent) => {
    if (draggingPointerId.value !== ev.pointerId) return
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUpOrCancel)
    window.removeEventListener('pointercancel', onUpOrCancel)

    const from = dragFromSlotIndex.value
    const to = dropTargetSlotIndex.value
    if (from != null && to != null && from !== to) {
      composerMedia.value = reorderInsertAt(composerMedia.value, from, to)
    }

    draggingMediaId.value = null
    draggingPointerId.value = null
    dragFromSlotIndex.value = null
    dropTargetSlotIndex.value = null
    dragGhost.value = null
  }

  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUpOrCancel)
  window.addEventListener('pointercancel', onUpOrCancel)
}

function composerUploadStatusLabel(m: ComposerMediaItem): string | null {
  if (m.source !== 'upload') return null
  if (m.uploadStatus === 'error') return 'Failed'
  // Only ever expose "Uploading" for loading states (queued/uploading/processing) – no "Processing" text.
  if (m.uploadStatus === 'queued' || m.uploadStatus === 'uploading' || m.uploadStatus === 'processing') return 'Uploading'
  return null
}

const uploadWorkerRunning = ref(false)
const uploadInFlight = ref(0)
const UPLOAD_CONCURRENCY = 3

async function uploadOne(id: string) {
  const next = composerMedia.value.find((m) => m.localId === id) ?? null
  if (!next || next.source !== 'upload' || next.uploadStatus !== 'queued') return
  const file = next.file
  if (!file) {
    patchComposerMedia(id, { uploadStatus: 'error', uploadError: 'Missing file.' })
    return
  }

  const controller = new AbortController()
  patchComposerMedia(id, { uploadStatus: 'uploading', uploadError: null, abortController: controller, uploadProgress: 0 })

  try {
    const init = await apiFetchData<{ key: string; uploadUrl: string; headers: Record<string, string>; maxBytes?: number }>(
      '/uploads/post-media/init',
      {
        method: 'POST',
        body: { contentType: file.type },
        signal: controller.signal,
      },
    )

    const maxBytes = typeof init.maxBytes === 'number' ? init.maxBytes : null
    if (maxBytes && file.size > maxBytes) throw new Error('File is too large.')

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', init.uploadUrl)
      for (const [k, v] of Object.entries(init.headers ?? {})) {
        try {
          xhr.setRequestHeader(k, v)
        } catch {
          // ignore
        }
      }
      xhr.upload.onprogress = (e) => {
        const total = e.total || file.size || 0
        if (!total) return
        const pct = Math.max(0, Math.min(100, (e.loaded / total) * 100))
        patchComposerMedia(id, { uploadProgress: pct })
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve()
        else reject(new Error('Failed to upload.'))
      }
      xhr.onerror = () => reject(new Error('Failed to upload.'))
      xhr.onabort = () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }))
      controller.signal.addEventListener(
        'abort',
        () => {
          try {
            xhr.abort()
          } catch {
            // ignore
          }
        },
        { once: true },
      )
      xhr.send(file)
    })

    patchComposerMedia(id, { uploadStatus: 'processing', uploadProgress: 100 })

    const committed = await apiFetchData<{
      key: string
      contentType: string
      kind: PostMediaKind
      width: number | null
      height: number | null
    }>('/uploads/post-media/commit', {
      method: 'POST',
      body: { key: init.key },
      signal: controller.signal,
    })

    patchComposerMedia(id, {
      uploadStatus: 'done',
      abortController: null,
      file: null,
      uploadProgress: 100,
      r2Key: committed.key,
      kind: committed.kind,
      width: committed.width ?? null,
      height: committed.height ?? null,
    })
  } catch (err: unknown) {
    if (controller.signal.aborted) return
    const msg = String((err as Error)?.message ?? err) || 'Upload failed.'
    patchComposerMedia(id, { uploadStatus: 'error', uploadError: msg, abortController: null })
  }
}

function processComposerUploadQueue() {
  if (uploadWorkerRunning.value) return
  uploadWorkerRunning.value = true

  const pump = () => {
    while (uploadInFlight.value < UPLOAD_CONCURRENCY) {
      const next = composerMedia.value.find((m) => m.source === 'upload' && m.uploadStatus === 'queued') ?? null
      if (!next) break
      uploadInFlight.value += 1
      void uploadOne(next.localId)
        .catch(() => {
          // per-item error handling
        })
        .finally(() => {
          uploadInFlight.value = Math.max(0, uploadInFlight.value - 1)
          pump()
        })
    }

    const queued = composerMedia.value.some((m) => m.source === 'upload' && m.uploadStatus === 'queued')
    if (!queued && uploadInFlight.value === 0) {
      uploadWorkerRunning.value = false
    }
  }

  pump()
}

async function onMediaFilesSelected(e: Event) {
  if (!import.meta.client) return
  const input = e.target as HTMLInputElement | null
  const files = Array.from(input?.files ?? [])
  if (input) input.value = ''
  if (!files.length) return
  addImageFiles(files, 'picker')
}

// Giphy picker
const giphyOpen = ref(false)
const giphyQuery = ref('')
const giphyLoading = ref(false)
const giphyError = ref<string | null>(null)
const giphyItems = ref<GiphySearchResponse['items']>([])
const giphyInputRef = ref<any>(null)
const giphyRequestId = ref(0)

function resetGiphyPickerState() {
  giphyQuery.value = ''
  giphyItems.value = []
  giphyError.value = null
  giphyLoading.value = false
}

function focusGiphyInput() {
  if (!import.meta.client) return
  try {
    const root = (giphyInputRef.value?.$el ?? giphyInputRef.value) as HTMLElement | null
    const input = (root?.tagName === 'INPUT' ? (root as HTMLInputElement) : (root?.querySelector?.('input') as HTMLInputElement | null)) ?? null
    input?.focus()
    input?.select?.()
  } catch {
    // ignore
  }
}

function openGiphyPicker() {
  if (!canAddMoreMedia.value) return
  resetGiphyPickerState()
  giphyOpen.value = true
  void nextTick().then(() => focusGiphyInput())
  void primeGiphyResults()
}

async function primeGiphyResults() {
  // use trending endpoint if q empty (server handles it)
  await searchGiphy()
}

async function searchGiphy() {
  if (giphyLoading.value) return
  const q = giphyQuery.value.trim()
  giphyLoading.value = true
  const reqId = ++giphyRequestId.value
  try {
    // Important: omit `q` entirely when blank so the server can treat it as trending.
    const query = q ? ({ q } as Record<string, string>) : ({} as Record<string, string>)
    const res = await apiFetchData<GiphySearchResponse>('/giphy/search', { method: 'GET', query: query as any })
    if (!giphyOpen.value || giphyRequestId.value !== reqId) return
    giphyItems.value = res?.items ?? []
    giphyError.value = null
  } catch (e: unknown) {
    if (!giphyOpen.value || giphyRequestId.value !== reqId) return
    giphyError.value = getApiErrorMessage(e) || 'Failed to search Giphy.'
    giphyItems.value = []
  } finally {
    if (giphyRequestId.value === reqId) giphyLoading.value = false
  }
}

function selectGiphyGif(gif: GiphySearchResponse['items'][number]) {
  if (!canAddMoreMedia.value) return
  const url = (gif?.url ?? '').trim()
  if (!url) return
  composerMedia.value.push({
    localId: makeLocalId(),
    source: 'giphy',
    kind: 'gif',
    previewUrl: url,
    url,
    mp4Url: gif.mp4Url ?? null,
    width: gif.width ?? null,
    height: gif.height ?? null,
    uploadStatus: 'done',
    uploadError: null,
    file: null,
    abortController: null,
  })
  giphyOpen.value = false
}

watch(
  giphyOpen,
  (open) => {
    if (!open) {
      giphyRequestId.value += 1
      resetGiphyPickerState()
    }
  },
  { flush: 'post' },
)

// Visibility + rules
const visibility = useCookie<PostVisibility>('moh.post.visibility.v1', {
  default: () => 'public',
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
})

const allowedComposerVisibilities = computed<PostVisibility[]>(() => {
  if (!isAuthed.value) return ['public']
  if (!viewerIsVerified.value) return ['onlyMe']
  return isPremium.value ? ['public', 'verifiedOnly', 'premiumOnly', 'onlyMe'] : ['public', 'verifiedOnly', 'onlyMe']
})

watch(
  allowedComposerVisibilities,
  (allowed) => {
    const set = new Set(allowed)
    if (!set.has(visibility.value)) visibility.value = allowed[0] ?? 'public'
  },
  { immediate: true },
)

const composerVisibilityLabel = computed(() => {
  if (visibility.value === 'verifiedOnly') return 'Verified'
  if (visibility.value === 'premiumOnly') return 'Premium'
  if (visibility.value === 'onlyMe') return 'Only me'
  return 'Public'
})

const composerVisibilityPillClass = computed(() => {
  return `${filterPillClasses(visibility.value, false)} bg-transparent hover:bg-transparent dark:hover:bg-transparent`
})

// Upload bar fill color matches composer visibility: blue (verified), orange (premium), purple (only me), normal primary (public).
const composerUploadBarColor = computed(() => {
  if (visibility.value === 'verifiedOnly') return 'var(--moh-verified)'
  if (visibility.value === 'premiumOnly') return 'var(--moh-premium)'
  if (visibility.value === 'onlyMe') return 'var(--moh-onlyme)'
  return 'var(--p-primary-color)'
})

const composerVisibilityWrapEl = ref<HTMLElement | null>(null)
const composerVisibilityPopoverOpen = ref(false)

function closeComposerVisibilityPopover() {
  composerVisibilityPopoverOpen.value = false
}
function toggleVisibilityPopover() {
  composerVisibilityPopoverOpen.value = !composerVisibilityPopoverOpen.value
}
function setComposerVisibility(v: PostVisibility) {
  visibility.value = v
  closeComposerVisibilityPopover()
}

watch(
  composerVisibilityPopoverOpen,
  (open) => {
    if (!import.meta.client) return

    const onPointerDown = (e: Event) => {
      const el = composerVisibilityWrapEl.value
      const target = e.target as Node | null
      if (!el || !target) return
      if (el.contains(target)) return
      closeComposerVisibilityPopover()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeComposerVisibilityPopover()
    }

    if (open) {
      window.addEventListener('mousedown', onPointerDown, true)
      window.addEventListener('touchstart', onPointerDown, true)
      window.addEventListener('keydown', onKeyDown)
    }

    return () => {
      window.removeEventListener('mousedown', onPointerDown, true)
      window.removeEventListener('touchstart', onPointerDown, true)
      window.removeEventListener('keydown', onKeyDown)
    }
  },
  { flush: 'post' },
)

// Textarea styling
const isDarkMode = computed(() => Boolean(useColorMode().value === 'dark'))
const composerTextareaVars = computed<Record<string, string>>(() => {
  if (visibility.value === 'verifiedOnly') return { '--moh-compose-accent': 'var(--moh-verified)', '--moh-compose-ring': 'var(--moh-verified-ring)' }
  if (visibility.value === 'premiumOnly') return { '--moh-compose-accent': 'var(--moh-premium)', '--moh-compose-ring': 'var(--moh-premium-ring)' }
  if (visibility.value === 'onlyMe') return { '--moh-compose-accent': 'var(--moh-onlyme)', '--moh-compose-ring': 'var(--moh-onlyme-ring)' }
  return isDarkMode.value
    ? { '--moh-compose-accent': 'rgba(255, 255, 255, 0.85)', '--moh-compose-ring': 'rgba(255, 255, 255, 0.25)' }
    : { '--moh-compose-accent': 'rgba(0, 0, 0, 0.85)', '--moh-compose-ring': 'rgba(0, 0, 0, 0.18)' }
})

const postMaxLen = computed(() => (isPremium.value ? 500 : 200))
const postCharCount = computed(() => draft.value.length)

const canPost = computed(() => Boolean(isAuthed.value && (viewerIsVerified.value || visibility.value === 'onlyMe')))

const postButtonOutlined = computed(() => visibility.value === 'public')
const postButtonClass = computed(() => {
  if (visibility.value === 'verifiedOnly') return 'moh-btn-verified moh-btn-tone'
  if (visibility.value === 'premiumOnly') return 'moh-btn-premium moh-btn-tone'
  if (visibility.value === 'onlyMe') return 'moh-btn-onlyme moh-btn-tone'
  return 'moh-btn-public'
})

// Composer submit
const submitting = ref(false)
const submitError = ref<string | null>(null)

const submit = async () => {
  if (!canPost.value) return
  if (submitting.value) return
  if (!(draft.value.trim() || composerMedia.value.length)) return
  if (postCharCount.value > postMaxLen.value) return
  if (composerUploading.value) return

  submitError.value = null
  submitting.value = true
  try {
    const mediaPayload: CreateMediaPayload[] = composerMedia.value
      .map((m) => {
        if (m.source === 'upload') {
          const r2Key = (m.r2Key ?? '').trim()
          if (!r2Key) return null
          return { source: 'upload' as const, kind: m.kind, r2Key, width: m.width ?? null, height: m.height ?? null }
        }
        const url = (m.url ?? '').trim()
        if (!url) return null
        return { source: 'giphy' as const, kind: 'gif' as const, url, mp4Url: m.mp4Url ?? null, width: m.width ?? null, height: m.height ?? null }
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x))

    const created =
      (await props.createPost?.(draft.value, visibility.value, mediaPayload)) ??
      (await apiFetchData<CreatePostResponse>('/posts', { method: 'POST', body: { body: draft.value, visibility: visibility.value, media: mediaPayload } })).post

    draft.value = ''
    for (const m of composerMedia.value) {
      if (m.source === 'upload' && m.previewUrl?.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(m.previewUrl)
        } catch {
          // ignore
        }
      }
    }
    composerMedia.value = []

    const id = (created as any)?.id as string | undefined
    if (id) {
      emit('posted', { id, visibility: visibility.value })
      toast.push({
        title: 'Posted',
        message:
          visibility.value === 'premiumOnly'
            ? 'Premium-only post · Tap to view.'
            : visibility.value === 'verifiedOnly'
              ? 'Verified-only post · Tap to view.'
              : visibility.value === 'onlyMe'
                ? 'Only you can see this · Tap to view.'
                : 'Tap to view.',
        tone:
          visibility.value === 'premiumOnly'
            ? 'premiumOnly'
            : visibility.value === 'verifiedOnly'
              ? 'verifiedOnly'
              : visibility.value === 'onlyMe'
                ? 'onlyMe'
                : 'public',
        to: `/p/${encodeURIComponent(id)}`,
        durationMs: 2600,
      })
    }
  } catch (e: unknown) {
    const msg = getApiErrorMessage(e) || 'Failed to post.'
    submitError.value = msg
    toast.push({ title: msg, tone: 'error', durationMs: 2500 })
  } finally {
    submitting.value = false
  }
}

function onComposerKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault()
    void submit()
  }
}

const goLogin = () => {
  const redirect = encodeURIComponent(route.fullPath || '/home')
  return navigateTo(`/login?redirect=${redirect}`)
}

onMounted(() => {
  if (!props.autoFocus) return
  void nextTick().then(() => composerTextareaEl.value?.focus?.())
})
</script>

<style scoped>
.composer-media-slot {
  flex: 0 0 auto;
  width: 5rem; /* h-20 / w-20 */
  height: 5rem;
}

.composer-media-move {
  transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.composer-media-enter-active,
.composer-media-leave-active {
  transition: opacity 0.2s ease, transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.composer-media-enter-from,
.composer-media-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.composer-slot-enter-active,
.composer-slot-leave-active {
  transition: opacity 0.14s ease, transform 0.18s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.composer-slot-enter-from,
.composer-slot-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

.moh-drag-ghost {
  position: fixed;
  z-index: 2000;
  pointer-events: none;
  transform: translateZ(0);
  will-change: left, top;
  opacity: 0.98;
}

.moh-upload-indeterminate {
  animation: moh-upload-indeterminate 900ms ease-in-out infinite;
}

@keyframes moh-upload-indeterminate {
  0% {
    transform: translateX(-110%);
  }
  100% {
    transform: translateX(210%);
  }
}
</style>

