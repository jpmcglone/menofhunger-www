import type { Space, SpaceStation } from '~/types/api'

/** Opacity for the visualizer when used as a background (radio bar, space cards). Use via :style="{ opacity }". */
export const SPACE_VISUALIZER_BACKGROUND_OPACITY = 0.26

const AUDIO_STATION_ID_KEY = 'space-audio-station-id'
const AUDIO_IS_PLAYING_KEY = 'space-audio-is-playing'
const AUDIO_IS_BUFFERING_KEY = 'space-audio-is-buffering'
const AUDIO_ERROR_KEY = 'space-audio-error'
// Bump version when changing default behavior so existing cookies don't lock old defaults.
const AUDIO_VOLUME_KEY = 'moh.space.audio.volume.v1'

let audioEl: HTMLAudioElement | null = null
let audioEventsBound = false

// Web Audio API nodes — module-level singletons so we never try to
// re-connect the same HTMLAudioElement to a second AudioContext.
let audioCtx: AudioContext | null = null
let analyserNode: AnalyserNode | null = null
let mediaSourceNode: MediaElementAudioSourceNode | null = null
// Set to true if createMediaElementSource permanently failed (e.g. CORS or browser
// refusal) so we stop retrying and don't accumulate InvalidStateErrors.
let mediaSourcePermanentlyFailed = false

function ensureAudio(): HTMLAudioElement | null {
  if (!import.meta.client) return null
  if (audioEl) return audioEl
  audioEl = new Audio()
  audioEl.preload = 'none'
  audioEl.crossOrigin = 'anonymous'
  return audioEl
}

/**
 * Returns a shared AnalyserNode wired into the space audio element.
 * Safe to call multiple times — returns the same node after first call.
 * Returns null on SSR or if the audio element is unavailable.
 */
export function getSpaceAudioAnalyser(): AnalyserNode | null {
  if (!import.meta.client) return null
  const el = ensureAudio()
  if (!el) return null
  if (analyserNode) return analyserNode
  // Once createMediaElementSource has permanently failed we cannot retry on the
  // same element — the browser will throw InvalidStateError every subsequent time.
  if (mediaSourcePermanentlyFailed) return null

  // Create the AudioContext once; never replace it (the element can only be
  // connected to one context over its lifetime).
  // Use webkitAudioContext fallback for older Safari.
  if (!audioCtx) {
    try {
      const AudioContextCtor: typeof AudioContext =
        window.AudioContext ?? (window as any).webkitAudioContext
      audioCtx = new AudioContextCtor()
      console.debug('[SpaceAudio] AudioContext created, state:', audioCtx.state)
    } catch (e) {
      console.warn('[SpaceAudio] Failed to create AudioContext:', e)
      return null
    }
  }

  try {
    analyserNode = audioCtx.createAnalyser()
    analyserNode.fftSize = 256
    analyserNode.smoothingTimeConstant = 0.82
    mediaSourceNode = audioCtx.createMediaElementSource(el)
    mediaSourceNode.connect(analyserNode)
    analyserNode.connect(audioCtx.destination)
    console.debug('[SpaceAudio] Web Audio graph wired. ctx state:', audioCtx.state, 'crossOrigin:', el.crossOrigin)
  } catch (e) {
    // SecurityError → CORS headers missing on the stream URL.
    // InvalidStateError → element already consumed by a prior (failed) call.
    // Either way, mark as permanently failed so we stop retrying.
    const name = (e as DOMException)?.name ?? 'Error'
    const msg = (e as Error)?.message ?? String(e)
    if (name === 'SecurityError') {
      console.error(
        '[SpaceAudio] createMediaElementSource blocked by CORS policy.',
        'The stream URL must return Access-Control-Allow-Origin: * (or the appropriate origin).',
        'Stream src:', el.src,
        'Error:', msg,
      )
    } else {
      console.error(`[SpaceAudio] createMediaElementSource failed (${name}):`, msg)
    }
    analyserNode = null
    mediaSourceNode = null
    mediaSourcePermanentlyFailed = true
    return null
  }
  return analyserNode
}

