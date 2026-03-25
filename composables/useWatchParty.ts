import type { WatchPartyState } from '~/types/api'

const WP_STATE_KEY = 'watch-party-state'
const WP_SPACE_ID_KEY = 'watch-party-space-id'

export function useWatchParty() {
  const presence = usePresence()
  const { user } = useAuth()

  const watchPartyState = useState<WatchPartyState | null>(WP_STATE_KEY, () => null)
  const watchPartySpaceId = useState<string | null>(WP_SPACE_ID_KEY, () => null)

  const wpCb = {
    onWatchPartyState: (payload: { spaceId: string } & WatchPartyState) => {
      if (!payload?.spaceId) return
      if (payload.spaceId !== watchPartySpaceId.value) return
      watchPartyState.value = {
        videoUrl: payload.videoUrl,
        isPlaying: payload.isPlaying,
        currentTime: payload.currentTime,
        playbackRate: payload.playbackRate,
        updatedAt: payload.updatedAt,
      }
    },
  }

  function subscribe(spaceId: string) {
    // Only wipe buffered state when switching to a different space.
    if (watchPartySpaceId.value !== spaceId) {
      watchPartyState.value = null
    }
    watchPartySpaceId.value = spaceId
    presence.addSpacesCallback(wpCb as any)
  }

  function unsubscribe() {
    presence.removeSpacesCallback(wpCb as any)
    watchPartyState.value = null
    watchPartySpaceId.value = null
  }

  function sendControl(spaceId: string, state: { videoUrl: string; isPlaying: boolean; currentTime: number; playbackRate: number }) {
    presence.emitSpacesWatchPartyControl(spaceId, state)
  }

  /** Pull the current server-side state for the given space. The response arrives via the normal onWatchPartyState callback. */
  function requestCurrentState(spaceId: string) {
    presence.emitSpacesRequestWatchPartyState(spaceId)
  }

  function isOwner(spaceOwnerId: string | null | undefined): boolean {
    return Boolean(user.value?.id && spaceOwnerId && user.value.id === spaceOwnerId)
  }

  return {
    watchPartyState: readonly(watchPartyState),
    subscribe,
    unsubscribe,
    sendControl,
    requestCurrentState,
    isOwner,
  }
}
