export type AppNavItem = {
  key: string
  label: string
  to: string
  /** Iconify name for inactive state (used by @nuxt/icon). */
  icon: string
  /** Optional Iconify name for active state (filled/solid variant). */
  iconActive?: string
  requiresAuth?: boolean
  requiresVerified?: boolean
  showInLeft?: boolean
  showInTabs?: boolean
}

export function useAppNav() {
  const { user } = useAuth()
  const isAuthed = computed(() => Boolean(user.value?.id))
  const isVerified = computed(() => (user.value?.verifiedStatus ?? 'none') !== 'none')

  const profileTo = computed(() => {
    const u = user.value?.username
    // Preserve capitalization in the profile path.
    return u ? `/u/${encodeURIComponent(u)}` : '/settings'
  })

  const allItems = computed<AppNavItem[]>(() => [
    { key: 'home', label: 'Home', to: '/home', icon: 'tabler:home', iconActive: 'tabler:home-filled', showInLeft: true, showInTabs: true },
    { key: 'explore', label: 'Explore', to: '/explore', icon: 'tabler:compass', iconActive: 'tabler:compass-filled', showInLeft: true, showInTabs: true },

    // Authed-only core items
    { key: 'notifications', label: 'Notifications', to: '/notifications', icon: 'tabler:bell', iconActive: 'tabler:bell-filled', requiresAuth: true, showInLeft: true, showInTabs: true },
    { key: 'messages', label: 'Chat', to: '/chat', icon: 'tabler:message-circle', iconActive: 'tabler:message-circle-filled', requiresAuth: true, requiresVerified: true, showInLeft: true, showInTabs: true },
    { key: 'bookmarks', label: 'Bookmarks', to: '/bookmarks', icon: 'tabler:bookmark', iconActive: 'tabler:bookmark-filled', requiresAuth: true, showInLeft: true, showInTabs: false },
    { key: 'groups', label: 'Groups', to: '/groups', icon: 'heroicons-outline:user-group', iconActive: 'heroicons-solid:user-group', requiresAuth: true, showInLeft: true, showInTabs: false },
    // Keep these as the Heroicons pair (you preferred the filled/outline look here).
    { key: 'only-me', label: 'Only me', to: '/only-me', icon: 'heroicons-outline:eye-slash', iconActive: 'heroicons-solid:eye-slash', requiresAuth: true, showInLeft: true, showInTabs: false },
    { key: 'profile', label: 'Profile', to: profileTo.value, icon: 'heroicons-outline:user-circle', iconActive: 'heroicons-solid:user-circle', requiresAuth: true, showInLeft: true, showInTabs: true },

    // Misc
    { key: 'about', label: 'About', to: '/about', icon: 'tabler:info-circle', iconActive: 'tabler:info-circle-filled', showInLeft: false, showInTabs: false },
    { key: 'status', label: 'Status', to: '/status', icon: 'tabler:bolt', iconActive: 'tabler:bolt', showInLeft: false, showInTabs: false }
  ])

  const visible = (item: AppNavItem) => {
    if (item.requiresAuth && !isAuthed.value) return false
    if (item.requiresVerified && !isVerified.value) return false
    return true
  }

  const leftItems = computed(() => allItems.value.filter((i) => i.showInLeft && visible(i)))
  const tabItems = computed(() => allItems.value.filter((i) => i.showInTabs && visible(i)))

  return { isAuthed, profileTo, leftItems, tabItems }
}

