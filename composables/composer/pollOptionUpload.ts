import { prepareUploadImage } from '~/utils/prepare-upload-image'

async function computeFileSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export type PollOptionUploadResult = { key: string; width: number | null; height: number | null; fileName: string }

/** Prepare, upload and commit one poll-option image; throws on failure or abort. */
export async function uploadPollOptionImage(
  source: File,
  opts: {
    apiFetchData: ReturnType<typeof useApiClient>['apiFetchData']
    signal: AbortSignal
    onProcessing: () => void
  },
): Promise<PollOptionUploadResult> {
  const { apiFetchData, signal, onProcessing } = opts
  const file = await prepareUploadImage(source)
  if (signal.aborted) throw Object.assign(new Error('Aborted'), { name: 'AbortError' })
  const contentHash = await computeFileSha256(file)
  const init = await apiFetchData<{
    key: string
    uploadUrl?: string
    headers: Record<string, string>
    maxBytes?: number
    skipUpload?: boolean
  }>('/uploads/post-media/init', {
    method: 'POST',
    body: { contentType: file.type, contentHash },
    signal,
  })

  const maxBytes = typeof init.maxBytes === 'number' ? init.maxBytes : null
  if (maxBytes && file.size > maxBytes) throw new Error('File is too large.')

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
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve()
        else reject(new Error('Failed to upload.'))
      }
      xhr.onerror = () => reject(new Error('Failed to upload.'))
      xhr.onabort = () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }))
      signal.addEventListener('abort', () => { try { xhr.abort() } catch { /* ignore */ } }, { once: true })
      xhr.send(file)
    })
  }

  onProcessing()

  const committed = await apiFetchData<{
    key: string
    kind: 'image' | 'gif' | 'video'
    width?: number | null
    height?: number | null
  }>('/uploads/post-media/commit', {
    method: 'POST',
    body: { key: init.key, contentHash },
    signal,
  })

  if (committed.kind !== 'image') throw new Error('Only images are allowed.')
  return { key: committed.key, width: committed.width ?? null, height: committed.height ?? null, fileName: file.name }
}
