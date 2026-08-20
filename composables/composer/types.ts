import type { PostMediaKind, PostMediaSource } from '~/types/api'

export type UploadStatus = 'queued' | 'compressing' | 'uploading' | 'processing' | 'done' | 'error'

export type CreatePollOptionImagePayload = {
  source: 'upload'
  kind: 'image'
  r2Key: string
  width: number | null
  height: number | null
  alt: string | null
}

export type ComposerPollPayload = {
  options: Array<{ text: string; image: CreatePollOptionImagePayload | null }>
  duration: { days: number; hours: number; minutes: number }
}

export type CreateMediaPayload =
  | {
      /** Reference existing media from an only-me source post (publish-from-only-me flow). */
      source: 'existing'
      id: string
      alt?: string | null
    }
  | {
      source: 'upload'
      kind: 'image' | 'gif'
      r2Key: string
      width: number | null
      height: number | null
      alt?: string | null
    }
  | {
      source: 'upload'
      kind: 'video'
      r2Key: string
      thumbnailR2Key?: string | null
      width: number | null
      height: number | null
      durationSeconds: number | null
      alt?: string | null
    }
  | {
      source: 'giphy'
      kind: 'gif'
      url: string
      mp4Url: string | null
      width: number | null
      height: number | null
      alt?: string | null
    }

export type ComposerMediaItem = {
  localId: string
  source: PostMediaSource
  kind: PostMediaKind
  previewUrl: string
  /** When present, this media is an existing item from a source post (e.g. only-me draft). */
  existingId?: string
  r2Key?: string
  thumbnailR2Key?: string | null
  url?: string
  mp4Url?: string | null
  width?: number | null
  height?: number | null
  durationSeconds?: number | null
  altText?: string | null
  uploadStatus?: UploadStatus
  uploadError?: string | null
  file?: File | null
  /** Video first-frame thumbnail blob for upload (not persisted after commit). */
  thumbnailBlob?: Blob | null
  abortController?: AbortController | null
  uploadProgress?: number | null
}

export function makeLocalId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `m_${Date.now()}_${Math.random().toString(16).slice(2)}`
  }
}

export function isComposerVideoType(type: string | null | undefined): boolean {
  const contentType = (type ?? '').toLowerCase().trim()
  return contentType === 'video/mp4'
    || contentType === 'video/quicktime'
    || contentType === 'video/webm'
    || contentType === 'video/x-m4v'
}

export function isComposerMediaType(type: string | null | undefined): boolean {
  const contentType = (type ?? '').toLowerCase()
  return contentType.startsWith('image/') || isComposerVideoType(contentType)
}

/** Rich copies (web pages, Docs) attach a bitmap *and* text. Text always wins. */
export function clipboardHasPlainText(
  dt: { getData: (type: string) => string } | null | undefined,
): boolean {
  return Boolean(dt?.getData('text/plain')?.trim())
}

export function collectMediaFiles(dt: DataTransfer | null): File[] {
  if (!dt) return []
  const fromItems: File[] = []
  for (const item of Array.from(dt.items ?? [])) {
    if (item.kind !== 'file' || !isComposerMediaType(item.type)) continue
    const file = item.getAsFile()
    if (file) fromItems.push(file)
  }
  if (fromItems.length) return fromItems
  return Array.from(dt.files ?? []).filter((file) => isComposerMediaType(file.type))
}

export function dataTransferHasImages(dt: DataTransfer | null): boolean {
  if (!dt) return false
  const items = Array.from(dt.items ?? [])
  if (items.some((it) => it.kind === 'file' && (it.type ?? '').toLowerCase().startsWith('image/'))) return true
  const files = Array.from(dt.files ?? [])
  if (files.some((f) => ((f.type ?? '').toLowerCase().startsWith('image/')))) return true
  return false
}

export function dataTransferHasMedia(
  dt: DataTransfer | null,
  opts: { includeImages: boolean; includeVideo: boolean },
): boolean {
  if (!dt) return false

  const items = Array.from(dt.items ?? [])
  if (opts.includeImages && items.some((it) => it.kind === 'file' && (it.type ?? '').toLowerCase().startsWith('image/'))) return true
  if (opts.includeVideo && items.some((it) => it.kind === 'file' && isComposerVideoType(it.type))) return true
  const files = Array.from(dt.files ?? [])
  if (opts.includeImages && files.some((f) => ((f.type ?? '').toLowerCase().startsWith('image/')))) return true
  if (opts.includeVideo && files.some((f) => isComposerVideoType(f.type))) return true
  return false
}

export function reorderInsertAt<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return arr.slice()
  const item = arr[fromIndex]
  if (!item) return arr.slice()
  const rest = arr.filter((_, i) => i !== fromIndex)
  const insertAt = toIndex > fromIndex ? toIndex - 1 : toIndex
  rest.splice(insertAt, 0, item)
  return rest
}

