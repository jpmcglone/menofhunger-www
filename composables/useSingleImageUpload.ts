import { prepareUploadImage } from '~/utils/prepare-upload-image'

export type UploadedImage = { r2Key: string; width: number | null; height: number | null; alt: string | null }

async function sha256Hex(file: File): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** One image through the shared post-media pipeline (init → PUT → commit), so ownership review covers it. */
export function useSingleImageUpload() {
  const { apiFetchData } = useApiClient()
  const image = ref<UploadedImage | null>(null)
  const previewUrl = ref<string | null>(null)
  const uploading = ref(false)
  const error = ref<string | null>(null)
  let controller: AbortController | null = null

  function clear() {
    controller?.abort()
    controller = null
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = null
    image.value = null
    error.value = null
    uploading.value = false
  }

  async function upload(input: File) {
    clear()
    controller = new AbortController()
    const signal = controller.signal
    previewUrl.value = URL.createObjectURL(input)
    uploading.value = true
    try {
      const file = await prepareUploadImage(input)
      const contentHash = await sha256Hex(file)
      const init = await apiFetchData<{ key: string; uploadUrl?: string; headers: Record<string, string>; maxBytes?: number; skipUpload?: boolean }>(
        '/uploads/post-media/init',
        { method: 'POST', body: { contentType: file.type, contentHash }, signal },
      )
      if (init.maxBytes && file.size > init.maxBytes) throw new Error('That image is too large.')
      if (!init.skipUpload && init.uploadUrl) {
        const res = await fetch(init.uploadUrl, { method: 'PUT', headers: init.headers ?? {}, body: file, signal })
        if (!res.ok) throw new Error('Upload failed.')
      }
      const committed = await apiFetchData<{ key: string; kind: 'image' | 'gif' | 'video'; width?: number | null; height?: number | null }>(
        '/uploads/post-media/commit',
        { method: 'POST', body: { key: init.key, contentHash }, signal },
      )
      if (committed.kind !== 'image') throw new Error('Only images are allowed.')
      const alt = input.name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').trim().slice(0, 120) || null
      image.value = { r2Key: committed.key, width: committed.width ?? null, height: committed.height ?? null, alt }
    } catch (e) {
      if (signal.aborted) return
      error.value = e instanceof Error ? e.message : 'Upload failed.'
      if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
      previewUrl.value = null
    } finally {
      if (!signal.aborted) uploading.value = false
    }
  }

  onBeforeUnmount(clear)
  return { image, previewUrl, uploading, error, upload, clear }
}
