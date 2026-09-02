<template>
  <Teleport to="body">
    <CallIncomingBanner v-if="phase === 'incoming' && incoming" :incoming="incoming" />
    <CallOutgoingScreen v-if="phase === 'outgoing' && !minimized" />
    <CallOverlay v-if="phase === 'in_call' && call && !minimized" :call="call" @minimize="minimized = true" />
    <CallMiniBar
      v-if="((phase === 'in_call' || phase === 'outgoing') && minimized) || phase === 'in_call_elsewhere'"
      @expand="minimized = false"
    />
    <!-- Remote audio outlives the overlay: minimized calls must keep talking. -->
    <CallAudioSink v-for="(stream, userId) in remoteStreams" :key="userId" :stream="stream" :speaker-device-id="speakerDeviceId" />
    <!-- Off-screen remote video so OS PiP still has a source when the overlay is minimized. -->
    <video
      ref="osPipEl"
      class="pointer-events-none fixed right-[-9999px] bottom-0 h-[90px] w-[160px] opacity-0"
      autoplay
      playsinline
      muted
      aria-hidden="true"
    />
    <CallVoicemailRecorder
      v-if="pendingVoicemail"
      :conversation-id="pendingVoicemail.conversationId"
      :message-id="pendingVoicemail.messageId"
    />
  </Teleport>
</template>

<script setup lang="ts">
/**
 * Single mount point for the call UI, rendered from GlobalOverlays (client-only) so a
 * call survives navigation. Also owns the one-per-tab realtime binding.
 */
import { useCallSession } from '~/composables/calls/useCallSession'
import { registerCallPipSource } from '~/composables/calls/callPictureInPicture'
import CallIncomingBanner from './CallIncomingBanner.vue'
import CallOutgoingScreen from './CallOutgoingScreen.vue'
import CallOverlay from './CallOverlay.vue'
import CallMiniBar from './CallMiniBar.vue'
import CallAudioSink from './CallAudioSink.vue'
import CallVoicemailRecorder from './CallVoicemailRecorder.vue'

const { phase, call, incoming, minimized, remoteStreams, speakerDeviceId, pendingVoicemail, bind } = useCallSession()

const osPipEl = ref<HTMLVideoElement | null>(null)

function firstRemoteVideoStream(): MediaStream | null {
  for (const stream of Object.values(remoteStreams.value)) {
    if (stream.getVideoTracks().some((t) => t.readyState === 'live')) return stream
  }
  return null
}

watch(
  [osPipEl, remoteStreams],
  () => {
    const el = osPipEl.value
    if (!el) return
    el.setAttribute('playsinline', '')
    el.setAttribute('webkit-playsinline', '')
    const stream = firstRemoteVideoStream()
    if (el.srcObject !== stream) el.srcObject = stream
    if (stream) void el.play().catch(() => {})
  },
  { immediate: true },
)

let unbind: (() => void) | null = null
let unregisterPip: (() => void) | null = null
watch(osPipEl, (el) => {
  unregisterPip?.()
  unregisterPip = registerCallPipSource(el)
})
onMounted(() => {
  unbind = bind()
})
onBeforeUnmount(() => {
  unregisterPip?.()
  unregisterPip = null
  unbind?.()
  unbind = null
})
</script>
