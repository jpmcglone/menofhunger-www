<template>
  <div
    class="fixed bottom-[calc(var(--moh-safe-bottom,0px)+4.5rem)] right-3 z-[9994] sm:bottom-4 sm:right-4"
    role="status"
  >
    <div class="flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/95 py-1.5 pl-3 pr-1.5 text-white shadow-xl shadow-black/40 backdrop-blur">
      <button
        v-if="expandable"
        type="button"
        class="flex min-w-0 items-center gap-2 text-left"
        aria-label="Show call"
        @click="emit('expand')"
      >
        <span class="relative flex h-2 w-2 shrink-0" aria-hidden="true">
          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span class="text-sm font-semibold truncate">{{ label }}</span>
        <span v-if="showTimer" class="text-xs tabular-nums text-white/70">{{ elapsed }}</span>
      </button>
      <div v-else class="flex min-w-0 items-center gap-2 pr-2">
        <Icon name="tabler:device-laptop" size="16" class="text-white/70" aria-hidden="true" />
        <span class="text-sm truncate">In a call in another tab</span>
      </div>

      <template v-if="expandable">
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors"
          :class="isMicEnabled ? 'bg-white/10 hover:bg-white/20' : 'bg-white text-zinc-900'"
          :aria-label="isMicEnabled ? 'Mute microphone' : 'Unmute microphone'"
          @click="toggleMic"
        >
          <Icon :name="isMicEnabled ? 'tabler:microphone' : 'tabler:microphone-off'" size="17" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-600 hover:bg-red-700 transition-colors"
          aria-label="Leave call"
          @click="leaveCall"
        >
          <Icon name="tabler:phone-off" size="17" aria-hidden="true" />
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCallSession } from '~/composables/calls/useCallSession'
import { useCallTimer } from '~/composables/calls/useCallTimer'

const emit = defineEmits<{ expand: [] }>()

const { phase, call, isMicEnabled, connectedAt, remoteParticipants, toggleMic, leaveCall } = useCallSession()
const { elapsed } = useCallTimer(connectedAt)

const expandable = computed(() => phase.value === 'in_call' || phase.value === 'outgoing')
const showTimer = computed(() => phase.value === 'in_call')
const label = computed(() => {
  if (phase.value === 'outgoing') return 'Calling…'
  const type = call.value?.type === 'video' ? 'Video call' : 'Voice call'
  const n = remoteParticipants.value.length + 1
  return n > 2 ? `${type} · ${n}` : type
})
</script>
