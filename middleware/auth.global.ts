import { isAdminPath, isArticlePermalinkPath, isLoggedOutAllowedPath, isPostPermalinkPath, isPublicPath, isSpacePermalinkPath, isUserProfilePath } from '~/config/routes'
import { isSafeRedirect } from '~/utils/url'

export default defineNuxtRouteMiddleware(async (to) => {
  const { user, ensureLoaded, apiUnreachable } = useAuth()

  // /: redirect logged-in users to /home (SSR + client). Anonymous see landing.
  if (to.path === '/') {
    await ensureLoaded()
    if (user.value) return navigateTo('/home')
    return
  }

  // Public routes (no auth check, SSR-safe/prerender-safe).
  if (isPublicPath(to.path)) return
  if (isUserProfilePath(to.path)) return
  // Post/article permalinks should never force login; show access reasons on the page instead.
  if (isPostPermalinkPath(to.path)) return
  if (isArticlePermalinkPath(to.path)) return
  // Space permalinks (/s/:username) are publicly viewable with obfuscated content for guests.
  if (isSpacePermalinkPath(to.path)) return
  // Admin routes are protected by admin middleware (404 for non-admins).
  if (isAdminPath(to.path)) return
  // Allow logged-out browsing of core feed/discovery for now.
  if (isLoggedOutAllowedPath(to.path)) return

  // If visiting login and already authenticated, go to home.
  if (to.path === '/login') {
    await ensureLoaded()
    if (user.value) {
      const redirect = typeof to.query.redirect === 'string' ? to.query.redirect : null
      if (isSafeRedirect(redirect)) return navigateTo(redirect!)
      return navigateTo('/home')
    }
    return
  }

  // Protect app-layout pages.
  const requiresAuth = to.meta?.layout === 'app'
  if (!requiresAuth) return

  await ensureLoaded()
  if (!user.value) {
    // If the API is unreachable (network error, not a 401) and there's a session cookie,
    // let the user through in degraded mode — the layout will show a connectivity banner.
    // This prevents redirecting users to login during a brief API outage or rolling deploy.
    if (apiUnreachable.value) {
      const cookieHeader = import.meta.server ? useRequestHeaders(['cookie']).cookie : document.cookie
      if (cookieHeader?.includes('moh_session=')) return
    }
    const redirect = encodeURIComponent(to.fullPath)
    return navigateTo(`/login?redirect=${redirect}`)
  }
})

