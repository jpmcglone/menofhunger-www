import { getYtGlobal, type SpaceYouTubePlayerProps, type SpaceYtPlayer } from './space-youtube-player-types'
import { mediaFocus } from '~/utils/mediaFocus'
import type { WatchPartyState } from '~/types/api'
import { isIosWebKit } from '~/utils/ios-webkit'
import { extractVideoId, driftAdjustedTime } from '~/utils/watchPartyMath'
import { useSpaceYouTubePlayerSync } from './useSpaceYouTubePlayerSync'
import { useSpaceYouTubePlayerLifecycle } from './useSpaceYouTubePlayerLifecycle'

/**
 * Script state for `SpaceYouTubePlayer`.
 */
export function useSpaceYouTubePlayer(props: SpaceYouTubePlayerProps) {
  const playerState = useSpaceYouTubePlayerState(props)
  const playerSyncing = useSpaceYouTubePlayerSync(props, playerState)
  const lifecycle = useSpaceYouTubePlayerLifecycle(props, { ...playerState, ...playerSyncing })
  return { ...playerState, ...playerSyncing, ...lifecycle }
}

/** Player handle, timers, and sync samples shared by the player composables. Not reactive: none of it renders. */
export interface SpaceYouTubePlayerSync {
  ytPlayer: SpaceYtPlayer | null
  ignoreNextStateChange: boolean
  ownerSyncTimer: ReturnType<typeof setInterval> | null
  /** Snapshot of last owner emit — atMs is the wall-clock time of the last emit (NOT updated on non-emit ticks). */
  lastOwnerState: { isPlaying: boolean; currentTime: number; playbackRate: number; atMs: number } | null
  /**
   * Last sampled player position (updated every owner-timer tick). Used to detect
   * scrub jumps while playing — previously we only detected seeks while paused, and
   * non-emit ticks overwrote currentTime so Live DVR seeks were silently swallowed.
   */
  lastOwnerSample: { currentTime: number; isPlaying: boolean; playbackRate: number; atMs: number } | null
  /**
   * Last remote timeline we applied as a viewer. atMs is the remote sample's
   * updatedAt so we can tell owner scrubs from natural playback between emits.
   */
  lastAppliedRemote: {
    currentTime: number
    isPlaying: boolean
    playbackRate: number
    atMs: number
  } | null
  /** True after the first successful applyState so periodic checkpoints use a relaxed seek threshold. */
  hasSyncedInitially: boolean
  /** The video ID currently loaded in the iframe — used to detect URL changes without recreating the player. */
  currentVideoId: string | null
  soundTimer: ReturnType<typeof setInterval> | null
  soundEchoUntil: number
  viewerGestureTimer: ReturnType<typeof setTimeout> | null
  /** Play during the unlock tap, then pause if the host is paused — iOS needs that play(). */
  pendingUnlockPause: boolean
  ownerSyncChipDelayTimer: ReturnType<typeof setTimeout> | null
  /**
   * Queued apply for video-swap: after calling loadVideoById the player is not
   * ready to seekTo/play yet. We stash the desired state here and re-apply it in
   * onStateChange when the new video reports CUED (5) or BUFFERING (3), so
   * viewers never sit on a freshly-loaded-but-never-played video.
   */
  pendingApply: WatchPartyState | null
}

/**
 * Watch-party wiring, ownership, the shared player bookkeeping, viewer volume,
 * autoplay, mute, and playback unlock.
 */
