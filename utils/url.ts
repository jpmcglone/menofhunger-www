/**
 * Join a base URL and path, normalizing slashes (trim trailing on base, leading on path).
 */
export function joinUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/+$/, '')
  const p = path.replace(/^\/+/, '')
  return `${base}/${p}`
}
