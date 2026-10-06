import { getAuthGeneration } from '~/composables/auth/authState'

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
  const toneClass = useActivityBadgeTone()

  async function refresh() {
    const generation = getAuthGeneration()
    const userId = user.value?.id
    if (!userId) {
      setCount(0)
      return
    }
    try {
      const inbox = await groupInvites.listInbox()
      if (generation !== getAuthGeneration() || user.value?.id !== userId) return
      setCount(inbox.filter((i) => i.status === 'pending').length)
    } catch {
      // Non-fatal — count will refresh on the next event.
    }
  }

  return { count, show, displayCount, toneClass, setCount, refresh }
}
