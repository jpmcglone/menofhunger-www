import { userColorTier } from '~/utils/user-tier'

/**
 * Badge state for the Crew nav icon: count of pending invites the viewer has
 * received. Mirrors the pattern used by `useNotificationsBadge` — the count is
 * shared via `useState` so multiple badge mount points (left rail, More sheet)
 * stay in sync, and is refreshed on auth change, socket reconnect, tab
 * visibility, and any `crew:invite-received` / `crew:invite-updated` realtime
 * event.
 */
export function useCrewInvitesBadge() {
  const { user } = useAuth()
  const { addCrewCallback, removeCrewCallback, isSocketConnected } = usePresence()
  const crewApi = useCrew()

  const count = useState<number>('crew-invites-badge-count', () => 0)

  const show = computed(() => count.value > 0)
  const displayCount = computed(() => (count.value >= 99 ? '99+' : String(count.value)))
  const toneClass = computed(() => {
    const tier = userColorTier(user.value)
    if (tier === 'organization' || tier === 'premium') return 'moh-notif-badge-premium'
    if (tier === 'verified') return 'moh-notif-badge-verified'
    return 'moh-notif-badge-normal'
  })

  async function refresh() {
    if (!user.value?.id) {
      if (count.value !== 0) count.value = 0
      return
    }
    try {
      const inbox = await crewApi.listInbox()
      const next = inbox.filter((i) => i.status === 'pending').length
      if (count.value !== next) count.value = next
    } catch {
      // Non-fatal — count will refresh on the next event.
    }
  }

  watch(
    () => user.value?.id,
    (uid) => {
      if (uid) void refresh()
      else count.value = 0
    },
    { immediate: true },
  )

  watch(isSocketConnected, (connected) => {
    if (connected && user.value?.id) void refresh()
  })

  if (import.meta.client) {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && user.value?.id) void refresh()
    }
    onMounted(() => document.addEventListener('visibilitychange', onVisible))
    onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisible))
  }

  const cb = {
    onInviteReceived() { void refresh() },
    onInviteUpdated() { void refresh() },
  }
  onMounted(() => addCrewCallback(cb))
  onBeforeUnmount(() => removeCrewCallback(cb))

  return { count, show, displayCount, toneClass, refresh }
}
