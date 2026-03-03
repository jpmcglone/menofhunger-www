import type { GetPresenceOnlineData } from '~/types/api'

/**
 * Polls /presence/online every 30 s when the right rail is visible and returns a reactive
 * count + tier breakdown for the hover popover.
 *
 * Automatically pauses when `enabled` is false (right rail hidden) and refreshes once more
 * immediately after the socket connects so the displayed count stays in sync.
 */
export function useOnlineCount(options: { enabled: Ref<boolean> }) {
  const { apiFetch } = useApiClient()
  const { isSocketConnected, isAuthed } = usePresence()
  const onlineCountPopover = useOnlineCountPopover()

  const count = ref<number | null>(null)

  async function refresh() {
    try {
      const res = await apiFetch<GetPresenceOnlineData>('/presence/online', {
        method: 'GET',
        query: { includeSelf: '1' },
        timeout: 8000,
      })
      const n =
        typeof res?.pagination?.totalOnline === 'number'
          ? res.pagination.totalOnline
          : Array.isArray(res?.data)
            ? res.data.length
            : null
      count.value = typeof n === 'number' ? Math.max(0, Math.floor(n)) : null

      const users = Array.isArray(res?.data) ? res.data : []
      let premiumPlus = 0
      let premium = 0
      let verified = 0
      let unverified = 0
      for (const u of users) {
        if (u.premiumPlus) premiumPlus += 1
        else if (u.premium) premium += 1
        else if (u.verifiedStatus && u.verifiedStatus !== 'none') verified += 1
        else unverified += 1
      }
      const rows = []
      if (premiumPlus > 0) rows.push({ key: 'premiumPlus', label: 'Premium+', count: premiumPlus, tone: 'premium' } as const)
      if (premium > 0) rows.push({ key: 'premium', label: 'Premium', count: premium, tone: 'premium' } as const)
      if (verified > 0) rows.push({ key: 'verified', label: 'Verified', count: verified, tone: 'verified' } as const)
      if (unverified > 0) rows.push({ key: 'unverified', label: 'Unverified', count: unverified, tone: 'unverified' } as const)
      onlineCountPopover.setRows(rows)
    } catch {
      // Best-effort: keep prior value on failure.
    }
  }

  // Poll every 30 s while the right rail is visible. Stop when hidden.
  watch(
    () => options.enabled.value,
    (enabled, _, onCleanup) => {
      if (!import.meta.client || !enabled) return
      void refresh()
      const timer = setInterval(() => void refresh(), 30_000)
      onCleanup(() => clearInterval(timer))
    },
    { immediate: true },
  )

  // Refresh once right after socket connects so count matches the /online page.
  watch(
    () => isSocketConnected.value,
    (connected) => {
      if (!import.meta.client || !connected || !isAuthed.value || !options.enabled.value) return
      void refresh()
    },
  )

  return { count, refresh, onlineCountPopover }
}
