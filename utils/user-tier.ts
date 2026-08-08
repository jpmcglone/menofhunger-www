export type UserColorTier = 'organization' | 'premium' | 'verified' | 'normal'

export type UserTierLike = {
  isOrganization?: boolean | null
  premium?: boolean | null
  premiumPlus?: boolean | null
  verifiedStatus?: string | null
}

export function userColorTier(user: UserTierLike | null | undefined): UserColorTier {
  if (!user) return 'normal'
  if (user.isOrganization) return 'organization'
  if (user.premium || user.premiumPlus) return 'premium'
  if (user.verifiedStatus && user.verifiedStatus !== 'none') return 'verified'
  return 'normal'
}

export function userTierColorVar(tier: UserColorTier): string | null {
  if (tier === 'organization') return 'var(--moh-org)'
  if (tier === 'premium') return 'var(--moh-premium)'
  if (tier === 'verified') return 'var(--moh-verified)'
  return null
}

/** Strength of the wash behind a message you sent. */
const OWN_MESSAGE_TINT_PERCENT = 14
/** Untiered senders have no tier color, so they get a neutral slate wash at the same strength. */
const OWN_MESSAGE_NEUTRAL_COLOR = 'rgb(148 163 184)'

/**
 * Background for a message the viewer sent, shared by every chat surface.
 *
 * A low-opacity wash of the sender's tier color rather than a solid fill: it marks the message
 * as yours without turning it into a colored block, so the body keeps normal foreground text
 * and tier-colored mentions stay legible in both themes.
 */
export function ownMessageTintStyle(tier: UserColorTier): { backgroundColor: string } {
  const color = userTierColorVar(tier) ?? OWN_MESSAGE_NEUTRAL_COLOR
  return {
    backgroundColor: `color-mix(in srgb, ${color} ${OWN_MESSAGE_TINT_PERCENT}%, transparent)`,
  }
}

export function userTierTextClass(tier: UserColorTier, opts?: { important?: boolean; fallback?: string }): string {
  const bang = opts?.important ? '!' : ''
  if (tier === 'organization') return `${bang}text-[var(--moh-org)]`
  if (tier === 'premium') return `${bang}text-[var(--moh-premium)]`
  if (tier === 'verified') return `${bang}text-[var(--moh-verified)]`
  return opts?.fallback ?? ''
}

export function userTierBgClass(tier: UserColorTier, opts?: { fallback?: string }): string {
  if (tier === 'organization') return 'bg-[var(--moh-org)]'
  if (tier === 'premium') return 'bg-[var(--moh-premium)]'
  if (tier === 'verified') return 'bg-[var(--moh-verified)]'
  return opts?.fallback ?? 'bg-gray-500'
}
