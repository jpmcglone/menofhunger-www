import { formatCount } from './number-format'

export function normalizeForMeta(text: string): string {
  return (text ?? '').toString().replace(/\s+/g, ' ').trim()
}

export function excerpt(text: string, maxLen: number): string {
  const t = normalizeForMeta(text)
  if (t.length <= maxLen) return t
  return `${t.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`
}

/**
 * Mirrors API `gatedPostBody`: first ~previewChars + "…" if body has ≥ minWords words, else empty.
 * Used for share/SEO on verified/premium posts so previews match logged-out /p/:id.
 */
export function gatedPostBodyPreview(body: string, minWords = 10, previewChars = 22): string {
  const text = normalizeForMeta(body)
  if (!text) return ''
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length < minWords) return ''
  return `${text.slice(0, previewChars)}…`
}

/** Compact counts keep post action slots stable, including million/billion values. */
export function formatShortCount(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0'
  if (n < 1000) return String(Math.floor(n))
  for (const [scale, suffix] of [[1e12, 't'], [1e9, 'b'], [1e6, 'm'], [1e3, 'k']] as const) {
    if (n < scale) continue
    const value = n / scale
    if (value >= 1000) return '999t'
    // Truncate instead of rounding 999.9k into the wider 1000k.
    return `${value < 10 ? Math.floor(value * 10) / 10 : Math.floor(value)}${suffix}`
  }
  return '0'
}

/** Full grouped count (1,234) for profile stats; non-numbers and negatives become 0. */
export function formatFullCount(n: unknown): string {
  const v = typeof n === 'number' ? n : Number(n)
  return formatCount(Math.max(0, Math.floor(Number.isFinite(v) ? v : 0)))
}

/** Up to two uppercase initials for avatar fallbacks ("?" when empty). */
export function initials(name: string | null | undefined): string {
  const n = (name ?? '').trim()
  if (!n) return '?'
  const parts = n.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  return n.slice(0, 2).toUpperCase()
}
