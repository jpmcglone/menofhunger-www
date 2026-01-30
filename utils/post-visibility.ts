import type { PostVisibility } from '~/types/api'

export type ProfilePostsFilter = 'all' | 'public' | PostVisibility

export function visibilityTagLabel(v: PostVisibility): string | null {
  if (v === 'verifiedOnly') return 'Verified'
  if (v === 'premiumOnly') return 'Premium'
  if (v === 'onlyMe') return 'Only me'
  return null
}

export function visibilityTagClasses(v: PostVisibility): string {
  if (v === 'verifiedOnly') {
    return 'moh-tag-verified'
  }
  if (v === 'premiumOnly') {
    return 'moh-tag-premium'
  }
  if (v === 'onlyMe') {
    return 'moh-tag-onlyme'
  }
  return ''
}

export function filterPillClasses(kind: ProfilePostsFilter, active: boolean): string {
  if (kind === 'all') {
    // All: inverted
    return active
      ? 'moh-pill-all-active'
      : 'moh-pill-all'
  }

  if (kind === 'public') {
    // Public: regular
    return active
      ? 'moh-pill-public-active'
      : 'moh-pill-public'
  }

  if (kind === 'verifiedOnly') {
    // Verified: blue
    return active
      ? 'moh-pill-verified-active'
      : 'moh-pill-verified'
  }

  if (kind === 'onlyMe') {
    // Only me: purple
    return active
      ? 'moh-pill-onlyme-active'
      : 'moh-pill-onlyme'
  }

  // Premium: orange
  return active
    ? 'moh-pill-premium-active'
    : 'moh-pill-premium'
}

