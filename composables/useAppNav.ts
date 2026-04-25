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
  /**
   * Hard kill-switch. When `false`, the item is hidden everywhere (left rail,
   * tab bar, mobile "More" sheet) regardless of auth/verification. The route
   * itself remains reachable by direct link — this only hides the entry point.
   */
  enabled?: boolean
  /** Include in the ordered app navigation model shared by left rail and mobile tabs. */
  showInPrimaryNav?: boolean
  /** Presentation grouping inside overflow menus. */
  menuSection?: 'main' | 'footer'
}

export function useAppNav() {
  const { user, isAuthed, isVerified: isVerifiedBase, isPremium } = useAuth()
  // A user is "verified" for nav purposes if they have premium OR verified status.
  const isVerified = computed(() => isPremium.value || isVerifiedBase.value)
  const { activeSpaceId, isPlaying: musicIsPlaying } = useSpaceAudio()
  const showMusicIcon = computed(() => Boolean(activeSpaceId.value) && Boolean(musicIsPlaying.value))

  const profileTo = computed(() => {
    const u = user.value?.username
    // Preserve capitalization in the profile path.
    return u ? `/u/${encodeURIComponent(u)}` : '/settings'
  })

  // Crew label changes with viewer membership: "Crew" (none) → "Your Crew"
  // (member) → "My Crew" (owner). Lazy-load the membership the first time the
  // nav is consulted so we don't pay for it on signed-out marketing routes.
  const { membership: crewMembership, ensureLoaded: ensureCrewLoaded } = useViewerCrew()
  if (import.meta.client) ensureCrewLoaded()
  const crewLabel = computed(() => {
    const role = crewMembership.value?.role
    if (role === 'owner') return 'My Crew'
    if (role === 'member') return 'Your Crew'
    return 'Crew'
  })

  const moreItem = computed<AppNavItem>(() => ({
    key: 'more',
    label: 'More',
    to: '/more',
    icon: 'tabler:dots',
    iconActive: 'tabler:dots',
    requiresAuth: true,
    showInPrimaryNav: false,
    menuSection: 'main',
  }))

  const allItems = computed<AppNavItem[]>(() => [
    { key: 'home', label: 'Home', to: '/home', icon: 'tabler:home', iconActive: 'tabler:home-filled', showInPrimaryNav: true, menuSection: 'main' },

    // Authed-only core items
    { key: 'notifications', label: 'Notifications', to: '/notifications', icon: 'tabler:bell', iconActive: 'tabler:bell-filled', requiresAuth: true, showInPrimaryNav: true, menuSection: 'main' },
    { key: 'messages', label: 'Chat', to: '/chat', icon: 'tabler:message-circle', iconActive: 'tabler:message-circle-filled', requiresAuth: true, requiresVerified: true, showInPrimaryNav: true, menuSection: 'main' },
    {
      key: 'spaces',
      label: 'Spaces',
      to: '/spaces',
      icon: showMusicIcon.value ? 'tabler:music' : 'tabler:layout-grid',
      iconActive: showMusicIcon.value ? 'tabler:music-filled' : 'tabler:layout-grid-filled',
      iconClass: showMusicIcon.value ? 'moh-slow-bounce' : undefined,
      requiresAuth: true,
      requiresVerified: true,
      showInPrimaryNav: true,
      menuSection: 'main',
    },
    // Use Tabler magnifying glass for Explore (Tabler doesn't provide a filled variant for search).
    { key: 'explore', label: 'Explore', to: '/explore', icon: 'tabler:search', iconActive: 'tabler:search', showInPrimaryNav: true, menuSection: 'main' },
    { key: 'articles', label: 'Articles', to: '/articles', icon: 'tabler:article', iconActive: 'tabler:article-filled', showInPrimaryNav: true, menuSection: 'main' },
    { key: 'groups', label: 'Groups', to: '/groups', icon: 'heroicons-outline:user-group', iconActive: 'heroicons-solid:user-group', requiresAuth: false, showInPrimaryNav: true, menuSection: 'main' },
    { key: 'crew', label: crewLabel.value, to: '/crew', icon: 'tabler:shield-check', iconActive: 'tabler:shield-check-filled', requiresAuth: true, requiresVerified: true, showInPrimaryNav: true, menuSection: 'main' },
    { key: 'bookmarks', label: 'Bookmarks', to: '/bookmarks', icon: 'tabler:bookmark', iconActive: 'tabler:bookmark-filled', requiresAuth: true, showInPrimaryNav: true, menuSection: 'main' },
    // Keep these as the Heroicons pair (you preferred the filled/outline look here).
    { key: 'profile', label: 'Profile', to: profileTo.value, icon: 'heroicons-outline:user-circle', iconActive: 'heroicons-solid:user-circle', requiresAuth: true, showInPrimaryNav: true, menuSection: 'main' },
    { key: 'only-me', label: 'Only me', to: '/only-me', icon: 'heroicons-outline:eye-slash', iconActive: 'heroicons-solid:eye-slash', requiresAuth: true, showInPrimaryNav: true, menuSection: 'main' },
    { key: 'settings', label: 'Settings and privacy', to: '/settings', icon: 'tabler:settings', iconActive: 'tabler:settings', requiresAuth: true, showInPrimaryNav: true, menuSection: 'footer' },
    { key: 'feedback', label: 'Send feedback', to: '/feedback', icon: 'tabler:message-circle', iconActive: 'tabler:message-circle-filled', requiresAuth: true, showInPrimaryNav: true, menuSection: 'footer' },
    { key: 'admin', label: 'Admin', to: '/admin', icon: 'tabler:shield', iconActive: 'tabler:shield', requiresAuth: true, requiresAdmin: true, showInPrimaryNav: true, menuSection: 'footer' },

    // Misc
    { key: 'about', label: 'About', to: '/about', icon: 'tabler:info-circle', iconActive: 'tabler:info-circle-filled', showInPrimaryNav: false, menuSection: 'footer' },
    { key: 'status', label: 'Status', to: '/status', icon: 'tabler:bolt', iconActive: 'tabler:bolt', showInPrimaryNav: false, menuSection: 'footer' }
  ])

  const isAdmin = computed(() => Boolean(user.value?.siteAdmin))

  const visible = (item: AppNavItem) => {
    if (item.enabled === false) return false
    if (item.requiresAuth && !isAuthed.value) return false
    if (item.requiresVerified && !isVerified.value) return false
    if (item.requiresAdmin && !isAdmin.value) return false
    return true
  }

  const primaryItems = computed(() => allItems.value.filter((i) => i.showInPrimaryNav && visible(i)))
  const tabItems = computed(() => {
    const items = primaryItems.value
    if (items.length <= 5) return items
    return [...items.slice(0, 4), moreItem.value]
  })

  return { isAuthed, profileTo, allItems, primaryItems, tabItems, moreItem, isItemVisible: visible }
}

