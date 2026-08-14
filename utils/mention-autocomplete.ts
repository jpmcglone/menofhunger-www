export type MentionMode = 'username'

export type ActiveMention = {
  /** Index of '@' */
  atIndex: number
  /** Current caret index (end of active token) */
  caretIndex: number
  /** Raw text between '@' and caret (may include spaces in displayName mode) */
  raw: string
  /** Normalized query used to search (trimmed) */
  query: string
  mode: MentionMode
}

/**
 * Mention/usernames contract (keep in sync with API).
 * - token: @ + username
 * - username: starts with a letter, then letters/numbers/underscore, max 15 chars
 * - display parsing: '@' must not be preceded by a word char (avoid emails like foo@bar.com)
 */
export const MENTION_USERNAME_RE_SOURCE = '[A-Za-z][A-Za-z0-9_]{0,14}'
export const MENTION_IN_TEXT_RE = new RegExp(`@(${MENTION_USERNAME_RE_SOURCE})`, 'g')
export const MENTION_IN_TEXT_DISPLAY_RE = new RegExp(`(?<![a-zA-Z0-9_])@(${MENTION_USERNAME_RE_SOURCE})`, 'g')

const WORD_CHAR = /[A-Za-z0-9_]/
const USERNAME_PREFIX_RE = new RegExp(`^${MENTION_USERNAME_RE_SOURCE}$`)
const USERNAME_QUERY_RE = /^[A-Za-z0-9_]*$/

export function parseActiveMention(text: string, caretIndex: number): ActiveMention | null {
  const value = (text ?? '').toString()
  const caret = Math.max(0, Math.min(value.length, Math.floor(caretIndex || 0)))
  if (caret <= 0) return null

  // Find nearest '@' to the left of the caret.
  const atIndex = value.lastIndexOf('@', caret - 1)
  if (atIndex < 0) return null

  // Avoid emails / words: '@' must be at start or preceded by a non-word char.
  if (atIndex > 0) {
    const prev = value[atIndex - 1] ?? ''
    if (WORD_CHAR.test(prev)) return null
  }

  // No newlines inside an active mention token.
  const between = value.slice(atIndex + 1, caret)
  if (between.includes('\n')) return null

  // Username-only mode: no spaces, only username characters.
  if (!USERNAME_QUERY_RE.test(between)) return null

  const raw = between
  // If the user has completed a token with a space (e.g. after selecting "@john "),
  // do not treat it as an active mention.
  if (raw.endsWith(' ')) return null
  const query = raw.trim()
  // Require at least 1 character after '@' before activating autocomplete UI.
  // This prevents showing suggestions on a bare '@'.
  if (!query) return null
  if (!USERNAME_PREFIX_RE.test(raw)) return null
  return { atIndex, caretIndex: caret, raw, query, mode: 'username' }
}

function escapeUsernameForRe(username: string): string {
  return username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function findExistingMentionToken(text: string, username: string): { start: number; end: number } | null {
  const un = username.trim()
  if (!un || !USERNAME_PREFIX_RE.test(un)) return null
  const re = new RegExp(`(^|[^A-Za-z0-9_])@(${escapeUsernameForRe(un)})(?![A-Za-z0-9_])`, 'i')
  const m = re.exec(text)
  if (!m) return null
  const at = m.index + (m[1]?.length ?? 0)
  return { start: at, end: at + 1 + (m[2]?.length ?? un.length) }
}

/**
 * Insert `@username ` at the caret for live-chat "click to mention".
 * Replaces an in-progress mention, skips a duplicate token, and keeps a
 * trailing space so the next word is ready to type.
 */
export function insertMentionAtCaret(
  text: string,
  caretIndex: number,
  username: string,
): { text: string; caret: number } {
  const value = (text ?? '').toString()
  const un = username.trim()
  if (!un || !USERNAME_PREFIX_RE.test(un)) {
    const caret = Math.max(0, Math.min(value.length, Math.floor(caretIndex || 0)))
    return { text: value, caret }
  }

  const caret = Math.max(0, Math.min(value.length, Math.floor(caretIndex || 0)))
  const existing = findExistingMentionToken(value, un)
  if (existing) {
    const after = existing.end < value.length && value[existing.end] === ' '
      ? existing.end + 1
      : existing.end
    return { text: value, caret: after }
  }

  const token = `@${un} `
  const active = parseActiveMention(value, caret)
  if (active) {
    const before = value.slice(0, active.atIndex)
    const after = value.slice(active.caretIndex)
    return { text: before + token + after, caret: before.length + token.length }
  }

  const prev = caret > 0 ? value[caret - 1] ?? '' : ''
  if (prev === '@' && (caret === 1 || !WORD_CHAR.test(value[caret - 2] ?? ''))) {
    const before = value.slice(0, caret - 1)
    const after = value.slice(caret)
    return { text: before + token + after, caret: before.length + token.length }
  }

  const before = value.slice(0, caret)
  const after = value.slice(caret)
  const needSpaceBefore = before.length > 0 && !/\s$/.test(before)
  const insertion = (needSpaceBefore ? ' ' : '') + token
  return { text: before + insertion + after, caret: before.length + insertion.length }
}

export function extractMentionedUsernames(text: string): string[] {
  const value = (text ?? '').toString()
  const out = new Set<string>()
  // Username rules: must start with a letter, then letters/numbers/underscore, max 15.
  const re = new RegExp(MENTION_IN_TEXT_RE.source, 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(value))) {
    const un = (m[1] ?? '').trim()
    if (un) out.add(un.toLowerCase())
  }
  return [...out]
}

