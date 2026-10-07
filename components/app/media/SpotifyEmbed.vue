<template>
  <div data-post-row-interactive class="relative min-w-0 overflow-hidden rounded-xl" :style="{ minHeight: `${content.height}px` }" @click.stop @pointerdown.stop @keydown.stop>
    <div ref="surface" :inert="!owns || undefined" />
    <button v-if="!owns || failed" type="button" class="absolute inset-0 flex items-center justify-center gap-2 bg-black/30 text-white moh-focus" @click="activate">
      <Icon name="tabler:player-play-filled" aria-hidden="true" />{{ failed ? 'Retry Spotify' : 'Play Spotify' }}
    </button>
  </div>
</template>
<script setup lang="ts">
import { mediaFocus } from '~/utils/mediaFocus'
import { loadSpotifyAPI, type SpotifyController, type SpotifyPlayback } from '~/utils/media/spotify'
import type { SpotifyContent } from '~/utils/spotify-embed'
const props = defineProps<{ content: SpotifyContent }>()
const surface = ref<HTMLElement | null>(null)
const focusId = `spotify:${useId()}`
const failed = ref(false)
const owns = ref(false)
let controller: SpotifyController | null = null
let generation = 0
let unsubscribe: (() => void) | undefined
let completion: ReturnType<typeof setTimeout> | undefined
let wantsPlay = false
let startTimeout: ReturnType<typeof setTimeout> | undefined
function clearCompletion() { clearTimeout(completion); completion = undefined }
function interrupt() { clearTimeout(startTimeout); wantsPlay = false; owns.value = false; clearCompletion(); controller?.pause() }
function release() { interrupt(); mediaFocus.release(focusId) }
function playback(event: { data: SpotifyPlayback }) {
  const data = event.data
  clearCompletion()
  if (!data.isPaused || data.isBuffering) {
    clearTimeout(startTimeout)
    if (mediaFocus.currentId !== focusId || !wantsPlay) { controller?.pause(); return }
  }
  // Collection transitions retain their selection. Only a completed single item releases it.
  if (data.isPaused && !data.isBuffering && data.duration > 0 && data.position >= data.duration - 250 && ['track', 'episode'].includes(props.content.kind)) {
    completion = setTimeout(release, 750)
  }
}
function activate() {
  if (!mediaFocus.claim(focusId, interrupt)) return
  owns.value = true; wantsPlay = true; failed.value = false
  clearTimeout(startTimeout)
  startTimeout = setTimeout(() => { if (mediaFocus.currentId === focusId) { failed.value = true; dispose() } }, 15000)
  if (controller) controller.play()
  else void initialize()
}
async function initialize() {
  const version = ++generation
  try {
    const api = await loadSpotifyAPI()
    if (version !== generation || !surface.value) return
    const mount = document.createElement('div'); surface.value.replaceChildren(mount)
    api.createController(mount, { uri: `spotify:${props.content.kind}:${props.content.id}`, width: '100%', height: props.content.height }, value => {
      if (version !== generation) { value.destroy(); return }
      controller = value
      value.addListener('playback_update', playback)
      value.addListener('playback_started', () => { clearTimeout(startTimeout); if (mediaFocus.currentId !== focusId || !wantsPlay) value.pause() })
      if (wantsPlay && mediaFocus.currentId === focusId) value.play()
    })
  } catch { if (version === generation) { failed.value = true; release() } }
}
function dispose() { generation++; release(); controller?.destroy(); controller = null; surface.value?.replaceChildren() }
watch(() => props.content.embedUrl, () => { dispose(); failed.value = false; void initialize() })
onMounted(() => { unsubscribe = mediaFocus.subscribe(id => { owns.value = id === focusId }); void initialize() })
onBeforeUnmount(() => { dispose(); unsubscribe?.() })
onDeactivated(dispose)
onActivated(() => { if (!controller) void initialize() })
</script>
