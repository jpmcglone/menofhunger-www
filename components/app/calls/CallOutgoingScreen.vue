<template>
  <div class="fixed inset-0 z-[9995] flex flex-col bg-zinc-950 text-white" role="dialog" aria-modal="true" aria-label="Calling">
    <!-- Local preview fills the background when the camera is on -->
    <div class="absolute inset-0">
      <CallVideoTile
        v-if="isCameraEnabled"
        :stream="localStream"
        :user="selfUser"
        label="You"
        :mic-enabled="isMicEnabled"
        :camera-enabled="isCameraEnabled"
        :mirrored="facingMode === 'user'"
        class="!rounded-none"
      />
      <div class="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" aria-hidden="true" />
    </div>

    <div class="relative flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <AppUserAvatar :user="callee" size-class="h-28 w-28" :show-presence="false" :show-status="false" :enable-preview="false" class="ring-4 ring-white/15 rounded-full" />
      <div>
        <div class="text-2xl font-semibold">{{ calleeName }}</div>
        <div class="mt-1 text-sm text-white/70">
          <span class="inline-flex items-center gap-1.5">
            <span class="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" aria-hidden="true" />
            Calling{{ dots }}
          </span>
        </div>
        <div
          class="mt-3 inline-flex items-center gap-1.5 text-xs text-white/55"
          :title="CALL_ENCRYPTION_SENTENCE"
          data-testid="call-encrypted-badge"
        >
          <Icon name="tabler:lock" size="13" aria-hidden="true" />
          {{ CALL_ENCRYPTION_SHORT }}
        </div>
      </div>
    </div>

    <div class="relative px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
      <p v-if="cameraError && !isCameraEnabled" class="mb-3 text-center text-sm text-white/85">
        {{ cameraError }}
      </p>
      <CallControls
        :mic-enabled="isMicEnabled"
        :camera-enabled="isCameraEnabled"
        :audio-device-id="audioDeviceId"
        :video-device-id="videoDeviceId"
        :speaker-device-id="speakerDeviceId"
        :show-devices="false"
        :show-reactions="false"
        :allow-screen-share="false"
        leave-label="Cancel call"
        @toggle-mic="toggleMic"
        @toggle-camera="toggleCamera"
        @switch-camera="switchCamera"
        @leave="leaveCall"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCallSession } from '~/composables/calls/useCallSession'
import { CALL_ENCRYPTION_SENTENCE, CALL_ENCRYPTION_SHORT } from '~/composables/calls/callCopy'
import CallVideoTile from './CallVideoTile.vue'
import CallControls from './CallControls.vue'

const {
  localStream,
  isMicEnabled,
  isCameraEnabled,
  cameraError,
  facingMode,
  audioDeviceId,
  videoDeviceId,
  speakerDeviceId,
  outgoingCalleeId,
  participantUser,
  participantLabel,
  toggleMic,
  toggleCamera,
  switchCamera,
  leaveCall,
} = useCallSession()

const { user: me } = useAuth()

const selfUser = computed(() => (me.value?.id ? participantUser(me.value.id) : null))
const callee = computed(() => (outgoingCalleeId.value ? participantUser(outgoingCalleeId.value) : null))
const calleeName = computed(() => (outgoingCalleeId.value ? participantLabel(outgoingCalleeId.value) : 'Member'))

// Animated ellipsis so "Calling" reads as in-progress even without audio.
const tick = ref(0)
let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  timer = setInterval(() => {
    tick.value = (tick.value + 1) % 4
  }, 500)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
const dots = computed(() => '.'.repeat(tick.value))
</script>
