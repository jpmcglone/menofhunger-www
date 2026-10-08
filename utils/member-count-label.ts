import { formatCount } from '~/utils/number-format'
export function memberCountLabel(count: number | null | undefined): string | null {
  if (typeof count !== 'number' || !Number.isFinite(count)) return null
  const normalized = Math.max(0, Math.floor(count))
  return `${formatCount(normalized)} ${normalized === 1 ? 'member' : 'members'}`
}
