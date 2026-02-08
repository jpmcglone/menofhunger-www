import type { MenuItem } from 'primevue/menuitem'

export function useUserMenu() {
  const { user, logout } = useAuth()

  const confirmVisible = ref(false)

  function viewProfile() {
    const username = (user.value?.username ?? '').trim()
    if (username) return navigateTo(`/u/${encodeURIComponent(username)}`)
    // If the user hasn't set a username yet, their public profile doesn't exist.
    return navigateTo('/settings')
  }

  type MenuItemWithIcon = MenuItem & { iconName?: string }

  const menuItems = computed<MenuItemWithIcon[]>(() => [
    ...(user.value?.siteAdmin
      ? ([
          {
            label: 'Admin',
            iconName: 'tabler:shield',
            command: () => navigateTo('/admin'),
          },
          { separator: true },
        ] as MenuItemWithIcon[])
      : []),
    {
      label: 'View profile',
      iconName: 'tabler:user',
      command: () => viewProfile(),
    },
    { separator: true },
    {
      label: 'Settings & privacy',
      iconName: 'tabler:settings',
      command: () => navigateTo('/settings'),
    },
    {
      label: 'Send feedback',
      iconName: 'tabler:message-circle',
      command: () => navigateTo('/feedback'),
    },
    { separator: true },
    {
      label: 'Log out',
      iconName: 'tabler:logout',
      command: () => {
        confirmVisible.value = true
      },
    },
  ])

  async function confirmLogout() {
    confirmVisible.value = false
    const { onLogout } = usePushNotifications()
    await onLogout()
    await logout()
  }

  return { menuItems, confirmVisible, confirmLogout }
}

