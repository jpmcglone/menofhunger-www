import type { SpaceYouTubePlayerProps } from './space-youtube-player-types'
import { loadYouTubeAPI } from '~/utils/media/youtube'
import { mediaFocus } from '~/utils/mediaFocus'
import { extractVideoId, driftAdjustedTime } from '~/utils/watchPartyMath'
import type { useSpaceYouTubePlayerState } from './useSpaceYouTubePlayer'
import type { useSpaceYouTubePlayerSync } from './useSpaceYouTubePlayerSync'

/**
 * Space and video watchers, socket reconnects, replaced-owner handling, and
 * mount and unmount.
 */
export function useSpaceYouTubePlayerLifecycle(props: SpaceYouTubePlayerProps, ctx: ReturnType<typeof useSpaceYouTubePlayerState> & ReturnType<typeof useSpaceYouTubePlayerSync>) {
  const { watchPartyState, sendControl, subscribe, unsubscribe, requestCurrentState, presence, isSocketConnected, selectedSpaceId, isOwner, canRequestRoomState, wpLog, playerReady, playerError, playerSync, sharedVideo, isReplacedOwner, isFollowingPlayback, viewerHasUnlockedAudio, viewerPlaybackUnlocked, viewerNeedsGesture, pendingOwnerRestore, ownerSyncChipVisible, applyOwnerRestoreState, loadNewVideoIfNeeded, createPlayer, snapOwnerToRoomState, startOwnerSyncTimer, stopOwnerSyncTimer, applyState, recoverFollowerPlayback, onPageBecameVisible } = ctx

  watch(watchPartyState, (newState) => {
    if (!newState) return
    wpLog('watchPartyState:update', {
      isOwner: isOwner.value,
      isReplacedOwner: isReplacedOwner.value,
      isPlaying: newState.isPlaying,
      currentTime: Number(newState.currentTime ?? 0),
      updatedAt: Number(newState.updatedAt ?? 0),
      playerReady: playerReady.value,
    })
    // Active primary owner: apply restore on reconnect, otherwise it drives the room.
    if (isOwner.value && !isReplacedOwner.value) {
      if (playerReady.value && pendingOwnerRestore.value) {
        applyOwnerRestoreState(newState)
        pendingOwnerRestore.value = false
      }
      return
    }
    // Viewers and replaced owner tabs both follow the remote state.
    if (playerReady.value) applyState(newState)
  })

  // When the host applies a new YouTube URL (via SpaceOwnerPanel), the space prop
  // updates but the iframe stays on the old video. Detect the video ID change,
  // swap the video in-place, and immediately broadcast a paused-at-0 control so
  // viewers snap to the new video without waiting for the next player event.
  watch(() => props.space.watchPartyUrl, (newUrl) => {
    if (!isOwner.value || isReplacedOwner.value) return
    const newId = extractVideoId(newUrl ?? '')
    if (!loadNewVideoIfNeeded(newId)) return
    // Broadcast immediately with the new URL so viewers load the video now.
    // The server's resetForVideo (called by handleSpacesAnnounceMode) is the
    // belt-and-suspenders: this client-side emit is belt.
    if (props.space?.id && newUrl) {
      sendControl(props.space.id, {
        videoUrl: newUrl,
        isPlaying: false,
        currentTime: 0,
        playbackRate: playerSync.ytPlayer?.getPlaybackRate?.() ?? 1,
      })
    }
  })

  watch(pendingOwnerRestore, (pending) => {
    if (!pending) {
      ownerSyncChipVisible.value = false
      if (playerSync.ownerSyncChipDelayTimer) {
        clearTimeout(playerSync.ownerSyncChipDelayTimer)
        playerSync.ownerSyncChipDelayTimer = null
      }
      return
    }
    // Show sync chip only if restore takes > 1s to avoid flicker.
    if (playerSync.ownerSyncChipDelayTimer) clearTimeout(playerSync.ownerSyncChipDelayTimer)
    playerSync.ownerSyncChipDelayTimer = setTimeout(() => {
      playerSync.ownerSyncChipDelayTimer = null
      if (pendingOwnerRestore.value) ownerSyncChipVisible.value = true
    }, 1000)
  })

  // When the socket connects (or reconnects), sync state immediately.
  // Owners re-emit their current position; viewers request it.
  // We don't gate on prevSocketConnected for viewers because on hard reload the
  // first join attempt may have raced handleConnection's async auth (userId null
  // → server skipped emitting watchPartyState). Always requesting ensures sync.
  let prevSocketConnected = isSocketConnected.value
  watch(isSocketConnected, async (connected) => {
    wpLog('socket:connected-changed', {
      connected,
      prevSocketConnected,
      isOwner: isOwner.value,
      playerReady: playerReady.value,
      canRequestRoomState: canRequestRoomState.value,
    })
    // Owner disconnect behavior: pause locally at the exact current timestamp.
    // This keeps owner and viewers aligned with the server's disconnect pause policy
    // and prevents owner playback from running ahead while offline.
    if (!connected && prevSocketConnected && isOwner.value && playerSync.ytPlayer && playerReady.value) {
      playerSync.ignoreNextStateChange = true
      playerSync.ytPlayer.pauseVideo?.()
    }

    // Update prevSocketConnected immediately so a re-entrant watch tick has
    // the correct baseline even while we await below.
    prevSocketConnected = connected

    if (!connected) return

    // On hard reload the Vue reactive watcher flush runs in the same microtask
    // batch as the socket connect event, but BEFORE the whenSocketConnected
    // promise continuation that calls emitSpacesJoin. Waiting one tick lets
    // that continuation run so the client is in the space room before we ask
    // for the authoritative watch-party state.
    await nextTick()

    // On (re)connect: both host and viewers request authoritative room state.
    // Host applies it once and remains paused; viewers apply normal sync behavior.
    if (!canRequestRoomState.value) {
      wpLog('socket:skip-request-room-not-ready', { spaceId: props.space.id })
      return
    }
    if (isOwner.value) pendingOwnerRestore.value = true
    wpLog('socket:request-state', { spaceId: props.space.id, isOwner: isOwner.value })
    requestCurrentState(props.space.id)
  })

  // Belt-and-suspenders: when the player becomes ready, request state if the
  // socket is already connected but no state has arrived yet (e.g. hard reload
  // where the YouTube API loaded before the socket finished connecting).
  // Applies to viewers AND replaced owner tabs (both follow remote state).
  watch(playerReady, (ready) => {
    if (!ready) return
    // Active primary owner drives the room — skip state request.
    if (isOwner.value && !isReplacedOwner.value) return
    if (watchPartyState.value) return
    if (isSocketConnected.value && canRequestRoomState.value) {
      wpLog('playerReady:request-state', { spaceId: props.space.id })
      requestCurrentState(props.space.id)
    }
  })

  watch(canRequestRoomState, (ready) => {
    wpLog('room-ready:changed', {
      ready,
      isSocketConnected: isSocketConnected.value,
      playerReady: playerReady.value,
      isOwner: isOwner.value,
    })
    if (!ready || !isSocketConnected.value) return
    if (isOwner.value) pendingOwnerRestore.value = true
    wpLog('room-ready:request-state', { spaceId: props.space.id, isOwner: isOwner.value })
    requestCurrentState(props.space.id)
  })

  // When the user explicitly leaves the space (selectedSpaceId → null), pause the
  // KeepAlive'd player so audio stops. When they re-join, viewers request fresh
  // state; the owner's sync timer will resume emitting on the next interval.
  watch(selectedSpaceId, (id, prevId) => {
    if (!id && prevId && playerSync.ytPlayer && playerReady.value) {
      playerSync.ytPlayer.pauseVideo?.()
    }
  })

  const replacedCb = {
    onWatchPartyOwnerReplaced: (payload: { spaceId: string }) => {
      if (payload.spaceId !== props.space.id) return
      isReplacedOwner.value = true
      wpLog('owner:replaced', { spaceId: payload.spaceId })
    },
    onWatchPartyOwnerPromoted: (payload: { spaceId: string }) => {
      if (payload.spaceId !== props.space.id) return
      wpLog('owner:promoted', { spaceId: payload.spaceId })
      // Snap to the last room checkpoint first so this tab does not broadcast
      // drifted follower time. The owner timer emits on the next real change.
      snapOwnerToRoomState()
      isReplacedOwner.value = false
    },
  }

  onMounted(async () => {
    playerSync.soundTimer = setInterval(() => {
      if (!playerReady.value || !playerSync.ytPlayer || mediaFocus.currentId !== 'video:watch-party' || Date.now() < playerSync.soundEchoUntil) return
      const muted = Boolean(playerSync.ytPlayer.isMuted?.())
      const volume = Number(playerSync.ytPlayer.getVolume?.() ?? 100) / 100
      if (muted !== !sharedVideo.appWideSoundOn.value || !muted && Math.abs(volume - sharedVideo.appWideVolume.value) > 0.015) {
        sharedVideo.reportPlayerAudio({ muted, volume01: muted ? undefined : volume })
      }
    }, 500)
    const videoId = extractVideoId(props.space.watchPartyUrl ?? '')
    if (!videoId) {
      wpLog('mount:skip-invalid-video-url', { watchPartyUrl: props.space.watchPartyUrl ?? null })
      return
    }

    wpLog('mount:start', {
      spaceId: props.space.id,
      videoId,
      isOwner: isOwner.value,
      roomReady: canRequestRoomState.value,
      isSocketConnected: isSocketConnected.value,
    })

    subscribe(props.space.id)

    if (isOwner.value) {
      presence.addSpacesCallback(replacedCb as any)
      pendingOwnerRestore.value = true
    }
    // Fire a state request immediately so the response races the YouTube API
    // load. Even if the API is already cached (< 200 ms), the network round
    // trip (~50–150 ms) usually completes in time for us to read the position
    // from watchPartyState before calling createPlayer below.
    if (canRequestRoomState.value) {
      wpLog('mount:request-state', { spaceId: props.space.id })
      requestCurrentState(props.space.id)
    } else {
      wpLog('mount:skip-request-room-not-ready', { spaceId: props.space.id })
    }

    await loadYouTubeAPI()

    // Use whatever state has arrived by now so the player can start buffering
    // from the correct position rather than flashing 0:00 first.
    const initialState = watchPartyState.value
    const startSeconds = initialState ? driftAdjustedTime(initialState) : 0
    wpLog('mount:create-player', {
      spaceId: props.space.id,
      startSeconds,
      hasInitialState: Boolean(initialState),
    })

    createPlayer(videoId, startSeconds)
    startOwnerSyncTimer()
    document.addEventListener('visibilitychange', onPageBecameVisible)
    window.addEventListener('pageshow', onPageBecameVisible)
  })

  onDeactivated(() => {
    if (!isFollowingPlayback.value || !playerSync.ytPlayer || !playerReady.value) return
    playerSync.ytPlayer.pauseVideo?.()
  })

  onActivated(() => {
    recoverFollowerPlayback()
  })

  onBeforeUnmount(() => {
    if (playerSync.soundTimer) clearInterval(playerSync.soundTimer)
    mediaFocus.release('video:watch-party')
    document.removeEventListener('visibilitychange', onPageBecameVisible)
    window.removeEventListener('pageshow', onPageBecameVisible)
    stopOwnerSyncTimer()
    if (playerSync.viewerGestureTimer) {
      clearTimeout(playerSync.viewerGestureTimer)
      playerSync.viewerGestureTimer = null
    }
    if (playerSync.ownerSyncChipDelayTimer) {
      clearTimeout(playerSync.ownerSyncChipDelayTimer)
      playerSync.ownerSyncChipDelayTimer = null
    }
    presence.removeSpacesCallback(replacedCb as any)
    unsubscribe()
    if (playerSync.ytPlayer?.destroy) {
      try { playerSync.ytPlayer.destroy() } catch { /* ignore */ }
    }
    playerSync.ytPlayer = null
    playerReady.value = false
    playerSync.lastOwnerState = null
    playerSync.lastOwnerSample = null
    playerSync.lastAppliedRemote = null
    playerSync.hasSyncedInitially = false
    playerSync.currentVideoId = null
    playerSync.pendingApply = null
    isReplacedOwner.value = false
    pendingOwnerRestore.value = false
    ownerSyncChipVisible.value = false
    viewerNeedsGesture.value = false
    viewerPlaybackUnlocked.value = false
    viewerHasUnlockedAudio.value = false
    playerSync.pendingUnlockPause = false
    playerError.value = null
  })

  return {

  }
}
