<template>
  <div
    class="fixed inset-0 z-[9995] flex flex-col bg-black text-white"
    role="dialog"
    aria-modal="true"
    :aria-label="`${call.type === 'video' ? 'Video' : 'Voice'} call`"
  >
    <!-- Top bar -->
    <div class="flex items-center justify-between gap-3 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-2">
      <div class="flex min-w-0 items-center gap-2 text-sm">
        <span class="font-semibold truncate">{{ title }}</span>
        <span class="tabular-nums text-white/70">{{ elapsed }}</span>
        <span
          class="inline-flex items-end gap-[2px]"
          :title="qualityLabel"
          :aria-label="`Connection: ${qualityLabel}`"
          role="img"
        >
          <span
            v-for="n in 3"
            :key="n"
            class="w-[3px] rounded-sm"
            :class="[n <= qualityBars ? 'bg-white' : 'bg-white/25', n === 1 ? 'h-1.5' : n === 2 ? 'h-2.5' : 'h-3.5']"
          />
        </span>
        <span
          class="hidden sm:inline-flex items-center gap-1 text-xs text-white/60"
          :title="CALL_ENCRYPTION_SENTENCE"
          data-testid="call-encrypted-badge"
        >
          <Icon name="tabler:lock" size="13" aria-hidden="true" />
          {{ CALL_ENCRYPTION_SHORT }}
        </span>
      </div>
      <button
        type="button"
        class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        aria-label="Minimize call"
        @click="emit('minimize')"
      >
        <Icon name="tabler:arrows-diagonal-minimize-2" size="18" aria-hidden="true" />
      </button>
    </div>

    <!-- Tiles -->
    <div class="relative min-h-0 flex-1 px-3 pb-2">
      <!-- Presenting: share on the stage, people in a filmstrip (Hangouts / Zoom). -->
      <div
        v-if="presenter"
        class="flex h-full min-h-0 flex-col gap-2 sm:flex-row"
      >
        <div class="min-h-0 min-w-0 flex-1" data-testid="call-presenting-stage">
          <CallVideoTile
            :stream="stageStream"
            :user="presenterUser"
            :label="stageLabel"
            :mic-enabled="true"
            :camera-enabled="true"
            :connection-state="stageConnectionState"
            avatar-size-class="h-20 w-20"
            fit="contain"
            screen-sharing
            variant="stage"
            picture-in-picture
          />
        </div>
        <div
          class="flex shrink-0 gap-2 overflow-x-auto sm:h-full sm:w-[7.25rem] sm:flex-col sm:overflow-y-auto sm:overflow-x-hidden"
          data-testid="call-presenting-filmstrip"
        >
          <div
            v-for="p in tiles"
            :key="p.userId"
            class="h-[6.25rem] w-[4.75rem] shrink-0 sm:h-auto sm:w-full sm:aspect-[3/4]"
          >
            <CallVideoTile
              :stream="remoteStreams[p.userId] ?? null"
              :user="participantUser(p.userId)"
              :label="participantLabel(p.userId)"
              :mic-enabled="p.micEnabled"
              :camera-enabled="p.cameraEnabled"
              :connection-state="peerStates[p.userId] ?? 'connecting'"
              avatar-size-class="h-10 w-10"
              :speaking-level="speakingIds[p.userId] ?? 0"
              :hand-raised="isGroupCall && Boolean(p.handRaised)"
              :ice-path="isAdmin ? (icePaths[p.userId] ?? null) : null"
            />
          </div>
          <div class="h-[6.25rem] w-[4.75rem] shrink-0 sm:h-auto sm:w-full sm:aspect-[3/4]">
            <CallVideoTile
              :stream="localStream"
              :user="selfUser"
              label="You"
              :mic-enabled="isMicEnabled"
              :camera-enabled="isCameraEnabled"
              :mirrored="facingMode === 'user'"
              avatar-size-class="h-10 w-10"
              :speaking-level="selfSpeaking"
              :hand-raised="isGroupCall && selfHandRaised"
            />
          </div>
        </div>
      </div>
      <div v-else class="grid h-full w-full gap-2" :class="gridClass">
        <div v-for="p in tiles" :key="p.userId" class="min-h-0">
          <CallVideoTile
            :stream="remoteStreams[p.userId] ?? null"
            :user="participantUser(p.userId)"
            :label="participantLabel(p.userId)"
            :mic-enabled="p.micEnabled"
            :camera-enabled="p.cameraEnabled"
            :connection-state="peerStates[p.userId] ?? 'connecting'"
            :avatar-size-class="tiles.length > 1 ? 'h-16 w-16' : 'h-28 w-28'"
            :speaking-level="speakingIds[p.userId] ?? 0"
            :hand-raised="isGroupCall && Boolean(p.handRaised)"
            :ice-path="isAdmin ? (icePaths[p.userId] ?? null) : null"
            picture-in-picture
          />
        </div>
        <!-- 4-way: self joins the grid instead of floating -->
        <div v-if="selfInGrid" class="min-h-0">
          <CallVideoTile
            :stream="localStream"
            :user="selfUser"
            label="You"
            :mic-enabled="isMicEnabled"
            :camera-enabled="isCameraEnabled"
            :mirrored="facingMode === 'user'"
            avatar-size-class="h-16 w-16"
            :speaking-level="selfSpeaking"
            :hand-raised="isGroupCall && selfHandRaised"
          />
        </div>
        <div v-if="tiles.length === 0" class="flex items-center justify-center text-white/70 text-sm">
          Waiting for others to join…
        </div>
      </div>
      <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <span
          v-for="r in reactions"
          :key="r.id"
          class="moh-call-reaction absolute text-4xl"
          :style="reactionStyle(r.userId)"
        >{{ r.emoji }}</span>
      </div>

      <!-- Draggable self-view (1–3 remotes, no presenter) -->
      <div
        v-if="!presenter && !selfInGrid"
        ref="pipEl"
        class="absolute z-10 h-[7.5rem] w-[5.25rem] rounded-2xl shadow-xl shadow-black/50 sm:h-[9rem] sm:w-[16rem] touch-none cursor-grab active:cursor-grabbing"
        :style="pipStyle"
        @pointerdown="onPipPointerDown"
        @pointermove="onPipPointerMove"
        @pointerup="onPipPointerUp"
        @pointercancel="onPipPointerUp"
      >
        <CallVideoTile
          :stream="localStream"
          :user="selfUser"
          label="You"
          :mic-enabled="isMicEnabled"
          :camera-enabled="isCameraEnabled"
          :mirrored="facingMode === 'user'"
          avatar-size-class="h-12 w-12"
          :speaking-level="selfSpeaking"
          :hand-raised="isGroupCall && selfHandRaised"
        />
      </div>
    </div>

    <!-- Controls -->
    <div class="px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <p v-if="cameraError && !isCameraEnabled" class="mb-3 text-center text-sm text-white/85">
        {{ cameraError }}
      </p>
      <CallControls
        :mic-enabled="isMicEnabled"
        :camera-enabled="isCameraEnabled"
        :audio-device-id="audioDeviceId"
        :video-device-id="videoDeviceId"
        :speaker-device-id="speakerDeviceId"
        :screen-sharing="isScreenSharing"
        :allow-screen-share="!someoneElsePresenting"
        :show-hand-raise="isGroupCall"
        :hand-raised="selfHandRaised"
        @toggle-mic="toggleMic"
        @toggle-camera="toggleCamera"
        @switch-camera="switchCamera"
        @toggle-screen-share="toggleScreenShare"
        @react="sendReaction"
        @toggle-hand="toggleHand"
        @leave="leaveCall"
        @select-microphone="setMicrophoneDevice"
        @select-camera="setCameraDevice"
        @select-speaker="setSpeakerDevice"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CallParticipant, CallSession } from '~/types/api'
