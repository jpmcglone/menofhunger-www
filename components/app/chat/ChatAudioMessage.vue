<template>
  <div
    class="flex w-[296px] max-w-full items-center gap-2 rounded-2xl px-3 py-2"
    :class="own ? 'bg-black/10 dark:bg-white/10' : 'bg-gray-100 dark:bg-zinc-800'"
    data-testid="chat-audio-message"
  >
    <button
      type="button"
      class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black"
      :aria-label="isThis && (playing || loading) ? 'Pause voice note' : 'Play voice note'"
      @click.stop="player.toggle(media.id, media.url, { title: sender ? `Voice message from ${sender}` : 'Voice message', href, duration: media.durationSeconds ?? 0 })"
    >
      <Icon :name="isThis && (playing || loading) ? 'tabler:player-pause-filled' : 'tabler:player-play-filled'" size="16" aria-hidden="true" />
    </button>
    <div class="min-w-0 flex-1">
      <p class="text-xs moh-text-muted">{{ isThis && error ? error : isThis && loading ? 'Loading…' : 'Voice message' }}</p>
      <input
        type="range"
        min="0"
        :max="Math.max(1, displayDuration)"
        step="0.1"
        :value="isThis ? currentTime : 0"
        class="moh-audio-scrub w-full"
        :disabled="!isThis || duration <= 0"
        aria-label="Voice note progress"
        @click.stop
        @input="onSeek"
      >
      <div class="mt-0.5 flex items-center justify-between text-[11px] tabular-nums text-gray-500 dark:text-zinc-400">
        <span>{{ formatClock(isThis ? currentTime : 0) }}</span>
        <span>{{ formatClock(displayDuration) }}</span>
      </div>
    </div>
    <button
      type="button"
      class="h-11 min-w-11 shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-gray-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10"
      :aria-label="`Playback speed ${isThis ? rate : 1}x`"
      :disabled="!isThis"
      @click.stop="player.cycleRate(media.id)"
    >
      {{ isThis ? rate : 1 }}x
    </button>
  </div>
</template>

<script setup lang="ts">
import type { MessageMedia } from '~/types/api'
import { useChatAudioPlayer } from '~/composables/chat/useChatAudioPlayer'

const props = defineProps<{
  media: MessageMedia
  own?: boolean
  sender?: string
  href?: string
}>()

const player = useChatAudioPlayer()
const { currentId, playing, currentTime, duration, rate, error, loading } = player

const isThis = computed(() => currentId.value === props.media.id)
const displayDuration = computed(() => {
  if (isThis.value && duration.value > 0) return duration.value
  return props.media.durationSeconds ?? 0
})

function onSeek(e: Event) {
  const value = Number((e.target as HTMLInputElement).value)
  player.seek(props.media.id, value)
}

function formatClock(total: number) {
  const s = Math.max(0, Math.floor(total))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.moh-audio-scrub {
  accent-color: currentColor;
  height: 4px;
}
</style>
