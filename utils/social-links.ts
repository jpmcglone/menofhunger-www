export type SocialNetwork = 'x' | 'pickax'

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
]

export function socialProfileUrl(network: SocialNetwork, handle: string): string {
  const descriptor = SOCIAL_NETWORK_DESCRIPTORS.find((d) => d.network === network)
  if (!descriptor) throw new Error(`Unknown social network: ${network}`)
  const clean = handle.replace(/^@/, '').trim()
  return `${descriptor.baseUrl}/${clean}`
}

export interface SocialLink {
  network: SocialNetwork
  label: string
  handle: string
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
}): SocialLink[] {
  const links: SocialLink[] = []
  for (const descriptor of SOCIAL_NETWORK_DESCRIPTORS) {
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
      href: `${descriptor.baseUrl}/${clean}`,
      icon: descriptor.icon,
      image: descriptor.image,
    })
  }
  return links
}
