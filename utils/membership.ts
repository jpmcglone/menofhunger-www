import type { TierId } from '~/config/tiers.data'
import type { BillingMe, BillingTier } from '~/types/api'
import type { UserTierLike } from '~/utils/user-tier'

export const appleSubscriptionsUrl = 'https://apps.apple.com/account/subscriptions'
const ranks: Record<TierId, number> = { unverified: 0, verified: 1, premium: 2, premiumPlus: 3 }

export function membershipTier(user: UserTierLike | null | undefined, billing?: BillingMe | null): TierId | null {
  if (!user) return null
  if (billing?.premiumPlus ?? user.premiumPlus) return 'premiumPlus'
  if (billing?.premium ?? user.premium) return 'premium'
  return (billing ? billing.verified : user.verifiedStatus && user.verifiedStatus !== 'none') ? 'verified' : 'unverified'
}

export function includesMembership(current: TierId | null, tier: TierId): boolean {
  return current !== null && ranks[current] > ranks[tier]
}

export function membershipAccent(tier: TierId | null): string {
  if (tier === 'verified') return 'var(--moh-verified)'
  if (tier === 'premium' || tier === 'premiumPlus') return 'var(--moh-premium)'
  return 'var(--moh-text-muted)'
}

export function membershipSignIn(tier: TierId): string {
  return `/login?redirect=${encodeURIComponent(`/tiers?plan=${tier}`)}`
}

export type MembershipAction = { label: string; to?: string; tier?: BillingTier; primary?: boolean; included?: boolean }

export function membershipAction(tier: TierId, current: TierId | null, billing: BillingMe | null): MembershipAction {
  if (!current) return { label: tier === 'unverified' ? 'Create an account' : 'Sign in to choose', to: membershipSignIn(tier) }
  if (includesMembership(current, tier)) return { label: 'Included', included: true }
  if (tier === 'unverified' || (current === 'unverified' && tier === 'verified')) return { label: 'Get verified', to: '/settings/verification', primary: true }
  if (current === 'unverified') return { label: 'Verify to upgrade', to: '/settings/verification', primary: true }
  if (tier === 'verified') return { label: 'View verification', to: '/settings/verification' }
  if (billing?.source === 'apple') return { label: 'Manage with Apple', to: appleSubscriptionsUrl }
  if (tier === current) return { label: 'Manage membership', to: '/settings/billing' }
  return { label: `Upgrade to ${tier === 'premiumPlus' ? 'Premium+' : 'Premium'}`, tier, primary: true }
}
