import type { Space } from '~/types/api'

/** Opacity for the visualizer when used as a background (radio bar, space cards). Use via :style="{ opacity }". */
export const SPACE_VISUALIZER_BACKGROUND_OPACITY = 0.26

const AUDIO_SPACE_ID_KEY = 'space-audio-space-id'
const AUDIO_IS_PLAYING_KEY = 'space-audio-is-playing'
const AUDIO_IS_BUFFERING_KEY = 'space-audio-is-buffering'
const AUDIO_ERROR_KEY = 'space-audio-error'
const AUDIO_VOLUME_KEY = 'moh.space.audio.volume.v1'

let audioEl: HTMLAudioElement | null = null
let audioEventsBound = false

let audioCtx: AudioContext | null = null
let analyserNode: AnalyserNode | null = null
let mediaSourceNode: MediaElementAudioSourceNode | null = null
let mediaSourcePermanentlyFailed = false

function ensureAudio(): HTMLAudioElement | null {
  if (!import.meta.client) return null
  if (audioEl) return audioEl
  audioEl = new Audio()
  audioEl.preload = 'none'
  audioEl.crossOrigin = 'anonymous'
  return audioEl
}

export function getSpaceAudioAnalyser(): AnalyserNode | null {
  if (!import.meta.client) return null
  const el = ensureAudio()
  if (!el) return null
  if (analyserNode) return analyserNode
  if (mediaSourcePermanentlyFailed) return null

  if (!audioCtx) {
    try {
      const AudioContextCtor: typeof AudioContext =
        window.AudioContext ?? (window as any).webkitAudioContext
      audioCtx = new AudioContextCtor()
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
  } catch (e) {
    const name = (e as DOMException)?.name ?? 'Error'
    const msg = (e as Error)?.message ?? String(e)
    if (name === 'SecurityError') {
      console.error('[SpaceAudio] createMediaElementSource blocked by CORS policy.', 'Stream src:', el.src, 'Error:', msg)
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

export function primeSpaceAudioContext(): void {
  if (!import.meta.client) return
  getSpaceAudioAnalyser()
  if (audioCtx && audioCtx.state !== 'running') {
    void audioCtx.resume()
  }
}

export function resumeSpaceAudioContext(): void {
  if (!import.meta.client || !audioCtx) return
  const state = audioCtx.state
  if (state !== 'running' && state !== 'closed') {
    void audioCtx.resume().catch(() => undefined)
  }
}

export function debugSpaceAudio(): void {
  if (!import.meta.client) return
  console.group('[SpaceAudio] Debug')
  console.log('audioEl:', audioEl)
  console.log('audioEl.src:', audioEl?.src)
  console.log('audioEl.paused:', audioEl?.paused)
  console.log('audioCtx state:', audioCtx?.state)
  console.log('analyserNode:', analyserNode)
  console.log('mediaSourceNode:', mediaSourceNode)
  console.log('mediaSourcePermanentlyFailed:', mediaSourcePermanentlyFailed)
  if (analyserNode) {
    const buf = new Uint8Array(analyserNode.frequencyBinCount)
    analyserNode.getByteFrequencyData(buf)
    const energy = buf.reduce((s, v) => s + v, 0)
    console.log('frequencyBinCount:', analyserNode.frequencyBinCount, 'totalEnergy:', energy)
  }
  console.groupEnd()
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5
  return Math.max(0, Math.min(1, n))
}

export function useSpaceAudio() {
  const activeSpaceId = useState<string | null>(AUDIO_SPACE_ID_KEY, () => null)
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
  const hasRadioStream = computed(() => Boolean(currentSpace.value?.radioStreamUrl))

  const isMuted = computed(() => (volume.value ?? 0.5) <= 0.001)

  function bindAudioEvents() {
    if (!import.meta.client) return
    if (audioEventsBound) return
    const a = ensureAudio()
    if (!a) return
    audioEventsBound = true

    const onPlay = () => {
      resumeSpaceAudioContext()
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
      resumeSpaceAudioContext()
      isBuffering.value = false
    }
    const onError = () => {
      isPlaying.value = false
      isBuffering.value = false
      error.value = 'Could not play this stream.'
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

  async function playStream(streamUrl: string, opts: { spaceId?: string } = {}) {
    if (!import.meta.client) return
    primeSpaceAudioContext()
    await ensureLoaded()
    if (!user.value?.id) return

    const a = ensureAudio()
    if (!a) return
    bindAudioEvents()
    syncAudioVolume()

    const url = String(streamUrl ?? '').trim()
    if (!url) return

    const sid = String(opts.spaceId ?? selectedSpaceId.value ?? '').trim()
    if (sid) {
      presence.connect()
      await presence.whenSocketConnected(10_000)
      presence.emitSpacesJoin(sid)
      presence.emitSpacesMute(isMuted.value)
    }

    activeSpaceId.value = sid || null
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
    if (!space?.radioStreamUrl) return
    await playStream(space.radioStreamUrl, { spaceId: space.id })
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
    activeSpaceId.value = null
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
    const s = currentSpace.value
    if (s?.radioStreamUrl && s.id) void playStream(s.radioStreamUrl, { spaceId: s.id })
  }

  onMounted(() => {
    syncAudioVolume()
  })

  // Enforce a single active space medium:
  // - If the selected space changes away from the one this audio belongs to, stop.
  // - If the selected space is no longer in RADIO mode (or has no stream), stop.
  // This guarantees switching to WATCH_PARTY or NONE immediately cancels radio playback.
  watch(
    [selectedSpaceId, currentSpace, activeSpaceId],
    ([selectedId, space, activeId]) => {
      const sid = String(selectedId ?? '').trim()
      const aid = String(activeId ?? '').trim()
      if (!aid) return
      if (!sid || sid !== aid) {
        stop()
        return
      }
      if (!space || space.id !== aid || space.mode !== 'RADIO' || !space.radioStreamUrl) {
        stop()
      }
    },
    { deep: false },
  )

  return {
    activeSpaceId: readonly(activeSpaceId),
    currentSpace,
    hasRadioStream,
    isPlaying: readonly(isPlaying),
    isBuffering: readonly(isBuffering),
    error: readonly(error),
    volume: readonly(volume),
    setVolume,
    playStream,
    playSpace,
    pause,
    stop,
    toggle,
  }
}
