export type AppNavItem = {
  key: string
  label: string
  to: string
  /** Iconify name for inactive state (used by @nuxt/icon). */
  icon: string
  /** Optional Iconify name for active state (filled/solid variant). */
  iconActive?: string
  /** Optional extra class for the icon element. */
  iconClass?: string
  requiresAuth?: boolean
  requiresVerified?: boolean
  /** Only show for site admins (e.g. Admin link). */
  requiresAdmin?: boolean
  showInLeft?: boolean
  showInTabs?: boolean
}

export function useAppNav() {
  const { user, isAuthed, isVerified: isVerifiedBase, isPremium } = useAuth()
  // A user is "verified" for nav purposes if they have premium OR verified status.
  const isVerified = computed(() => isPremium.value || isVerifiedBase.value)
  const { stationId: playbackStationId, isPlaying: musicIsPlaying } = useSpaceAudio()
  const showMusicIcon = computed(() => Boolean(playbackStationId.value) && Boolean(musicIsPlaying.value))

  const profileTo = computed(() => {
    const u = user.value?.username
    // Preserve capitalization in the profile path.
    return u ? `/u/${encodeURIComponent(u)}` : '/settings'
  })

  const allItems = computed<AppNavItem[]>(() => [
    { key: 'home', label: 'Home', to: '/home', icon: 'tabler:home', iconActive: 'tabler:home-filled', showInLeft: true, showInTabs: true },

    // Authed-only core items
    { key: 'notifications', label: 'Notifications', to: '/notifications', icon: 'tabler:bell', iconActive: 'tabler:bell-filled', requiresAuth: true, showInLeft: true, showInTabs: true },
    {
      key: 'spaces',
      label: 'Spaces',
      to: '/spaces',
      icon: showMusicIcon.value ? 'tabler:music' : 'tabler:layout-grid',
      iconActive: showMusicIcon.value ? 'tabler:music' : 'tabler:layout-grid',
      iconClass: showMusicIcon.value ? 'moh-slow-bounce' : undefined,
      requiresAuth: true,
      requiresVerified: true,
      showInLeft: true,
      showInTabs: true,
    },
    { key: 'messages', label: 'Chat', to: '/chat', icon: 'tabler:message-circle', iconActive: 'tabler:message-circle-filled', requiresAuth: true, requiresVerified: true, showInLeft: true, showInTabs: true },
    // Use Tabler magnifying glass for Explore (Tabler doesn't provide a filled variant for search).
    { key: 'explore', label: 'Explore', to: '/explore', icon: 'tabler:search', iconActive: 'tabler:search', showInLeft: true, showInTabs: false },
    { key: 'groups', label: 'Groups', to: '/groups', icon: 'heroicons-outline:user-group', iconActive: 'heroicons-solid:user-group', requiresAuth: true, showInLeft: true, showInTabs: false },
    { key: 'bookmarks', label: 'Bookmarks', to: '/bookmarks', icon: 'tabler:bookmark', iconActive: 'tabler:bookmark-filled', requiresAuth: true, showInLeft: true, showInTabs: false },
    // Keep these as the Heroicons pair (you preferred the filled/outline look here).
    { key: 'profile', label: 'Profile', to: profileTo.value, icon: 'heroicons-outline:user-circle', iconActive: 'heroicons-solid:user-circle', requiresAuth: true, showInLeft: true, showInTabs: false },
    { key: 'only-me', label: 'Only me', to: '/only-me', icon: 'heroicons-outline:eye-slash', iconActive: 'heroicons-solid:eye-slash', requiresAuth: true, showInLeft: true, showInTabs: false },
    { key: 'more', label: 'More', to: '/more', icon: 'tabler:dots', iconActive: 'tabler:dots', requiresAuth: true, showInLeft: false, showInTabs: true },
    { key: 'settings', label: 'Settings and privacy', to: '/settings', icon: 'tabler:settings', iconActive: 'tabler:settings', requiresAuth: true, showInLeft: false, showInTabs: false },
    { key: 'feedback', label: 'Send feedback', to: '/feedback', icon: 'tabler:message-circle', iconActive: 'tabler:message-circle-filled', requiresAuth: true, showInLeft: false, showInTabs: false },
    { key: 'admin', label: 'Admin', to: '/admin', icon: 'tabler:shield', iconActive: 'tabler:shield', requiresAuth: true, requiresAdmin: true, showInLeft: false, showInTabs: false },

    // Misc
    { key: 'about', label: 'About', to: '/about', icon: 'tabler:info-circle', iconActive: 'tabler:info-circle-filled', showInLeft: false, showInTabs: false },
    { key: 'status', label: 'Status', to: '/status', icon: 'tabler:bolt', iconActive: 'tabler:bolt', showInLeft: false, showInTabs: false }
  ])

  const isAdmin = computed(() => Boolean(user.value?.siteAdmin))

  const visible = (item: AppNavItem) => {
    if (item.requiresAuth && !isAuthed.value) return false
    if (item.requiresVerified && !isVerified.value) return false
    if (item.requiresAdmin && !isAdmin.value) return false
    return true
  }

  const leftItems = computed(() => allItems.value.filter((i) => i.showInLeft && visible(i)))
  const tabItems = computed(() => allItems.value.filter((i) => i.showInTabs && visible(i)))

  return { isAuthed, profileTo, allItems, leftItems, tabItems, isItemVisible: visible }
}

