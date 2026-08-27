/** Surfaces that belong to a person, not a page they operate. */
const PERSON_ONLY: ReadonlyArray<{ prefix: string; feature: string }> = [
  { prefix: '/check-ins', feature: 'Check-ins' },
  { prefix: '/fitness', feature: 'Fitness' },
  { prefix: '/invite', feature: 'Invites' },
  { prefix: '/referrals', feature: 'Invites' },
  { prefix: '/coins', feature: 'Coins' },
  { prefix: '/crew', feature: 'Crew' },
  { prefix: '/settings/billing', feature: 'Billing' },
  { prefix: '/settings/fitness', feature: 'Fitness' },
  { prefix: '/settings/verification', feature: 'Verification' },
  { prefix: '/verification', feature: 'Verification' },
  { prefix: '/admin', feature: 'Admin' },
  { prefix: '/daily', feature: 'Daily' },
]

export function personOnlyFeatureForPath(pathname: string): string | null {
  const path = (pathname.split(/[?#]/)[0] || '/').replace(/\/+$/, '') || '/'
  for (const { prefix, feature } of PERSON_ONLY) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return feature
  }
  return null
}

export function isPersonOnlyPath(pathname: string): boolean {
  return personOnlyFeatureForPath(pathname) != null
}