/** Split body into segments for rendering: plain text and @username mentions (same regex as above). */
export type BodySegment = { type: 'text' | 'mention'; value: string }

export function segmentBodyWithMentions(text: string): BodySegment[] {
  const value = (text ?? '').toString()
  if (!value) return []
  const re = new RegExp(MENTION_IN_TEXT_RE.source, 'g')
  const out: BodySegment[] = []
  let lastEnd = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(value))) {
    const full = m[0] ?? ''
    const start = m.index
    if (start > lastEnd) {
      out.push({ type: 'text', value: value.slice(lastEnd, start) })
    }
    out.push({ type: 'mention', value: full })
    lastEnd = start + full.length
  }
  if (lastEnd < value.length) {
    out.push({ type: 'text', value: value.slice(lastEnd) })
  }
  return out
}

/** Like segmentBodyWithMentions but @ must not be preceded by word char (avoids matching email). Use for display (bio, etc.). */
export function segmentBodyWithMentionsDisplay(text: string): BodySegment[] {
  const value = (text ?? '').toString()
  if (!value) return []
  const re = new RegExp(MENTION_IN_TEXT_DISPLAY_RE.source, 'g')
  const out: BodySegment[] = []
  let lastEnd = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(value))) {
    const full = m[0] ?? ''
    const start = m.index
    if (start > lastEnd) {
      out.push({ type: 'text', value: value.slice(lastEnd, start) })
    }
    out.push({ type: 'mention', value: full })
    lastEnd = start + full.length
  }
  if (lastEnd < value.length) {
    out.push({ type: 'text', value: value.slice(lastEnd) })
  }
  return out
}

export type MentionDisplayMatch = {
  /** Full mention token as written in text, e.g. "@John" */
  raw: string
  /** Username portion only, e.g. "John" */
  username: string
  /** Lowercased username, convenient for map lookups */
  usernameLower: string
}

export type MentionTextSegment = { text: string; mention?: MentionDisplayMatch }

/** Split text into segments with display-safe @username tokens (email-safe). */
export function splitTextByMentionsDisplay(text: string): MentionTextSegment[] {
  const value = (text ?? '').toString()
  if (!value) return []
  const re = new RegExp(MENTION_IN_TEXT_DISPLAY_RE.source, 'g')
  const out: MentionTextSegment[] = []
  let lastEnd = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(value))) {
    const raw = m[0] ?? ''
    const username = m[1] ?? ''
    const start = m.index
    if (start > lastEnd) out.push({ text: value.slice(lastEnd, start) })
    if (raw && username) {
      out.push({ text: raw, mention: { raw, username, usernameLower: username.toLowerCase() } })
    } else if (raw) {
      out.push({ text: raw })
    }
    lastEnd = start + raw.length
  }
  if (lastEnd < value.length) out.push({ text: value.slice(lastEnd) })
  return out.length ? out : [{ text: value }]
}

