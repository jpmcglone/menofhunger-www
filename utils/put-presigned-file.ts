import type { ApiFetchData } from '~/composables/useApiClient'

type PutPresignedFileOptions = {
  retries?: number
  signal?: AbortSignal
  credentials?: RequestCredentials
}

/**
 * PUT a file/blob to a presigned storage URL with lightweight retry for transient failures.
 * This is the only place allowed to issue a raw presigned `PUT` (see architecture guardrails).
 */
export async function putPresignedFile(
  uploadUrl: string,
  headers: Record<string, string> | undefined,
  body: Blob | File,
  options: PutPresignedFileOptions = {},
): Promise<void> {
  const retries = options.retries ?? 2
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: headers ?? {},
        body,
        signal: options.signal,
        credentials: options.credentials,
      })
      if (response.ok) return
      lastError = new Error(
        response.status === 403
          ? 'Upload was blocked. Please try again or use a different network.'
          : `Upload failed (${response.status}).`,
      )
    } catch (error) {
      if (options.signal?.aborted) throw error
      lastError = error instanceof Error ? error : new Error('Upload failed.')
    }

    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
    }
  }

  throw lastError ?? new Error('Upload failed.')
}

type PresignInit = {
  key: string
  uploadUrl?: string
  headers?: Record<string, string>
  skipUpload?: boolean
  maxBytes?: number
}

/**
 * init → PUT → commit against `/uploads/<kind>/{init,commit}`. `skipUpload` (deduped content) skips the PUT.
 * `beforePut` can reject using init metadata (e.g. `maxBytes`).
 */
export async function presignedUpload<TCommit extends { key: string } = { key: string }>(
  apiFetchData: ApiFetchData,
  kind: string,
  file: File,
  options: {
    initBody?: Record<string, unknown>
    commitBody?: Record<string, unknown>
    signal?: AbortSignal
    beforePut?: (init: PresignInit) => void
  } = {},
): Promise<TCommit> {
  const { signal } = options
  const init = await apiFetchData<PresignInit>(`/uploads/${kind}/init`, {
    method: 'POST',
    body: { contentType: file.type || 'image/jpeg', ...options.initBody },
    signal,
  })
  options.beforePut?.(init)
  if (!init.skipUpload && init.uploadUrl) await putPresignedFile(init.uploadUrl, init.headers, file, { signal })
  return apiFetchData<TCommit>(`/uploads/${kind}/commit`, {
    method: 'POST',
    body: { key: init.key, ...options.commitBody },
    signal,
  })
}
