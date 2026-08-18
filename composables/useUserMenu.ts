import type { MenuItem } from 'primevue/menuitem'

export function useUserMenu() {
  const { user, logout, isPageAccount } = useAuth()
  const { confirm } = useAppConfirm()

  async function requestLogout() {
    const ok = await confirm({
      header: 'Log out?',
      message: 'Are you sure you want to log out?',
      confirmLabel: 'Log out',
      confirmSeverity: 'danger',
      confirmIcon: 'tabler:door-exit',
    })
    if (ok) await logout()
  }

  function viewProfile() {
    const username = (user.value?.username ?? '').trim()
    if (username) return navigateTo(`/u/${encodeURIComponent(username)}`)
    // If the user hasn't set a username yet, their public profile doesn't exist.
    return navigateTo('/settings')
  }

  type MenuItemWithIcon = MenuItem & { iconName?: string }

  const profileUrl = computed(() => {
    const username = (user.value?.username ?? '').trim()
    return username ? `/u/${encodeURIComponent(username)}` : '/settings'
  })

  const menuItems = computed<MenuItemWithIcon[]>(() => [
    ...(user.value?.siteAdmin && !isPageAccount.value
      ? ([
          {
            label: 'Admin',
            iconName: 'tabler:shield',
            url: '/admin',
            command: () => navigateTo('/admin'),
          },
          { separator: true },
        ] as MenuItemWithIcon[])
      : []),
    {
      label: 'View profile',
      iconName: 'tabler:user',
      url: profileUrl.value,
      command: () => viewProfile(),
    },
    ...(!isPageAccount.value
      ? ([
          {
            label: 'Coins',
            iconName: 'tabler:coin',
            url: '/coins',
            command: () => navigateTo('/coins'),
          },
          { separator: true },
        ] as MenuItemWithIcon[])
      : []),
    ...(!isPageAccount.value
      ? ([
          {
            label: 'Invite friends',
            iconName: 'tabler:gift',
            url: '/invite',
            command: () => navigateTo('/invite'),
          },
        ] as MenuItemWithIcon[])
      : []),
    {
      label: 'Feature requests',
      iconName: 'tabler:bulb',
      url: '/feedback',
      command: () => navigateTo('/feedback'),
    },
    ...(!isPageAccount.value && !user.value?.premiumPlus
      ? ([
          {
            label: 'Upgrade',
            iconName: 'tabler:sparkles',
            url: '/tiers',
            command: () => navigateTo('/tiers'),
          },
        ] as MenuItemWithIcon[])
      : []),
    {
      label: 'Settings & privacy',
      iconName: 'tabler:settings',
      url: '/settings',
      command: () => navigateTo('/settings'),
    },
    { separator: true },
    {
      label: 'Log out',
      iconName: 'tabler:door-exit',
      command: () => requestLogout(),
    },
  ])

  return { menuItems, requestLogout }
}

