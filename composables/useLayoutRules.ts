import { isRightRailForcedHiddenPath, isRightRailSearchHiddenPath, isAdminPath, isSettingsPath, navCompactModePath } from '~/config/routes'

export function useLayoutRules(route = useRoute()) {
  const hideTopBar = computed(() => {
    // Prefer per-route meta for flexibility.
    if (route.meta?.hideTopBar === true) return true
    // Admin/settings pages render their own in-page headers; the global title bar is redundant.
    if (isAdminPath(route.path)) return true
    if (isSettingsPath(route.path)) return true
    return false
  })

  const navCompactMode = computed(() => {
    return navCompactModePath(route.path)
  })

  const isRightRailForcedHidden = computed(() => {
    return isRightRailForcedHiddenPath(route.path)
  })

  const isRightRailSearchHidden = computed(() => {
    return isRightRailSearchHiddenPath(route.path)
  })

  const title = computed(() => {
    // Nuxt provides the current route's meta title via useRoute().meta in many cases.
    // Keep a simple fallback.
    return (route.meta?.title as string) || 'Home'
  })

  return { hideTopBar, navCompactMode, isRightRailForcedHidden, isRightRailSearchHidden, title }
}

