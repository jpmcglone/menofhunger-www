export function memberCountLabel(count: number | null | undefined): string | null {
  if (typeof count !== 'number' || !Number.isFinite(count)) return null
  const normalized = Math.max(0, Math.floor(count))
  return `${normalized.toLocaleString()} ${normalized === 1 ? 'member' : 'members'}`
}
