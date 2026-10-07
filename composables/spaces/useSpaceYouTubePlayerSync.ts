import type { SpaceYouTubePlayerProps } from './space-youtube-player-types'
import { mediaFocus } from '~/utils/mediaFocus'
import type { WatchPartyState } from '~/types/api'
import { extractVideoId, driftAdjustedTime, expectedPlaybackTime, isSeekJump, shouldCorrectPlayingPosition, IOS_REMOTE_SEEK_THRESHOLD_S, REMOTE_SEEK_THRESHOLD_S } from '~/utils/watchPartyMath'
import type { useSpaceYouTubePlayerState } from './useSpaceYouTubePlayer'

/**
 * Player creation, owner sync and restore, applying remote state, and follower
 * playback recovery.
 */
export function useSpaceYouTubePlayerSync(props: SpaceYouTubePlayerProps, ctx: ReturnType<typeof useSpaceYouTubePlayerState>) {
  const { OWNER_SYNC_INTERVAL_MS, watchPartyState, sendControl, requestCurrentState, presence, isOwner, canRequestRoomState, wpLog, playerContainerRef, playerReady, playerError, playerSync, locallySuspended, sharedVideo, interruptWatchParty, isReplacedOwner, isFollowingPlayback, viewerPlaybackUnlocked, viewerNeedsGesture, iosWebKit, pendingOwnerRestore, syncLocalVolumeFromPlayer, muteViewerForAutoplay, isYtPlaying, playAlongHost, prepareWatchPartyIframe, applyOwnerRestoreState, loadNewVideoIfNeeded } = ctx

  /**
   * @param startSeconds  If > 0 the player will begin buffering from this
   *   position so viewers never see the video flash from 0:00.
   */
  function createPlayer(videoId: string, startSeconds = 0) {
    if (!playerContainerRef.value) {
      wpLog('createPlayer:skip-missing-container', { videoId, startSeconds })
      return
    }
    wpLog('createPlayer:start', { videoId, startSeconds, isOwner: isOwner.value, roomReady: canRequestRoomState.value })
    playerSync.currentVideoId = videoId
    playerError.value = null
    const container = document.createElement('div')
    playerContainerRef.value.innerHTML = ''
    playerContainerRef.value.appendChild(container)

    const YT = (window as any).YT
    playerSync.ytPlayer = new YT.Player(container, {
      videoId,
      width: '100%',
      height: '100%',
      // Same privacy host as feed embeds — Safari ITP is harsher on youtube.com cookies.
      host: 'https://www.youtube-nocookie.com',
      playerVars: {
        // Explicitly pin the JS API origin to this app. This is recommended by
        // YouTube and helps avoid cross-origin postMessage confusion.
        origin: window.location.origin,
        autoplay: 0,
        // Viewers start muted so a later playVideo() from socket state is allowed.
        mute: sharedVideo.appWideSoundOn.value ? 0 : 1,
        // Owner uses native YouTube controls; viewers get locked playback with
        // custom local-volume-only controls.
        controls: isOwner.value ? 1 : 0,
        modestbranding: 1,
        rel: 0,              // limit related videos to same channel
        disablekb: isOwner.value ? 0 : 1,
        iv_load_policy: 3,  // disable annotations and info cards
        cc_load_policy: 0,  // captions off by default
        fs: isOwner.value ? 1 : 0,
        playsinline: 1,     // inline playback on iOS
        // Starting the player at the known position avoids the 0:00 flash.
        // onReady will fine-tune to the drift-adjusted position afterward.
        ...(startSeconds > 1 ? { start: Math.floor(startSeconds) } : {}),
      },
      events: {
        onReady: () => {
          playerSync.ytPlayer.setVolume?.(sharedVideo.appWideVolume.value * 100)
          if (sharedVideo.appWideSoundOn.value) playerSync.ytPlayer.unMute?.(); else playerSync.ytPlayer.mute?.()
          prepareWatchPartyIframe()
          const iframe = playerContainerRef.value?.querySelector('iframe')
          wpLog('yt:onReady:dom', {
            containerWidth: playerContainerRef.value?.clientWidth ?? 0,
            containerHeight: playerContainerRef.value?.clientHeight ?? 0,
            hasIframe: Boolean(iframe),
            iframeSrc: iframe?.getAttribute('src') ?? null,
            iframeAllow: iframe?.getAttribute('allow') ?? null,
          })
          wpLog('yt:onReady', {
            isOwner: isOwner.value,
            hasState: Boolean(watchPartyState.value),
            pendingOwnerRestore: pendingOwnerRestore.value,
            canRequestRoomState: canRequestRoomState.value,
          })
          playerReady.value = true
          if (isFollowingPlayback.value) muteViewerForAutoplay()
          else syncLocalVolumeFromPlayer()
          const state = watchPartyState.value
          if (isFollowingPlayback.value && iosWebKit && !viewerPlaybackUnlocked.value) {
            playerSync.pendingApply = state ?? playerSync.pendingApply
            viewerNeedsGesture.value = true
            return
          }
          if (isOwner.value) {
            // Apply restore if state arrived before the player was ready.
            // Always clear the flag so the sync timer can start emitting:
            //  • With prior state  → seek to saved position, then timer takes over.
            //  • Fresh space (no state) → timer starts from 0 immediately.
            if (pendingOwnerRestore.value && state) {
              applyOwnerRestoreState(state)
            }
            pendingOwnerRestore.value = false
          } else if (state) {
            // applyState computes drift internally, so pass the raw state.
            applyState(state)
          } else if (canRequestRoomState.value) {
            // State hasn't arrived yet — request it now as a final fallback.
            wpLog('yt:onReady:request-state', { spaceId: props.space.id })
            requestCurrentState(props.space.id)
          } else {
            wpLog('yt:onReady:skip-request-room-not-ready', { spaceId: props.space.id })
          }
        },
        onStateChange: (event: any) => {
          const YTState = (window as any).YT?.PlayerState
          const st = event.data
          if (st === YTState?.PLAYING) {
            if (locallySuspended.value || !mediaFocus.claim('video:watch-party', interruptWatchParty, { automatic: true })) {
              locallySuspended.value = true
              playerSync.ignoreNextStateChange = true
              playerSync.ytPlayer?.pauseVideo?.()
              return
            }
          }

          // Apply any stashed state when the new video finishes loading (CUED = 5,
          // BUFFERING = 3). This handles the video-swap case where applyState returned
          // early after loadVideoById and there was no follow-up WS tick.
          if ((st === YTState?.CUED || st === YTState?.BUFFERING) && playerSync.pendingApply) {
            const stateToApply = playerSync.pendingApply
            playerSync.pendingApply = null
            // Re-invoke applyState now that the player has the new video loaded.
            applyState(stateToApply)
            return
          }

          if (isFollowingPlayback.value && playerSync.pendingUnlockPause && (st === YTState?.PLAYING || st === YTState?.BUFFERING)) {
            playerSync.pendingUnlockPause = false
            playerSync.ytPlayer.pauseVideo?.()
            return
          }
          if (isFollowingPlayback.value && (st === YTState?.PLAYING || st === YTState?.BUFFERING)) {
            viewerPlaybackUnlocked.value = true
            viewerNeedsGesture.value = false
          }

          // Only the active primary owner tab drives the room via emitCurrentState.
          if (!isOwner.value || isReplacedOwner.value || playerSync.ignoreNextStateChange) {
            playerSync.ignoreNextStateChange = false
            return
          }
          // Scrubbing often transitions through BUFFERING/PAUSED and can miss a clean
          // PLAYING/PAUSED edge, so emit for these state changes too.
          if (
            st === YTState?.PLAYING ||
            st === YTState?.PAUSED ||
            st === YTState?.BUFFERING ||
            st === YTState?.ENDED
          ) {
            emitCurrentState()
          }
        },
        onPlaybackRateChange: () => {
          if (!isOwner.value) return
          emitCurrentState()
        },
        onError: (event: { data?: number }) => {
          const code = Number(event?.data)
          wpLog('yt:onError', { code, isOwner: isOwner.value })
          playerError.value =
            code === 101 || code === 150
              ? 'YouTube blocked embedding for this video.'
              : code === 100
                ? 'YouTube could not find this video.'
                : 'YouTube could not play this video.'
        },
      },
    })
  }

  /** Align this tab to the room clock before it starts driving. Do not emit local time. */
  function snapOwnerToRoomState() {
    if (!playerSync.ytPlayer || !playerReady.value || locallySuspended.value) return
    const state = watchPartyState.value
    if (!state) return
    const adjusted = driftAdjustedTime(state)
    const target = isFinite(adjusted) ? adjusted : Math.max(0, Number(state.currentTime) || 0)
    const rate = state.playbackRate || 1
    playerSync.ignoreNextStateChange = true
    const stateVideoId = extractVideoId(state.videoUrl)
    if (stateVideoId) loadNewVideoIfNeeded(stateVideoId, target)
    playerSync.ytPlayer.seekTo?.(target, true)
    playerSync.ytPlayer.setPlaybackRate?.(rate)
    if (state.isPlaying) playerSync.ytPlayer.playVideo?.()
    else playerSync.ytPlayer.pauseVideo?.()
    const now = Date.now()
    playerSync.lastOwnerState = {
      isPlaying: state.isPlaying,
      currentTime: state.currentTime,
      playbackRate: rate,
      atMs: now,
    }
    playerSync.lastOwnerSample = {
      isPlaying: state.isPlaying,
      currentTime: target,
      playbackRate: rate,
      atMs: now,
    }
  }

  function takeControl() {
    snapOwnerToRoomState()
    isReplacedOwner.value = false
    // Re-joining the space re-elects this socket as the primary owner.
    presence.emitSpacesJoin(props.space.id)
  }

  function emitCurrentState() {
    if (locallySuspended.value) return
    if (!playerSync.ytPlayer || !props.space?.id) return
    if (isReplacedOwner.value) return
    const videoUrl = props.space.watchPartyUrl ?? ''
    const YTState = (window as any).YT?.PlayerState
    const playerState = playerSync.ytPlayer.getPlayerState?.()
    const nextState = {
      videoUrl,
      // BUFFERING means the owner intends to be playing but is loading — treat as playing
      // so viewers don't get a spurious pause flash during the owner's network hiccup.
      isPlaying: playerState === YTState?.PLAYING || playerState === YTState?.BUFFERING,
      currentTime: playerSync.ytPlayer.getCurrentTime?.() ?? 0,
      playbackRate: playerSync.ytPlayer.getPlaybackRate?.() ?? 1,
    }
    sendControl(props.space.id, nextState)
    const now = Date.now()
    playerSync.lastOwnerState = {
      isPlaying: nextState.isPlaying,
      currentTime: nextState.currentTime,
      playbackRate: nextState.playbackRate,
      atMs: now,
    }
    playerSync.lastOwnerSample = {
      isPlaying: nextState.isPlaying,
      currentTime: nextState.currentTime,
      playbackRate: nextState.playbackRate,
      atMs: now,
    }
  }

  function startOwnerSyncTimer() {
    if (!isOwner.value) return
    if (playerSync.ownerSyncTimer) clearInterval(playerSync.ownerSyncTimer)
    playerSync.ownerSyncTimer = setInterval(() => {
      if (!playerSync.ytPlayer || !playerReady.value || locallySuspended.value) return
      // Don't emit while waiting for the initial restore — we don't want to
      // overwrite the server's saved position with the player's 0:00 start position.
      if (pendingOwnerRestore.value) return
      const YTState = (window as any).YT?.PlayerState
      const playerState = playerSync.ytPlayer.getPlayerState?.()
      const isPlaying = playerState === YTState?.PLAYING || playerState === YTState?.BUFFERING
      const currentTime = Number(playerSync.ytPlayer.getCurrentTime?.() ?? 0)
      const playbackRate = Number(playerSync.ytPlayer.getPlaybackRate?.() ?? 1)
      const now = Date.now()

      if (!playerSync.lastOwnerState || !playerSync.lastOwnerSample) {
        emitCurrentState()
        return
      }

      // Detect scrub while paused OR while playing (Live DVR / VOD). Compare against
      // the expected timeline from the last sample — not last emit — so a jump isn't
      // silently absorbed into lastOwnerState.currentTime on a non-emit tick.
      const expected = expectedPlaybackTime(playerSync.lastOwnerSample, now)
      const seekDetected = isSeekJump(expected, currentTime)

      const playbackChanged =
        isPlaying !== playerSync.lastOwnerState.isPlaying ||
        Math.abs(playbackRate - playerSync.lastOwnerState.playbackRate) > 0.001

      // Send a periodic checkpoint so viewers can correct drift that accumulated
      // from buffering. atMs is only updated inside emitCurrentState (not on
      // non-emit ticks) so this reliably fires every OWNER_SYNC_INTERVAL_MS.
      const periodicCheckpoint = isPlaying && now - playerSync.lastOwnerState.atMs > OWNER_SYNC_INTERVAL_MS

      if (seekDetected || playbackChanged || periodicCheckpoint) {
        emitCurrentState()
        return
      }

      // No emit — advance the sample clock so the next tick's expected time is correct.
      playerSync.lastOwnerSample = { isPlaying, currentTime, playbackRate, atMs: now }
    }, 500)
  }

  function stopOwnerSyncTimer() {
    if (playerSync.ownerSyncTimer) {
      clearInterval(playerSync.ownerSyncTimer)
      playerSync.ownerSyncTimer = null
    }
  }

  function applyState(state: WatchPartyState) {
    if (locallySuspended.value) { playerSync.pendingApply = state; return }
    if (!playerSync.ytPlayer) return
    // The active primary owner tab drives the room; it must not seek itself.
    // Replaced owner tabs should follow the room exactly like viewers.
    if (isOwner.value && !isReplacedOwner.value) return

    // iPhone Safari: do not call play/seek until a tap unlocks the media session.
    if (isFollowingPlayback.value && iosWebKit && !viewerPlaybackUnlocked.value) {
      playerSync.pendingApply = state
      viewerNeedsGesture.value = true
      return
    }

    // If the video changed, swap the embed first. We stash the desired state in
    // pendingApply so onStateChange can re-apply it once the new video is ready
    // (CUED or BUFFERING), avoiding reliance on a follow-up WS tick.
    // Always compute the wall-clock-adjusted position so a state that was stored
    // seconds ago still lands the viewer at the correct spot.
    const adjusted = driftAdjustedTime(state)
    const stateVideoId = extractVideoId(state.videoUrl)
    if (stateVideoId && loadNewVideoIfNeeded(stateVideoId, isFinite(adjusted) ? adjusted : 0)) {
      playerSync.pendingApply = state
      return
    }
    if (!isFinite(adjusted)) return  // bad/missing updatedAt — skip rather than seek to NaN
    const currentTime = playerSync.ytPlayer.getCurrentTime?.() ?? 0
    const drift = Math.abs(currentTime - adjusted)

    // Owner scrubbed the timeline (paused or playing) — always follow, even if the
    // jump is smaller than the normal playing drift tolerance. Compare against the
    // expected owner timeline between samples so periodic play checkpoints aren't
    // treated as seeks.
    const remoteUpdatedAt = Number(state.updatedAt)
    const remoteSeek =
      playerSync.lastAppliedRemote != null &&
      Number.isFinite(remoteUpdatedAt) &&
      remoteUpdatedAt > 0 &&
      isSeekJump(
        expectedPlaybackTime(playerSync.lastAppliedRemote, remoteUpdatedAt),
        state.currentTime,
        iosWebKit ? IOS_REMOTE_SEEK_THRESHOLD_S : REMOTE_SEEK_THRESHOLD_S,
      )

    // Seek rules:
    //  • First sync ever — always seek (avoids flashing from 0:00).
    //  • Pause event   — always seek to the EXACT pause timestamp (user requirement).
    //  • Owner scrub   — always seek (Live DVR / VOD seek-while-playing).
    //  • Playing       — only seek when drift exceeds tolerance to avoid micro-stutters.
    //  • iPhone Safari — skip small playing corrections. seekTo pauses the iframe
    //    and a socket playVideo() cannot resume it (looks like a pause every 10–30s).
    const shouldSeek = shouldCorrectPlayingPosition({
      iosWebKit,
      hasSyncedInitially: playerSync.hasSyncedInitially,
      isPlaying: state.isPlaying,
      drift,
      remoteSeek,
    })

    if (shouldSeek) {
      playerSync.ytPlayer.seekTo?.(adjusted, true)
    }

    const nextRate = Number(state.playbackRate) || 1
    const currentRate = Number(playerSync.ytPlayer.getPlaybackRate?.() ?? 1)
    if (Math.abs(currentRate - nextRate) > 0.01) {
      playerSync.ytPlayer.setPlaybackRate?.(nextRate)
    }

    if (state.isPlaying) {
      playAlongHost()
    } else {
      playerSync.pendingUnlockPause = false
      if (!iosWebKit || viewerPlaybackUnlocked.value) viewerNeedsGesture.value = false
      playerSync.ytPlayer.pauseVideo?.()
    }

    playerSync.lastAppliedRemote = {
      currentTime: state.currentTime,
      isPlaying: state.isPlaying,
      playbackRate: state.playbackRate || 1,
      atMs: Number.isFinite(remoteUpdatedAt) && remoteUpdatedAt > 0 ? remoteUpdatedAt : Date.now(),
    }
    playerSync.hasSyncedInitially = true
  }

  function recoverFollowerPlayback() {
    if (locallySuspended.value) return
    if (!isFollowingPlayback.value || !playerSync.ytPlayer || !playerReady.value) return
    const state = watchPartyState.value
    if (!state) return
    if (state.isPlaying && isYtPlaying()) return
    if (iosWebKit) {
      viewerPlaybackUnlocked.value = false
      viewerNeedsGesture.value = true
      playerSync.pendingApply = state
      return
    }
    applyState(state)
  }

  function onPageBecameVisible() {
    if (typeof document !== 'undefined' && document.visibilityState && document.visibilityState !== 'visible') return
    recoverFollowerPlayback()
  }

  return {
    createPlayer,
    snapOwnerToRoomState,
    takeControl,
    startOwnerSyncTimer,
    stopOwnerSyncTimer,
    applyState,
    recoverFollowerPlayback,
    onPageBecameVisible,
  }
}
