import { getAuthGeneration } from '~/composables/auth/authState'

/**
 * Badge state for the Crew nav icon: count of pending invites the viewer has
 * received. State is shared so all mount points stay in sync.
 * `useBadgeHydration` owns automatic bootstrap/recovery; `refresh` is explicit.
 */
export function useCrewInvitesBadge() {
  const { user, isPageAccount } = useAuth()
  const crewApi = useCrew()

  const count = useState<number>('crew-invites-badge-count', () => 0)

  function setCount(value: number) {
    count.value = Math.max(0, Math.floor(Number(value) || 0))
  }

  const show = computed(() => count.value > 0)
  const displayCount = computed(() => (count.value >= 99 ? '99+' : String(count.value)))
  const toneClass = useActivityBadgeTone()

  async function refresh() {
    const generation = getAuthGeneration()
    const userId = user.value?.id
    if (!userId || isPageAccount.value) {
      setCount(0)
      return
    }
    try {
      const inbox = await crewApi.listInbox()
      if (generation !== getAuthGeneration() || user.value?.id !== userId) return
      const next = inbox.filter((i) => i.status === 'pending').length
      setCount(next)
    } catch {
      // Non-fatal — count will refresh on the next event.
    }
  }

  return { count, show, displayCount, toneClass, setCount, refresh }
}