/**
 * Call this in the browser console to diagnose visualizer issues.
 *   debugSpaceAudio()
 */
export function debugSpaceAudio(): void {
  if (!import.meta.client) { console.log('SSR context — no debug info'); return }
  const el = audioEl
  console.group('[SpaceAudio] Diagnostic')
  console.log('Audio element:', el)
  console.log('  src:', el?.src ?? '(none)')
  console.log('  crossOrigin:', el?.crossOrigin ?? '(not set)')
  console.log('  paused:', el?.paused)
  console.log('  readyState:', el?.readyState, '(4 = HAVE_ENOUGH_DATA)')
  console.log('  networkState:', el?.networkState)
  console.log('AudioContext:', audioCtx)
  console.log('  state:', audioCtx?.state ?? '(not created)')
  console.log('  sampleRate:', audioCtx?.sampleRate)
  console.log('AnalyserNode:', analyserNode)
  console.log('MediaSourceNode:', mediaSourceNode)
  console.log('mediaSourcePermanentlyFailed:', mediaSourcePermanentlyFailed)
  if (analyserNode && audioCtx?.state === 'running') {
    const arr = new Uint8Array(analyserNode.frequencyBinCount)
    analyserNode.getByteFrequencyData(arr)
    const max = Math.max(...arr)
    const sum = arr.reduce((a, b) => a + b, 0)
    console.log('  getByteFrequencyData → max:', max, 'sum:', sum, '(non-zero = audio flowing through graph)')
  }
  console.groupEnd()
}

/**
 * Prime the AudioContext from within a user-gesture handler.
 *
 * Safari (and other strict autoplay-policy browsers) require both the
 * AudioContext creation AND its `.resume()` call to happen synchronously
 * inside a user-gesture callback — before any `await`. Calling this at the
 * very top of an async click handler (before the first await) satisfies that
 * requirement and lets the visualiser bars work on Safari/iOS.
 */
export function primeSpaceAudioContext(): void {
  if (!import.meta.client) return
  getSpaceAudioAnalyser()
  if (audioCtx && audioCtx.state !== 'running') {
    void audioCtx.resume()
  }
}

/** Resume the AudioContext if it is not running. */
export function resumeSpaceAudioContext(): void {
  if (!import.meta.client || !audioCtx) return
  const state = audioCtx.state
  if (state !== 'running' && state !== 'closed') {
    void audioCtx.resume().then(() => {
      console.debug('[SpaceAudio] AudioContext resumed, new state:', audioCtx?.state)
    }).catch((e) => {
      console.warn('[SpaceAudio] AudioContext.resume() failed:', e)
    })
  }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5
  return Math.max(0, Math.min(1, n))
}

