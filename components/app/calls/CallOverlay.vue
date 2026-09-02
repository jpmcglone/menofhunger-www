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
      <div class="grid h-full w-full gap-2" :class="gridClass">
        <div v-for="p in tiles" :key="p.userId" class="min-h-0">
          <CallVideoTile
            :stream="remoteStreams[p.userId] ?? null"
            :user="participantUser(p.userId)"
            :label="participantLabel(p.userId)"
            :mic-enabled="p.micEnabled"
            :camera-enabled="p.cameraEnabled"
            :connection-state="peerStates[p.userId] ?? 'connecting'"
            :avatar-size-class="tiles.length > 1 ? 'h-16 w-16' : 'h-28 w-28'"
            :speaking="speakingIds[p.userId] === true"
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
            :speaking="selfSpeaking"
          />
        </div>
        <div v-if="tiles.length === 0" class="flex items-center justify-center text-white/70 text-sm">
          Waiting for others to join…
        </div>
      </div>

      <!-- Draggable self-view (1–3 remotes) -->
      <div
        v-if="!selfInGrid"
        ref="pipEl"
        class="absolute z-10 h-[7.5rem] w-[5.25rem] sm:h-[9rem] sm:w-[16rem] touch-none cursor-grab shadow-xl shadow-black/50 active:cursor-grabbing"
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
          :speaking="selfSpeaking"
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
        @toggle-mic="toggleMic"
        @toggle-camera="toggleCamera"
        @switch-camera="switchCamera"
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
import CallVideoTile from './CallVideoTile.vue'
import CallControls from './CallControls.vue'

const props = defineProps<{ call: CallSession }>()
const emit = defineEmits<{ minimize: [] }>()

const {
  localStream,
  remoteStreams,
  peerStates,
  speakingIds,
  isMicEnabled,
  isCameraEnabled,
  cameraError,
  qualityBars,
  facingMode,
  audioDeviceId,
  videoDeviceId,
  speakerDeviceId,
  connectedAt,
  participantUser,
  participantLabel,
  toggleMic,
  toggleCamera,
  switchCamera,
  leaveCall,
  setMicrophoneDevice,
  setCameraDevice,
  setSpeakerDevice,
} = useCallSession()

const { user: me } = useAuth()
const { elapsed } = useCallTimer(connectedAt)

const selfUser = computed(() => (me.value?.id ? participantUser(me.value.id) : null))
const selfSpeaking = computed(() => Boolean(me.value?.id && speakingIds.value[me.value.id]))
const tiles = computed<CallParticipant[]>(() => props.call.participants.filter((p) => p.userId !== me.value?.id))
const selfInGrid = computed(() => tiles.value.length >= 3)

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
