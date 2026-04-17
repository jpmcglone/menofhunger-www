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
  showInLeft?: boolean
  showInTabs?: boolean
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
  // Crew is still WIP — hide its nav entry in production. /crew still resolves
  // for anyone with a direct link; we only suppress discovery via the rail and
  // mobile "More" sheet. Staging + local dev keep the entry so we can keep
  // iterating on it.
  const env = String(useRuntimeConfig().public?.sentry?.environment || '').trim().toLowerCase()
  const crewEnabled = computed(() => env !== 'production')
  // Skip the membership probe entirely in environments where crew is hidden,
  // so we don't issue a `/crew/me` request just to compute a label nobody
  // ever sees.
  if (import.meta.client && crewEnabled.value) ensureCrewLoaded()
  const crewLabel = computed(() => {
    const role = crewMembership.value?.role
    if (role === 'owner') return 'My Crew'
    if (role === 'member') return 'Your Crew'
    return 'Crew'
  })

  const allItems = computed<AppNavItem[]>(() => [
    { key: 'home', label: 'Home', to: '/home', icon: 'tabler:home', iconActive: 'tabler:home-filled', showInLeft: true, showInTabs: true },

    // Authed-only core items
    { key: 'notifications', label: 'Notifications', to: '/notifications', icon: 'tabler:bell', iconActive: 'tabler:bell-filled', requiresAuth: true, showInLeft: true, showInTabs: true },
    { key: 'messages', label: 'Chat', to: '/chat', icon: 'tabler:message-circle', iconActive: 'tabler:message-circle-filled', requiresAuth: true, requiresVerified: true, showInLeft: true, showInTabs: true },
    // Use Tabler magnifying glass for Explore (Tabler doesn't provide a filled variant for search).
    { key: 'explore', label: 'Explore', to: '/explore', icon: 'tabler:search', iconActive: 'tabler:search', showInLeft: true, showInTabs: false },
    { key: 'articles', label: 'Articles', to: '/articles', icon: 'tabler:article', iconActive: 'tabler:article-filled', showInLeft: true, showInTabs: false },
    { key: 'groups', label: 'Groups', to: '/groups', icon: 'heroicons-outline:user-group', iconActive: 'heroicons-solid:user-group', requiresAuth: false, showInLeft: true, showInTabs: false },
    { key: 'crew', label: crewLabel.value, to: '/crew', icon: 'tabler:shield-check', iconActive: 'tabler:shield-check-filled', requiresAuth: true, requiresVerified: true, enabled: crewEnabled.value, showInLeft: true, showInTabs: false },
    { key: 'bookmarks', label: 'Bookmarks', to: '/bookmarks', icon: 'tabler:bookmark', iconActive: 'tabler:bookmark-filled', requiresAuth: true, showInLeft: false, showInTabs: false },
    // Keep these as the Heroicons pair (you preferred the filled/outline look here).
    { key: 'profile', label: 'Profile', to: profileTo.value, icon: 'heroicons-outline:user-circle', iconActive: 'heroicons-solid:user-circle', requiresAuth: true, showInLeft: false, showInTabs: false },
    { key: 'only-me', label: 'Only me', to: '/only-me', icon: 'heroicons-outline:eye-slash', iconActive: 'heroicons-solid:eye-slash', requiresAuth: true, showInLeft: false, showInTabs: false },
    {
      key: 'spaces',
      label: 'Spaces',
      to: '/spaces',
      icon: showMusicIcon.value ? 'tabler:music' : 'tabler:layout-grid',
      iconActive: showMusicIcon.value ? 'tabler:music-filled' : 'tabler:layout-grid-filled',
      iconClass: showMusicIcon.value ? 'moh-slow-bounce' : undefined,
      requiresAuth: true,
      requiresVerified: true,
      showInLeft: true,
      showInTabs: true,
    },
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
    if (item.enabled === false) return false
    if (item.requiresAuth && !isAuthed.value) return false
    if (item.requiresVerified && !isVerified.value) return false
    if (item.requiresAdmin && !isAdmin.value) return false
    return true
  }

  const leftItems = computed(() => allItems.value.filter((i) => i.showInLeft && visible(i)))
  // When the user is signed out, the bottom tab bar mirrors the left rail.
  // Otherwise the tab bar would degrade to just `home` (every other `showInTabs: true`
  // item — notifications, messages, spaces, more — is `requiresAuth: true` and filters
  // out), leaving anonymous mobile visitors with no way to reach Explore / Articles /
  // Groups from the primary nav. Logged-in users still get the curated tab set
  // (home, notifications, messages, spaces, more).
  const tabItems = computed(() => {
    if (!isAuthed.value) {
      return allItems.value.filter((i) => i.showInLeft && visible(i))
    }
    return allItems.value.filter((i) => i.showInTabs && visible(i))
  })
  const moreMenuKeys = new Set(['bookmarks', 'profile', 'only-me'])
  const moreItems = computed(() => allItems.value.filter((i) => moreMenuKeys.has(i.key) && visible(i)))

  return { isAuthed, profileTo, allItems, leftItems, tabItems, moreItems, isItemVisible: visible }
}

