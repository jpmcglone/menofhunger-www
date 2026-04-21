<!-- Module-level singleton: ensures only one <script> tag is appended and the
     onYouTubeIframeAPIReady callback is never clobbered by a second instance. -->
<script lang="ts">
let _ytApiPromise: Promise<void> | null = null
const YT_IFRAME_API_SRC = 'https://www.youtube.com/iframe_api'

function hasOfficialYoutubeIframeApiScript(): boolean {
  if (typeof document === 'undefined') return false
  return Boolean(document.querySelector(`script[src="${YT_IFRAME_API_SRC}"]`))
}

function hasUsableYoutubeApiGlobal(): boolean {
  const YT = (window as any).YT
  return Boolean(YT?.Player && YT?.PlayerState)
}

function loadYouTubeAPIOnce(): Promise<void> {
  // Only trust an existing YT global when the official iframe_api script is
  // actually present. Browser extensions can inject partial/incompatible
  // youtube.js globals that satisfy YT.Player but break at runtime.
  if (hasUsableYoutubeApiGlobal() && hasOfficialYoutubeIframeApiScript()) return Promise.resolve()

  if (hasUsableYoutubeApiGlobal() && !hasOfficialYoutubeIframeApiScript()) {
    try {
      delete (window as any).YT
    } catch {
      ;(window as any).YT = undefined
    }
  }

  if (_ytApiPromise) return _ytApiPromise
  _ytApiPromise = new Promise((resolve) => {
    const prev = (window as any).onYouTubeIframeAPIReady
    ;(window as any).onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve()
    }
    if (!hasOfficialYoutubeIframeApiScript()) {
      const tag = document.createElement('script')
      tag.src = YT_IFRAME_API_SRC
      document.head.appendChild(tag)
    }
  })
  return _ytApiPromise
}
</script>

<template>
  <div class="relative w-full h-full rounded-lg overflow-hidden bg-black">
    <div ref="playerContainerRef" class="w-full h-full" />
    <div
      v-if="!playerReady"
      class="absolute inset-0 flex items-center justify-center bg-black"
    >
      <Icon name="tabler:loader" class="text-[28px] text-white opacity-60 animate-spin" aria-hidden="true" />
    </div>
    <div
      v-if="isOwner && ownerSyncChipVisible"
      class="absolute top-3 left-1/2 -translate-x-1/2 z-30 inline-flex items-center gap-1.5 rounded-full bg-black/75 px-2.5 py-1 text-[11px] text-white/90 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <Icon name="tabler:loader-2" class="text-[12px] animate-spin" aria-hidden="true" />
      <span>Syncing to room state…</span>
    </div>
    <!-- Overlay for non-owners to prevent click-through to YT interactions -->
    <div
      v-if="!isOwner && playerReady"
      class="absolute inset-0 z-10"
      aria-hidden="true"
    />

    <!-- Viewer controls: local volume only -->
    <div
      v-if="!isOwner && playerReady"
      class="absolute bottom-3 right-3 z-20 flex items-center gap-2 rounded-full bg-black/70 px-2.5 py-1.5 backdrop-blur-sm"
    >
      <button
        type="button"
        class="inline-flex h-7 w-7 items-center justify-center rounded-full text-white/90 hover:text-white transition-colors"
        :aria-label="viewerVolume <= 1 ? 'Unmute local volume' : 'Mute local volume'"
        @click="toggleMute"
      >
        <Icon
          :name="viewerVolume <= 1 ? 'tabler:volume-off' : 'tabler:volume'"
          class="text-[15px]"
          aria-hidden="true"
        />
      </button>
      <input
        v-model.number="viewerVolume"
        type="range"
        min="0"
        max="100"
        step="1"
        class="h-1.5 w-28 accent-white/90"
        aria-label="Local volume"
        @input="onVolumeInput"
      >
    </div>

    <!-- Banner shown when this owner tab has been superseded by another tab -->
    <div
      v-if="isReplacedOwner"
      class="absolute bottom-0 inset-x-0 z-30 flex items-center justify-between gap-2 bg-black/80 px-4 py-2 text-xs text-white/80"
    >
      <span>Controlling from another tab — controls disabled here.</span>
      <button
        type="button"
        class="shrink-0 rounded px-2 py-1 text-xs font-semibold bg-white/15 hover:bg-white/25 transition-colors"
        @click="takeControl"
      >
        Take control
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Space, WatchPartyState } from '~/types/api'
import { extractVideoId, driftAdjustedTime } from '~/utils/watchPartyMath'

const props = defineProps<{
  space: Space
  roomReady?: boolean
}>()

