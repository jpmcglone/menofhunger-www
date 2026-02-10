export type RouteHeaderDefaults = { icon?: string; description?: string }

export const PUBLIC_PATHS = new Set<string>(['/about', '/status', '/roadmap', '/tiers'])

// Allow logged-out browsing of core feed/discovery for now.
export const LOGGED_OUT_ALLOWED_PATHS = new Set<string>(['/home', '/explore', '/notifications', '/feedback'])

// After logout, these pages are safe to keep the user on (even if they use the `app` layout).
export const AUTH_ALLOWED_AFTER_LOGOUT_PATHS = new Set<string>([
  '/home',
  '/explore',
  '/notifications',
  '/roadmap',
  '/tiers',
  '/feedback',
])

export function isAdminPath(path: string): boolean {
  return path === '/admin' || path.startsWith('/admin/')
}

export function isSettingsPath(path: string): boolean {
  return path === '/settings' || path.startsWith('/settings/')
}

export function isUserProfilePath(path: string): boolean {
  return path.startsWith('/u/')
}

export function isPostPermalinkPath(path: string): boolean {
  return path.startsWith('/p/')
}

export function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.has(path)
}

export function isPublicPrefixPath(path: string): boolean {
  return isUserProfilePath(path) || isPostPermalinkPath(path)
}

export function isLoggedOutAllowedPath(path: string): boolean {
  return LOGGED_OUT_ALLOWED_PATHS.has(path)
}

export function isAuthAllowedAfterLogoutPath(path: string): boolean {
  return AUTH_ALLOWED_AFTER_LOGOUT_PATHS.has(path)
}

export function isNavActive(params: { currentPath: string; to: string }): boolean {
  const { currentPath, to } = params
  if (to === '/home') return currentPath === '/home'
  return currentPath === to || currentPath.startsWith(`${to}/`)
}

export function navCompactModePath(path: string): boolean {
  // Some routes need more horizontal space in the center column.
  // Force the left nav to remain compact (even on desktop) for those routes.
  return path === '/tiers' || path.startsWith('/tiers/')
}

export function isRightRailForcedHiddenPath(path: string): boolean {
  // On these routes we want the center column to be as wide as possible.
  const forced = ['/chat', '/admin', '/settings', '/roadmap', '/tiers', '/radio', '/comparison']
  return forced.some((p) => path === p || path.startsWith(`${p}/`))
}

export function isRightRailSearchHiddenPath(path: string): boolean {
  // On Explore, the search UI is part of the center column.
  return path === '/explore' || path.startsWith('/explore/')
}

export function routeHeaderDefaultsFor(path: string): RouteHeaderDefaults {
  if (path === '/notifications') return { icon: 'tabler:bell', description: 'Replies, follows, and updates from your network.' }
  if (path === '/chat') return { icon: 'tabler:mail', description: 'Chat conversations and chat requests.' }
  if (path.startsWith('/bookmarks')) return { icon: 'tabler:bookmark', description: 'Saved posts and folders.' }
  if (path === '/explore') return { icon: 'tabler:search', description: 'Search and discover.' }
  if (path === '/groups') return { icon: 'tabler:users', description: 'Brotherhood circles and challenges. Coming soon.' }
  if (path === '/feedback') return { icon: 'tabler:send', description: 'Help us improve.' }
  if (path === '/only-me') return { icon: undefined, description: 'Private posts that only you can see. These never appear in feeds.' }
  if (path === '/roadmap') return { icon: 'tabler:map', description: 'What we’re building and when.' }
  if (path === '/tiers') return { icon: 'tabler:tags', description: 'Unverified, Verified, and Premium — what you get with each tier.' }
  return { icon: undefined, description: undefined }
}

export function isComposerEntrypointPath(params: { path: string; profileTo?: string | null }): boolean {
  const p = params.path
  if (p === '/home') return true
  if (p === '/explore') return true
  if (p === '/notifications') return true
  if (p === '/only-me') return true
  // Reserved route (future-proof): treat current user profile as /profile if it ever exists.
  if (p === '/profile') return true
  // Current user profile route today is /u/:username via useAppNav().
  if (params.profileTo && p === params.profileTo) return true
  // Any user profile page.
  if (/^\/u\/[^/]+$/.test(p)) return true
  return false
}

