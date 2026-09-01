<template>
  <audio ref="audioEl" autoplay class="hidden" />
</template>

<script setup lang="ts">
/**
 * Plays one remote participant's audio. Lives in CallHost, not in a tile, so minimizing the
 * overlay (which unmounts every <video>) never silences the call. Only audio tracks are bound,
 * and the element's srcObject is only swapped when the audio track set actually changes, so a
 * video track arriving mid-call doesn't restart playback.
 */
const props = defineProps<{
  stream: MediaStream | null
  speakerDeviceId: string | null
}>()

const audioEl = ref<HTMLAudioElement | null>(null)
let boundTrackIds = ''

function attach() {
  const el = audioEl.value
  if (!el) return
  const tracks = props.stream?.getAudioTracks() ?? []
  const ids = tracks
    .map((t) => t.id)
    .sort()
    .join(',')
  if (ids === boundTrackIds && el.srcObject) return
  boundTrackIds = ids
  el.srcObject = tracks.length > 0 ? new MediaStream(tracks) : null
  if (tracks.length > 0) void el.play().catch(() => {})
}

async function applySink() {
  const el = audioEl.value as (HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }) | null
  if (!el || !props.speakerDeviceId || typeof el.setSinkId !== 'function') return
  try {
    await el.setSinkId(props.speakerDeviceId)
  } catch {
    // Device gone or not permitted; keep default output.
  }
}

onMounted(() => {
  attach()
  void applySink()
})
watch(() => props.stream, attach)
watch(() => props.speakerDeviceId, () => void applySink())
onBeforeUnmount(() => {
  const el = audioEl.value
  if (el) el.srcObject = null
})
</script>
