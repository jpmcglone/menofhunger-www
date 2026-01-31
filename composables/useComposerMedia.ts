import type { Ref } from 'vue'
export type { CreateMediaPayload, ComposerMediaItem, UploadStatus } from '~/composables/composer/types'
import type { CreateMediaPayload, ComposerMediaItem } from '~/composables/composer/types'
import { useComposerDragReorder } from '~/composables/composer/useComposerDragReorder'
import { useComposerUploads } from '~/composables/composer/useComposerUploads'
import { useComposerImageIngest } from '~/composables/composer/useComposerImageIngest'
import { useComposerGiphyPicker } from '~/composables/composer/useComposerGiphyPicker'

export function useComposerMedia(opts?: {
  maxSlots?: number
  textareaEl?: Ref<HTMLTextAreaElement | null>
}) {
  const { apiFetchData } = useApiClient()
  const toast = useAppToast()

  const MEDIA_SLOTS = typeof opts?.maxSlots === 'number' ? Math.max(1, Math.floor(opts.maxSlots)) : 4

  const composerMedia = ref<ComposerMediaItem[]>([])
  const canAddMoreMedia = computed(() => composerMedia.value.length < MEDIA_SLOTS)
  const remainingMediaSlots = computed(() => Math.max(0, MEDIA_SLOTS - composerMedia.value.length))

  const drag = useComposerDragReorder({ composerMedia, maxSlots: MEDIA_SLOTS })

  const composerUploading = computed(() => {
    return composerMedia.value.some((m) => {
      if (m.source !== 'upload') return false
      return m.uploadStatus === 'queued' || m.uploadStatus === 'uploading' || m.uploadStatus === 'processing'
    })
  })

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

  function composerUploadStatusLabel(m: ComposerMediaItem): string | null {
    if (m.source !== 'upload') return null
    if (m.uploadStatus === 'error') return 'Failed'
    // Only ever expose "Uploading" for loading states (queued/uploading/processing) – no "Processing" text.
    if (m.uploadStatus === 'queued' || m.uploadStatus === 'uploading' || m.uploadStatus === 'processing') return 'Uploading'
    return null
  }

  const { processUploadQueue } = useComposerUploads({ composerMedia, patchComposerMedia, apiFetchData, concurrency: 3 })

  const mediaFileInputEl = ref<HTMLInputElement | null>(null)
  const ingest = useComposerImageIngest({
    maxSlots: MEDIA_SLOTS,
    composerMedia,
    canAddMoreMedia,
    remainingMediaSlots,
    mediaFileInputEl,
    textareaEl: opts?.textareaEl,
    toast,
    processUploadQueue,
  })

  const giphy = useComposerGiphyPicker({ composerMedia, canAddMoreMedia, apiFetchData })

  function toCreatePayload(media: ComposerMediaItem[]): CreateMediaPayload[] {
    const out: CreateMediaPayload[] = []
    for (const m of media) {
      if (m.source === 'upload') {
        if (!m.r2Key) continue
        out.push({
          source: 'upload',
          kind: m.kind === 'gif' ? 'gif' : 'image',
          r2Key: m.r2Key,
          width: typeof m.width === 'number' ? m.width : null,
          height: typeof m.height === 'number' ? m.height : null,
        })
      } else if (m.source === 'giphy') {
        if (!m.url) continue
        out.push({
          source: 'giphy',
          kind: 'gif',
          url: m.url,
          mp4Url: m.mp4Url ?? null,
          width: typeof m.width === 'number' ? m.width : null,
          height: typeof m.height === 'number' ? m.height : null,
        })
      }
    }
    return out
  }

  function clearAll() {
    // revoke object URLs
    for (const m of composerMedia.value) {
      if (m.source === 'upload' && m.previewUrl?.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(m.previewUrl)
        } catch {
          // ignore
        }
      }
      try {
        m.abortController?.abort?.()
      } catch {
        // ignore
      }
    }
    composerMedia.value = []
  }

  return {
    MEDIA_SLOTS,
    composerMedia,
    canAddMoreMedia,
    remainingMediaSlots,
    displaySlots: drag.displaySlots,
    firstEmptySlotIndex: drag.firstEmptySlotIndex,
    composerUploading,
    composerUploadStatusLabel,
    mediaFileInputEl,
    openMediaPicker: ingest.openMediaPicker,
    onMediaFilesSelected: ingest.onMediaFilesSelected,
    removeComposerMedia,
    draggingMediaId: drag.draggingMediaId,
    dragGhost: drag.dragGhost,
    dragGhostStyle: drag.dragGhostStyle,
    dropOverlayVisible: ingest.dropOverlayVisible,
    onComposerAreaDragEnter: ingest.onComposerAreaDragEnter,
    onComposerAreaDragOver: ingest.onComposerAreaDragOver,
    onComposerAreaDragLeave: ingest.onComposerAreaDragLeave,
    onComposerDrop: ingest.onComposerDrop,
    onComposerPaste: ingest.onComposerPaste,
    onMediaTilePointerDown: drag.onMediaTilePointerDown,
    giphyOpen: giphy.giphyOpen,
    giphyQuery: giphy.giphyQuery,
    giphyLoading: giphy.giphyLoading,
    giphyError: giphy.giphyError,
    giphyItems: giphy.giphyItems,
    giphyInputRef: giphy.giphyInputRef,
    openGiphyPicker: giphy.openGiphyPicker,
    searchGiphy: giphy.searchGiphy,
    selectGiphyGif: giphy.selectGiphyGif,
    toCreatePayload,
    clearAll,
  }
}

