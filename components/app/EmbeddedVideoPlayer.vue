<template>
  <div ref="box" class="relative w-full overflow-hidden bg-black" :style="frameStyle" data-post-row-interactive>
    <div ref="surface" class="absolute inset-0" :inert="!active || undefined" />
    <img v-if="poster && !painted" :src="poster" class="pointer-events-none absolute inset-0 h-full w-full object-cover" alt="" @error="$emit('posterError')">
    <button v-if="!active || state === 'blocked' || state === 'failed'" type="button" class="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/20 text-white" :aria-label="state === 'failed' ? 'Retry video' : `Play ${title || 'video'}`" @click.stop="play">
      <Icon name="tabler:player-play-filled" class="h-12 w-12 rounded-full bg-black/60 p-3" aria-hidden="true" />
      <span v-if="state === 'failed'" class="rounded bg-black/70 px-3 py-1 text-sm">Couldn’t play. Tap to retry.</span>
      <span v-else-if="state === 'blocked'" class="rounded bg-black/70 px-3 py-1 text-sm">Tap to play</span>
    </button>
    <div v-if="!painted && title" class="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8 text-white">
      <div class="line-clamp-2 text-sm font-semibold">{{ title }}</div><div v-if="author" class="text-xs text-white/70">{{ author }}</div>
    </div>
    <span v-if="active && state === 'buffering'" class="pointer-events-none absolute left-3 top-3 z-20 rounded bg-black/60 p-2 text-white" role="status" aria-label="Loading video"><Icon name="tabler:loader-2" class="animate-spin" /></span>
  </div>
</template>
<script setup lang="ts">
import { addBreadcrumb } from '@sentry/nuxt'
import { loadYouTubeAPI, type YouTubePlayer } from '~/utils/media/youtube'
import { rumbleDocument } from '~/utils/media/rumble-document'
import { parseYouTubeUrl } from '~/utils/link-utils'
import type { MediaPlayerAdapter, PlaybackState, PlayRequest, VideoSound } from '~/utils/media/video-autoplay'

const props = defineProps<{ youtubeUrl?: string | null; rumbleUrl?: string | null; poster?: string | null; title?: string | null; author?: string | null; frameStyle?: Record<string, string> }>()
defineEmits<{ posterError: [] }>()
const manager = useEmbeddedVideoManager()
const id = `embed:${useId()}`
const box = ref<HTMLElement | null>(null)
const surface = ref<HTMLElement | null>(null)
const active = computed(() => manager.activeId.value === id)
const state = ref<PlaybackState>('idle')
const painted = ref(false)
let yt: YouTubePlayer | null = null
let rumble: HTMLIFrameElement | null = null
let request: PlayRequest | null = null
let position = 0
let generation = 0
let poll: ReturnType<typeof setInterval> | null = null
let timeout: ReturnType<typeof setTimeout> | null = null
let expected: VideoSound = { muted: true, volume: 1 }
let ready = false
let fallbackMuted = false
let channel = ''
let audioEchoUntil = 0

