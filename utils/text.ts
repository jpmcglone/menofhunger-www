export function normalizeForMeta(text: string): string {
  return (text ?? '').toString().replace(/\s+/g, ' ').trim()
}

export function excerpt(text: string, maxLen: number): string {
  const t = normalizeForMeta(text)
  if (t.length <= maxLen) return t
  return `${t.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`
}

