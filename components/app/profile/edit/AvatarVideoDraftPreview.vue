<template>
  <span class="absolute inset-0 overflow-hidden" aria-hidden="true">
    <video
      ref="video" :src="source" :style="cropStyle" class="absolute max-w-none" muted playsinline
      @loadedmetadata="start" @timeupdate="loop" @ended="start" />
  </span>
</template>

<script setup lang="ts">
import type { AvatarVideoEdit } from '~/utils/avatar-video-upload'

const props = defineProps<{ edit: AvatarVideoEdit }>()
const source = ref('')
const video = ref<HTMLVideoElement | null>(null)
const cropStyle = computed(() => {
  const { x, y, width, height } = props.edit.selection.crop
  return { width: `${100 / width}%`, height: `${100 / height}%`, left: `${-100 * x / width}%`, top: `${-100 * y / height}%` }
})
function play() {
  if (video.value && !document.hidden) void video.value.play().catch(() => {})
}
function start() {
  if (!video.value) return
  video.value.currentTime = props.edit.selection.startSeconds
  play()
}
function loop() {
  if (!video.value) return
  const { startSeconds, durationSeconds } = props.edit.selection
  if (video.value.currentTime >= startSeconds + durationSeconds || video.value.currentTime < startSeconds) start()
}
function visibilityChanged() {
  if (document.hidden) video.value?.pause()
  else play()
}
function load() {
  video.value?.pause()
  if (source.value) URL.revokeObjectURL(source.value)
  source.value = URL.createObjectURL(props.edit.file)
}
onMounted(() => {
  load()
  document.addEventListener('visibilitychange', visibilityChanged)
})
watch(() => props.edit, () => { if (import.meta.client) load() })
onBeforeUnmount(() => {
  video.value?.pause()
  if (source.value) URL.revokeObjectURL(source.value)
  document.removeEventListener('visibilitychange', visibilityChanged)
})
</script>
