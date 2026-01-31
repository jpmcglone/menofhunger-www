import type { Ref } from 'vue'
import type { PostMediaKind } from '~/types/api'
import type { ComposerMediaItem } from './types'

export function useComposerUploads(opts: {
  composerMedia: Ref<ComposerMediaItem[]>
  patchComposerMedia: (localId: string, patch: Partial<ComposerMediaItem>) => void
  apiFetchData: <T>(url: string, init: any) => Promise<T>
  concurrency?: number
}) {
  const uploadWorkerRunning = ref(false)
  const uploadInFlight = ref(0)
  const UPLOAD_CONCURRENCY = typeof opts.concurrency === 'number' ? Math.max(1, Math.floor(opts.concurrency)) : 3

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
      const init = await opts.apiFetchData<{ key: string; uploadUrl: string; headers: Record<string, string>; maxBytes?: number }>(
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

      opts.patchComposerMedia(id, { uploadStatus: 'processing', uploadProgress: 100 })

      const committed = await opts.apiFetchData<{
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

      opts.patchComposerMedia(id, {
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

