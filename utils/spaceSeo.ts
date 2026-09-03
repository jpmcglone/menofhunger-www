import { siteConfig } from '~/config/site'
import { getYouTubePosterUrls } from '~/utils/link-utils'
import { spaceDisplayTitle, type SpaceDisplayInput } from '~/utils/space-display'

export type SpaceSeoInput = SpaceDisplayInput & {
  ownerUsername?: string | null
  description?: string | null
}

export type SpaceSeoMeta = {
  title: string
  description: string
  image: string | null
  imageAlt: string
  twitterCard: 'summary' | 'summary_large_image'
}

/** Same display-title rules as the page: custom title wins; null/default yields YouTube/radio. */
export function spaceSeoTitle(space: SpaceSeoInput): string {
  const name = spaceDisplayTitle(space) || 'Space'
  const host = space.ownerUsername?.trim() ? `@${space.ownerUsername.trim()}` : ''
  return host ? `${name} by ${host}` : name
}

export function spaceSeoDescription(space: SpaceSeoInput): string {
  const name = spaceDisplayTitle(space) || 'Space'
  const host = space.ownerUsername?.trim() ? `@${space.ownerUsername.trim()}` : 'unknown'
  const custom = (space.description ?? '').trim()
  const base = custom || `Join ${name} — a live space hosted by ${host} on ${siteConfig.name}.`
  let suffix = ''
  if (space.isActive && space.mode === 'WATCH_PARTY') suffix = ' Watch party in progress.'
  else if (space.isActive && space.mode === 'RADIO') suffix = ' Radio playing live.'
  return `${base}${suffix} Verified members can join and chat live.`
}

/** YouTube poster for watch-party shares — same i.ytimg.com URL posts use for OG. */
export function spaceSeoImage(space: Pick<SpaceDisplayInput, 'mode' | 'watchPartyUrl'>): string | null {
  if (space.mode !== 'WATCH_PARTY') return null
  const url = (space.watchPartyUrl ?? '').trim()
  if (!url) return null
  return getYouTubePosterUrls(url)?.maxres ?? null
}

export function computeSpaceSeo(space: SpaceSeoInput | null): SpaceSeoMeta {
  if (!space) {
    return {
      title: 'Space',
      description: `Join a live space on ${siteConfig.name} — chat, watch parties, and radio with other men.`,
      image: null,
      imageAlt: `${siteConfig.name} logo`,
      twitterCard: 'summary_large_image',
    }
  }
  const image = spaceSeoImage(space)
  const name = spaceDisplayTitle(space) || 'Space'
  return {
    title: spaceSeoTitle(space),
    description: spaceSeoDescription(space),
    image,
    imageAlt: image ? name : `${siteConfig.name} logo`,
    twitterCard: image ? 'summary_large_image' : 'summary',
  }
}
