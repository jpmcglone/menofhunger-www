/**
 * Anonymous viewer identity for post/article view counts.
 *
 * Must stay compatible with the API sanitizer in
 * menofhunger-api `src/modules/views/view-tracking.utils.ts`
 * (`^[A-Za-z0-9_-]+$`, 12–128 chars).
 */
export const ANON_VIEW_COOKIE = 'moh_anon_view_id'
export const ANON_VIEW_ID_MIN_LEN = 12
export const ANON_VIEW_ID_MAX_LEN = 128
export const ANON_VIEW_ID_RE = /^[A-Za-z0-9_-]+$/

export function isValidAnonViewId(raw: string | null | undefined): raw is string {
  const value = (raw ?? '').trim()
  return (
    value.length >= ANON_VIEW_ID_MIN_LEN
    && value.length <= ANON_VIEW_ID_MAX_LEN
    && ANON_VIEW_ID_RE.test(value)
  )
}

export function generateAnonViewId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `anon_${crypto.randomUUID().replace(/-/g, '')}`
  }
  return `anon_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}
