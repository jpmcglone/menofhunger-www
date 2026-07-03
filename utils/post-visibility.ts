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

/** Post row / pinned block highlight classes (left border + tint) by visibility. */
export function postHighlightClasses(v: PostVisibility): string {
  if (v === 'verifiedOnly') return 'moh-post-highlight moh-post-highlight-verified'
  if (v === 'premiumOnly') return 'moh-post-highlight moh-post-highlight-premium'
  if (v === 'onlyMe') return 'moh-post-highlight moh-post-highlight-onlyme'
  return 'moh-post-highlight'
}

/** Tint for the circular feed filter trigger (sort icon colored by scope). */
export function feedFilterButtonColor(kind: ProfilePostsFilter): string {
  if (kind === 'verifiedOnly') return 'var(--moh-verified)'
  if (kind === 'premiumOnly') return 'var(--moh-premium)'
  if (kind === 'public') return 'var(--moh-text-muted)'
  // 'all' — neutral text, outline style
  return 'var(--moh-text)'
}

/** Background for the circular feed filter trigger. Filled for active scopes, transparent for "all". */
export function feedFilterButtonBg(kind: ProfilePostsFilter): string {
  if (kind === 'verifiedOnly') return 'rgba(var(--moh-verified-rgb), 0.15)'
  if (kind === 'premiumOnly') return 'rgba(var(--moh-premium-rgb), 0.15)'
  if (kind === 'public') return 'rgba(var(--moh-text-rgb, 255,255,255), 0.1)'
  return 'transparent'
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

