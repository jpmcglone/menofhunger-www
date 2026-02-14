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
