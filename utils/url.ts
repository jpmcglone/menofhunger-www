/**
 * Join a base URL and path, normalizing slashes (trim trailing on base, leading on path).
 */
export function joinUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/+$/, '')
  const p = path.replace(/^\/+/, '')
  return `${base}/${p}`
}

/**
 * Returns true only if the redirect target is a safe same-origin path.
 * Blocks open-redirect attacks like `//evil.com` or `https://evil.com`
 * that pass a simple `startsWith('/')` check.
 */
export function isSafeRedirect(url: string | null | undefined): boolean {
  if (!url) return false
  // Must start with exactly one slash (not // which is protocol-relative)
  if (!url.startsWith('/') || url.startsWith('//')) return false
  // Reject anything that could be parsed as having a host (e.g. /\evil.com on IE)
  const normalized = url.replace(/\\/g, '/')
  if (normalized.startsWith('//')) return false
  return true
}
