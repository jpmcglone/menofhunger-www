<template>
  <div
    class="relative h-full w-full rounded-2xl"
    :class="speaking ? 'moh-speaking-ring' : ''"
  >
    <!-- Clip + mask live on this inner surface so WebKit's video compositor can't paint a sharp rect. -->
    <div class="moh-call-tile-clip absolute inset-0 bg-zinc-900">
      <!-- Mirror the wrapper, never the <video>: Safari drops object-fit after scaleX on the element. -->
      <div
        class="absolute inset-0"
        :class="mirrored && fit !== 'contain' ? 'scale-x-[-1]' : ''"
      >
        <video
          :key="attachKey"
          ref="videoEl"
          class="moh-call-tile-video absolute inset-0 h-full w-full"
          :class="[showVideo ? 'opacity-100' : 'opacity-0', fit === 'contain' ? 'object-contain' : 'object-cover']"
          autoplay
          playsinline
          muted
        />
      </div>
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
        <span class="truncate">{{ screenSharing && label === 'You' ? "You're sharing your screen" : label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CallDisplayUser } from '~/composables/calls/useCallSession'
import type { PeerMediaState } from '~/composables/calls/transport/CallTransport'
import { callVideoAttachKey } from '~/composables/calls/callLifecycle'
import { registerCallPipSource } from '~/composables/calls/callPictureInPicture'

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
    /** Screen share: contain-fit and never mirrored. */
    fit?: 'cover' | 'contain'
    screenSharing?: boolean
    /** Register this tile's <video> as the OS picture-in-picture source. */
    pictureInPicture?: boolean
  }>(),
  {
    connectionState: 'connected',
    mirrored: false,
    avatarSizeClass: 'h-20 w-20',
    speaking: false,
    fit: 'cover',
    screenSharing: false,
    pictureInPicture: false,
  },
)

const videoEl = ref<HTMLVideoElement | null>(null)
const hasVideoTrack = ref(false)
const attachKey = computed(() => callVideoAttachKey(props.stream))

const showVideo = computed(() => props.cameraEnabled && hasVideoTrack.value)

function refreshHasVideo() {
  const s = props.stream
  hasVideoTrack.value = Boolean(s && s.getVideoTracks().some((t) => t.readyState === 'live' && !t.muted))
}

function attach() {
  const el = videoEl.value
  if (!el) return
  el.setAttribute('playsinline', '')
  el.setAttribute('webkit-playsinline', '')
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
watch(attachKey, attach)
watch(() => props.cameraEnabled, refreshHasVideo)
watch(videoEl, attach)

let unregisterPip: (() => void) | null = null
watch(
  [videoEl, () => props.pictureInPicture],
  ([el, enabled]) => {
    unregisterPip?.()
    unregisterPip = enabled ? registerCallPipSource(el) : null
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  unregisterPip?.()
  unregisterPip = null
  const el = videoEl.value
  if (el) el.srcObject = null
})
</script>

<style scoped>
.moh-call-tile-clip {
  overflow: hidden;
  border-radius: inherit;
  /* Forces WebKit to clip the video compositor layer to the radius (overflow:hidden alone does not). */
  clip-path: inset(0 round 1rem);
  transform: translateZ(0);
  /* Opaque mask: promotes the video onto a clipped compositor layer without fading the edges. */
  -webkit-mask-image: linear-gradient(#fff 0 100%);
  mask-image: linear-gradient(#fff 0 100%);
}

/* Full-bleed outgoing preview (`!rounded-none` on the tile root). */
.rounded-none > .moh-call-tile-clip,
.\!rounded-none > .moh-call-tile-clip {
  clip-path: none;
  -webkit-mask-image: none;
  mask-image: none;
}

.moh-call-tile-video {
  border-radius: inherit;
}

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
