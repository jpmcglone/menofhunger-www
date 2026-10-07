<template>
  <div class="relative w-full h-full rounded-lg overflow-hidden bg-black">
    <button v-if="locallySuspended" type="button" class="absolute inset-0 z-50 flex items-center justify-center bg-black/40 text-white" @click="unlockViewerPlayback">Resume watch party</button>
    <div ref="playerContainerRef" class="absolute inset-0" />
    <div
      v-if="!playerReady"
      class="absolute inset-0 flex items-center justify-center bg-black"
    >
      <Icon name="tabler:loader" class="text-[28px] text-white opacity-60 animate-spin" aria-hidden="true" />
    </div>
    <div
      v-if="isOwner && ownerSyncChipVisible"
      class="absolute top-3 left-1/2 -translate-x-1/2 z-30 inline-flex items-center gap-1.5 rounded-full bg-black/75 px-2.5 py-1 text-[11px] text-white/90 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <Icon name="tabler:loader-2" class="text-[12px] animate-spin" aria-hidden="true" />
      <span>Syncing to room state…</span>
    </div>
    <!-- Overlay for non-owners (and replaced owner tabs) to prevent click-through to YT -->
    <div
      v-if="isFollowingPlayback && playerReady && !viewerNeedsGesture"
      class="absolute inset-0 z-10"
      aria-hidden="true"
    />
    <button
      v-if="isFollowingPlayback && playerReady && viewerNeedsGesture && !playerError"
      type="button"
      class="absolute inset-0 z-20 flex items-center justify-center bg-black/40"
      aria-label="Watch with the room"
      @click="unlockViewerPlayback"
    >
      <span class="rounded-full bg-black/75 px-4 py-2 text-sm font-medium text-white">
        Watch with the room
      </span>
    </button>
    <div
      v-if="playerError"
      class="absolute inset-0 z-30 flex items-center justify-center bg-black/70 px-4 text-center text-sm text-white"
      role="alert"
    >
      {{ playerError }}
    </div>

    <!-- Viewer controls: local volume only. Lifted when the replaced-owner banner is up. -->
    <div
      v-if="isFollowingPlayback && playerReady"
      class="absolute right-3 z-40 flex items-center gap-2 rounded-full bg-black/70 px-2.5 py-1.5 backdrop-blur-sm"
      :class="isReplacedOwner ? 'bottom-12' : 'bottom-3'"
    >
      <button
        type="button"
        class="inline-flex h-7 w-7 items-center justify-center rounded-full text-white/90 hover:text-white transition-colors"
        :aria-label="viewerVolume <= 1 ? 'Unmute local volume' : 'Mute local volume'"
        @click="toggleMute"
      >
        <Icon
          :name="viewerVolume <= 1 ? 'tabler:volume-off' : 'tabler:volume'"
          class="text-[15px]"
          aria-hidden="true"
        />
      </button>
      <input
        v-model.number="viewerVolume"
        type="range"
        min="0"
        max="100"
        step="1"
        class="h-1.5 w-28 accent-white/90"
        aria-label="Local volume"
        @input="onVolumeInput"
      >
    </div>

    <!-- Banner shown when this owner tab has been superseded by another tab -->
    <div
      v-if="isReplacedOwner"
      class="absolute bottom-0 inset-x-0 z-30 flex items-center justify-between gap-2 bg-black/80 px-4 py-2 text-xs text-white/80"
    >
      <span>Controlling from another tab — controls disabled here.</span>
      <button
        type="button"
        class="shrink-0 rounded px-2 py-1 text-xs font-semibold bg-white/15 hover:bg-white/25 transition-colors"
        @click="takeControl"
      >
        Take control
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SpaceYouTubePlayerProps } from '../composables/spaces/space-youtube-player-types'
import { useSpaceYouTubePlayer } from '~/composables/spaces/useSpaceYouTubePlayer'

const props = defineProps<SpaceYouTubePlayerProps>()

const {
  isOwner,
  playerContainerRef,
  playerReady,
  playerError,
  locallySuspended,
  isReplacedOwner,
  isFollowingPlayback,
  viewerVolume,
  viewerNeedsGesture,
  ownerSyncChipVisible,
  onVolumeInput,
  unlockViewerPlayback,
  toggleMute,
  takeControl,
} = useSpaceYouTubePlayer(props)
</script>

<style scoped>
/* YT.Player bakes pixel width/height once at create time. Pin the iframe to
   the 16:9 box so a 0-height container at init cannot leave a wrong rectangle. */
:deep(iframe) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
