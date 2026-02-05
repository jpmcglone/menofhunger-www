export type AppNavItem = {
  key: string
  label: string
  to: string
  icon?: string
  requiresAuth?: boolean
  showInLeft?: boolean
  showInTabs?: boolean
}

export function useAppNav() {
  const { user } = useAuth()
  const isAuthed = computed(() => Boolean(user.value?.id))

  const profileTo = computed(() => {
    const u = user.value?.username
    return u ? `/u/${u.toLowerCase()}` : '/settings'
  })

  const allItems = computed<AppNavItem[]>(() => [
    { key: 'home', label: 'Home', to: '/home', icon: 'pi-home', showInLeft: true, showInTabs: true },
    { key: 'explore', label: 'Explore', to: '/explore', icon: 'pi-search', showInLeft: true, showInTabs: true },

    // Authed-only core items
    // Public for now (prod wants it visible/usable even if logged out).
    { key: 'notifications', label: 'Notifications', to: '/notifications', icon: 'pi-bell', showInLeft: true, showInTabs: true },
    { key: 'messages', label: 'Chat', to: '/messages', icon: 'pi-envelope', requiresAuth: true, showInLeft: true, showInTabs: true },
    { key: 'bookmarks', label: 'Bookmarks', to: '/bookmarks', icon: 'pi-bookmark', requiresAuth: true, showInLeft: true, showInTabs: false },
    { key: 'groups', label: 'Groups', to: '/groups', icon: 'pi-users', requiresAuth: true, showInLeft: true, showInTabs: false },
    { key: 'only-me', label: 'Only me', to: '/only-me', icon: 'pi-eye-slash', requiresAuth: true, showInLeft: true, showInTabs: false },
    { key: 'profile', label: 'Profile', to: profileTo.value, icon: 'pi-user', requiresAuth: true, showInLeft: true, showInTabs: true },

    // Misc
    { key: 'about', label: 'About', to: '/about', icon: 'pi-info-circle', showInLeft: true, showInTabs: false },
    { key: 'status', label: 'Status', to: '/status', icon: 'pi-bolt', showInLeft: false, showInTabs: false }
  ])

  const visible = (item: AppNavItem) => !item.requiresAuth || isAuthed.value

  const leftItems = computed(() => allItems.value.filter((i) => i.showInLeft && visible(i)))
  const tabItems = computed(() => allItems.value.filter((i) => i.showInTabs && visible(i)))

  return { isAuthed, profileTo, leftItems, tabItems }
}

