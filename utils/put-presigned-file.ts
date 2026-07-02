type PutPresignedFileOptions = {
  retries?: number
}

/**
 * PUT a file/blob to a presigned storage URL with lightweight retry for transient failures.
 */
export async function putPresignedFile(
  uploadUrl: string,
  headers: Record<string, string>,
  body: Blob | File,
  options: PutPresignedFileOptions = {},
): Promise<void> {
  const retries = options.retries ?? 2
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers,
        body,
      })
      if (response.ok) return
      lastError = new Error(
        response.status === 403
          ? 'Upload was blocked. Please try again or use a different network.'
          : `Upload failed (${response.status}).`,
      )
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Upload failed.')
    }

    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
    }
  }

  throw lastError ?? new Error('Upload failed.')
}
