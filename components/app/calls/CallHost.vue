<template>
  <Teleport to="body">
    <CallIncomingBanner v-if="phase === 'incoming' && incoming" :incoming="incoming" />
    <CallOutgoingScreen v-if="phase === 'outgoing' && !minimized" />
    <CallOverlay v-if="phase === 'in_call' && call && !minimized" :call="call" @minimize="minimized = true" />
    <CallMiniBar
      v-if="((phase === 'in_call' || phase === 'outgoing') && minimized) || phase === 'in_call_elsewhere'"
      @expand="minimized = false"
    />
  </Teleport>
</template>

<script setup lang="ts">
/**
 * Single mount point for the call UI, rendered from GlobalOverlays (client-only) so a
 * call survives navigation. Also owns the one-per-tab realtime binding.
 */
import { useCallSession } from '~/composables/calls/useCallSession'
import CallIncomingBanner from './CallIncomingBanner.vue'
import CallOutgoingScreen from './CallOutgoingScreen.vue'
import CallOverlay from './CallOverlay.vue'
import CallMiniBar from './CallMiniBar.vue'

const { phase, call, incoming, minimized, bind } = useCallSession()

let unbind: (() => void) | null = null
onMounted(() => {
  unbind = bind()
})
onBeforeUnmount(() => {
  unbind?.()
  unbind = null
})
</script>
