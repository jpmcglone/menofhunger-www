import type { RadioListener, RadioLobbyCounts, RadioStation } from '~/types/api'
import radioStationsFallback from '~/config/radio-stations.json'

const RADIO_STATION_ID_KEY = 'radio-station-id'
const RADIO_IS_PLAYING_KEY = 'radio-is-playing'
const RADIO_IS_BUFFERING_KEY = 'radio-is-buffering'
const RADIO_ERROR_KEY = 'radio-error'
const RADIO_LISTENERS_KEY = 'radio-listeners'
const RADIO_LOBBY_COUNTS_KEY = 'radio-lobby-counts'
// Bump version when changing default behavior so existing cookies don't lock old defaults.
const RADIO_VOLUME_KEY = 'moh.radio.volume.v2'
const DEFAULT_RADIO_STATIONS: RadioStation[] = Array.isArray(radioStationsFallback)
  ? (radioStationsFallback as RadioStation[])
  : []

let audioEl: HTMLAudioElement | null = null
let audioEventsBound = false

function ensureAudio(): HTMLAudioElement | null {
  if (!import.meta.client) return null
  if (audioEl) return audioEl
  audioEl = new Audio()
  audioEl.preload = 'none'
  audioEl.crossOrigin = 'anonymous'
  return audioEl
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5
  return Math.max(0, Math.min(1, n))
}