// ─── Sync configuration ────────────────────────────────────────────────────
/** How often (ms) the owner broadcasts a position checkpoint while playing. */
const OWNER_SYNC_INTERVAL_MS = 10_000
/** Max drift (seconds) a viewer is allowed before being force-seeked to correct. */
const VIEWER_DRIFT_TOLERANCE_S = 5
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

let ytPlayer: any = null
let ignoreNextStateChange = false
let ownerSyncTimer: ReturnType<typeof setInterval> | null = null
/** Snapshot of last owner emit — atMs is the wall-clock time of the last emit (NOT updated on non-emit ticks). */
let lastOwnerState: { isPlaying: boolean; currentTime: number; playbackRate: number; atMs: number } | null = null
/** True after the first successful applyState so periodic checkpoints use a relaxed seek threshold. */
let hasSyncedInitially = false
/** The video ID currently loaded in the iframe — used to detect URL changes without recreating the player. */
let currentVideoId: string | null = null

/** True when a newer owner tab has taken primary control — this tab should not emit control events. */
const isReplacedOwner = ref(false)

// Local (per-viewer/per-tab) volume only — never synced to others.
const viewerVolume = ref(100)
const lastNonZeroVolume = ref(100)

/** Owner asks server for authoritative state on reconnect/refresh and applies it once. */
const pendingOwnerRestore = ref(false)
const ownerSyncChipVisible = ref(false)
let ownerSyncChipDelayTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Queued apply for video-swap: after calling loadVideoById the player is not
 * ready to seekTo/play yet. We stash the desired state here and re-apply it in
 * onStateChange when the new video reports CUED (5) or BUFFERING (3), so
 * viewers never sit on a freshly-loaded-but-never-played video.
 */
let pendingApply: WatchPartyState | null = null

function syncLocalVolumeFromPlayer() {
  if (!ytPlayer) return
  const vol = Math.max(0, Math.min(100, Number(ytPlayer.getVolume?.() ?? 100)))
  viewerVolume.value = vol
  if (vol > 1) lastNonZeroVolume.value = vol
}

function onVolumeInput() {
  if (!ytPlayer) return
  const vol = Math.max(0, Math.min(100, Number(viewerVolume.value) || 0))
  viewerVolume.value = vol
  ytPlayer.setVolume?.(vol)
  ytPlayer.unMute?.()
  if (vol > 1) lastNonZeroVolume.value = vol
}

function toggleMute() {
  if (!ytPlayer) return
  if (viewerVolume.value <= 1) {
    const restored = Math.max(1, Math.min(100, Number(lastNonZeroVolume.value) || 35))
    viewerVolume.value = restored
    ytPlayer.setVolume?.(restored)
    ytPlayer.unMute?.()
    return
  }
  if (viewerVolume.value > 1) lastNonZeroVolume.value = viewerVolume.value
  viewerVolume.value = 0
  ytPlayer.setVolume?.(0)
  ytPlayer.mute?.()
}

function applyOwnerRestoreState(state: WatchPartyState) {
  if (!ytPlayer) return
  const raw = Math.max(0, Number(driftAdjustedTime(state)) || 0)
  // If the saved position is at or past the video's end (video finished before
  // the owner rejoined), restart from 0 so the player isn't stuck on a black
  // ended-state frame.
  const duration: number = ytPlayer.getDuration?.() ?? 0
  const target = duration > 0 && raw >= duration - 1 ? 0 : raw
  const restoreVideoId = extractVideoId(state.videoUrl) ?? currentVideoId
  wpLog('owner:apply-restore', {
    raw,
    target,
    playbackRate: state.playbackRate,
    stateVideoId: restoreVideoId,
    currentVideoId,
    duration,
  })
  ignoreNextStateChange = true
  // Use cueVideoById for paused restore so YouTube renders the target frame
  // without requiring autoplay/user interaction.
  if (restoreVideoId) {
    currentVideoId = restoreVideoId
    ytPlayer.cueVideoById?.({ videoId: restoreVideoId, startSeconds: target })
  } else {
    ytPlayer.seekTo?.(target, true)
  }
  ytPlayer.setPlaybackRate?.(state.playbackRate)
  ytPlayer.pauseVideo?.()
}

/**
 * If the player is ready and the video ID has changed, swap the video without
 * destroying the iframe. Returns true if a swap occurred.
 */
