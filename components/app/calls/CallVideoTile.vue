<template>
  <div class="relative h-full w-full rounded-2xl">
    <div class="moh-speak-rings pointer-events-none absolute inset-0 z-10 rounded-[inherit]" aria-hidden="true">
      <span
        v-for="(alpha, index) in ringAlphas"
        :key="index"
        class="moh-speak-ring"
        :class="`moh-speak-ring-${index + 1}`"
        :style="ringStyle(index, alpha)"
      />
    </div>
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
          :class="micIconClass"
          :style="isSpeaking ? { color: ringColor } : undefined"
          :aria-label="!micEnabled ? 'Muted' : isSpeaking ? 'Speaking' : 'Mic on'"
        />
        <span class="truncate">{{ screenSharing && label === 'You' ? "You're sharing your screen" : label }}</span>
        <span v-if="handRaised" class="text-sm leading-none" aria-label="Hand raised">✋</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CallDisplayUser } from '~/composables/calls/useCallSession'
import type { PeerMediaState } from '~/composables/calls/transport/CallTransport'
import { callVideoAttachKey } from '~/composables/calls/callLifecycle'
import { registerCallPipSource } from '~/composables/calls/callPictureInPicture'
import { speakingRingAlphas } from '~/composables/calls/speakingDetector'
import { userColorTier, userTierColorVar } from '~/utils/user-tier'

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
    /** 0…1 volume while speaking. Drives ring fade, thickness, and extra outlines. */
    speakingLevel?: number
    /** Screen share: contain-fit and never mirrored. */
    fit?: 'cover' | 'contain'
    screenSharing?: boolean
    /** Group calls only: this person has their hand up. */
    handRaised?: boolean
    /** Register this tile's <video> as the OS picture-in-picture source. */
    pictureInPicture?: boolean
  }>(),
  {
    connectionState: 'connected',
    mirrored: false,
    avatarSizeClass: 'h-20 w-20',
    speaking: false,
    speakingLevel: 0,
    fit: 'cover',
    screenSharing: false,
    handRaised: false,
    pictureInPicture: false,
  },
)

const videoEl = ref<HTMLVideoElement | null>(null)
const hasVideoTrack = ref(false)
const attachKey = computed(() => callVideoAttachKey(props.stream))

const showVideo = computed(() => props.cameraEnabled && hasVideoTrack.value)
const intensity = computed(() => {
  const n = props.speakingLevel
  if (n > 0) return Math.min(1, n)
  return props.speaking ? 0.55 : 0
})
const isSpeaking = computed(() => intensity.value > 0.02)
const ringAlphas = computed(() => speakingRingAlphas(intensity.value))
const ringColor = computed(() => userTierColorVar(userColorTier(props.user)) ?? 'var(--moh-link)')
const micIconClass = computed(() => {
  if (!props.micEnabled) return 'text-red-400'
  return isSpeaking.value ? '' : 'opacity-80'
})

function ringStyle(index: number, alpha: number) {
  const i = intensity.value
  const spreads = [2 + i * 2.5, 6 + i * 5, 12 + i * 8]
  const glows = [0, 5 + i * 7, 12 + i * 12]
  const bloom = [0, 1 + i * 1.2, 2 + i * 2.4]
  const ring = Math.min(Math.max(index, 0), spreads.length - 1)
  return {
    opacity: alpha,
    transform: `scale(${1 + (bloom[ring] ?? 0) / 100})`,
    boxShadow: `0 0 ${glows[ring] ?? 0}px ${spreads[ring] ?? 0}px ${ringColor.value}`,
  }
}

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

/* Volume rings sit outside the clipped video so they can thicken without cropping. */
.moh-speak-ring {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0;
  transition:
    opacity 220ms cubic-bezier(0.2, 0, 0, 1),
    box-shadow 160ms cubic-bezier(0.2, 0, 0, 1),
    transform 220ms cubic-bezier(0.2, 0, 0, 1);
}

.moh-speak-ring-1 {
  transition-duration: 180ms, 140ms, 180ms;
}

.moh-speak-ring-2 {
  transition-duration: 220ms, 180ms, 220ms;
}

.moh-speak-ring-3 {
  transition-duration: 280ms, 220ms, 280ms;
}

@media (prefers-reduced-motion: reduce) {
  .moh-speak-ring {
    transition: opacity 80ms linear, box-shadow 80ms linear, transform 80ms linear;
  }
}
</style>
