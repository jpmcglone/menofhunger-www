import { ref } from 'vue'
import { mediaFocus } from '~/utils/mediaFocus'

let shared: HTMLAudioElement | null = null
let generation = 0
const currentId = ref<string | null>(null)
const playing = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)
const currentTime = ref(0)
const duration = ref(0)
const rate = ref(1)
const title = ref('Voice message')
const href = ref<string | null>(null)
let source = ''

function session() { return typeof navigator !== 'undefined' ? navigator.mediaSession : undefined }
function updateSession() {
  const ms = session()
  if (!ms || !currentId.value) return
  ms.playbackState = playing.value ? 'playing' : 'paused'
  if (duration.value > 0 && Number.isFinite(duration.value)) {
    try { ms.setPositionState?.({ duration: duration.value, playbackRate: rate.value, position: Math.min(duration.value, Math.max(0, currentTime.value)) }) } catch { /* Older browsers lack position state. */ }
  }
}
function stop() {
  generation += 1
  shared?.pause()
  if (shared) { shared.removeAttribute('src'); shared.load() }
  currentId.value = null
  playing.value = false
  loading.value = false
  error.value = null
  currentTime.value = 0
  duration.value = 0
  href.value = null
  source = ''
  mediaFocus.release('voice')
  const ms = session()
  if (ms) {
    ms.metadata = null
    ms.playbackState = 'none'
    try { ms.setPositionState?.() } catch { /* Optional API. */ }
    for (const action of ['play', 'pause', 'stop', 'seekto', 'seekbackward', 'seekforward'] as const) {
      try { ms.setActionHandler(action, null) } catch { /* Unsupported action. */ }
    }
  }
}
function pause() { generation += 1; shared?.pause(); playing.value = false; loading.value = false; updateSession() }
function seek(id: string, seconds: number) {
  if (!shared || currentId.value !== id || !Number.isFinite(seconds)) return
  shared.currentTime = Math.min(duration.value || 0, Math.max(0, seconds))
  currentTime.value = shared.currentTime
  updateSession()
}
function installSession() {
  const ms = session()
  if (!ms) return
  if (typeof MediaMetadata !== 'undefined') ms.metadata = new MediaMetadata({ title: title.value, artist: 'Men of Hunger' })
  const handlers: Partial<Record<MediaSessionAction, MediaSessionActionHandler>> = {
    play: () => void play(), pause, stop,
    seekto: d => { if (currentId.value && d.seekTime != null) seek(currentId.value, d.seekTime) },
    seekbackward: d => { if (currentId.value) seek(currentId.value, currentTime.value - (d.seekOffset ?? 10)) },
    seekforward: d => { if (currentId.value) seek(currentId.value, currentTime.value + (d.seekOffset ?? 10)) },
  }
  for (const [action, handler] of Object.entries(handlers)) {
    try { ms.setActionHandler(action as MediaSessionAction, handler as MediaSessionActionHandler) } catch { /* Unsupported action. */ }
  }
}
function ensure(): HTMLAudioElement {
  if (shared) return shared
  const el = new Audio()
  shared = el
  el.preload = 'metadata'
  const sync = () => {
    if (!currentId.value) return
    currentTime.value = el.currentTime || 0
    if (Number.isFinite(el.duration) && el.duration > 0) duration.value = el.duration
    updateSession()
  }
  el.addEventListener('timeupdate', sync)
  el.addEventListener('loadedmetadata', sync)
  el.addEventListener('playing', () => { if (currentId.value) { playing.value = true; loading.value = false; error.value = null; sync() } })
  el.addEventListener('waiting', () => { if (currentId.value && !el.paused) loading.value = true })
  el.addEventListener('pause', () => { playing.value = false; loading.value = false; sync() })
  el.addEventListener('ended', () => { playing.value = false; loading.value = false; sync() })
  el.addEventListener('error', () => { if (currentId.value) { error.value = 'Couldn’t play. Tap to retry.'; loading.value = false; playing.value = false } })
  return el
}
async function play() {
  if (!currentId.value) return
  if (!mediaFocus.claim('voice', stop)) { error.value = 'Finish recording before playing.'; return }
  const el = ensure()
  const attempt = ++generation
  if (error.value) { el.src = source; el.load() }
  if (el.ended) el.currentTime = 0
  el.playbackRate = rate.value
  error.value = null
  loading.value = true
  installSession()
  try { await el.play() } catch {
    if (attempt === generation) { loading.value = false; playing.value = false; error.value = 'Couldn’t play. Tap to retry.' }
  }
}
export function useChatAudioPlayer() {
  function toggle(id: string, src: string, details: { title?: string; href?: string; duration?: number } = {}) {
    if (typeof window === 'undefined') return
    if (currentId.value === id) { if (playing.value || loading.value) pause(); else void play(); return }
    if (!mediaFocus.claim('voice', stop)) return
    const el = ensure()
    el.pause()
    generation += 1
    currentId.value = id
    source = src
    title.value = details.title ?? 'Voice message'
    href.value = details.href ?? null
    duration.value = details.duration ?? 0
    currentTime.value = 0
    error.value = null
    el.src = src
    void play()
  }
  function cycleRate(id: string) {
    if (currentId.value !== id) return
    rate.value = rate.value === 1 ? 1.5 : rate.value === 1.5 ? 2 : 1
    if (shared) shared.playbackRate = rate.value
    updateSession()
  }
  return { currentId, playing, loading, error, currentTime, duration, rate, title, href, toggle, seek, cycleRate, pause, play, stop }
}
