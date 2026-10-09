import { formatLocaleDate, formatLocaleTime } from '~/utils/time-format'

export function formatWhen(createdAt: string): string {
  const d = new Date(createdAt)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffM = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMs / 3600000)
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) {
    if (diffM < 1) return 'now'
    if (diffM < 60) return `${diffM}m`
    return `${Math.max(1, diffH)}h`
  }
  const sameYear = d.getFullYear() === now.getFullYear()
  return formatLocaleDate(d, {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  })
}

export function formatWhenFull(createdAt: string): string {
  const d = new Date(createdAt)
  if (Number.isNaN(d.getTime())) return ''
  const rawTime = formatLocaleTime(d, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  const time = rawTime.replace(/\s/g, '').toLowerCase()
  const date = formatLocaleDate(d, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${time} - ${date}`
}
