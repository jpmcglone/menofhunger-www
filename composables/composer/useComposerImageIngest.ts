import { computed, type Ref } from 'vue'
import type { ComposerMediaItem } from './types'
import { dataTransferHasMedia, makeLocalId } from './types'
import { appConfig } from '~/config/app'

export function useComposerImageIngest(opts: {
  maxSlots: number
  composerMedia: Ref<ComposerMediaItem[]>
  canAddMoreMedia: Ref<boolean>
  remainingMediaSlots: Ref<number>
  mediaFileInputEl: Ref<HTMLInputElement | null>
  textareaEl?: Ref<HTMLTextAreaElement | null>
  toast: ReturnType<typeof useAppToast>
  processUploadQueue: () => void
  /** Patch a composer media item by localId (used to update slot during upload). */
  patchComposerMedia: (localId: string, patch: Partial<ComposerMediaItem>) => void
  /** When true, accept images/GIFs (premium-only in our product rules). */
  canAcceptImages?: Ref<boolean>
  /** When true, also accept videos (premium-only). */
  canAcceptVideo?: Ref<boolean>
  /** Called when user tries to add media but is not premium; show modal and reject. */
  onMediaRejectedNeedPremium?: () => void
}) {
  const MEDIA_SLOTS = Math.max(1, Math.floor(opts.maxSlots))
  const canAcceptImages = opts.canAcceptImages ?? computed(() => true)
  const canAcceptVideo = opts.canAcceptVideo ?? computed(() => false)

  const isAllowedVideoType = (t: string | null | undefined) => {
    const ct = (t ?? '').toLowerCase().trim()
    return ct === 'video/mp4' || ct === 'video/quicktime' || ct === 'video/webm' || ct === 'video/x-m4v'
  }

  const formatBytes = (n: number) => {
    const bytes = Math.max(0, Math.floor(n || 0))
    const mb = bytes / (1024 * 1024)
    if (mb < 1024) return `${Math.round(mb)}MB`
    return `${(mb / 1024).toFixed(1)}GB`
  }

  function defaultAltFromFilename(name: string | null | undefined): string | null {
    const raw = (name ?? '').trim()
    if (!raw) return null
    const withoutExt = raw.replace(/\.[a-z0-9]+$/i, '')
    const cleaned = withoutExt.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
    return cleaned || null
  }

  function openMediaPicker() {
    if (!opts.canAddMoreMedia.value) return
    if (!canAcceptImages.value && !canAcceptVideo.value) {
      opts.onMediaRejectedNeedPremium?.()
      return
    }
    const input = opts.mediaFileInputEl.value
    if (!input) return

    // iOS Safari shows the "prev/next/done" accessory bar when multiple form inputs exist.
    // Keeping the file input disabled except during an actual picker open reduces that noise.
    input.disabled = false
    input.click()

    // When the picker closes (cancel or select), focus returns to the page; disable the input again.
    const disable = () => {
      try {
        input.disabled = true
      } catch {
        // ignore
      }
    }
    window.addEventListener('focus', disable, { once: true })
  }

  function addImageFiles(files: File[], source: 'picker' | 'drop' | 'paste') {
    if (!import.meta.client) return
    if (!files.length) return

    const remaining = Math.max(0, MEDIA_SLOTS - opts.composerMedia.value.length)
    if (remaining <= 0) {
      opts.toast.push({ title: `You can attach up to ${MEDIA_SLOTS} images or videos.`, tone: 'public', durationMs: 1600 })
      return
    }

    const imageFiles = files
      .filter(Boolean)
      .filter((f) => ((f.type ?? '').toLowerCase().startsWith('image/')))
      .slice(0, remaining)

    const rawVideoFiles = files
      .filter(Boolean)
      .filter((f) => isAllowedVideoType(f.type))
      .slice(0, remaining - imageFiles.length)

    if (imageFiles.length > 0 && !canAcceptImages.value) {
      opts.onMediaRejectedNeedPremium?.()
    }
    if (rawVideoFiles.length > 0 && !canAcceptVideo.value) {
      opts.onMediaRejectedNeedPremium?.()
    }

    const allowedImages = canAcceptImages.value ? imageFiles : []
    const videoFiles = canAcceptVideo.value ? rawVideoFiles : []

    const added: Promise<void>[] = []

    for (const file of allowedImages) {
      const ct = (file.type ?? '').toLowerCase()
      const previewUrl = URL.createObjectURL(file)
      const localId = makeLocalId()

      const slot: ComposerMediaItem = {
        localId,
        source: 'upload',
        kind: ct === 'image/gif' ? 'gif' : 'image',
        previewUrl,
        altText: defaultAltFromFilename(file.name),
        uploadStatus: 'queued',
        uploadError: null,
        file,
        abortController: null,
        uploadProgress: 0,
      }
      opts.composerMedia.value.push(slot)
    }

    for (const file of videoFiles) {
      if (opts.composerMedia.value.length >= MEDIA_SLOTS) break
      const p = addVideoFile(file, source)
      added.push(p)
    }

    if (added.length) {
      void Promise.all(added).then(() => opts.processUploadQueue())
    } else {
      opts.processUploadQueue()
    }

    if (imageFiles.length || videoFiles.length) {
      const skipped = files.length - imageFiles.length - videoFiles.length
      if (source !== 'picker' && skipped > 0) {
        opts.toast.push({
          title: `Added ${imageFiles.length + videoFiles.length} item${imageFiles.length + videoFiles.length === 1 ? '' : 's'}.`,
          message: skipped > 0 ? `Ignored ${skipped} extra (max ${MEDIA_SLOTS}).` : undefined,
          tone: 'public',
          durationMs: 1600,
        })
      }
    }
  }

  async function addVideoFile(file: File, _source: 'picker' | 'drop' | 'paste') {
    const { user } = useAuth()
    const u = user.value
    if (!u?.premium && !u?.premiumPlus) {
      opts.toast.push({ title: 'Video uploads are for premium members only.', tone: 'error', durationMs: 2200 })
      return
    }

    const limits = u.premiumPlus ? appConfig.video.premiumPlus : appConfig.video.premium
    const { maxDurationSeconds, maxBytes } = limits
    if (file.size > maxBytes) {
      opts.toast.push({
        title: `Video is too large (max ${formatBytes(maxBytes)}).`,
        message: 'Try trimming it, or export at 1080p and try again.',
        tone: 'error',
        durationMs: 2600,
      })
      return
    }

    const meta = await getVideoMetadata(file)
    if (!meta) {
      opts.toast.push({ title: 'Could not read video.', tone: 'error', durationMs: 2200 })
      return
    }
    if (meta.durationSeconds > maxDurationSeconds) {
      const limitLabel = maxDurationSeconds >= 60 ? `${Math.round(maxDurationSeconds / 60)} minutes or shorter` : `${maxDurationSeconds}s or shorter`
      opts.toast.push({ title: `Video must be ${limitLabel}.`, tone: 'error', durationMs: 2200 })
      return
    }

    const localId = makeLocalId()
    const previewUrl = meta.posterBlobUrl ?? URL.createObjectURL(file)
    const slot: ComposerMediaItem = {
      localId,
      source: 'upload',
      kind: 'video',
      previewUrl,
      altText: defaultAltFromFilename(file.name),
      uploadStatus: 'queued',
      uploadError: null,
      file,
      thumbnailBlob: meta.posterBlob ?? null,
      abortController: null,
      uploadProgress: 0,
      width: meta.width ?? null,
      height: meta.height ?? null,
      durationSeconds: meta.durationSeconds ?? null,
    }
    opts.composerMedia.value.push(slot)
  }

  function getVideoMetadata(file: File): Promise<{ width: number; height: number; durationSeconds: number; posterBlobUrl?: string; posterBlob?: Blob } | null> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file)
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.muted = true
      video.playsInline = true

      const cleanup = () => {
        video.src = ''
        URL.revokeObjectURL(url)
      }

      function onSeeked() {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(video, 0, 0)
            canvas.toBlob(
              (blob) => {
                const posterBlobUrl = blob ? URL.createObjectURL(blob) : undefined
                resolve({
                  width: video.videoWidth,
                  height: video.videoHeight,
                  durationSeconds: Math.floor(video.duration),
                  posterBlobUrl,
                  posterBlob: blob ?? undefined,
                })
                cleanup()
              },
              'image/jpeg',
              0.85,
            )
          } else {
            resolve({
              width: video.videoWidth,
              height: video.videoHeight,
              durationSeconds: Math.floor(video.duration),
            })
            cleanup()
          }
        } catch {
          resolve({
            width: video.videoWidth,
            height: video.videoHeight,
            durationSeconds: Math.floor(video.duration),
          })
          cleanup()
        }
      }

      video.addEventListener('seeked', onSeeked, { once: true })

      function onMeta() {
        const w = video.videoWidth || 0
        const h = video.videoHeight || 0
        if (!w || !h) {
          resolve(null)
          cleanup()
          return
        }
        video.currentTime = 0
      }

      function onErr() {
        resolve(null)
        cleanup()
      }

      video.addEventListener('loadedmetadata', onMeta, { once: true })
      video.addEventListener('error', onErr, { once: true })
      video.src = url
    })
  }

  async function onMediaFilesSelected(e: Event) {
    if (!import.meta.client) return
    const input = e.target as HTMLInputElement | null
    const files = Array.from(input?.files ?? [])
    if (input) {
      input.value = ''
      // Restore disabled state (see openMediaPicker()).
      input.disabled = true
    }
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
    if (!dataTransferHasMedia(dt, { includeImages: canAcceptImages.value, includeVideo: canAcceptVideo.value })) return
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
    if (!dataTransferHasMedia(dt, { includeImages: canAcceptImages.value, includeVideo: canAcceptVideo.value })) {
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
    if (!dataTransferHasMedia(dt, { includeImages: canAcceptImages.value, includeVideo: canAcceptVideo.value })) return
    dragOverDepth.value = Math.max(0, dragOverDepth.value - 1)
    if (dragOverDepth.value === 0) dropOverlayVisible.value = false
  }

  function onComposerPaste(e: ClipboardEvent) {
    if (!import.meta.client) return
    const cd = e.clipboardData
    if (!cd) return

    const out: File[] = []
    let rejectedNeedPremium = false
    const items = Array.from(cd.items ?? [])
    for (const it of items) {
      if (it.kind !== 'file') continue
      const type = (it.type ?? '').toLowerCase()
      if (type.startsWith('image/') && !canAcceptImages.value) {
        rejectedNeedPremium = true
        continue
      }
      if (!type.startsWith('image/') && !(canAcceptVideo.value && type === 'video/mp4')) continue
      const f = it.getAsFile()
      if (f) out.push(f)
    }
    if (rejectedNeedPremium) {
      opts.onMediaRejectedNeedPremium?.()
      return
    }

    if (!out.length) {
      out.push(...Array.from(cd.files ?? []).filter(Boolean))
    }

    const hasImage = out.some((f) => ((f.type ?? '').toLowerCase().startsWith('image/')))
    const hasVideo = canAcceptVideo.value && out.some((f) => ((f.type ?? '').toLowerCase() === 'video/mp4'))
    if (!hasImage && !hasVideo) return

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