function loadNewVideoIfNeeded(videoId: string | null): boolean {
  if (!videoId || !ytPlayer || !playerReady.value) return false
  if (videoId === currentVideoId) return false
  currentVideoId = videoId
  hasSyncedInitially = false
  ytPlayer.loadVideoById?.({ videoId, startSeconds: 0 })
  return true
}

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
  currentVideoId = videoId
  const container = document.createElement('div')
  playerContainerRef.value.innerHTML = ''
  playerContainerRef.value.appendChild(container)

  const YT = (window as any).YT
  ytPlayer = new YT.Player(container, {
    videoId,
    width: '100%',
    height: '100%',
    playerVars: {
      // Explicitly pin the JS API origin to this app. This is recommended by
      // YouTube and helps avoid cross-origin postMessage confusion.
      origin: window.location.origin,
      autoplay: 0,
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
        const iframe = playerContainerRef.value?.querySelector('iframe')
        wpLog('yt:onReady:dom', {
          containerWidth: playerContainerRef.value?.clientWidth ?? 0,
          containerHeight: playerContainerRef.value?.clientHeight ?? 0,
          hasIframe: Boolean(iframe),
          iframeSrc: iframe?.getAttribute('src') ?? null,
        })
        wpLog('yt:onReady', {
          isOwner: isOwner.value,
          hasState: Boolean(watchPartyState.value),
          pendingOwnerRestore: pendingOwnerRestore.value,
          canRequestRoomState: canRequestRoomState.value,
        })
        playerReady.value = true
        syncLocalVolumeFromPlayer()
        const state = watchPartyState.value
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

        // Apply any stashed state when the new video finishes loading (CUED = 5,
        // BUFFERING = 3). This handles the video-swap case where applyState returned
        // early after loadVideoById and there was no follow-up WS tick.
        if ((st === YTState?.CUED || st === YTState?.BUFFERING) && pendingApply) {
          const stateToApply = pendingApply
          pendingApply = null
          // Re-invoke applyState now that the player has the new video loaded.
          applyState(stateToApply)
          return
        }

        // Only the active primary owner tab drives the room via emitCurrentState.
        if (!isOwner.value || isReplacedOwner.value || ignoreNextStateChange) {
          ignoreNextStateChange = false
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
    },
  })
}

function takeControl() {
  isReplacedOwner.value = false
  // Re-joining the space re-elects this socket as the primary owner.
  presence.emitSpacesJoin(props.space.id)
}

function emitCurrentState() {
  if (!ytPlayer || !props.space?.id) return
  if (isReplacedOwner.value) return
  const videoUrl = props.space.watchPartyUrl ?? ''
  const YTState = (window as any).YT?.PlayerState
  const playerState = ytPlayer.getPlayerState?.()
  const nextState = {
    videoUrl,
    // BUFFERING means the owner intends to be playing but is loading — treat as playing
    // so viewers don't get a spurious pause flash during the owner's network hiccup.
    isPlaying: playerState === YTState?.PLAYING || playerState === YTState?.BUFFERING,
    currentTime: ytPlayer.getCurrentTime?.() ?? 0,
    playbackRate: ytPlayer.getPlaybackRate?.() ?? 1,
  }
  sendControl(props.space.id, nextState)
  lastOwnerState = {
    isPlaying: nextState.isPlaying,
    currentTime: nextState.currentTime,
    playbackRate: nextState.playbackRate,
    atMs: Date.now(),
  }
}

function startOwnerSyncTimer() {
  if (!isOwner.value) return
  if (ownerSyncTimer) clearInterval(ownerSyncTimer)
  ownerSyncTimer = setInterval(() => {
    if (!ytPlayer || !playerReady.value) return
    // Don't emit while waiting for the initial restore — we don't want to
    // overwrite the server's saved position with the player's 0:00 start position.
    if (pendingOwnerRestore.value) return
    const YTState = (window as any).YT?.PlayerState
    const playerState = ytPlayer.getPlayerState?.()
    const isPlaying = playerState === YTState?.PLAYING || playerState === YTState?.BUFFERING
    const currentTime = Number(ytPlayer.getCurrentTime?.() ?? 0)
    const playbackRate = Number(ytPlayer.getPlaybackRate?.() ?? 1)
    const now = Date.now()

    if (!lastOwnerState) {
      emitCurrentState()
      return
    }

    const pausedSeekDetected =
      !isPlaying &&
      !lastOwnerState.isPlaying &&
      Math.abs(currentTime - lastOwnerState.currentTime) > 1.25

    const playbackChanged =
      isPlaying !== lastOwnerState.isPlaying ||
      Math.abs(playbackRate - lastOwnerState.playbackRate) > 0.001

    // Send a periodic checkpoint so viewers can correct drift that accumulated
    // from buffering. atMs is only updated inside emitCurrentState (not on
    // non-emit ticks) so this reliably fires every OWNER_SYNC_INTERVAL_MS.
    const periodicCheckpoint = isPlaying && now - lastOwnerState.atMs > OWNER_SYNC_INTERVAL_MS

    if (pausedSeekDetected || playbackChanged || periodicCheckpoint) {
      emitCurrentState()
      return
    }

    // Keep the change-detection snapshot current, but preserve atMs so the
    // periodic-checkpoint counter isn't reset on every non-emit tick.
    lastOwnerState = { isPlaying, currentTime, playbackRate, atMs: lastOwnerState.atMs }
  }, 500)
}

