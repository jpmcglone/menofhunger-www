export function normalizeForMeta(text: string): string {
  return (text ?? '').toString().replace(/\s+/g, ' ').trim()
}

export function excerpt(text: string, maxLen: number): string {
  const t = normalizeForMeta(text)
  if (t.length <= maxLen) return t
  return `${t.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`
}

/**
 * Short count for post engagement: 1–999 as-is, 1000+ as "1k", "1.1k" (one decimal when fractional).
 */
export function formatShortCount(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0'
  if (n < 1000) return String(Math.round(n))
  const k = n / 1000
  return k % 1 === 0 ? `${k}k` : `${k.toFixed(1)}k`
}