export function useRadioPlayer() {
  const stationId = useState<string | null>(RADIO_STATION_ID_KEY, () => null)
  const isPlaying = useState<boolean>(RADIO_IS_PLAYING_KEY, () => false)
  const isBuffering = useState<boolean>(RADIO_IS_BUFFERING_KEY, () => false)
  const error = useState<string | null>(RADIO_ERROR_KEY, () => null)
  const listeners = useState<RadioListener[]>(RADIO_LISTENERS_KEY, () => [])
  const lobbyCounts = useState<RadioLobbyCounts>(RADIO_LOBBY_COUNTS_KEY, () => ({ countsByStationId: {} }))
  const volumeCookie = useCookie<number>(RADIO_VOLUME_KEY, {
    // Default requested: start at 25%.
    default: () => 0.25,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  const volume = useState<number>('radio-volume', () => clamp01(volumeCookie.value ?? 0.25))

  const { ensureLoaded, user } = useAuth()
  const { apiFetchData } = useApiClient()
  const presence = usePresence()

  const stations = useState<RadioStation[]>('radio-stations', () => DEFAULT_RADIO_STATIONS)
  const stationsLoading = ref(false)

  async function loadStations() {
    if (stationsLoading.value) return
    stationsLoading.value = true
    try {
      const remote = await apiFetchData<RadioStation[]>('/radio/stations', { method: 'GET' })
      stations.value = Array.isArray(remote) && remote.length > 0 ? remote : DEFAULT_RADIO_STATIONS
    } catch {
      // best-effort; page can still render with empty list
      stations.value = stations.value.length > 0 ? stations.value : DEFAULT_RADIO_STATIONS
    } finally {
      stationsLoading.value = false
    }
  }

  const currentStation = computed(() => stations.value.find((s) => s.id === stationId.value) ?? null)
  const hasStation = computed(() => Boolean(currentStation.value))

  const isMuted = computed(() => (volume.value ?? 0.5) <= 0.001)

  const radioCb = {
    onListeners: (payload: { stationId: string; listeners: any[] }) => {
      if (!payload?.stationId) return
      if (payload.stationId !== stationId.value) return
      // API emits {id, username, avatarUrl} (matches RadioListener shape)
      listeners.value = (payload.listeners ?? []) as RadioListener[]
    },
    onLobbyCounts: (payload: { countsByStationId: Record<string, number> }) => {
      const countsByStationId = payload?.countsByStationId ?? {}
      lobbyCounts.value = { countsByStationId }
    },
    onReplaced: () => {
      stop()
      const { push } = useAppToast()
      push({
        title: 'Radio stopped',
        message: 'You started playing in another tab.',
        color: '#000000',
        durationMs: 3500,
      })
    },
  }

  function bindAudioEvents() {
    if (!import.meta.client) return
    if (audioEventsBound) return
    const a = ensureAudio()
    if (!a) return
    audioEventsBound = true

    const onPlay = () => {
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
    if (wasMuted !== nowMuted && stationId.value) {
      // Best-effort: mute presence is only relevant while in a station lobby.
      presence.connect()
      presence.emitRadioMute(nowMuted)
    }
  }

  async function play(station: RadioStation) {
    if (!import.meta.client) return
    await ensureLoaded()
    if (!user.value?.id) return

    const a = ensureAudio()
    if (!a) return
    bindAudioEvents()
    syncAudioVolume()

    const url = String(station?.streamUrl ?? '').trim()
    if (!url) return

    // If switching stations, leave previous first.
    if (stationId.value && stationId.value !== station.id) {
      presence.emitRadioLeave()
      listeners.value = []
    }

    stationId.value = station.id
    error.value = null
    isBuffering.value = true

    // Ensure socket is connected before joining room.
    presence.connect()
    await presence.whenSocketConnected(10_000)
    presence.addRadioCallback(radioCb)
    presence.emitRadioJoin(station.id)
    // Send current mute state (so other listeners can see it immediately).
    presence.emitRadioMute(isMuted.value)

    // Start playback (requires user gesture; caller should only invoke on click).
    a.src = url
    try {
      await a.play()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Playback failed.'
      isPlaying.value = false
      isBuffering.value = false
      // Ensure we don't count as listening if play failed.
      presence.emitRadioLeave()
    }
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
    // Stop counting as a listener, but remain subscribed so we can still show/update listeners while paused.
    presence.emitRadioPause()
  }

  function stop() {
    if (!import.meta.client) return
    const a = ensureAudio()
    if (a) {
      try {
        a.pause()
        // Ensure we stop downloading/streaming.
        a.removeAttribute('src')
        a.load()
      } catch {
        // ignore
      }
    }
    // Fully leave the station room and clear local state.
    presence.emitRadioLeave()
    presence.removeRadioCallback(radioCb as any)
    stationId.value = null
    listeners.value = []
    isPlaying.value = false
    isBuffering.value = false
    error.value = null
  }

  function toggle() {
    if (!import.meta.client) return
    if (isPlaying.value) {
      pause()
      return
    }
    const s = currentStation.value
    if (s) void play(s)
  }

  // Cleanup when user logs out.
  watch(
    () => user.value?.id ?? null,
    (uid) => {
      if (uid) return
      pause()
      stationId.value = null
      listeners.value = []
      presence.removeRadioCallback(radioCb as any)
    },
  )

  onMounted(() => {
    void loadStations()
    syncAudioVolume()
  })

  async function subscribeLobbyCounts() {
    if (!import.meta.client) return
    await ensureLoaded()
    if (!user.value?.id) return
    presence.connect()
    await presence.whenSocketConnected(10_000)
    presence.addRadioCallback(radioCb)
    presence.emitRadioLobbiesSubscribe()
  }

  function unsubscribeLobbyCounts() {
    if (!import.meta.client) return
    presence.emitRadioLobbiesUnsubscribe()
    // Don't remove the callback here: it may also be needed for per-station listeners if playing.
  }

  function lobbyCountForStation(stationIdRaw: string): number {
    const id = String(stationIdRaw ?? '').trim()
    if (!id) return 0
    return Math.max(0, Math.floor(Number(lobbyCounts.value?.countsByStationId?.[id] ?? 0) || 0))
  }

  return {
    stations: readonly(stations),
    stationsLoading: readonly(stationsLoading),
    loadStations,
    stationId: readonly(stationId),
    currentStation,
    hasStation,
    isPlaying: readonly(isPlaying),
    isBuffering: readonly(isBuffering),
    error: readonly(error),
    listeners: readonly(listeners),
    lobbyCounts: readonly(lobbyCounts),
    lobbyCountForStation,
    volume: readonly(volume),
    setVolume,
    play,
    pause,
    stop,
    toggle,
    subscribeLobbyCounts,
    unsubscribeLobbyCounts,
  }
}

