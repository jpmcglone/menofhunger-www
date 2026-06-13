export type ActiveCashtag = {
  /** Index of '$' */
  dollarIndex: number
  /** Current caret index (end of active token) */
  caretIndex: number
  /** Raw text between '$' and caret */
  raw: string
  /** Normalized query used to search (trimmed, uppercase) */
  query: string
}

/**
 * Cashtag contract (keep in sync with API).
 * - token: $ + symbol
 * - symbol: 1–6 letters only (A-Z); digits are NOT valid (to avoid $100, $5B)
 * - display parsing: '$' must not be preceded by a word char or '$' itself
 */
export const CASHTAG_SYMBOL_RE_SOURCE = '[A-Za-z]{1,6}'
export const CASHTAG_IN_TEXT_DISPLAY_RE = new RegExp(
  `(?<![A-Za-z0-9_$])\\$(${CASHTAG_SYMBOL_RE_SOURCE})(?![A-Za-z0-9_])`,
  'g',
)

const WORD_OR_DOLLAR_CHAR = /[A-Za-z0-9_$]/
const SYMBOL_QUERY_RE = /^[A-Za-z]*$/

/**
 * Detects whether the caret is inside an active cashtag token.
 * Returns null when the caret is not positioned inside a `$XXX` token.
 */
export function parseActiveCashtag(text: string, caretIndex: number): ActiveCashtag | null {
  const value = (text ?? '').toString()
  const caret = Math.max(0, Math.min(value.length, Math.floor(caretIndex || 0)))
  if (caret <= 0) return null

  const dollarIndex = value.lastIndexOf('$', caret - 1)
  if (dollarIndex < 0) return null

  // '$' must not be preceded by a word char or another '$'.
  if (dollarIndex > 0) {
    const prev = value[dollarIndex - 1] ?? ''
    if (WORD_OR_DOLLAR_CHAR.test(prev)) return null
  }

  const between = value.slice(dollarIndex + 1, caret)
  if (between.includes('\n')) return null
  if (!SYMBOL_QUERY_RE.test(between)) return null

  const raw = between
  if (raw.endsWith(' ')) return null

  const query = raw.trim().toUpperCase()
  // Allow bare '$' to open suggestions.
  if (!raw) return { dollarIndex, caretIndex: caret, raw, query }
  if (raw.length > 6) return null

  return { dollarIndex, caretIndex: caret, raw, query }
}

export type CashtagDisplayMatch = {
  /** Full cashtag token as written in text, e.g. "$SPY" */
  raw: string
  /** Symbol portion only, e.g. "SPY" */
  symbol: string
  /** Uppercase symbol (for map lookups) */
  symbolUpper: string
}

export type CashtagTextSegment = { text: string; cashtag?: CashtagDisplayMatch }

/** Split text into segments with display-safe $SYMBOL tokens. */
export function splitTextByCashtagsDisplay(text: string): CashtagTextSegment[] {
  const value = (text ?? '').toString()
  if (!value) return []
  const re = new RegExp(CASHTAG_IN_TEXT_DISPLAY_RE.source, 'g')
  const out: CashtagTextSegment[] = []
  let lastEnd = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(value))) {
    const raw = m[0] ?? ''
    const symbol = m[1] ?? ''
    const start = m.index
    if (start > lastEnd) out.push({ text: value.slice(lastEnd, start) })
    if (raw && symbol) {
      out.push({ text: raw, cashtag: { raw, symbol, symbolUpper: symbol.toUpperCase() } })
    } else if (raw) {
      out.push({ text: raw })
    }
    lastEnd = start + raw.length
  }
  if (lastEnd < value.length) out.push({ text: value.slice(lastEnd) })
  return out.length ? out : [{ text: value }]
}
