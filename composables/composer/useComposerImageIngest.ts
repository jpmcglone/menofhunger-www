import type { Ref } from 'vue'
import type { ComposerMediaItem } from './types'
import { dataTransferHasImages, makeLocalId } from './types'

export function useComposerImageIngest(opts: {
  maxSlots: number
  composerMedia: Ref<ComposerMediaItem[]>
  canAddMoreMedia: Ref<boolean>
  remainingMediaSlots: Ref<number>
  mediaFileInputEl: Ref<HTMLInputElement | null>
  textareaEl?: Ref<HTMLTextAreaElement | null>
  toast: ReturnType<typeof useAppToast>
  processUploadQueue: () => void
}) {
  const MEDIA_SLOTS = Math.max(1, Math.floor(opts.maxSlots))

  function openMediaPicker() {
    if (!opts.canAddMoreMedia.value) return
    opts.mediaFileInputEl.value?.click()
  }

  function addImageFiles(files: File[], source: 'picker' | 'drop' | 'paste') {
    if (!import.meta.client) return
    if (!files.length) return

    const remaining = Math.max(0, MEDIA_SLOTS - opts.composerMedia.value.length)
    if (remaining <= 0) {
      opts.toast.push({ title: `You can attach up to ${MEDIA_SLOTS} images.`, tone: 'public', durationMs: 1600 })
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
      opts.composerMedia.value.push(slot)
    }

    if (files.length > imageFiles.length) {
      const skipped = files.length - imageFiles.length
      if (source !== 'picker') {
        opts.toast.push({
          title: `Added ${imageFiles.length} image${imageFiles.length === 1 ? '' : 's'}.`,
          message: skipped > 0 ? `Ignored ${skipped} extra (max ${MEDIA_SLOTS}).` : undefined,
          tone: 'public',
          durationMs: 1600,
        })
      }
    }

    opts.processUploadQueue()
  }

  async function onMediaFilesSelected(e: Event) {
    if (!import.meta.client) return
    const input = e.target as HTMLInputElement | null
    const files = Array.from(input?.files ?? [])
    if (input) input.value = ''
    if (!files.length) return
    addImageFiles(files, 'picker')
  }

  // Drag + drop overlay state
  const dragOverDepth = ref(0)
  const dropOverlayVisible = ref(false)

  function onComposerDrop(e: DragEvent) {
    if (!import.meta.client) return
    const dt = e.dataTransfer
    if (!dt) return
    const files = Array.from(dt.files ?? [])
    if (!files.length) return
    addImageFiles(files, 'drop')
    opts.textareaEl?.value?.focus?.()
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
    if (!dt) {
      dropOverlayVisible.value = false
      return
    }
    if (!dataTransferHasImages(dt)) {
      dropOverlayVisible.value = false
      return
    }
    try {
      e.preventDefault()
    } catch {
      // ignore
    }
    dropOverlayVisible.value = true
    try {
      dt.dropEffect = opts.remainingMediaSlots.value > 0 ? 'copy' : 'none'
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
    const items = Array.from(cd.items ?? [])
    for (const it of items) {
      if (it.kind !== 'file') continue
      const type = (it.type ?? '').toLowerCase()
      if (!type.startsWith('image/')) continue
      const f = it.getAsFile()
      if (f) out.push(f)
    }

    if (!out.length) {
      out.push(...Array.from(cd.files ?? []).filter(Boolean))
    }

    const hasImage = out.some((f) => ((f.type ?? '').toLowerCase().startsWith('image/')))
    if (!hasImage) return

    try {
      e.preventDefault()
    } catch {
      // ignore
    }
    addImageFiles(out, 'paste')
  }

  return {
    mediaFileInputEl: opts.mediaFileInputEl,
    openMediaPicker,
    onMediaFilesSelected,
    dropOverlayVisible,
    onComposerAreaDragEnter,
    onComposerAreaDragOver,
    onComposerAreaDragLeave,
    onComposerDrop,
    onComposerPaste,
  }
}

