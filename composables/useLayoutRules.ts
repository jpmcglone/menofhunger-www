export function useLayoutRules(route = useRoute()) {
  const hideTopBar = computed(() => {
    // Prefer per-route meta for flexibility.
    if (route.meta?.hideTopBar === true) return true
    return false
  })

  const navCompactMode = computed(() => {
    // Some routes need more horizontal space in the center column.
    // Force the left nav to remain compact (even on desktop) for those routes.
    const forced: string[] = []
    return forced.some((p) => route.path === p || route.path.startsWith(`${p}/`))
  })

  const isRightRailForcedHidden = computed(() => {
    // On these routes we want the center column to be as wide as possible.
    const forced = ['/messages', '/admin', '/settings', '/roadmap', '/tiers']
    return forced.some((p) => route.path === p || route.path.startsWith(`${p}/`))
  })

  const isRightRailSearchHidden = computed(() => {
    // On Explore, the search UI is part of the center column.
    const forced = ['/explore']
    return forced.some((p) => route.path === p || route.path.startsWith(`${p}/`))
  })

  const title = computed(() => {
    // Nuxt provides the current route's meta title via useRoute().meta in many cases.
    // Keep a simple fallback.
    return (route.meta?.title as string) || 'Home'
  })

  return { hideTopBar, navCompactMode, isRightRailForcedHidden, isRightRailSearchHidden, title }
}