export function useSpaceYouTubePlayerState(props: SpaceYouTubePlayerProps) {
  // ─── Sync configuration ────────────────────────────────────────────────────
  /** How often (ms) the owner broadcasts a position checkpoint while playing. */
  const OWNER_SYNC_INTERVAL_MS = 10_000
  // ────────────────────────────────────────────────────────────────────────────

  const { user } = useAuth()
  const { watchPartyState, sendControl, subscribe, unsubscribe, requestCurrentState } = useWatchParty()
  const presence = usePresence()
  const { isSocketConnected } = presence
  const { selectedSpaceId } = useSpaceLobby()

  const isOwner = computed(() => Boolean(user.value?.id && props.space?.owner?.id && user.value.id === props.space.owner.id))
  const canRequestRoomState = computed(() => props.roomReady !== false)

  function wpLog(...args: unknown[]) {
    if (!import.meta.dev) return
    console.info('[watch-party/player]', ...args)
  }

  const playerContainerRef = ref<HTMLElement | null>(null)
  const playerReady = ref(false)
  const playerError = ref<string | null>(null)
  const playerSync: SpaceYouTubePlayerSync = {
    ytPlayer: null,
    ignoreNextStateChange: false,
    ownerSyncTimer: null,
    lastOwnerState: null,
    lastOwnerSample: null,
    lastAppliedRemote: null,
    hasSyncedInitially: false,
    currentVideoId: null,
    soundTimer: null,
    soundEchoUntil: 0,
    viewerGestureTimer: null,
    pendingUnlockPause: false,
    ownerSyncChipDelayTimer: null,
    pendingApply: null,
  }

  const locallySuspended = ref(false)
  const sharedVideo = useEmbeddedVideoManager()
  function interruptWatchParty() { locallySuspended.value = true; playerSync.ignoreNextStateChange = true; playerSync.ytPlayer?.pauseVideo?.() }

  /** True when a newer owner tab has taken primary control — this tab should not emit control events. */
  const isReplacedOwner = ref(false)
  /** Replaced owner tabs follow the room like viewers — overlay + local volume. */
  const isFollowingPlayback = computed(() => !isOwner.value || isReplacedOwner.value)

  // Local (per-viewer/per-tab) volume only — never synced to others.
  const viewerVolume = ref(sharedVideo.appWideSoundOn.value ? sharedVideo.appWideVolume.value * 100 : 0)
  const lastNonZeroVolume = ref(100)
  /** Followers start muted so playVideo() can beat the autoplay gate. */
  const viewerHasUnlockedAudio = ref(sharedVideo.appWideSoundOn.value)
  /** True after a tap (or a successful non-iOS play) so later host play/pause/seek/rate can apply. */
  const viewerPlaybackUnlocked = ref(false)
  /** Show the join overlay until iOS WebKit is unlocked, or desktop autoplay is blocked. */
  const viewerNeedsGesture = ref(false)
  const iosWebKit = import.meta.client && isIosWebKit()

  /** Owner asks server for authoritative state on reconnect/refresh and applies it once. */
  const pendingOwnerRestore = ref(false)
  const ownerSyncChipVisible = ref(false)

  watch([sharedVideo.appWideSoundOn, sharedVideo.appWideVolume], ([soundOn, volume]) => {
    playerSync.soundEchoUntil = Date.now() + 600
    viewerHasUnlockedAudio.value = soundOn
    viewerVolume.value = soundOn ? volume * 100 : 0
    playerSync.ytPlayer?.setVolume?.(volume * 100)
    if (soundOn) playerSync.ytPlayer?.unMute?.(); else playerSync.ytPlayer?.mute?.()
  })
  function syncLocalVolumeFromPlayer() {
    if (!playerSync.ytPlayer) return
    const vol = Math.max(0, Math.min(100, Number(playerSync.ytPlayer.getVolume?.() ?? 100)))
    viewerVolume.value = vol
    if (vol > 1) lastNonZeroVolume.value = vol
  }

  function onVolumeInput() {
    if (!playerSync.ytPlayer) return
    const vol = Math.max(0, Math.min(100, Number(viewerVolume.value) || 0))
    sharedVideo.reportPlayerAudio({ muted: vol <= 1, volume01: vol / 100 })
    viewerVolume.value = vol
    playerSync.ytPlayer.setVolume?.(vol)
    if (vol > 1) {
      lastNonZeroVolume.value = vol
      viewerHasUnlockedAudio.value = true
      if (!viewerPlaybackUnlocked.value) unlockViewerPlayback()
      playerSync.ytPlayer.unMute?.()
      if (watchPartyState.value?.isPlaying) playerSync.ytPlayer.playVideo?.()
      viewerNeedsGesture.value = false
    } else {
      playerSync.ytPlayer.mute?.()
    }
  }

  function muteViewerForAutoplay() {
    if (!playerSync.ytPlayer || !isFollowingPlayback.value || viewerHasUnlockedAudio.value) return
    playerSync.ytPlayer.mute?.()
    playerSync.ytPlayer.setVolume?.(0)
    viewerVolume.value = 0
  }

  function isYtPlaying(): boolean {
    const playing = getYtGlobal()?.PlayerState?.PLAYING
    const buffering = getYtGlobal()?.PlayerState?.BUFFERING
    const st = playerSync.ytPlayer?.getPlayerState?.()
    return st === playing || st === buffering
  }

  function playAlongHost() {
    if (locallySuspended.value) return
    if (!playerSync.ytPlayer) return
    if (isYtPlaying()) return
    muteViewerForAutoplay()
    playerSync.ytPlayer.playVideo?.()
    scheduleViewerGestureCheck()
  }

  function scheduleViewerGestureCheck() {
    if (!isFollowingPlayback.value) return
    if (playerSync.viewerGestureTimer) clearTimeout(playerSync.viewerGestureTimer)
    playerSync.viewerGestureTimer = setTimeout(() => {
      playerSync.viewerGestureTimer = null
      if (!playerSync.ytPlayer || !watchPartyState.value?.isPlaying) {
        if (!iosWebKit || viewerPlaybackUnlocked.value) viewerNeedsGesture.value = false
        return
      }
      const blocked = !isYtPlaying()
      viewerNeedsGesture.value = blocked
      if (!blocked) viewerPlaybackUnlocked.value = true
    }, 700)
  }

  /**
   * iPhone Safari only allows later play/pause/seek/rate after a tap on this page.
   * Play during the tap (even if the host is paused), then snap to room state.
   */
  function unlockViewerPlayback() {
    if (!mediaFocus.claim('video:watch-party', interruptWatchParty)) return
    locallySuspended.value = false
    if (!playerSync.ytPlayer) return
    prepareWatchPartyIframe()
    muteViewerForAutoplay()
    viewerPlaybackUnlocked.value = true
    viewerNeedsGesture.value = false
    playerSync.hasSyncedInitially = false
    const state = watchPartyState.value ?? playerSync.pendingApply
    if (state) {
      const stateVideoId = extractVideoId(state.videoUrl)
      const adjusted = driftAdjustedTime(state)
      if (stateVideoId) loadNewVideoIfNeeded(stateVideoId, isFinite(adjusted) ? adjusted : 0)
      if (isFinite(adjusted)) playerSync.ytPlayer.seekTo?.(adjusted, true)
      playerSync.ytPlayer.setPlaybackRate?.(state.playbackRate || 1)
      playerSync.pendingUnlockPause = !state.isPlaying
      playerSync.pendingApply = state
    } else {
      playerSync.pendingUnlockPause = true
    }
    playerSync.ytPlayer.playVideo?.()
  }

  /** iPhone Safari blocks iframe media unless allow=autoplay is on the frame itself. */
  function prepareWatchPartyIframe() {
    const iframe = playerContainerRef.value?.querySelector('iframe')
    if (!iframe) return
    iframe.setAttribute(
      'allow',
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
    )
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin')
    iframe.setAttribute('allowfullscreen', '')
    iframe.setAttribute('playsinline', '')
    iframe.setAttribute('webkit-playsinline', '')
  }

  function toggleMute() {
    if (!playerSync.ytPlayer) return
    if (viewerVolume.value <= 1) {
      sharedVideo.reportPlayerAudio({ muted: false, volume01: Math.max(0.01, lastNonZeroVolume.value / 100) })
      const restored = Math.max(1, Math.min(100, Number(lastNonZeroVolume.value) || 35))
      viewerVolume.value = restored
      viewerHasUnlockedAudio.value = true
      if (!viewerPlaybackUnlocked.value) unlockViewerPlayback()
      playerSync.ytPlayer.setVolume?.(restored)
      playerSync.ytPlayer.unMute?.()
      if (watchPartyState.value?.isPlaying) playerSync.ytPlayer.playVideo?.()
      viewerNeedsGesture.value = false
      return
    }
    if (viewerVolume.value > 1) lastNonZeroVolume.value = viewerVolume.value
    sharedVideo.reportPlayerAudio({ muted: true })
    viewerVolume.value = 0
    playerSync.ytPlayer.setVolume?.(0)
    playerSync.ytPlayer.mute?.()
  }

  function applyOwnerRestoreState(state: WatchPartyState) {
    if (locallySuspended.value) { playerSync.pendingApply = state; return }
    if (!playerSync.ytPlayer) return
    const raw = Math.max(0, Number(driftAdjustedTime(state)) || 0)
    // If the saved position is at or past the video's end (video finished before
    // the owner rejoined), restart from 0 so the player isn't stuck on a black
    // ended-state frame.
    const duration: number = playerSync.ytPlayer.getDuration?.() ?? 0
    const target = duration > 0 && raw >= duration - 1 ? 0 : raw
    const restoreVideoId = extractVideoId(state.videoUrl) ?? playerSync.currentVideoId
    wpLog('owner:apply-restore', {
      raw,
      target,
      playbackRate: state.playbackRate,
      stateVideoId: restoreVideoId,
      currentVideoId: playerSync.currentVideoId,
      duration,
    })
    playerSync.ignoreNextStateChange = true
    // Use cueVideoById for paused restore so YouTube renders the target frame
    // without requiring autoplay/user interaction.
    if (restoreVideoId) {
      playerSync.currentVideoId = restoreVideoId
      playerSync.ytPlayer.cueVideoById?.({ videoId: restoreVideoId, startSeconds: target })
    } else {
      playerSync.ytPlayer.seekTo?.(target, true)
    }
    playerSync.ytPlayer.setPlaybackRate?.(state.playbackRate)
    playerSync.ytPlayer.pauseVideo?.()
  }

  /**
   * If the player is ready and the video ID has changed, swap the video without
   * destroying the iframe. Returns true if a swap occurred.
   */
  function loadNewVideoIfNeeded(videoId: string | null, startSeconds = 0): boolean {
    if (!videoId || !playerSync.ytPlayer || !playerReady.value) return false
    if (videoId === playerSync.currentVideoId) return false
    playerSync.currentVideoId = videoId
    playerSync.hasSyncedInitially = false
    playerSync.ytPlayer.loadVideoById?.({ videoId, startSeconds })
    return true
  }

  return {
    OWNER_SYNC_INTERVAL_MS,
    watchPartyState,
    sendControl,
    subscribe,
    unsubscribe,
    requestCurrentState,
    presence,
    isSocketConnected,
    selectedSpaceId,
    isOwner,
    canRequestRoomState,
    wpLog,
    playerContainerRef,
    playerReady,
    playerError,
    playerSync,
    locallySuspended,
    sharedVideo,
    interruptWatchParty,
    isReplacedOwner,
    isFollowingPlayback,
    viewerVolume,
    viewerHasUnlockedAudio,
    viewerPlaybackUnlocked,
    viewerNeedsGesture,
    iosWebKit,
    pendingOwnerRestore,
    ownerSyncChipVisible,
    syncLocalVolumeFromPlayer,
    onVolumeInput,
    muteViewerForAutoplay,
    isYtPlaying,
    playAlongHost,
    unlockViewerPlayback,
    prepareWatchPartyIframe,
    toggleMute,
    applyOwnerRestoreState,
    loadNewVideoIfNeeded,
  }
}

export type SpaceYouTubePlayerContext = ReturnType<typeof useSpaceYouTubePlayer>
