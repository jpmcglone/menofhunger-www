/** Where a page (non-person) account lands when it opens a person-only route; null when allowed. */
export function personOnlyLandingPath(pathname: string): string | null {
  if (pathname === '/settings/billing' || pathname.startsWith('/settings/billing/')) return '/settings/account'
  if (pathname === '/settings/fitness' || pathname.startsWith('/settings/fitness/')) return '/settings/account'
  if (pathname === '/settings/verification' || pathname.startsWith('/settings/verification/')) {
    return '/settings/account'
  }
  const personOnlyPrefixes = [
    '/check-ins',
    '/fitness',
    '/invite',
    '/referrals',
    '/coins',
    '/crew',
    '/verification',
    '/admin',
    '/daily',
  ]
  if (personOnlyPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return '/home'
  }
  return null
}
