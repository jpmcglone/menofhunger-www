<template>
  <div class="fixed inset-0 z-[9996] flex flex-col bg-zinc-950 text-white" role="dialog" aria-modal="true" aria-label="Leave a video message">
    <div class="relative flex-1 overflow-hidden bg-black">
      <video
        v-if="previewUrl"
        :src="previewUrl"
        class="h-full w-full object-contain"
        controls
        playsinline
      />
      <video
        v-else
        ref="liveEl"
        class="h-full w-full object-cover"
        muted
        autoplay
        playsinline
      />
      <div class="absolute left-4 top-4 text-sm text-white/80">
        {{ reviewing ? 'Review' : `Recording ${formatClock(elapsed)}` }}
      </div>
    </div>
    <div class="flex items-center justify-center gap-3 px-4 py-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
      <Button label="Cancel" severity="secondary" rounded @click="cancel" />
      <Button v-if="!reviewing && !recording" label="Start" rounded @click="start" />
      <Button v-else-if="recording" label="Stop" rounded @click="stop" />
      <template v-else>
        <Button label="Redo" severity="secondary" rounded @click="redo" />
        <Button label="Send" rounded :loading="sending" @click="send" />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { pickVoicemailRecorderMime, voicemailFileExtension, VOICEMAIL_MAX_SECONDS } from '~/composables/calls/callVoicemail'
import { useCallSession } from '~/composables/calls/useCallSession'
import { getSafeUserErrorMessage } from '~/utils/api-error'

const props = defineProps<{
  conversationId: string
  messageId: string
}>()

const { dismissVoicemail, localStream } = useCallSession()
const { apiFetchData } = useApiClient()
const toast = useAppToast()

const liveEl = ref<HTMLVideoElement | null>(null)
const recording = ref(false)
const reviewing = ref(false)
const sending = ref(false)
const elapsed = ref(0)
const previewUrl = ref<string | null>(null)
const recorded = ref<{ file: File; durationSeconds: number; width: number; height: number; poster: Blob | null } | null>(null)

let stream: MediaStream | null = null
let recorder: MediaRecorder | null = null
let chunks: Blob[] = []
let timer: ReturnType<typeof setInterval> | null = null
let startedAt = 0
let mime = 'video/webm'

function formatClock(total: number) {
  const s = Math.max(0, Math.floor(total))
  const m = Math.floor(s / 60)
  return `${m}:${(s % 60).toString().padStart(2, '0')}`
}

function attachLive(next: MediaStream) {
  stream = next
  nextTick(() => {
    if (liveEl.value) liveEl.value.srcObject = next
  })
}

onMounted(async () => {
  if (localStream.value?.getVideoTracks().length) {
    attachLive(localStream.value)
    return
  }
  try {
    attachLive(await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true }))
  } catch {
    toast.push({ title: 'Couldn’t access your camera.', tone: 'error' })
  }
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  if (stream && stream !== localStream.value) stream.getTracks().forEach((t) => t.stop())
})

function tick() {
  elapsed.value = Math.min(VOICEMAIL_MAX_SECONDS, (Date.now() - startedAt) / 1000)
  if (elapsed.value >= VOICEMAIL_MAX_SECONDS) void stop()
}

async function start() {
  if (!stream) return
  mime = pickVoicemailRecorderMime()
  chunks = []
  recorder = new MediaRecorder(stream, { mimeType: mime })
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data)
  }
  recorder.onstop = () => {
    const durationSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000))
    const type = mime.startsWith('video/mp4') ? 'video/mp4' : 'video/webm'
    const blob = new Blob(chunks, { type })
    const file = new File([blob], `voicemail-${Date.now()}.${voicemailFileExtension(type)}`, { type })
    const track = stream?.getVideoTracks()[0]?.getSettings()
    recorded.value = {
      file,
      durationSeconds,
      width: track?.width ?? 720,
      height: track?.height ?? 1280,
      poster: null,
    }
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = URL.createObjectURL(blob)
    reviewing.value = true
    recording.value = false
    void capturePoster(blob)
  }
  startedAt = Date.now()
  elapsed.value = 0
  recording.value = true
  reviewing.value = false
  recorder.start(250)
  timer = setInterval(tick, 100)
}

async function stop() {
  if (timer) clearInterval(timer)
  timer = null
  if (recorder && recorder.state !== 'inactive') recorder.stop()
}

async function capturePoster(blob: Blob) {
  const url = URL.createObjectURL(blob)
  const video = document.createElement('video')
  video.src = url
  video.muted = true
  video.playsInline = true
  await video.play().catch(() => {})
  video.pause()
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth || 720
  canvas.height = video.videoHeight || 1280
  canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
  const poster = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.8)
  })
  URL.revokeObjectURL(url)
  if (recorded.value) {
    recorded.value = { ...recorded.value, poster, width: canvas.width, height: canvas.height }
  }
}

function redo() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = null
  recorded.value = null
  reviewing.value = false
  elapsed.value = 0
}

function cancel() {
  if (recorder && recorder.state !== 'inactive') {
    try { recorder.stop() } catch { /* ignore */ }
  }
  dismissVoicemail()
}

async function send() {
  const clip = recorded.value
  if (!clip || sending.value) return
  sending.value = true
  try {
    let thumbnailKey: string | undefined
    if (clip.poster) {
      const thumbInit = await apiFetchData<{ key: string; uploadUrl?: string; headers: Record<string, string> }>(
        '/uploads/post-media/init',
        { method: 'POST', body: { contentType: 'image/jpeg', purpose: 'thumbnail' } },
      )
      if (thumbInit.uploadUrl) {
        await fetch(thumbInit.uploadUrl, { method: 'PUT', headers: thumbInit.headers, body: clip.poster })
      }
      thumbnailKey = thumbInit.key
    }
    const init = await apiFetchData<{ key: string; uploadUrl?: string; headers: Record<string, string> }>(
      '/uploads/post-media/init',
      { method: 'POST', body: { contentType: clip.file.type, purpose: 'voicemail' } },
    )
    if (init.uploadUrl) {
      await fetch(init.uploadUrl, { method: 'PUT', headers: init.headers, body: clip.file })
    }
    const committed = await apiFetchData<{ key: string }>(
      '/uploads/post-media/commit',
      {
        method: 'POST',
        body: {
          key: init.key,
          thumbnailKey,
          width: clip.width,
          height: clip.height,
          durationSeconds: clip.durationSeconds,
        },
      },
    )
    await apiFetchData(`/messages/conversations/${props.conversationId}/messages/${props.messageId}/voicemail`, {
      method: 'POST',
      body: {
        source: 'upload',
        kind: 'video',
        r2Key: committed.key,
        thumbnailR2Key: thumbnailKey ?? null,
        width: clip.width,
        height: clip.height,
        durationSeconds: clip.durationSeconds,
      },
    })
    dismissVoicemail()
  } catch (e) {
    toast.push({ title: getSafeUserErrorMessage(e, 'Couldn’t send the video message.'), tone: 'error' })
  } finally {
    sending.value = false
  }
}
</script>
