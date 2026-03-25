export type RouteHeaderDefaults = { icon?: string; description?: string }

export const PUBLIC_PATHS = new Set<string>(['/about', '/status', '/roadmap', '/tiers'])

// Allow logged-out browsing of core feed/discovery for now.
export const LOGGED_OUT_ALLOWED_PATHS = new Set<string>(['/home', '/explore', '/notifications', '/feedback', '/articles'])

// After logout, these pages are safe to keep the user on (even if they use the `app` layout).
export const AUTH_ALLOWED_AFTER_LOGOUT_PATHS = new Set<string>([
  '/home',
  '/explore',
  '/notifications',
  '/roadmap',
  '/tiers',
  '/feedback',
  '/articles',
  '/groups',
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

export function isArticlePermalinkPath(path: string): boolean {
  return path.startsWith('/a/')
}

export function isSpacePermalinkPath(path: string): boolean {
  return path.startsWith('/s/')
}

export function isPublicPrefixPath(path: string): boolean {
  return isUserProfilePath(path) || isPostPermalinkPath(path) || isArticlePermalinkPath(path) || isSpacePermalinkPath(path)
}

export function isGroupDetailPath(path: string): boolean {
  return path.startsWith('/g/')
}

export function isGroupsHubPath(path: string): boolean {
  return path === '/groups' || path.startsWith('/groups/')
}

export function isLoggedOutAllowedPath(path: string): boolean {
  return LOGGED_OUT_ALLOWED_PATHS.has(path) || isGroupDetailPath(path) || isGroupsHubPath(path)
}

export function isAuthAllowedAfterLogoutPath(path: string): boolean {
  return AUTH_ALLOWED_AFTER_LOGOUT_PATHS.has(path)
}

export function isNavActive(params: { currentPath: string; to: string }): boolean {
  const { currentPath, to } = params
  if (to === '/home') return currentPath === '/home'
  if (to === '/groups') {
    // Groups nav should stay active for both hub routes and group detail routes.
    return currentPath === '/groups' || currentPath.startsWith('/groups/') || currentPath.startsWith('/g/')
  }
  if (to === '/articles') {
    // Keep Articles nav active on both listing routes and article permalinks.
    return currentPath === '/articles' || currentPath.startsWith('/articles/') || currentPath.startsWith('/a/')
  }
  if (to === '/spaces') {
    return currentPath === '/spaces' || currentPath.startsWith('/spaces/') || currentPath.startsWith('/s/')
  }
  return currentPath === to || currentPath.startsWith(`${to}/`)
}

export function navCompactModePath(path: string): boolean {
  // Some routes need more horizontal space in the center column.
  // Force the left nav to remain compact (even on desktop) for those routes.
  return (
    path === '/tiers' ||
    path.startsWith('/tiers/') ||
    path === '/radio' ||
    path.startsWith('/radio/') ||
    path.startsWith('/a/')
  )
}

export function isRightRailForcedHiddenPath(path: string): boolean {
  // Admin user detail pages should show the right rail.
  if (/^\/admin\/users\/[^/]+/.test(path) && path !== '/admin/users') return false
  // On these routes we want the center column to be as wide as possible.
  const forced = ['/chat', '/admin', '/settings', '/roadmap', '/tiers', '/comparison']
  if (forced.some((p) => path === p || path.startsWith(`${p}/`))) return true
  // Article editor needs the full center column width.
  if (path === '/articles/new' || path.startsWith('/articles/edit/')) return true
  return false
}

export function isRightRailSearchHiddenPath(path: string): boolean {
  // On Explore, the search UI is part of the center column.
  return (
    path === '/explore' ||
    path.startsWith('/explore/') ||
    path === '/spaces' ||
    path.startsWith('/spaces/') ||
    path.startsWith('/s/') ||
    path === '/radio' ||
    path.startsWith('/radio/')
  )
}

export function routeHeaderDefaultsFor(path: string): RouteHeaderDefaults {
  if (path === '/notifications') return { icon: 'tabler:bell', description: 'Replies, follows, and updates from your network.' }
  if (path === '/chat') return { icon: 'tabler:mail', description: 'Chat conversations and chat requests.' }
  if (path.startsWith('/bookmarks')) return { icon: 'tabler:bookmark', description: 'Saved posts and folders.' }
  if (path === '/explore') return { icon: 'tabler:search', description: 'Search and discover.' }
  if (path === '/groups' || path.startsWith('/groups/') || path.startsWith('/g/')) {
    return { icon: 'tabler:users', description: 'Community groups and shared conversations.' }
  }
  if (path === '/feedback') return { icon: 'tabler:send', description: 'Help us improve.' }
  if (path === '/only-me') return { icon: undefined, description: 'Private posts that only you can see. These never appear in feeds.' }
  if (path === '/roadmap') return { icon: 'tabler:map', description: 'What we’re building and when.' }
  if (path === '/tiers') return { icon: 'tabler:tags', description: 'Unverified, Verified, and Premium — what you get with each tier.' }
  if (path === '/coins') return { icon: 'tabler:coin', description: 'Your coin balance, transfers, and activity.' }
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
  // Any user profile page (including tab sub-routes).
  if (/^\/u\/[^/]+(\/(?:posts|replies|articles|media))?$/.test(p)) return true
  // Group detail page.
  if (/^\/g\/[^/]+$/.test(p)) return true
  return false
}

