import { isScheduledNotifySpace } from '~/utils/spacesLobbySort'

/**
 * Orange dot on Spaces nav when the viewer has ≥1 upcoming scheduled space
 * they're notified about (including their own host reminders).
 */
export function useSpacesNotifyBadge() {
  const { user, isVerifiedMember } = useAuth()
  const { spaces, loadedOnce, loadSpaces } = useSpaces()

  const count = computed(() => {
    const list = spaces.value ?? []
    const now = Date.now()
    return list.reduce((n, s) => n + (isScheduledNotifySpace(s, now) ? 1 : 0), 0)
  })

  const show = computed(() => count.value > 0)

  async function refresh() {
    if (!user.value?.id || !isVerifiedMember.value) return
    await loadSpaces()
  }

  watch(
    () => [user.value?.id ?? null, isVerifiedMember.value] as const,
    ([userId, verified]) => {
      if (!userId || !verified) return
      if (loadedOnce.value) return
      void refresh()
    },
    { immediate: true },
  )

  return { count, show, refresh }
}