function clearTimers() { if (poll) clearInterval(poll); if (timeout) clearTimeout(timeout); poll = null; timeout = null }
function send(action: string, extra: Record<string, unknown> = {}) {
  // srcdoc has an opaque origin; authenticate replies with source + a per-mount channel.
  rumble?.contentWindow?.postMessage({ channel, action, ...extra }, '*')
}
function report(next: PlaybackState, user = false) {
  if (next === 'failed' || next === 'blocked') addBreadcrumb({ category: 'media', message: next, level: 'warning', data: { provider: props.youtubeUrl ? 'youtube' : 'rumble' } })
  state.value = next; manager.report(id, next, user)
}
function applyAudio(sound: VideoSound) {
  expected = { ...sound }
  audioEchoUntil = Date.now() + 350
  if (yt && ready) { yt.setVolume(sound.volume * 100); if (sound.muted) yt.mute(); else yt.unMute() }
  if (rumble && ready) send('audio', sound)
}
function receiveAudio(muted: boolean, volume: number) {
  if (!active.value || !ready || Date.now() < audioEchoUntil) return
  if (muted !== expected.muted || Math.abs(volume - expected.volume) > 0.015) {
    expected = { muted, volume }
    manager.reportPlayerAudio({ muted, volume01: volume })
  }
}
function blocked() {
  if (!request || request.signal.aborted) return
  if (!expected.muted && !fallbackMuted) {
    fallbackMuted = true
    applyAudio({ ...expected, muted: true })
    yt?.playVideo()
    if (rumble) send('play', { ...expected, time: position })
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => { if (request && !request.signal.aborted) report('blocked') }, 8000)
  } else report('blocked')
}
function started() {
  if (!request || request.signal.aborted) return
  if (timeout) clearTimeout(timeout)
  timeout = null
  painted.value = true
  report('playing')
}
function disposePlayer() {
  generation++
  clearTimers()
  if (yt) { try { position = yt.getCurrentTime() || position; yt.pauseVideo(); yt.destroy() } catch { /* Provider may already have torn down. */ } }
  if (rumble) { send('pause'); rumble.remove() }
  yt = null; rumble = null; ready = false; request = null; painted.value = false
  surface.value?.replaceChildren()
}
const adapter: MediaPlayerAdapter = {
  async play(next) {
    request = next
    fallbackMuted = false
    expected = { muted: next.muted, volume: next.volume }
    if (yt && ready) { applyAudio(expected); yt.playVideo(); return }
    if (rumble && ready) { send('play', { ...expected, time: position }); return }
    const version = ++generation
    if (props.youtubeUrl) {
      const info = parseYouTubeUrl(props.youtubeUrl)
      if (!info) throw new Error('Invalid video')
      const api = await loadYouTubeAPI()
      if (version !== generation || next.signal.aborted || !surface.value) return
      const mount = document.createElement('div'); surface.value.replaceChildren(mount)
      yt = new api.Player(mount, {
        host: 'https://www.youtube-nocookie.com', width: '100%', height: '100%', videoId: info.id,
        playerVars: { autoplay: 0, mute: 1, playsinline: 1, controls: 1, rel: 0, origin: window.location.origin, start: position || info.startSeconds || 0 },
        events: {
          onReady: () => {
            if (version !== generation || request?.signal.aborted) return
            ready = true; applyAudio(expected)
            const frame = yt?.getIframe(); frame?.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture; encrypted-media'); frame?.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin')
            yt?.playVideo()
            poll = setInterval(() => { if (yt && ready) { position = yt.getCurrentTime() || position; receiveAudio(yt.isMuted(), yt.getVolume() / 100) } }, 250)
          },
          onStateChange: event => {
            if (version !== generation || request?.signal.aborted) return
            if (event.data === 1) started()
            else if (event.data === 2 && painted.value) report('paused', true)
            else if (event.data === 0) { report('ended'); position = 0 }
            else if (event.data === 3) report('buffering')
          },
          onError: () => { if (version === generation) report('failed') },
          onAutoplayBlocked: blocked,
        },
      })
    } else if (props.rumbleUrl && surface.value) {
      channel = `moh-rumble-${crypto.randomUUID()}`
      rumble = document.createElement('iframe')
      rumble.className = 'h-full w-full border-0'
      rumble.title = props.title || 'Rumble video'
      rumble.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media'
      rumble.allowFullscreen = true
      rumble.referrerPolicy = 'strict-origin-when-cross-origin'
      rumble.setAttribute('sandbox', 'allow-scripts allow-popups allow-presentation')
      rumble.srcdoc = rumbleDocument(props.rumbleUrl, channel, window.location.origin)
      surface.value.replaceChildren(rumble)
    }
    timeout = setTimeout(() => { if (version === generation && !next.signal.aborted) blocked() }, 12000)
  },
  pause: disposePlayer,
  setAudio: sound => { if (request && !request.signal.aborted) { fallbackMuted = false; applyAudio(sound) } },
  dispose: disposePlayer,
}
function onMessage(event: MessageEvent) {
  if (event.source !== rumble?.contentWindow || event.origin !== 'null' || !event.data || event.data.channel !== channel || !request || request.signal.aborted) return
  const data = event.data
  if (typeof data.time === 'number' && Number.isFinite(data.time)) position = data.time
  if (data.state === 'ready') { ready = true; applyAudio(expected); send('play', { ...expected, time: position }) }
  else if (data.state === 'play') started()
  else if (data.state === 'pause' && painted.value) report('paused', true)
  else if (data.state === 'videoEnd') { report('ended'); position = 0 }
  else if (data.state === 'error') report('failed')
  else if (data.state === 'fullscreen') manager.pin(id, data.value === true)
  if (typeof data.muted === 'boolean') receiveAudio(data.muted, typeof data.volume === 'number' ? data.volume : expected.volume)
}
function play() { manager.activate(id) }
watch([box, () => props.youtubeUrl, () => props.rumbleUrl], ([el], _old, cleanup) => {
  if (!el || !import.meta.client) return
  position = 0
  cleanup(manager.register(id, el, adapter, next => { state.value = next }))
}, { flush: 'post' })
function fullscreen() { manager.pin(id, !!document.fullscreenElement && !!box.value?.contains(document.fullscreenElement)) }
onMounted(() => { window.addEventListener('message', onMessage); document.addEventListener('fullscreenchange', fullscreen) })
onBeforeUnmount(() => { window.removeEventListener('message', onMessage); document.removeEventListener('fullscreenchange', fullscreen); disposePlayer() })
</script>
