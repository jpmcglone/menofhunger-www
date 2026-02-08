export type HashtagMode = 'tag'

export type ActiveHashtag = {
  /** Index of '#' */
  hashIndex: number
  /** Current caret index (end of active token) */
  caretIndex: number
  /** Raw text between '#' and caret */
  raw: string
  /** Normalized query used to search (trimmed) */
  query: string
  mode: HashtagMode
}

/**
 * Hashtag contract (keep in sync with API).
 * - token: # + tag
 * - tag: starts with a letter, then letters/numbers/underscore, max 50 chars
 * - display parsing: '#' must not be preceded by a word char (avoid matching mid-word)
 */
export const HASHTAG_TAG_RE_SOURCE = '[A-Za-z][A-Za-z0-9_]{0,49}'
export const HASHTAG_IN_TEXT_RE = new RegExp(`#(${HASHTAG_TAG_RE_SOURCE})`, 'g')
export const HASHTAG_IN_TEXT_DISPLAY_RE = new RegExp(`(?<![a-zA-Z0-9_])#(${HASHTAG_TAG_RE_SOURCE})`, 'g')

const WORD_CHAR = /[A-Za-z0-9_]/
const TAG_PREFIX_RE = new RegExp(`^${HASHTAG_TAG_RE_SOURCE}$`)
const TAG_QUERY_RE = /^[A-Za-z0-9_]*$/

export function parseActiveHashtag(text: string, caretIndex: number): ActiveHashtag | null {
  const value = (text ?? '').toString()
  const caret = Math.max(0, Math.min(value.length, Math.floor(caretIndex || 0)))
  if (caret <= 0) return null

  // Find nearest '#' to the left of the caret.
  const hashIndex = value.lastIndexOf('#', caret - 1)
  if (hashIndex < 0) return null

  // Avoid matching mid-word: '#' must be at start or preceded by a non-word char.
  if (hashIndex > 0) {
    const prev = value[hashIndex - 1] ?? ''
    if (WORD_CHAR.test(prev)) return null
  }

  // No newlines inside an active hashtag token.
  const between = value.slice(hashIndex + 1, caret)
  if (between.includes('\n')) return null

  // Tag mode: no spaces, only tag characters.
  if (!TAG_QUERY_RE.test(between)) return null

  const raw = between
  // If the user completed a token with a space (e.g. after selecting "#food "),
  // do not treat it as an active hashtag.
  if (raw.endsWith(' ')) return null

  const query = raw.trim()
  // Allow bare '#' to open trending suggestions.
  if (!raw) return { hashIndex, caretIndex: caret, raw, query, mode: 'tag' }

  // Enforce prefix rules for the currently typed token.
  if (!TAG_PREFIX_RE.test(raw)) return null
  return { hashIndex, caretIndex: caret, raw, query, mode: 'tag' }
}

export type HashtagDisplayMatch = {
  /** Full hashtag token as written in text, e.g. "#Food" */
  raw: string
  /** Tag portion only, e.g. "Food" */
  tag: string
  /** Lowercased tag, convenient for map lookups */
  tagLower: string
}

export type HashtagTextSegment = { text: string; hashtag?: HashtagDisplayMatch }

/** Split text into segments with display-safe #tag tokens. */
export function splitTextByHashtagsDisplay(text: string): HashtagTextSegment[] {
  const value = (text ?? '').toString()
  if (!value) return []
  const re = new RegExp(HASHTAG_IN_TEXT_DISPLAY_RE.source, 'g')
  const out: HashtagTextSegment[] = []
  let lastEnd = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(value))) {
    const raw = m[0] ?? ''
    const tag = m[1] ?? ''
    const start = m.index
    if (start > lastEnd) out.push({ text: value.slice(lastEnd, start) })
    if (raw && tag) {
      out.push({ text: raw, hashtag: { raw, tag, tagLower: tag.toLowerCase() } })
    } else if (raw) {
      out.push({ text: raw })
    }
    lastEnd = start + raw.length
  }
  if (lastEnd < value.length) out.push({ text: value.slice(lastEnd) })
  return out.length ? out : [{ text: value }]
}

