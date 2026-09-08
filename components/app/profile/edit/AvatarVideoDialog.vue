<template>
  <Dialog :visible="Boolean(file)" modal header="Video avatar" :style="{ width: 'min(28rem, 96vw)' }" @update:visible="emit('cancel')">
    <div class="space-y-4">
      <p class="text-sm text-[var(--moh-text-muted)]">Choose up to 7 seconds. Drag to frame your video.</p>
      <div
        ref="viewport" class="relative mx-auto aspect-square w-full touch-none overflow-hidden bg-black"
        tabindex="0" role="group" aria-label="Video crop. Use arrow keys to reposition."
        @keydown.left.prevent="panX = Math.max(0, panX - 0.05)" @keydown.right.prevent="panX = Math.min(1, panX + 0.05)"
        @keydown.up.prevent="panY = Math.max(0, panY - 0.05)" @keydown.down.prevent="panY = Math.min(1, panY + 0.05)"
        @pointerdown="beginDrag" @pointermove="drag" @pointerup="endDrag" @pointercancel="endDrag"
      >
        <video ref="video" :src="source" :style="videoStyle" class="absolute max-w-none" muted playsinline @loadedmetadata="loaded" @timeupdate="loop" @error="error = 'This browser cannot preview this video. Choose an MP4 video.'" />
        <div class="pointer-events-none absolute inset-0 border border-white/50" :class="isOrganization ? 'rounded-[16%]' : 'rounded-full'" />
      </div>
      <label class="block text-sm">Start · {{ start.toFixed(1) }}s
        <input v-model.number="start" class="block w-full" type="range" min="0" :max="Math.max(0, total - length)" step="0.05" aria-label="Clip start" @input="seek">
      </label>
      <label class="block text-sm">Length · {{ length.toFixed(1) }}s
        <input v-model.number="length" class="block w-full" type="range" min="0.1" :max="Math.min(7, total)" step="0.05" aria-label="Clip length" @input="start = Math.min(start, total - length); seek()">
      </label>
      <label class="block text-sm">Zoom
        <input v-model.number="zoom" class="block w-full" type="range" min="1" max="3" step="0.01" aria-label="Crop zoom">
      </label>
      <div class="flex justify-between text-xs text-[var(--moh-text-muted)]">
        <span>Silent · Loops while visible</span>
        <button type="button" class="underline" @click="togglePreview">{{ paused ? 'Play preview' : 'Pause preview' }}</button>
      </div>
      <AppInlineAlert v-if="error" severity="warning">{{ error }}</AppInlineAlert>
    </div>
    <template #footer>
      <Button label="Cancel" text severity="secondary" @click="emit('cancel')" />
      <Button label="Apply" :disabled="!ready || Boolean(error)" :loading="applying" @click="apply" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import type { AvatarVideoEdit } from '~/utils/avatar-video-upload'
const props = defineProps<{ file: File | null; isOrganization?: boolean }>()
const emit = defineEmits<{ cancel: []; selected: [edit: AvatarVideoEdit] }>()
const video = ref<HTMLVideoElement | null>(null)
const viewport = ref<HTMLElement | null>(null)
const source = ref('')
const width = ref(1), height = ref(1), total = ref(7), start = ref(0), length = ref(7), zoom = ref(1)
const panX = ref(0.5), panY = ref(0.5), ready = ref(false), applying = ref(false), error = ref(''), paused = ref(false)
const viewportWidth = ref(320)
let observer: ResizeObserver | undefined
let last: { x: number; y: number; id: number } | null = null
const size = computed(() => Math.min(width.value, height.value) / zoom.value)
const crop = computed(() => ({ x: (width.value - size.value) * panX.value, y: (height.value - size.value) * panY.value, size: size.value }))
const videoStyle = computed(() => {
  const scale = viewportWidth.value / size.value
  return { width: `${width.value * scale}px`, height: `${height.value * scale}px`, left: `${-crop.value.x * scale}px`, top: `${-crop.value.y * scale}px` }
})
watch(() => props.file, file => {
  if (source.value) URL.revokeObjectURL(source.value)
  source.value = file ? URL.createObjectURL(file) : ''
  ready.value = false; error.value = ''; start.value = 0; zoom.value = 1; panX.value = 0.5; panY.value = 0.5
}, { immediate: true })
function loaded() {
  const v = video.value!
  if (!Number.isFinite(v.duration) || v.duration < 0.1 || v.duration > 600) { error.value = 'Choose a video between 0.1 seconds and 10 minutes.'; return }
  width.value = v.videoWidth; height.value = v.videoHeight; total.value = v.duration; length.value = Math.min(7, v.duration)
  viewportWidth.value = viewport.value?.clientWidth || 320
  observer?.disconnect(); observer = new ResizeObserver(() => { viewportWidth.value = viewport.value?.clientWidth || 320 })
  if (viewport.value) observer.observe(viewport.value)
  ready.value = true
  void v.play().catch(() => { paused.value = true })
}
function seek() { if (video.value) video.value.currentTime = start.value }
function loop() { if (video.value && video.value.currentTime >= start.value + length.value - 0.025) seek() }
function togglePreview() { if (!video.value) return; paused.value = !paused.value; if (paused.value) video.value.pause(); else void video.value.play().catch(() => { paused.value = true }) }
function beginDrag(e: PointerEvent) { viewport.value?.setPointerCapture(e.pointerId); last = { x: e.clientX, y: e.clientY, id: e.pointerId } }
function drag(e: PointerEvent) {
  if (!last) return
  const scale = size.value / viewportWidth.value
  panX.value = Math.max(0, Math.min(1, panX.value - (e.clientX - last.x) * scale / Math.max(1, width.value - size.value)))
  panY.value = Math.max(0, Math.min(1, panY.value - (e.clientY - last.y) * scale / Math.max(1, height.value - size.value)))
  last = { x: e.clientX, y: e.clientY, id: e.pointerId }
}
function endDrag() { last = null }
async function apply() {
  if (!props.file || !video.value || applying.value) return
  applying.value = true
  try {
    const player = video.value
    player.pause()
    if (Math.abs(player.currentTime - start.value) > 0.001) {
      await new Promise<void>((resolve, reject) => {
        const done = () => { cleanup(); resolve() }
        const fail = () => { cleanup(); reject(new Error('Could not load the first frame.')) }
        const timer = setTimeout(fail, 5000)
        const cleanup = () => { clearTimeout(timer); player.removeEventListener('seeked', done); player.removeEventListener('error', fail) }
        player.addEventListener('seeked', done, { once: true })
        player.addEventListener('error', fail, { once: true })
        player.currentTime = start.value
      })
    }
    const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 320
    canvas.getContext('2d')!.drawImage(video.value, crop.value.x, crop.value.y, size.value, size.value, 0, 0, 320, 320)
    const poster = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Could not create preview.')), 'image/jpeg', 0.85))
    emit('selected', { file: props.file, poster, selection: { startSeconds: start.value, durationSeconds: length.value,
      crop: { x: crop.value.x / width.value, y: crop.value.y / height.value, width: size.value / width.value, height: size.value / height.value } } })
  } catch { error.value = 'Could not prepare this clip. Please try again.' }
  finally { applying.value = false; if (!paused.value) void video.value?.play().catch(() => {}) }
}
onBeforeUnmount(() => { observer?.disconnect(); if (source.value) URL.revokeObjectURL(source.value) })
</script>
