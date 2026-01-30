export default defineNuxtRouteMiddleware(async (to) => {
  const { user, ensureLoaded } = useAuth()

  // Public routes (no auth check, SSR-safe/prerender-safe).
  const publicPaths = new Set<string>(['/', '/about', '/status', '/test'])
  if (publicPaths.has(to.path)) return
  if (to.path.startsWith('/u/')) return
  // Post permalinks should never force login; show access reasons on the page instead.
  if (to.path.startsWith('/p/')) return
  // Admin routes are protected by admin middleware (404 for non-admins).
  if (to.path === '/admin' || to.path.startsWith('/admin/')) return
  // Allow logged-out browsing of core feed/discovery for now.
  if (to.path === '/home' || to.path === '/explore' || to.path === '/notifications') return

  // If visiting login and already authenticated, go to home.
  if (to.path === '/login') {
    await ensureLoaded()
    if (user.value) {
      const redirect = typeof to.query.redirect === 'string' ? to.query.redirect : null
      if (redirect && redirect.startsWith('/')) return navigateTo(redirect)
      return navigateTo('/home')
    }
    return
  }

  // Protect app-layout pages.
  const requiresAuth = to.meta?.layout === 'app'
  if (!requiresAuth) return

  await ensureLoaded()
  if (!user.value) {
    const redirect = encodeURIComponent(to.fullPath)
    return navigateTo(`/login?redirect=${redirect}`)
  }
})

