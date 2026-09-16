<template>
  <div v-if="currentId" class="flex min-h-16 items-center gap-2 border-b moh-border moh-surface-2 px-3 py-2 moh-text" role="region" aria-label="Voice message player">
    <button class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full moh-surface-3" :aria-label="playing || loading ? 'Pause voice message' : 'Play voice message'" @click="playing || loading ? player.pause() : player.play()">
      <Icon :name="playing || loading ? 'tabler:player-pause-filled' : 'tabler:player-play-filled'" size="20" />
    </button>
    <div class="min-w-0 flex-1">
      <NuxtLink v-if="href" :to="href" class="block truncate text-sm font-semibold">{{ title }}</NuxtLink>
      <span v-else class="block truncate text-sm font-semibold">{{ title }}</span>
      <div class="truncate text-xs tabular-nums moh-text-muted">{{ error || `${loading ? 'Loading…' : playing ? 'Playing' : 'Paused'} · ${clock(currentTime)} / ${clock(duration)}` }}</div>
      <input class="block h-3 w-full accent-current" type="range" min="0" :max="Math.max(1, duration)" step="0.1" :value="currentTime" :disabled="duration <= 0" aria-label="Voice message progress" @input="seek" >
    </div>
    <button class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:opacity-70" aria-label="Stop voice message" @click="player.stop"><Icon name="tabler:x" size="20" /></button>
  </div>
</template>
<script setup lang="ts">
import { useChatAudioPlayer } from '~/composables/chat/useChatAudioPlayer'
const player = useChatAudioPlayer()
const { currentId, playing, loading, error, currentTime, duration, title, href } = player
function clock(n: number) { const s = Math.max(0, Math.floor(n)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
function seek(e: Event) { if (currentId.value) player.seek(currentId.value, Number((e.target as HTMLInputElement).value)) }
</script>
