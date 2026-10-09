import type { ProfileLinkIcon } from '~/types/api'

/**
 * Brand glyphs for profile links. One mapping powers the public links page, the
 * profile header, and the link editor, so a brand looks the same everywhere.
 *
 * - `iconify`: a Tabler brand icon (rendered with `<Icon>`).
 * - `image`: a bundled raster logo (Pickax has no icon-set glyph).
 * - `svg`: a single-path 24x24 mark (Simple Icons, CC0) for brands Tabler lacks.
 */
export type ProfileLinkGlyph =
  | { kind: 'iconify'; name: string }
  | { kind: 'image'; src: string }
  | { kind: 'svg'; path: string }

const WEBSITE_GLYPH: ProfileLinkGlyph = { kind: 'iconify', name: 'tabler:world' }

export const PROFILE_LINK_GLYPHS: Record<ProfileLinkIcon, ProfileLinkGlyph> = {
  website: WEBSITE_GLYPH,
  x: { kind: 'iconify', name: 'tabler:brand-x' },
  pickax: { kind: 'image', src: '/images/brands/pickax.png' },
  youtube: { kind: 'iconify', name: 'tabler:brand-youtube' },
  rumble: { kind: 'iconify', name: 'tabler:brand-rumble' },
  linkedin: { kind: 'iconify', name: 'tabler:brand-linkedin' },
  substack: {
    kind: 'svg',
    path: 'M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z',
  },
  ghost: {
    kind: 'svg',
    path: 'M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm.256 2.313c2.47.005 5.116 2.008 5.898 2.962l.244.3c1.64 1.994 3.569 4.34 3.569 6.966 0 3.719-2.98 5.808-6.158 7.508-1.433.766-2.98 1.508-4.748 1.508-4.543 0-8.366-3.569-8.366-8.112 0-.706.17-1.425.342-2.15.122-.515.244-1.033.307-1.549.548-4.539 2.967-6.795 8.422-7.408a4.29 4.29 0 01.49-.026Z',
  },
  github: { kind: 'iconify', name: 'tabler:brand-github' },
  soundcloud: { kind: 'iconify', name: 'tabler:brand-soundcloud' },
  bandcamp: { kind: 'iconify', name: 'tabler:brand-bandcamp' },
  etsy: { kind: 'iconify', name: 'tabler:brand-etsy' },
  gumroad: { kind: 'iconify', name: 'tabler:brand-gumroad' },
  sketchfab: {
    kind: 'svg',
    path: 'M11.3 0A11.983 11.983 0 0 0 .037 11a13.656 13.656 0 0 0 0 2 11.983 11.983 0 0 0 11.29 11h1.346a12.045 12.045 0 0 0 11.3-11.36 13.836 13.836 0 0 0 0-1.7A12.049 12.049 0 0 0 12.674 0zM15 6.51l2.99 1.74s-6.064 3.24-6.084 3.24S5.812 8.27 5.8 8.26l2.994-1.77 2.992-1.76zm-6.476 5.126L11 13v5.92l-2.527-1.4-2.46-1.43v-5.76zm9.461 1.572v2.924L15.5 17.574 13 19.017v-6.024l2.489-1.345 2.5-1.355z',
  },
  tiktok: { kind: 'iconify', name: 'tabler:brand-tiktok' },
  // Locals has no standard brand glyph in the icon sets; the neutral globe reads fine.
  locals: WEBSITE_GLYPH,
  facebook: { kind: 'iconify', name: 'tabler:brand-facebook' },
  instagram: { kind: 'iconify', name: 'tabler:brand-instagram' },
  spotify: { kind: 'iconify', name: 'tabler:brand-spotify' },
}

/** Unknown or missing icons render as a website link, so new API icons never break old clients. */
export function profileLinkGlyph(icon: string | null | undefined): ProfileLinkGlyph {
  if (icon && Object.prototype.hasOwnProperty.call(PROFILE_LINK_GLYPHS, icon)) {
    return PROFILE_LINK_GLYPHS[icon as ProfileLinkIcon]
  }
  return WEBSITE_GLYPH
}

/** "46.9K" / "1.2M". Truncates (never rounds up across a unit), drops a trailing ".0". */
export function formatFollowerCount(count: number): string {
  if (!Number.isFinite(count) || count < 0) return '0'
  const n = Math.floor(count)
  if (n < 1000) return String(n)
  const units = [
    { size: 1_000_000_000, suffix: 'B' },
    { size: 1_000_000, suffix: 'M' },
    { size: 1_000, suffix: 'K' },
  ]
  for (const { size, suffix } of units) {
    if (n < size) continue
    const tenths = Math.floor((n / size) * 10)
    const whole = Math.floor(tenths / 10)
    const frac = tenths % 10
    return `${whole}${frac ? `.${frac}` : ''}${suffix}`
  }
  return String(n)
}

export function followerCountLabel(count: number): string {
  return `${formatFollowerCount(count)} ${count === 1 ? 'follower' : 'followers'}`
}

export function linksPagePath(username: string): string {
  return `/u/${encodeURIComponent(username)}/links`
}

export function linksPageOgImagePath(username: string): string {
  return `/og/links/${encodeURIComponent(username.toLowerCase())}.png`
}

/** Join CTA: attributes the signup to the links page and credits the owner's referral code. */
export function linksPageJoinHref(referralCode: string | null | undefined): string {
  const code = (referralCode ?? '').trim()
  const query = new URLSearchParams({ src: 'links_page' })
  if (code) query.set('ref', code)
  return `/login?${query.toString()}`
}

export const CONNECTED_NETWORK_LABELS: Record<'x' | 'pickax', string> = { x: 'X', pickax: 'Pickax' }
