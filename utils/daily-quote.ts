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

function dayIndexUtc(d: Date): number {
  // Day number since Unix epoch, in UTC (stable across timezones).
  return Math.floor(d.getTime() / 86400000)
}

export function getDailyQuote<T extends DailyQuote>(
  quotes: T[],
  now: Date = new Date(),
): { quote: T | null; index: number } {
  const list = Array.isArray(quotes) ? quotes.filter(Boolean) : []
  if (list.length === 0) return { quote: null, index: 0 }

  const i = ((dayIndexUtc(now) % list.length) + list.length) % list.length
  return { quote: list[i] ?? null, index: i }
}

export function formatDailyQuoteAttribution(q: DailyQuote): string {
  if (q.kind === 'scripture') {
    const pieces = [q.reference, q.tradition].filter(Boolean)
    return pieces.join(' · ')
  }
  return q.author
}

