<template>
  <div
    class="relative h-full w-full overflow-hidden rounded-2xl bg-zinc-900 transition-shadow duration-200"
    :class="speaking ? 'moh-speaking-ring' : ''"
  >
    <!-- Display only. Remote audio plays through CallAudioSink in CallHost so it survives minimize. -->
    <video
      ref="videoEl"
      class="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
      :class="[showVideo ? 'opacity-100' : 'opacity-0', mirrored ? 'scale-x-[-1]' : '']"
      autoplay
      playsinline
      muted
    />
    <!-- Avatar fallback while the camera is off or the stream hasn't arrived -->
    <div v-if="!showVideo" class="absolute inset-0 flex items-center justify-center">
      <AppUserAvatar :user="user" :size-class="avatarSizeClass" :show-presence="false" :show-status="false" :enable-preview="false" />
    </div>

    <!-- Reconnecting scrim -->
    <div
      v-if="connectionState === 'reconnecting' || connectionState === 'connecting'"
      class="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-[2px]"
    >
      <div class="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white">
        <span class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/80 border-t-transparent" aria-hidden="true" />
        {{ connectionState === 'connecting' ? 'Connecting…' : 'Reconnecting…' }}
      </div>
    </div>

    <!-- Name + mic state -->
    <div class="absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-xs text-white">
      <Icon
        :name="micEnabled ? 'tabler:microphone' : 'tabler:microphone-off'"
        size="13"
        :class="!micEnabled ? 'text-red-400' : speaking ? 'text-sky-300' : 'opacity-80'"
        :aria-label="!micEnabled ? 'Muted' : speaking ? 'Speaking' : 'Mic on'"
      />
      <span class="truncate">{{ label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CallDisplayUser } from '~/composables/calls/useCallSession'
import type { PeerMediaState } from '~/composables/calls/transport/CallTransport'

const props = withDefaults(
  defineProps<{
    stream: MediaStream | null
    user: CallDisplayUser | null
    label: string
    micEnabled: boolean
    cameraEnabled: boolean
    connectionState?: PeerMediaState | 'connected'
    /** Local self-view: mirror like a mirror. */
    mirrored?: boolean
    avatarSizeClass?: string
    /** Audio is flowing from this participant right now; draws the pulsing ring. */
    speaking?: boolean
  }>(),
  { connectionState: 'connected', mirrored: false, avatarSizeClass: 'h-20 w-20', speaking: false },
)

const videoEl = ref<HTMLVideoElement | null>(null)
const hasVideoTrack = ref(false)

const showVideo = computed(() => props.cameraEnabled && hasVideoTrack.value)

function refreshHasVideo() {
  const s = props.stream
  hasVideoTrack.value = Boolean(s && s.getVideoTracks().some((t) => t.readyState === 'live' && !t.muted))
}

function attach() {
  const el = videoEl.value
  if (!el) return
  const s = props.stream
  if (el.srcObject !== s) el.srcObject = s
  refreshHasVideo()
  if (s) {
    s.onaddtrack = refreshHasVideo
    s.onremovetrack = refreshHasVideo
    for (const t of s.getVideoTracks()) {
      t.onmute = refreshHasVideo
      t.onunmute = refreshHasVideo
      t.onended = refreshHasVideo
    }
  }
  void el.play().catch(() => {})
}

onMounted(attach)
watch(() => props.stream, attach)
watch(() => props.cameraEnabled, refreshHasVideo)
onBeforeUnmount(() => {
  const el = videoEl.value
  if (el) el.srcObject = null
})
</script>

<style scoped>
/* Two-layer ring: a crisp inner edge plus a soft halo that breathes while audio is flowing. */
.moh-speaking-ring {
  box-shadow:
    0 0 0 2px rgb(56 189 248),
    0 0 0 6px rgb(56 189 248 / 0.28);
  animation: moh-speaking-pulse 1.4s ease-in-out infinite;
}

@keyframes moh-speaking-pulse {
  0%,
  100% {
    box-shadow:
      0 0 0 2px rgb(56 189 248),
      0 0 0 5px rgb(56 189 248 / 0.22);
  }
  50% {
    box-shadow:
      0 0 0 2px rgb(56 189 248),
      0 0 0 8px rgb(56 189 248 / 0.34);
  }
}

@media (prefers-reduced-motion: reduce) {
  .moh-speaking-ring {
    animation: none;
  }
}
</style>
