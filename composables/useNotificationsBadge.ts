export function useNotificationsBadge() {
  const { user } = useAuth()

  // Fake count for now.
  const count = computed(() => 5)
  const show = computed(() => count.value > 0)

  const toneClass = computed(() => {
    const u = user.value
    if (u?.premium) return 'moh-notif-badge-premium'
    if (u?.verifiedStatus && u.verifiedStatus !== 'none') return 'moh-notif-badge-verified'
    return 'moh-notif-badge-normal'
  })

  return { count, show, toneClass }
}

