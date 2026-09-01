import { userColorTier } from '~/utils/user-tier'

/**
 * Pending group invites the viewer still needs to accept or decline.
 * Stays until they act — viewing notifications does not clear it.
 * `useBadgeHydration` owns bootstrap; `refresh` is for sockets / explicit callers.
 */
export function useGroupInvitesBadge() {
  const { user } = useAuth()
  const groupInvites = useGroupInvites()

  const count = useState<number>('group-invites-badge-count', () => 0)

  function setCount(value: number) {
    count.value = Math.max(0, Math.floor(Number(value) || 0))
  }

  const show = computed(() => count.value > 0)
  const displayCount = computed(() => (count.value >= 99 ? '99+' : String(count.value)))
  const toneClass = computed(() => {
    const tier = userColorTier(user.value)
    if (tier === 'organization' || tier === 'premium') return 'moh-notif-badge-premium'
    if (tier === 'verified') return 'moh-notif-badge-verified'
    return 'moh-notif-badge-normal'
  })

  async function refresh() {
    const userId = user.value?.id
    if (!userId) {
      setCount(0)
      return
    }
    try {
      const inbox = await groupInvites.listInbox()
      if (user.value?.id !== userId) return
      setCount(inbox.filter((i) => i.status === 'pending').length)
    } catch {
      // Non-fatal — count will refresh on the next event.
    }
  }

  return { count, show, displayCount, toneClass, setCount, refresh }
}