import { useCallSession } from '~/composables/calls/useCallSession'
import { useCallTimer } from '~/composables/calls/useCallTimer'
import { CALL_ENCRYPTION_SENTENCE, CALL_ENCRYPTION_SHORT } from '~/composables/calls/callCopy'
import CallVideoTile from './CallVideoTile.vue'
import CallControls from './CallControls.vue'

const props = defineProps<{ call: CallSession }>()
const emit = defineEmits<{ minimize: [] }>()

const {
  localStream,
  localScreenStream,
  remoteStreams,
  remoteScreenStreams,
  peerStates,
  speakingIds,
  icePaths,
  isMicEnabled,
  isCameraEnabled,
  cameraError,
  qualityBars,
  facingMode,
  audioDeviceId,
  videoDeviceId,
  speakerDeviceId,
  isScreenSharing,
  reactions,
  connectedAt,
  participantUser,
  participantLabel,
  toggleMic,
  toggleCamera,
  switchCamera,
  toggleScreenShare,
  sendReaction,
  toggleHand,
  leaveCall,
  setMicrophoneDevice,
  setCameraDevice,
  setSpeakerDevice,
} = useCallSession()

const { user: me } = useAuth()
const isAdmin = computed(() => Boolean(me.value?.siteAdmin))
const { elapsed } = useCallTimer(connectedAt)

