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
