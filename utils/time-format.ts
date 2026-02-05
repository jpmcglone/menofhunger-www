type DateStyle = NonNullable<Intl.DateTimeFormatOptions['dateStyle']>
type TimeStyle = NonNullable<Intl.DateTimeFormatOptions['timeStyle']>

function toDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d
}

export function formatDateTime(
  iso: string | null | undefined,
  options?: {
    dateStyle?: DateStyle
    timeStyle?: TimeStyle
    dateOptions?: Intl.DateTimeFormatOptions
    timeOptions?: Intl.DateTimeFormatOptions
    separator?: string
    fallback?: string
  },
): string {
  const fallback = options?.fallback ?? '—'
  const d = toDate(iso)
  if (!d) return fallback
  if (options?.dateStyle || options?.timeStyle) {
    return d.toLocaleString(undefined, {
      dateStyle: options?.dateStyle,
      timeStyle: options?.timeStyle,
    })
  }
  const date = new Intl.DateTimeFormat(
    undefined,
    options?.dateOptions ?? { year: 'numeric', month: 'short', day: '2-digit' },
  ).format(d)
  const time = new Intl.DateTimeFormat(
    undefined,
    options?.timeOptions ?? { hour: 'numeric', minute: '2-digit' },
  ).format(d)
  return `${date}${options?.separator ?? ' · '}${time}`
}

export function formatDateOnly(
  iso: string | null | undefined,
  options?: {
    dateStyle?: DateStyle
    dateOptions?: Intl.DateTimeFormatOptions
    fallback?: string
  },
): string {
  const fallback = options?.fallback ?? '—'
  const d = toDate(iso)
  if (!d) return fallback
  if (options?.dateStyle) {
    return d.toLocaleDateString(undefined, { dateStyle: options.dateStyle })
  }
  return new Intl.DateTimeFormat(
    undefined,
    options?.dateOptions ?? { year: 'numeric', month: 'short', day: '2-digit' },
  ).format(d)
}

export function formatRelativeTime(iso: string | null, options?: { fallback?: string }): string {
  const fallback = options?.fallback ?? 'Never'
  if (!iso?.trim()) return fallback
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  if (diffSec < 10) return 'Just now'
  if (diffSec < 60) return `${diffSec} seconds ago`
  if (diffMin === 1) return '1 minute ago'
  if (diffMin < 60) return `${diffMin} minutes ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr === 1) return '1 hour ago'
  if (diffHr < 24) return `${diffHr} hours ago`
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function formatListTime(iso: string | null) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'now'
  if (diffMin < 60) return `${diffMin}m`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function formatMessageTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  // In chat, always prefer a clock time over "Just now".
  if (diffMin < 1) return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (diffMin < 60) return `${diffMin}m`
  if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  if (diffDay < 6) {
    return date.toLocaleDateString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
  }

  const showYear = diffDay >= 364
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: showYear ? 'numeric' : undefined,
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatMessageTimeFull(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function formatDayDividerLabel(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Earlier'
  const now = new Date()
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  if (sameDay) return 'Today'
  const yday = new Date(now)
  yday.setDate(now.getDate() - 1)
  const isYesterday =
    date.getFullYear() === yday.getFullYear() &&
    date.getMonth() === yday.getMonth() &&
    date.getDate() === yday.getDate()
  if (isYesterday) return 'Yesterday'
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}
