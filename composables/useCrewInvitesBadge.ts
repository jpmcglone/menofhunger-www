import { userColorTier } from '~/utils/user-tier'

/**
 * Badge state for the Crew nav icon: count of pending invites the viewer has
 * received. State is shared so all mount points stay in sync.
 * `useBadgeHydration` owns automatic bootstrap/recovery; `refresh` is explicit.
 */
export function useCrewInvitesBadge() {
  const { user } = useAuth()
  const crewApi = useCrew()

  const count = useState<number>('crew-invites-badge-count', () => 0)

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
      const inbox = await crewApi.listInbox()
      if (user.value?.id !== userId) return
      const next = inbox.filter((i) => i.status === 'pending').length
      setCount(next)
    } catch {
      // Non-fatal — count will refresh on the next event.
    }
  }

  return { count, show, displayCount, toneClass, setCount, refresh }
}
