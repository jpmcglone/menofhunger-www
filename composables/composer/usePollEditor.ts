import type { ComposerMediaItem, ComposerPollPayload, CreatePollOptionImagePayload } from '~/composables/composer/types'
import { uploadPollOptionImage } from './pollOptionUpload'

type PollDuration = { days: number; hours: number; minutes: number }
type UploadStatus = 'idle' | 'uploading' | 'processing' | 'done' | 'error'
type LocalOption = {
  id: string
  text: string
  image: CreatePollOptionImagePayload | null
  previewUrl: string | null
  uploadStatus: UploadStatus
  uploadError: string | null
  abortController: AbortController | null
}

/** Poll option editing state, payload emission, and per-option image upload for the composer poll. */
export function usePollEditor(
  props: { modelValue: ComposerPollPayload },
  emit: {
    (e: 'update:modelValue', v: ComposerPollPayload): void
    (e: 'status', v: { uploading: boolean; hasFailed: boolean }): void
  },
) {
  const { apiFetchData } = useApiClient()
  const toast = useAppToast()

  function makeId() {
    try {
      return crypto.randomUUID()
    } catch {
      return `p_${Date.now()}_${Math.random().toString(16).slice(2)}`
    }
  }

  function defaultAltFromFilename(name: string | null | undefined): string | null {
    const raw = (name ?? '').trim()
    if (!raw) return null
    const withoutExt = raw.replace(/\.[a-z0-9]+$/i, '')
    const cleaned = withoutExt.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
    return cleaned || null
  }

  const fileInputEl = ref<HTMLInputElement | null>(null)
  const fileTargetOptionId = ref<string | null>(null)
  const focusedOptionId = ref<string | null>(null)

  const options = ref<LocalOption[]>([])
  const duration = reactive<PollDuration>({
    days: props.modelValue?.duration?.days ?? 1,
    hours: props.modelValue?.duration?.hours ?? 0,
    minutes: props.modelValue?.duration?.minutes ?? 0,
  })

  function slotForOption(opt: LocalOption): { index: number; empty: boolean; item?: ComposerMediaItem } {
    const hasPreview = Boolean(opt.previewUrl)
    if (!hasPreview) return { index: 0, empty: true }
    // Adapter: poll option image -> ComposerMediaItem shape for shared tile rendering
    const mappedStatus: ComposerMediaItem['uploadStatus'] =
      opt.uploadStatus === 'uploading' || opt.uploadStatus === 'processing' || opt.uploadStatus === 'error'
        ? opt.uploadStatus
        : 'done'
    return {
      index: 0,
      empty: false,
      item: {
        localId: opt.id,
        source: 'upload',
        kind: 'image',
        previewUrl: opt.previewUrl!,
        altText: opt.image?.alt ?? null,
        uploadStatus: mappedStatus,
        uploadError: opt.uploadError ?? null,
        uploadProgress: null,
      },
    }
  }

  function pollUploadStatusLabel(m: ComposerMediaItem): string | null {
    // Mirror composer media labels
    if (!m || m.source !== 'upload') return null
    if (m.uploadStatus === 'error') return 'Failed'
    if (m.uploadStatus === 'uploading' || m.uploadStatus === 'processing') return 'Uploading'
    return null
  }

  watch(
    () => duration.days,
    (d) => {
      if (d === 7) {
        duration.hours = 0
        duration.minutes = 0
      }
      emitPayload()
    },
  )
  watch(() => duration.hours, () => emitPayload())
  watch(() => duration.minutes, () => emitPayload())

  const dayOptions = computed(() => Array.from({ length: 8 }, (_, i) => ({ label: `${i}d`, value: i })))
  const hourOptions = computed(() => Array.from({ length: 24 }, (_, i) => ({ label: `${i}h`, value: i })))
  const minuteOptions = computed(() => {
    const vals = [0, 5, 10, 15, 30, 45]
    return vals.map((v) => ({ label: `${v}m`, value: v }))
  })

  function onOptionFocus(id: string) {
    focusedOptionId.value = id
  }
  function onOptionBlur(id: string) {
    if (focusedOptionId.value === id) focusedOptionId.value = null
  }
  function isOptionFocused(id: string) {
    return focusedOptionId.value === id
  }
  function shouldShowChoiceHeader(id: string, text: string) {
    return isOptionFocused(id) || Boolean((text ?? '').trim())
  }

  function emitStatus() {
    const uploading = options.value.some((o) => o.uploadStatus === 'uploading' || o.uploadStatus === 'processing')
    const hasFailed = options.value.some((o) => o.uploadStatus === 'error')
    emit('status', { uploading, hasFailed })
  }

  function emitPayload() {
    emitStatus()
    emit('update:modelValue', {
      duration: {
        days: Math.max(0, Math.min(7, Math.floor(duration.days || 0))),
        hours: Math.max(0, Math.min(23, Math.floor(duration.hours || 0))),
        minutes: Math.max(0, Math.min(59, Math.floor(duration.minutes || 0))),
      },
      options: options.value
        .map((o, idx) => ({ o, idx }))
        .filter(({ o, idx }) => {
          if (idx < 2) return true
          const hasText = Boolean((o.text ?? '').trim())
          const hasImage = Boolean(o.image || o.previewUrl)
          return hasText || hasImage
        })
        .map(({ o }) => ({ text: (o.text ?? '').slice(0, 30), image: o.image ?? null })),
    })
  }

  function syncFromModel() {
    const incoming = props.modelValue
    const incomingOpts = Array.isArray(incoming?.options) ? incoming.options : []
    const next: LocalOption[] = []
    for (let i = 0; i < Math.min(5, incomingOpts.length || 0); i++) {
      const it = incomingOpts[i]!
      next.push({
        id: makeId(),
        text: String(it.text ?? '').slice(0, 30),
        image: it.image ?? null,
        previewUrl: null,
        uploadStatus: it.image ? 'done' : 'idle',
        uploadError: null,
        abortController: null,
      })
    }
    if (next.length < 2) {
      while (next.length < 2) {
        next.push({
          id: makeId(),
          text: '',
          image: null,
          previewUrl: null,
          uploadStatus: 'idle',
          uploadError: null,
          abortController: null,
        })
      }
    }
    options.value = next
    duration.days = incoming?.duration?.days ?? duration.days
    duration.hours = incoming?.duration?.hours ?? duration.hours
    duration.minutes = incoming?.duration?.minutes ?? duration.minutes
    if (duration.days === 7) {
      duration.hours = 0
      duration.minutes = 0
    }
    emitPayload()
  }

  watch(
    () => props.modelValue,
    () => {
      // Only resync when the parent resets the payload shape (e.g., on add/remove poll)
      if (!options.value.length) syncFromModel()
    },
    { immediate: true },
  )

  function addOption() {
    if (options.value.length >= 5) return
    options.value.push({
      id: makeId(),
      text: '',
      image: null,
      previewUrl: null,
      uploadStatus: 'idle',
      uploadError: null,
      abortController: null,
    })
    emitPayload()
  }

  function removeOption(id: string) {
    if (options.value.length <= 2) return
    const idx = options.value.findIndex((o) => o.id === id)
    if (idx < 0) return
    if (idx < 2) return
    removeOptionImage(id)
    options.value.splice(idx, 1)
    emitPayload()
  }

  function optionHasContent(opt: LocalOption) {
    const hasText = Boolean((opt.text ?? '').trim())
    const hasImage = Boolean(opt.image || opt.previewUrl)
    return hasText || hasImage
  }

  function onRemoveOptionClick(optionId: string) {
    const idx = options.value.findIndex((o) => o.id === optionId)
    if (idx < 2) return
    const opt = options.value[idx]
    if (!opt) return

    if (!optionHasContent(opt)) {
      removeOption(optionId)
      return
    }

    // Lightweight confirmation (keeps current component style; no new modal dependency).
    const ok = window.confirm('Remove this option? This cannot be undone.')
    if (!ok) return
    removeOption(optionId)
  }

  function updateOptionText(id: string, text: string) {
    const idx = options.value.findIndex((o) => o.id === id)
    if (idx < 0) return
    options.value[idx] = { ...options.value[idx]!, text: String(text ?? '').slice(0, 30) }
    emitPayload()
  }

  function onClickPickImage(optionId: string) {
    fileTargetOptionId.value = optionId
    const input = fileInputEl.value
    if (!input) return
    input.value = ''
    input.click()
  }

  function revokePreviewUrl(url: string | null) {
    if (!url) return
    if (!url.startsWith('blob:')) return
    try {
      URL.revokeObjectURL(url)
    } catch {
      // ignore
    }
  }

  function removeOptionImage(optionId: string) {
    const idx = options.value.findIndex((o) => o.id === optionId)
    if (idx < 0) return
    const cur = options.value[idx]!
    try {
      cur.abortController?.abort?.()
    } catch {
      // ignore
    }
    revokePreviewUrl(cur.previewUrl)
    options.value[idx] = {
      ...cur,
      image: null,
      previewUrl: null,
      uploadStatus: 'idle',
      uploadError: null,
      abortController: null,
    }
    emitPayload()
  }

  async function uploadImageForOption(optionId: string, file: File) {
    const idx = options.value.findIndex((o) => o.id === optionId)
    if (idx < 0) return
    const controller = new AbortController()
    const ct = (file.type ?? '').toLowerCase().trim()
    if (!ct.startsWith('image/')) return
    if (ct === 'image/gif') {
      toast.push({ title: 'GIFs are not allowed in poll options.', tone: 'error', durationMs: 2000 })
      return
    }

    // Reset existing image (abort + cleanup)
    removeOptionImage(optionId)

    const previewUrl = URL.createObjectURL(file)
    options.value[idx] = {
      ...options.value[idx]!,
      previewUrl,
      uploadStatus: 'uploading',
      uploadError: null,
      abortController: controller,
    }
    emitPayload()

    try {
      const committed = await uploadPollOptionImage(file, {
        apiFetchData,
        signal: controller.signal,
        onProcessing: () => {
          options.value[idx] = { ...options.value[idx]!, uploadStatus: 'processing' }
          emitPayload()
        },
      })
      options.value[idx] = {
        ...options.value[idx]!,
        uploadStatus: 'done',
        abortController: null,
        image: {
          source: 'upload',
          kind: 'image',
          r2Key: committed.key,
          width: committed.width,
          height: committed.height,
          alt: defaultAltFromFilename(committed.fileName),
        },
      }
      emitPayload()
    } catch (err: unknown) {
      if (controller.signal.aborted) return
      const msg = String((err as { message?: unknown } | null)?.message ?? err) || 'Upload failed.'
      options.value[idx] = { ...options.value[idx]!, uploadStatus: 'error', uploadError: msg, abortController: null }
      emitPayload()
    }
  }

  function onFileSelected(e: Event) {
    const optionId = fileTargetOptionId.value
    fileTargetOptionId.value = null
    const input = e.target as HTMLInputElement | null
    const file = input?.files?.[0] ?? null
    if (!optionId || !file) return
    void uploadImageForOption(optionId, file)
  }

  onBeforeUnmount(() => {
    for (const o of options.value) {
      try {
        o.abortController?.abort?.()
      } catch {
        // ignore
      }
      revokePreviewUrl(o.previewUrl)
    }
  })

  return {
    fileInputEl,
    options,
    duration,
    slotForOption,
    pollUploadStatusLabel,
    dayOptions,
    hourOptions,
    minuteOptions,
    onOptionFocus,
    onOptionBlur,
    isOptionFocused,
    shouldShowChoiceHeader,
    addOption,
    onRemoveOptionClick,
    updateOptionText,
    onClickPickImage,
    removeOptionImage,
    onFileSelected,
  }
}
