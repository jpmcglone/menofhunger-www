export type SocialNetwork = 'x' | 'pickax' | 'rumble' | 'linkedin' | 'youtube'

export interface SocialNetworkDescriptor {
  network: SocialNetwork
  label: string
  /** Iconify icon name — null when no suitable icon is available and `image` should be used. */
  icon: string | null
  /** Path to a local image asset (relative to /public) — used when `icon` is null. */
  image: string | null
  baseUrl: string
}

export const SOCIAL_NETWORK_DESCRIPTORS: SocialNetworkDescriptor[] = [
  {
    network: 'x',
    label: 'X',
    icon: 'tabler:brand-x',
    image: null,
    baseUrl: 'https://x.com',
  },
  {
    network: 'pickax',
    label: 'Pickax',
    icon: null,
    image: '/images/brands/pickax.png',
    baseUrl: 'https://pickax.com',
  },
  { network: 'rumble', label: 'Rumble', icon: 'tabler:player-play', image: null, baseUrl: 'https://rumble.com' },
  { network: 'linkedin', label: 'LinkedIn', icon: 'tabler:brand-linkedin', image: null, baseUrl: 'https://linkedin.com' },
  { network: 'youtube', label: 'YouTube', icon: 'tabler:brand-youtube', image: null, baseUrl: 'https://youtube.com' },
]

export function socialProfileUrl(network: SocialNetwork, handle: string): string {
  const descriptor = SOCIAL_NETWORK_DESCRIPTORS.find((d) => d.network === network)
  if (!descriptor) throw new Error(`Unknown social network: ${network}`)
  if (network !== 'x' && network !== 'pickax') return handle
  const clean = handle.replace(/^@/, '').trim()
  return `${descriptor.baseUrl}/${clean}`
}

export interface SocialLink {
  network: SocialNetwork
  label: string
  handle: string
  display: string
  href: string
  icon: string | null
  image: string | null
}

/**
 * Build the ordered list of social links to display from a profile object.
 * Returns only networks that have a non-empty handle. Order: X, then Pickax.
 */
export function buildSocialLinks(profile: {
  xUsername?: string | null
  pickaxUsername?: string | null
  rumbleUrl?: string | null
  linkedinUrl?: string | null
  youtubeUrl?: string | null
}): SocialLink[] {
  const links: SocialLink[] = []
  for (const descriptor of SOCIAL_NETWORK_DESCRIPTORS) {
    if (descriptor.network !== 'x' && descriptor.network !== 'pickax') {
      const href = profile[`${descriptor.network}Url`]?.trim()
      if (!href) continue
      try {
        if (new URL(href).protocol !== 'https:') continue
      } catch { continue }
      links.push({ network: descriptor.network, label: descriptor.label, handle: '', display: descriptor.label, href, icon: descriptor.icon, image: descriptor.image })
      continue
    }
    const handle =
      descriptor.network === 'x'
        ? profile.xUsername
        : descriptor.network === 'pickax'
          ? profile.pickaxUsername
          : null
    const clean = (handle ?? '').trim().replace(/^@/, '')
    if (!clean) continue
    links.push({
      network: descriptor.network,
      label: descriptor.label,
      handle: clean,
      display: `@${clean}`,
      href: `${descriptor.baseUrl}/${clean}`,
      icon: descriptor.icon,
      image: descriptor.image,
    })
  }
  return links
}

export interface ProfileHeaderLink {
  /** Stable v-for key. */
  key: string
  /** ProfileLinkIcon used to pick the brand glyph. */
  icon: string
  display: string
  href: string
  /** Set for X so the hover preview can load follower metrics. */
  network: SocialNetwork | null
}

function websiteDisplay(href: string): string {
  try {
    const u = new URL(href)
    const path = u.pathname && u.pathname !== '/' ? u.pathname.replace(/\/$/, '') : ''
    return `${u.hostname}${path}`
  } catch {
    return href
  }
}

/**
 * Everything the profile header shows as a link: connected X and Pickax first, then the member's
 * custom links in their saved order. Payloads from before `links` existed fall back to the legacy
 * website/Rumble/LinkedIn/YouTube fields; once `links` is present the legacy mirror is ignored.
 */
export function buildProfileHeaderLinks(profile: {
  xUsername?: string | null
  pickaxUsername?: string | null
  links?: ReadonlyArray<{ id: string; url: string; title: string; host: string; icon: string }> | null
  website?: string | null
  rumbleUrl?: string | null
  linkedinUrl?: string | null
  youtubeUrl?: string | null
}): ProfileHeaderLink[] {
  const connected = buildSocialLinks({ xUsername: profile.xUsername, pickaxUsername: profile.pickaxUsername })
    .map((link): ProfileHeaderLink => ({
      key: link.network,
      icon: link.network,
      display: link.display,
      href: link.href,
      network: link.network,
    }))

  if (Array.isArray(profile.links)) {
    const custom = profile.links
      .filter((link) => /^https?:\/\//i.test(link.url))
      .map((link): ProfileHeaderLink => ({
        key: `link:${link.id}`,
        icon: link.icon,
        display: link.title?.trim() || link.host || websiteDisplay(link.url),
        href: link.url,
        network: null,
      }))
    return [...connected, ...custom]
  }

  const website = (profile.website ?? '').trim()
  const legacy: ProfileHeaderLink[] = []
  if (website) legacy.push({ key: 'website', icon: 'website', display: websiteDisplay(website), href: website, network: null })
  for (const link of buildSocialLinks({
    rumbleUrl: profile.rumbleUrl,
    linkedinUrl: profile.linkedinUrl,
    youtubeUrl: profile.youtubeUrl,
  })) {
    legacy.push({ key: link.network, icon: link.network, display: link.display, href: link.href, network: link.network })
  }
  return [...connected, ...legacy]
}
