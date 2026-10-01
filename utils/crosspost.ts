/**
 * Mirrors the API cross-post rules so the composer offers Link or Full post
 * only when that destination can actually take the post.
 * X length matches twitter-text v3 (see the API's xWeightedLength tests).
 */

export type CrosspostDestinationId = 'pickax' | 'x'
export type CrosspostMode = 'link' | 'native'

export type CrosspostDraft = {
  visibility: string
  body: string
  mediaCount: number
  mediaAllUploadedImages: boolean
  hasPoll: boolean
  isReply: boolean
  isQuote: boolean
  isCheckin: boolean
  groupId?: string | null
  scheduled: boolean
}

export type CrosspostOptions = {
  modes: CrosspostMode[]
  linkOnlyReason?: string
}

export type CrosspostPayload = {
  pickax?: CrosspostMode
  x?: CrosspostMode
}

const URL_RE = /https?:\/\/\S+/gi
const X_URL_WEIGHT = 23

function codePointWeight(cp: number): number {
  if (
    (cp >= 0 && cp <= 4351)
    || (cp >= 8192 && cp <= 8205)
    || (cp >= 8208 && cp <= 8223)
    || (cp >= 8242 && cp <= 8247)
  ) return 1
  return 2
}

/** Same vectors as the API: latin 1, emoji and CJK 2, each URL 23. */
export function xWeightedLength(text: string): number {
  const spans: Array<[number, number]> = []
  for (const match of text.matchAll(URL_RE)) {
    if (match.index === undefined) continue
    spans.push([match.index, match.index + match[0].length])
  }
  let weight = 0
  let i = 0
  let spanIdx = 0
  while (i < text.length) {
    const span = spans[spanIdx]
    if (span && i >= span[0] && i < span[1]) {
      weight += X_URL_WEIGHT
      i = span[1]
      spanIdx += 1
      continue
    }
    const cp = text.codePointAt(i)!
    weight += codePointWeight(cp)
    i += cp > 0xffff ? 2 : 1
  }
  return weight
}

function linkBlocked(draft: CrosspostDraft): boolean {
  if (draft.isReply || draft.isQuote || draft.isCheckin) return true
  if (draft.groupId) return true
  return draft.visibility !== 'public'
}

function nativeReason(draft: CrosspostDraft, destination: CrosspostDestinationId): string | null {
  if (draft.hasPoll) return 'poll'
  const text = draft.body.trim()
  if (!text && draft.mediaCount === 0) return 'empty'
  if (destination === 'x') {
    if (xWeightedLength(text) > 280) return 'too_long'
    if (draft.mediaCount > 0 && !draft.mediaAllUploadedImages) return 'unsupported_media'
    if (draft.mediaCount > 4) return 'too_many_images'
    return null
  }
  if (text.length > 1000) return 'too_long'
  if (draft.mediaCount > 0 && !draft.mediaAllUploadedImages) return 'unsupported_media'
  if (draft.mediaCount > 10) return 'too_many_images'
  return null
}

function reasonCopy(reason: string, destination: CrosspostDestinationId): string {
  const name = destination === 'x' ? 'X' : 'Pickax'
  if (reason === 'poll') return `Polls can't be posted to ${name}, so this shares a link`
  if (reason === 'too_long') return `This is longer than ${name} allows, so this shares a link`
  if (reason === 'unsupported_media') return `Only photos can be posted to ${name}, so this shares a link`
  if (reason === 'too_many_images') return `${name} takes fewer photos, so this shares a link`
  return `This shares a link on ${name}`
}

export function crosspostOptions(draft: CrosspostDraft, destination: CrosspostDestinationId): CrosspostOptions {
  if (linkBlocked(draft)) return { modes: [] }
  const reason = nativeReason(draft, destination)
  if (reason) return { modes: ['link'], linkOnlyReason: reasonCopy(reason, destination) }
  return { modes: ['link', 'native'] }
}

export function crosspostSkipMessage(destination: 'Pickax' | 'X', reason: string): string {
  const detail = reason === 'monthly_limit'
    ? 'monthly limit reached'
    : reason === 'premium_required'
      ? 'Premium is required'
      : reason.replaceAll('_', ' ')
  return `Posted here. ${destination} couldn't take this post: ${detail}.`
}

/** Match the API's conservative accounting of URLs that X may linkify. */
export function xContainsLink(text: string): boolean {
  return /https?:\/\/|\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}(?:[/:?#]|\b)/i.test(text)
}
