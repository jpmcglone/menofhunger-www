import { siteConfig } from '~/config/site'

export type ShareParams = {
  ref?: string | null
  from?: string | null
}

/** Append `ref` / `from` query params to a path or absolute URL. Omits empty values. */
export function appendShareParams(urlOrPath: string, params: ShareParams = {}): string {
  const ref = normalizeParam(params.ref)
  const from = normalizeParam(params.from)
  if (!ref && !from) return urlOrPath

  const isAbsolute = /^https?:\/\//i.test(urlOrPath)
  const base = isAbsolute ? undefined : 'https://example.invalid'
  const u = new URL(urlOrPath, base)
  if (ref) u.searchParams.set('ref', ref)
  if (from) u.searchParams.set('from', from)
  if (isAbsolute) return u.toString()
  return `${u.pathname}${u.search}${u.hash}`
}

export function postSharePath(postId: string, ref?: string | null): string {
  const id = String(postId ?? '').trim()
  return appendShareParams(`/p/${encodeURIComponent(id)}`, { ref })
}

export function postShareUrl(postId: string, ref?: string | null, origin = siteConfig.url): string {
  const path = postSharePath(postId, ref)
  return `${origin.replace(/\/$/, '')}${path}`
}

export function groupSharePath(slug: string, params: ShareParams = {}): string {
  const s = String(slug ?? '').trim()
  return appendShareParams(`/g/${encodeURIComponent(s)}`, params)
}

export function groupShareUrl(slug: string, params: ShareParams = {}, origin = siteConfig.url): string {
  return `${origin.replace(/\/$/, '')}${groupSharePath(slug, params)}`
}

export type PostShareTextInput = {
  /** Check-in streak days; when > 0 produces the day-N invite line. */
  streakDays?: number | null
  commentCount?: number | null
  /** Unused for external payload — kept for future body-snippet experiments. */
  body?: string | null
  isCheckin?: boolean
}

/**
 * External share message for posts / check-ins.
 * Default: conversation CTA. Check-in with streak: day-N invite.
 */
export function postShareText(input: PostShareTextInput = {}): string {
  const streak = Math.max(0, Math.floor(Number(input.streakDays ?? 0) || 0))
  if (input.isCheckin && streak > 0) {
    return `I'm on day ${streak} of Men of Hunger — join me.`
  }
  const replies = Math.max(0, Math.floor(Number(input.commentCount ?? 0) || 0))
  if (replies > 0) {
    return `Join the conversation on Men of Hunger (${replies} ${replies === 1 ? 'reply' : 'replies'}).`
  }
  return 'Join the conversation on Men of Hunger.'
}

export function groupShareText(groupName: string): string {
  const name = String(groupName ?? '').trim() || 'this group'
  return `I started ${name} — join us on Men of Hunger.`
}

export function weeklyMissionShareText(streakDays: number): string {
  const n = Math.max(1, Math.floor(Number(streakDays) || 1))
  return `I'm on day ${n} of this week's mission on Men of Hunger — join me.`
}

function normalizeParam(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value
  return String(raw ?? '').trim().slice(0, 50)
}