export function useSpaceAudio() {
  const stationId = useState<string | null>(AUDIO_STATION_ID_KEY, () => null)
  const isPlaying = useState<boolean>(AUDIO_IS_PLAYING_KEY, () => false)
  const isBuffering = useState<boolean>(AUDIO_IS_BUFFERING_KEY, () => false)
  const error = useState<string | null>(AUDIO_ERROR_KEY, () => null)
  const volumeCookie = useCookie<number>(AUDIO_VOLUME_KEY, {
    default: () => 0.25,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  const volume = useState<number>('space-audio-volume', () => clamp01(volumeCookie.value ?? 0.25))

  const { ensureLoaded, user } = useAuth()
  const presence = usePresence()
  const { selectedSpaceId } = useSpaceLobby()
  const { getById } = useSpaces()

  const currentSpace = computed(() => getById(selectedSpaceId.value))
  const currentStation = computed<SpaceStation | null>(() => currentSpace.value?.station ?? null)
  const hasStation = computed(() => Boolean(currentStation.value))

  const isMuted = computed(() => (volume.value ?? 0.5) <= 0.001)

  function bindAudioEvents() {
    if (!import.meta.client) return
    if (audioEventsBound) return
    const a = ensureAudio()
    if (!a) return
    audioEventsBound = true

    // Expose diagnostic helper globally so it can be called from the browser console:
    //   debugSpaceAudio()
    if (typeof window !== 'undefined') {
      ;(window as any).debugSpaceAudio = debugSpaceAudio
    }

    const onPlay = () => {
      // Re-resume on iOS Safari: the AudioContext can be suspended between
      // the user gesture (where primeSpaceAudioContext ran) and actual playback.
      resumeSpaceAudioContext()
      console.debug('[SpaceAudio] play event. ctx state:', audioCtx?.state)
      isPlaying.value = true
      isBuffering.value = false
      error.value = null
    }
    const onPause = () => {
      isPlaying.value = false
      isBuffering.value = false
    }
    const onWaiting = () => {
      if (isPlaying.value) isBuffering.value = true
    }
    const onPlaying = () => {
      // Belt-and-suspenders: also resume on the 'playing' event for Safari.
      resumeSpaceAudioContext()
      isBuffering.value = false
    }
    const onError = () => {
      isPlaying.value = false
      isBuffering.value = false
      error.value = 'Could not play this station.'
    }

    a.addEventListener('play', onPlay)
    a.addEventListener('pause', onPause)
    a.addEventListener('waiting', onWaiting)
    a.addEventListener('playing', onPlaying)
    a.addEventListener('error', onError)
  }

  function syncAudioVolume() {
    if (!import.meta.client) return
    const a = ensureAudio()
    if (!a) return
    a.volume = clamp01(volume.value)
  }

  function setVolume(next: number) {
    const wasMuted = isMuted.value
    const v = clamp01(next)
    volume.value = v
    volumeCookie.value = v
    syncAudioVolume()

    const nowMuted = isMuted.value
    if (wasMuted !== nowMuted && selectedSpaceId.value) {
      presence.connect()
      presence.emitSpacesMute(nowMuted)
    }
  }

  async function playStation(station: SpaceStation, opts: { spaceId?: string } = {}) {
    if (!import.meta.client) return
    // Must be first — before any await — so Safari's autoplay policy allows
    // the AudioContext to start and the visualiser bars work.
    primeSpaceAudioContext()
    await ensureLoaded()
    if (!user.value?.id) return

    const a = ensureAudio()
    if (!a) return
    bindAudioEvents()
    syncAudioVolume()

    const url = String(station?.streamUrl ?? '').trim()
    if (!url) return

    const sid = String(opts.spaceId ?? selectedSpaceId.value ?? '').trim()
    if (sid) {
      presence.connect()
      await presence.whenSocketConnected(10_000)
      presence.emitSpacesJoin(sid)
      presence.emitSpacesMute(isMuted.value)
    }

    stationId.value = station.id
    error.value = null
    isBuffering.value = true

    a.src = url
    try {
      await a.play()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Playback failed.'
      isPlaying.value = false
      isBuffering.value = false
      if (sid) presence.emitSpacesPause()
    }
  }

  async function playSpace(space: Space) {
    if (!space?.station) return
    await playStation(space.station, { spaceId: space.id })
  }

  function pause() {
    if (!import.meta.client) return
    const a = ensureAudio()
    if (!a) return
    try {
      a.pause()
    } catch {
      // ignore
    }
    presence.emitSpacesPause()
  }

  function stop() {
    if (!import.meta.client) return
    const a = ensureAudio()
    if (a) {
      try {
        a.pause()
        a.removeAttribute('src')
        a.load()
      } catch {
        // ignore
      }
    }
    stationId.value = null
    isPlaying.value = false
    isBuffering.value = false
    error.value = null
    presence.emitSpacesPause()
  }

  function toggle() {
    if (!import.meta.client) return
    if (isPlaying.value) {
      pause()
      return
    }
    const s = currentStation.value
    const spaceId = currentSpace.value?.id
    if (s && spaceId) void playStation(s, { spaceId })
  }

  onMounted(() => {
    syncAudioVolume()
  })

  return {
    stationId: readonly(stationId),
    currentSpace,
    currentStation,
    hasStation,
    isPlaying: readonly(isPlaying),
    isBuffering: readonly(isBuffering),
    error: readonly(error),
    volume: readonly(volume),
    setVolume,
    playStation,
    playSpace,
    pause,
    stop,
    toggle,
  }
}