const selfUser = computed(() => (me.value?.id ? participantUser(me.value.id) : null))
const selfSpeaking = computed(() => (me.value?.id ? (speakingIds.value[me.value.id] ?? 0) : 0))
const tiles = computed<CallParticipant[]>(() => props.call.participants.filter((p) => p.userId !== me.value?.id))
const isGroupCall = computed(() => props.call.participants.length > 2)
const selfHandRaised = computed(() =>
  props.call.participants.find((p) => p.userId === me.value?.id)?.handRaised === true,
)
const selfInGrid = computed(() => tiles.value.length >= 3)
const presenter = computed(() => props.call.participants.find((p) => p.screenSharing) ?? null)
const someoneElsePresenting = computed(() => Boolean(presenter.value && presenter.value.userId !== me.value?.id))
const presenterUser = computed(() => (presenter.value ? participantUser(presenter.value.userId) : null))
const stageStream = computed(() => {
  const p = presenter.value
  if (!p) return null
  if (p.userId === me.value?.id) return localScreenStream.value
  return remoteScreenStreams.value[p.userId] ?? null
})
const stageLabel = computed(() => {
  const p = presenter.value
  if (!p) return ''
  if (p.userId === me.value?.id) return "You're presenting"
  return `${participantLabel(p.userId)} is presenting`
})
const stageConnectionState = computed(() => {
  const p = presenter.value
  if (!p || p.userId === me.value?.id) return 'connected' as const
  const s = peerStates.value[p.userId]
  if (s === 'reconnecting' || s === 'failed') return s
  return 'connected' as const
})

const gridClass = computed(() => {
  const n = tiles.value.length + (selfInGrid.value ? 1 : 0)
  if (n <= 1) return 'grid-cols-1 grid-rows-1'
  if (n === 2) return 'grid-cols-1 grid-rows-2 sm:grid-cols-2 sm:grid-rows-1'
  return 'grid-cols-2 grid-rows-2'
})

const title = computed(() => {
  const names = tiles.value.map((p) => participantLabel(p.userId))
  if (names.length === 0) return props.call.type === 'video' ? 'Video call' : 'Voice call'
  if (names.length === 1) return names[0]!
  return `${names.length + 1} people`
})

const qualityLabel = computed(() => (qualityBars.value >= 3 ? 'Great' : qualityBars.value === 2 ? 'Good' : qualityBars.value === 1 ? 'Poor' : 'Audio only'))

function reactionStyle(userId: string) {
  const self = userId === me.value?.id
  return self
    ? { right: '1.5rem', bottom: '1.25rem' }
    : { left: `${12 + (userId.charCodeAt(0) % 40)}%`, bottom: '18%' }
}

// ─── Self-view drag ─────────────────────────────────────────────────────────
const pipEl = ref<HTMLElement | null>(null)
const pipPos = ref<{ x: number; y: number } | null>(null)
let drag: { startX: number; startY: number; originX: number; originY: number } | null = null

const pipStyle = computed(() => {
  if (!pipPos.value) return { right: '1rem', bottom: '1rem' }
  return { left: `${pipPos.value.x}px`, top: `${pipPos.value.y}px` }
})

function onPipPointerDown(e: PointerEvent) {
  const el = pipEl.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const parent = el.parentElement?.getBoundingClientRect()
  if (!parent) return
  pipPos.value = { x: rect.left - parent.left, y: rect.top - parent.top }
  drag = { startX: e.clientX, startY: e.clientY, originX: pipPos.value.x, originY: pipPos.value.y }
  el.setPointerCapture(e.pointerId)
}
function onPipPointerMove(e: PointerEvent) {
  if (!drag || !pipEl.value) return
  const parent = pipEl.value.parentElement?.getBoundingClientRect()
  if (!parent) return
  const w = pipEl.value.offsetWidth
  const h = pipEl.value.offsetHeight
  const x = Math.min(Math.max(0, drag.originX + (e.clientX - drag.startX)), parent.width - w)
  const y = Math.min(Math.max(0, drag.originY + (e.clientY - drag.startY)), parent.height - h)
  pipPos.value = { x, y }
}
function onPipPointerUp(e: PointerEvent) {
  drag = null
  try {
    pipEl.value?.releasePointerCapture(e.pointerId)
  } catch {
    // already released
  }
}
</script>

<style scoped>
.moh-call-reaction {
  animation: moh-call-reaction-rise 2.4s ease-out forwards;
}
@keyframes moh-call-reaction-rise {
  0% { transform: translateY(0) scale(0.7); opacity: 0; }
  12% { transform: translateY(-12px) scale(1); opacity: 1; }
  100% { transform: translateY(-140px) scale(1.15); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .moh-call-reaction { animation: none; opacity: 1; }
}
</style>
