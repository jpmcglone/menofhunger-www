export type DailyQuoteKind = 'scripture' | 'quote' | 'paraphrase'

export type DailyQuote = {
  id: string
  kind: DailyQuoteKind
  author: string
  reference: string | null
  text: string
  isParaphrase: boolean
  tradition?: string
  note?: string
  sourceUrl?: string
}

const ET_ZONE = 'America/New_York'

/** Day number for the calendar day in Eastern Time (quote changes at midnight ET). */
function dayIndexEastern(d: Date): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ET_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const year = Number(parts.find((p) => p.type === 'year')?.value ?? 0)
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? 1) - 1
  const day = Number(parts.find((p) => p.type === 'day')?.value ?? 1)
  return Math.floor(Date.UTC(year, month, day) / 86400000)
}

export function getDailyQuote<T extends DailyQuote>(
  quotes: T[],
  now: Date = new Date(),
): { quote: T | null; index: number } {
  const list = Array.isArray(quotes) ? quotes.filter(Boolean) : []
  if (list.length === 0) return { quote: null, index: 0 }

  const dayIndex = dayIndexEastern(now) + 1
  const i = ((dayIndex % list.length) + list.length) % list.length
  return { quote: list[i] ?? null, index: i }
}

export function formatDailyQuoteAttribution(q: DailyQuote): string {
  if (q.kind === 'scripture') {
    const pieces = [q.reference, q.tradition].filter(Boolean)
    return pieces.join(' · ')
  }
  return q.author
}

