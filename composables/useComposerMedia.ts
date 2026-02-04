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
  /** When true, file picker and drop/paste accept video/mp4 (premium-only). */
  canAcceptVideo?: Ref<boolean>
  /** Called when non-premium user tries to add video; show premium-required modal. */
  onVideoRejectedNeedPremium?: () => void
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
    if (import.meta.dev) {
      console.log('[moh:video] patchComposerMedia', { localId, idx, patchKeys: Object.keys(patch ?? {}) })
    }
    if (idx < 0) {
      if (import.meta.dev) console.warn('[moh:video] patchComposerMedia: slot not found', { localId })
      return
    }
    const cur = composerMedia.value[idx]
    if (!cur) return
    // Replace array so Vue ref reactivity triggers (in-place mutation doesn't)
    composerMedia.value = composerMedia.value.map((m, i) =>
      i === idx ? { ...m, ...patch } : m,
    )
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
    patchComposerMedia,
    canAcceptVideo: opts?.canAcceptVideo,
    onVideoRejectedNeedPremium: opts?.onVideoRejectedNeedPremium,
  })

  const giphy = useComposerGiphyPicker({ composerMedia, canAddMoreMedia, apiFetchData })

  function toCreatePayload(media: ComposerMediaItem[]): CreateMediaPayload[] {
    const out: CreateMediaPayload[] = []
    for (const m of media) {
      if (m.source === 'upload') {
        // Only include uploads that completed successfully (have r2Key). Skip failed/rejected (e.g. video when not premium).
        if (!m.r2Key) continue
        if (m.kind === 'video') {
          out.push({
            source: 'upload',
            kind: 'video',
            r2Key: m.r2Key,
            thumbnailR2Key: m.thumbnailR2Key ?? undefined,
            width: typeof m.width === 'number' ? m.width : null,
            height: typeof m.height === 'number' ? m.height : null,
            durationSeconds: typeof m.durationSeconds === 'number' ? m.durationSeconds : null,
            alt: (m.altText ?? '').trim() || null,
          })
        } else {
          out.push({
            source: 'upload',
            kind: m.kind === 'gif' ? 'gif' : 'image',
            r2Key: m.r2Key,
            width: typeof m.width === 'number' ? m.width : null,
            height: typeof m.height === 'number' ? m.height : null,
            alt: (m.altText ?? '').trim() || null,
          })
        }
      } else if (m.source === 'giphy') {
        if (!m.url) continue
        out.push({
          source: 'giphy',
          kind: 'gif',
          url: m.url,
          mp4Url: m.mp4Url ?? null,
          width: typeof m.width === 'number' ? m.width : null,
          height: typeof m.height === 'number' ? m.height : null,
          alt: (m.altText ?? '').trim() || null,
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
    patchComposerMedia,
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

