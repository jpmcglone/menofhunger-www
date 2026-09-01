<template>
  <div
    class="fixed left-1/2 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[9996] w-[calc(100%-1.5rem)] max-w-sm -translate-x-1/2"
    role="alertdialog"
    aria-live="assertive"
    :aria-label="`${callerName} is calling`"
  >
    <div class="moh-call-ring flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/95 p-3 text-white shadow-2xl shadow-black/40 backdrop-blur">
      <AppUserAvatar :user="caller" size-class="h-12 w-12" :show-presence="false" :show-status="false" :enable-preview="false" />
      <div class="min-w-0 flex-1">
        <div class="truncate font-semibold">{{ callerName }}</div>
        <div class="flex items-center gap-1.5 text-xs text-white/70">
          <Icon :name="incoming.call.type === 'video' ? 'tabler:video' : 'tabler:phone'" size="13" aria-hidden="true" />
          Incoming {{ incoming.call.type === 'video' ? 'video' : 'voice' }} call
        </div>
      </div>
      <button
        type="button"
        class="inline-flex h-11 w-11 items-center justify-center rounded-full bg-red-600 hover:bg-red-700 transition-colors"
        aria-label="Decline"
        @click="declineIncoming"
      >
        <Icon name="tabler:phone-off" size="20" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-600 transition-colors"
        aria-label="Accept"
        @click="acceptIncoming"
      >
        <Icon :name="incoming.call.type === 'video' ? 'tabler:video' : 'tabler:phone'" size="20" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WsCallsIncomingPayload } from '~/types/api'
import { useCallSession } from '~/composables/calls/useCallSession'

const props = defineProps<{ incoming: WsCallsIncomingPayload }>()
const { acceptIncoming, declineIncoming } = useCallSession()

const caller = computed(() => props.incoming.caller)
const callerName = computed(() => caller.value.name || (caller.value.username ? `@${caller.value.username}` : 'Someone'))
</script>

<style scoped>
.moh-call-ring {
  animation: moh-call-ring 1.6s ease-in-out infinite;
}
@keyframes moh-call-ring {
  0%, 100% { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 0 rgba(16, 185, 129, 0.45); }
  50% { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 10px rgba(16, 185, 129, 0); }
}
@media (prefers-reduced-motion: reduce) {
  .moh-call-ring { animation: none; }
}
</style>
