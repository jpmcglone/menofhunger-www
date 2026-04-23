/**
 * Keep the viewer's crew membership cache in sync with realtime crew events.
 *
 * The API fans `crew:*` events out to every member of the affected crew (and to
 * the inviter/invitee for invite events). We listen globally so the dynamic
 * "Crew" / "Your Crew" / "My Crew" nav label, the unread badge, and any open
 * /crew page reflect cross-tab and cross-device changes immediately — without
 * each consumer having to wire its own socket handler.
 */
export default defineNuxtPlugin(() => {
  const { user } = useAuth()
  const presence = usePresence()
  const viewerCrew = useViewerCrew()

  let cb: ReturnType<typeof buildCallback> | null = null

  function buildCallback() {
    return {
      // Invitee accepted in another tab → refresh nav membership so labels update.
      onInviteUpdated(payload: { invite: { status: string } }) {
        const status = payload?.invite?.status
        if (status === 'accepted') void viewerCrew.refresh()
      },
      // Owner/member changes can flip the viewer's role or membership.
      onMembersChanged() {
        void viewerCrew.refresh()
      },
      onOwnerChanged() {
        void viewerCrew.refresh()
      },
      // Only clear when the disbanded crew is the one we currently think we're
      // in. The API may emit `crew:disbanded` for an OLD crew (auto-disbanded
      // when the viewer accepts an invite as a solo crew member) right around
      // the time we get added to a NEW crew — without this guard, a late-arriving
      // disband event would wipe the freshly-set new membership.
      onDisbanded(payload: { crewId: string }) {
        const disbandedId = payload?.crewId
        const currentId = viewerCrew.membership.value?.crewId ?? null
        if (!disbandedId || !currentId || disbandedId === currentId) {
          viewerCrew.clear()
        }
      },
    }
  }

  watch(
    user,
    (u) => {
      // Detach previous binding before swapping (handles re-login + logout).
      if (cb) {
        presence.removeCrewCallback(cb)
        cb = null
      }
      if (!u) {
        viewerCrew.clear()
        return
      }
      cb = buildCallback()
      presence.addCrewCallback(cb)
    },
    { immediate: true },
  )
})
