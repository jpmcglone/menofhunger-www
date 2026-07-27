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

export function formatDailyQuoteAttribution(q: DailyQuote): string {
  if (q.kind === 'scripture') {
    const pieces = [q.reference, q.tradition].filter(Boolean)
    return pieces.join(' · ')
  }
  return q.author
}

