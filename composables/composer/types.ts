import type { PostMediaKind, PostMediaSource } from '~/types/api'

export type UploadStatus = 'queued' | 'uploading' | 'processing' | 'done' | 'error'

export type CreateMediaPayload =
  | {
      source: 'upload'
      kind: 'image' | 'gif'
      r2Key: string
      width: number | null
      height: number | null
    }
  | {
      source: 'upload'
      kind: 'video'
      r2Key: string
      thumbnailR2Key?: string | null
      width: number | null
      height: number | null
      durationSeconds: number | null
    }
  | {
      source: 'giphy'
      kind: 'gif'
      url: string
      mp4Url: string | null
      width: number | null
      height: number | null
    }

export type ComposerMediaItem = {
  localId: string
  source: PostMediaSource
  kind: PostMediaKind
  previewUrl: string
  r2Key?: string
  thumbnailR2Key?: string | null
  url?: string
  mp4Url?: string | null
  width?: number | null
  height?: number | null
  durationSeconds?: number | null
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

export function dataTransferHasImages(dt: DataTransfer | null): boolean {
  if (!dt) return false
  const items = Array.from(dt.items ?? [])
  if (items.some((it) => it.kind === 'file' && (it.type ?? '').toLowerCase().startsWith('image/'))) return true
  const files = Array.from(dt.files ?? [])
  if (files.some((f) => ((f.type ?? '').toLowerCase().startsWith('image/')))) return true
  return false
}

export function dataTransferHasMedia(dt: DataTransfer | null, includeVideo: boolean): boolean {
  if (!dt) return false
  const items = Array.from(dt.items ?? [])
  if (items.some((it) => it.kind === 'file' && (it.type ?? '').toLowerCase().startsWith('image/'))) return true
  if (includeVideo && items.some((it) => it.kind === 'file' && (it.type ?? '').toLowerCase() === 'video/mp4')) return true
  const files = Array.from(dt.files ?? [])
  if (files.some((f) => ((f.type ?? '').toLowerCase().startsWith('image/')))) return true
  if (includeVideo && files.some((f) => ((f.type ?? '').toLowerCase() === 'video/mp4'))) return true
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

