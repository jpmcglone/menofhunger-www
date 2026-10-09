import type { MyProfileLink } from '~/types/api'

/** One row in the link editor. `id` is null until the API has saved it. */
export type DraftLink = {
  key: string
  id: string | null
  url: string
  title: string
  host: string
  icon: string
  grandfathered: boolean
  hiddenUntilVerified: boolean
}

let draftSeq = 0
const nextKey = () => `link-draft-${(draftSeq += 1)}`

export function draftFromLink(link: MyProfileLink): DraftLink {
  return {
    key: nextKey(),
    id: link.id,
    url: link.url,
    title: link.title ?? '',
    host: link.host,
    icon: link.icon,
    grandfathered: link.grandfathered,
    hiddenUntilVerified: link.hiddenUntilVerified,
  }
}

export function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/** Adds https:// when the member typed a bare domain. The API still validates and rejects unsafe URLs. */
export function normalizeLinkUrl(raw: string): string {
  const value = raw.trim()
  if (!value) return ''
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value
  return `https://${value.replace(/^\/\//, '')}`
}

export function newDraft(rawUrl: string, title: string): DraftLink {
  const url = normalizeLinkUrl(rawUrl)
  return {
    key: nextKey(),
    id: null,
    url,
    title: title.trim(),
    host: hostFromUrl(url),
    icon: 'website',
    grandfathered: false,
    hiddenUntilVerified: false,
  }
}

/** Returns a new list with the item at `from` moved to `to`. Out-of-range moves return the list unchanged. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list]
  if (from === to || from < 0 || from >= next.length || to < 0 || to >= next.length) return next
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item!)
  return next
}

export type LinksSavePayload = { links: Array<{ id?: string; url: string; title?: string }> }

/** Whole-list replace, in display order. Empty titles are omitted so the API derives one from the host. */
export function linksPayload(drafts: readonly DraftLink[]): LinksSavePayload {
  return {
    links: drafts.map((d) => ({
      ...(d.id ? { id: d.id } : {}),
      url: d.url.trim(),
      ...(d.title.trim() ? { title: d.title.trim() } : {}),
    })),
  }
}

/** Stable text form for dirty checks and echo detection. */
export function linksSignature(links: ReadonlyArray<{ id?: string | null; url: string; title?: string | null }>): string {
  return JSON.stringify(links.map((l) => [l.id ?? '', l.url.trim(), (l.title ?? '').trim()]))
}
