import type { CrewPrivate } from '~/types/api'

export type ViewerCrewMembership = {
  crewId: string
  role: 'owner' | 'member'
} | null

/**
 * Global viewer crew membership cache. Backs the dynamic "Crew" / "My Crew" /
 * "Your Crew" nav label and any other place that needs to know if the viewer
 * is in a crew without paying for an extra `/crew/me` per consumer.
 *
 * - Lazy-loads on first access when authed + verified.
 * - Reset to `null` when auth flips off.
 * - Pages that mutate membership (create, accept invite, leave, disband,
 *   transfer ownership) should call `setFromCrew` / `clear` to keep the nav
 *   in sync without waiting for the next refetch.
 */
export function useViewerCrew() {
  const membership = useState<ViewerCrewMembership>('viewer-crew-membership', () => null)
  const loaded = useState<boolean>('viewer-crew-loaded', () => false)
  const inflight = useState<boolean>('viewer-crew-inflight', () => false)

  const { isAuthed, isVerified } = useAuth()

  function setFromCrew(crew: Pick<CrewPrivate, 'id' | 'viewerRole'> | null) {
    membership.value = crew ? { crewId: crew.id, role: crew.viewerRole } : null
    loaded.value = true
  }

  function clear() {
    membership.value = null
    loaded.value = true
  }

  async function refresh(): Promise<ViewerCrewMembership> {
    if (!isAuthed.value || !isVerified.value) {
      clear()
      return null
    }
    if (inflight.value) return membership.value
    inflight.value = true
    try {
      const { getMyCrew } = useCrew()
      const c = await getMyCrew()
      setFromCrew(c)
      return membership.value
    } catch {
      // Leave whatever we had; nav label degrades to "Crew" if nothing cached.
      return membership.value
    } finally {
      inflight.value = false
    }
  }

  function ensureLoaded() {
    if (loaded.value || inflight.value) return
    if (!import.meta.client) return
    if (!isAuthed.value || !isVerified.value) {
      clear()
      return
    }
    void refresh()
  }

  // Reset whenever auth/verified status flips off so a logged-out viewer
  // doesn't briefly see the previous user's "My Crew" label.
  if (import.meta.client) {
    watch(
      [isAuthed, isVerified],
      ([authed, verified]) => {
        if (!authed || !verified) {
          membership.value = null
          loaded.value = false
        }
      },
      { immediate: false },
    )
  }

  return { membership, loaded, ensureLoaded, refresh, setFromCrew, clear }
}