function stopOwnerSyncTimer() {
  if (ownerSyncTimer) {
    clearInterval(ownerSyncTimer)
    ownerSyncTimer = null
  }
}

function applyState(state: WatchPartyState) {
  if (!ytPlayer) return
  // The active primary owner tab drives the room; it must not seek itself.
  // Replaced owner tabs should follow the room exactly like viewers.
  if (isOwner.value && !isReplacedOwner.value) return

  // If the video changed, swap the embed first. We stash the desired state in
  // pendingApply so onStateChange can re-apply it once the new video is ready
  // (CUED or BUFFERING), avoiding reliance on a follow-up WS tick.
  const stateVideoId = extractVideoId(state.videoUrl)
  if (stateVideoId && loadNewVideoIfNeeded(stateVideoId)) {
    pendingApply = state
    return
  }

  // Always compute the wall-clock-adjusted position so a state that was stored
  // seconds ago still lands the viewer at the correct spot.
  const adjusted = driftAdjustedTime(state)
  if (!isFinite(adjusted)) return  // bad/missing updatedAt — skip rather than seek to NaN
  const currentTime = ytPlayer.getCurrentTime?.() ?? 0
  const drift = Math.abs(currentTime - adjusted)

  // Seek rules:
  //  • First sync ever — always seek (avoids flashing from 0:00).
  //  • Pause event   — always seek to the EXACT pause timestamp (user requirement).
  //  • Playing       — only seek when drift exceeds tolerance to avoid micro-stutters.
  const shouldSeek =
    !hasSyncedInitially ||
    !state.isPlaying ||
    drift > VIEWER_DRIFT_TOLERANCE_S

  if (shouldSeek) {
    ytPlayer.seekTo?.(adjusted, true)
  }

  ytPlayer.setPlaybackRate?.(state.playbackRate)

  if (state.isPlaying) {
    ytPlayer.playVideo?.()
  } else {
    ytPlayer.pauseVideo?.()
  }

  hasSyncedInitially = true
}

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
      playbackRate: ytPlayer?.getPlaybackRate?.() ?? 1,
    })
  }
})

watch(pendingOwnerRestore, (pending) => {
  if (!pending) {
    ownerSyncChipVisible.value = false
    if (ownerSyncChipDelayTimer) {
      clearTimeout(ownerSyncChipDelayTimer)
      ownerSyncChipDelayTimer = null
    }
    return
  }
  // Show sync chip only if restore takes > 1s to avoid flicker.
  if (ownerSyncChipDelayTimer) clearTimeout(ownerSyncChipDelayTimer)
  ownerSyncChipDelayTimer = setTimeout(() => {
    ownerSyncChipDelayTimer = null
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
  if (!connected && prevSocketConnected && isOwner.value && ytPlayer && playerReady.value) {
    ignoreNextStateChange = true
    ytPlayer.pauseVideo?.()
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
  if (!id && prevId && ytPlayer && playerReady.value) {
    ytPlayer.pauseVideo?.()
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
    isReplacedOwner.value = false
    wpLog('owner:promoted', { spaceId: payload.spaceId })
    // Resume emitting now that we are primary again. The sync timer will pick
    // up naturally; emit once immediately so viewers don't wait up to 10 s.
    if (ytPlayer && playerReady.value) emitCurrentState()
  },
}

onMounted(async () => {
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

  await loadYouTubeAPIOnce()

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
})

onBeforeUnmount(() => {
  stopOwnerSyncTimer()
  if (ownerSyncChipDelayTimer) {
    clearTimeout(ownerSyncChipDelayTimer)
    ownerSyncChipDelayTimer = null
  }
  presence.removeSpacesCallback(replacedCb as any)
  unsubscribe()
  if (ytPlayer?.destroy) {
    try { ytPlayer.destroy() } catch { /* ignore */ }
  }
  ytPlayer = null
  playerReady.value = false
  lastOwnerState = null
  hasSyncedInitially = false
  currentVideoId = null
  pendingApply = null
  isReplacedOwner.value = false
  pendingOwnerRestore.value = false
  ownerSyncChipVisible.value = false
})
</script>
