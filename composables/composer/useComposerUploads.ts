import type { Ref } from 'vue'
import type { PostMediaKind } from '~/types/api'
import type { ComposerMediaItem } from './types'

const CHUNK_SIZE = 256 * 1024 // 256KB for hash chunks

async function computeFileSha256(file: File): Promise<string> {
  // NOTE: This reads the whole file into memory. Do NOT use this for large videos.
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function useComposerUploads(opts: {
  composerMedia: Ref<ComposerMediaItem[]>
  patchComposerMedia: (localId: string, patch: Partial<ComposerMediaItem>) => void
  apiFetchData: <T>(url: string, init: any) => Promise<T>
  concurrency?: number
}) {
  const uploadWorkerRunning = ref(false)
  const uploadInFlight = ref(0)
  const UPLOAD_CONCURRENCY = typeof opts.concurrency === 'number' ? Math.max(1, Math.floor(opts.concurrency)) : 3
  const MAX_HASH_BYTES = 24 * 1024 * 1024 // 24MB (avoid memory blowups on large files)

  async function uploadOne(id: string) {
    const next = opts.composerMedia.value.find((m) => m.localId === id) ?? null
    if (!next || next.source !== 'upload' || next.uploadStatus !== 'queued') return
    const file = next.file
    if (!file) {
      opts.patchComposerMedia(id, { uploadStatus: 'error', uploadError: 'Missing file.' })
      return
    }

    const controller = new AbortController()
    opts.patchComposerMedia(id, { uploadStatus: 'uploading', uploadError: null, abortController: controller, uploadProgress: 0 })

    try {
      let thumbnailKey: string | undefined
      if (next.kind === 'video' && next.thumbnailBlob) {
        const thumbInit = await opts.apiFetchData<{ key: string; uploadUrl?: string; headers: Record<string, string> }>(
          '/uploads/post-media/init',
          {
            method: 'POST',
            body: { contentType: 'image/jpeg', purpose: 'thumbnail' },
            signal: controller.signal,
          },
        )
        if (thumbInit.uploadUrl) {
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest()
            xhr.open('PUT', thumbInit.uploadUrl!)
            for (const [k, v] of Object.entries(thumbInit.headers ?? {})) {
              try {
                xhr.setRequestHeader(k, v)
              } catch {
                // ignore
              }
            }
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) resolve()
              else reject(new Error('Thumbnail upload failed.'))
            }
            xhr.onerror = () => reject(new Error('Thumbnail upload failed.'))
            xhr.onabort = () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }))
            controller.signal.addEventListener('abort', () => { try { xhr.abort() } catch { /* ignore */ } }, { once: true })
            xhr.send(next.thumbnailBlob!)
          })
        }
        thumbnailKey = thumbInit.key
      }

      const shouldHash = next.kind !== 'video' && file.size <= MAX_HASH_BYTES
      const contentHash = shouldHash ? await computeFileSha256(file) : undefined
      const initBody: { contentType: string; contentHash?: string; purpose?: 'post' | 'thumbnail' } = {
        contentType: file.type,
        ...(contentHash ? { contentHash } : {}),
      }
      const init = await opts.apiFetchData<{
        key: string
        uploadUrl?: string
        headers: Record<string, string>
        maxBytes?: number
        skipUpload?: boolean
      }>('/uploads/post-media/init', {
        method: 'POST',
        body: initBody,
        signal: controller.signal,
      })

      const maxBytes = typeof init.maxBytes === 'number' ? init.maxBytes : null
      if (maxBytes && file.size > maxBytes) {
        const mb = Math.round(maxBytes / (1024 * 1024))
        throw new Error(`File is too large (max ${mb}MB). Try trimming it or exporting at 1080p.`)
      }

      if (!init.skipUpload && init.uploadUrl) {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('PUT', init.uploadUrl!)
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
            opts.patchComposerMedia(id, { uploadProgress: pct })
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
      } else {
        opts.patchComposerMedia(id, { uploadProgress: 100 })
      }

      opts.patchComposerMedia(id, { uploadStatus: 'processing', uploadProgress: 100 })

      const commitBody: {
        key: string
        contentHash?: string
        thumbnailKey?: string
        width?: number
        height?: number
        durationSeconds?: number
      } = { key: init.key, contentHash }
      if (thumbnailKey) commitBody.thumbnailKey = thumbnailKey
      else if (next.thumbnailR2Key) commitBody.thumbnailKey = next.thumbnailR2Key
      if (typeof next.width === 'number') commitBody.width = next.width
      if (typeof next.height === 'number') commitBody.height = next.height
      if (typeof next.durationSeconds === 'number') commitBody.durationSeconds = next.durationSeconds

      const committed = await opts.apiFetchData<{
        key: string
        contentType: string
        kind: PostMediaKind
        width?: number | null
        height?: number | null
        durationSeconds?: number | null
        thumbnailKey?: string | null
      }>('/uploads/post-media/commit', {
        method: 'POST',
        body: commitBody,
        signal: controller.signal,
      })

      opts.patchComposerMedia(id, {
        uploadStatus: 'done',
        abortController: null,
        file: null,
        thumbnailBlob: null,
        uploadProgress: 100,
        r2Key: committed.key,
        kind: committed.kind,
        width: committed.width ?? null,
        height: committed.height ?? null,
        durationSeconds: committed.durationSeconds ?? null,
        thumbnailR2Key: committed.thumbnailKey ?? null,
      })
    } catch (err: unknown) {
      if (controller.signal.aborted) return
      const msg = String((err as Error)?.message ?? err) || 'Upload failed.'
      opts.patchComposerMedia(id, { uploadStatus: 'error', uploadError: msg, abortController: null })
    }
  }

  function processUploadQueue() {
    if (uploadWorkerRunning.value) return
    uploadWorkerRunning.value = true

    const pump = () => {
      while (uploadInFlight.value < UPLOAD_CONCURRENCY) {
        const next = opts.composerMedia.value.find((m) => m.source === 'upload' && m.uploadStatus === 'queued') ?? null
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

      const queued = opts.composerMedia.value.some((m) => m.source === 'upload' && m.uploadStatus === 'queued')
      if (!queued && uploadInFlight.value === 0) {
        uploadWorkerRunning.value = false
      }
    }

    pump()
  }

  return { processUploadQueue }
}

