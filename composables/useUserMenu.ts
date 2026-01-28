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

  const menuItems = computed<MenuItem[]>(() => [
    ...(user.value?.siteAdmin
      ? ([
          {
            label: 'Admin',
            icon: 'pi pi-shield',
            command: () => navigateTo('/admin'),
          },
          { separator: true },
        ] as MenuItem[])
      : []),
    {
      label: 'View profile',
      icon: 'pi pi-user',
      command: () => viewProfile(),
    },
    { separator: true },
    {
      label: 'Settings & privacy',
      icon: 'pi pi-cog',
      command: () => navigateTo('/settings'),
    },
    {
      label: 'Send feedback',
      icon: 'pi pi-comment',
      command: () => navigateTo('/feedback'),
    },
    { separator: true },
    {
      label: 'Log out',
      icon: 'pi pi-sign-out',
      command: () => {
        confirmVisible.value = true
      },
    },
  ])

  async function confirmLogout() {
    confirmVisible.value = false
    await logout()
  }

  return { menuItems, confirmVisible, confirmLogout }
}

