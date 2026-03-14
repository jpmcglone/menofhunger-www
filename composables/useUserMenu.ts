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
      label: 'Feature requests',
      iconName: 'tabler:bulb',
      command: () => navigateTo('/feedback'),
    },
    ...(user.value?.premiumPlus
      ? []
      : ([
          {
            label: 'Upgrade',
            iconName: 'tabler:sparkles',
            command: () => navigateTo('/tiers'),
          },
        ] as MenuItemWithIcon[])),
    {
      label: 'Settings & privacy',
      iconName: 'tabler:settings',
      command: () => navigateTo('/settings'),
    },
    { separator: true },
    {
      label: 'Log out',
      iconName: 'tabler:door-exit',
      command: () => {
        confirmVisible.value = true
      },
    },
  ])

  function openLogoutConfirm() {
    confirmVisible.value = true
  }

  async function confirmLogout() {
    confirmVisible.value = false
    await logout()
  }

  return { menuItems, confirmVisible, confirmLogout, openLogoutConfirm }
}

