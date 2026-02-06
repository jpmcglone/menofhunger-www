<template>
  <div class="px-4 py-5 space-y-6 min-h-full dark:bg-black">
    <div class="flex items-end justify-between gap-3">
      <div class="min-w-0">
        <div class="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
          Radio
        </div>
        <div class="mt-1 text-sm moh-text-muted">
          Choose a station and listen while you build.
        </div>
      </div>
    </div>

    <!-- Stations -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <div
        v-for="s in stations"
        :key="s.id"
        :class="[
          'rounded-2xl border moh-border p-4 flex items-start justify-between gap-3 transition-colors',
          stationId === s.id
            ? 'bg-black/5 dark:bg-white/5 ring-2 ring-[var(--p-primary-color)] border-transparent'
            : 'moh-surface-hover'
        ]"
      >
        <button
          type="button"
          class="min-w-0 flex-1 text-left"
          :aria-label="`Play ${s.name}`"
          @click="onStationRowClick(s)"
        >
          <div class="font-semibold text-gray-900 dark:text-gray-50 leading-snug">
            {{ s.name }}
          </div>
          <div v-if="s.attributionName" class="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
            {{ s.attributionName }}
          </div>
        </button>

        <div class="shrink-0 pt-0.5">
          <div
            v-if="stationId === s.id && isBuffering"
            class="h-8 w-8 flex items-center justify-center"
            aria-label="Loading"
            role="status"
          >
            <i class="pi pi-spinner pi-spin opacity-80" aria-hidden="true" />
          </div>
          <Button
            v-else
            :icon="stationId === s.id && isPlaying ? 'pi pi-pause' : 'pi pi-play'"
            severity="secondary"
            rounded
            text
            size="small"
            :aria-label="stationId === s.id && isPlaying ? 'Pause' : 'Play'"
            @click="onPlayPauseClick(s)"
          />
        </div>
      </div>
    </div>

    <div v-if="stationsLoading" class="text-xs moh-text-muted">
      Refreshing station list…
    </div>

    <div v-if="error" class="text-sm text-red-700 dark:text-red-300">
      {{ error }}
    </div>

    <!-- Listening now -->
    <div v-if="currentStation" class="space-y-3">
      <div class="text-sm text-gray-900 dark:text-gray-50">
        Listening now to <span class="font-bold">{{ currentStation.name }}</span>
      </div>

      <div>
        <div v-if="listeners.length === 0" class="text-sm moh-text-muted">
          Nobody else is listening right now.
        </div>
        <TransitionGroup
          v-else
          name="moh-radio-avatars"
          tag="div"
          class="relative flex flex-wrap gap-2"
        >
          <NuxtLink
            v-for="u in listeners"
            :key="u.id"
            :to="listenerProfileTo(u)"
            class="relative block shrink-0 cursor-pointer"
            v-tooltip.bottom="tinyTooltip(u.username ? `@${u.username}` : 'User')"
          >
            <AppUserAvatar
              :user="{ id: u.id, username: u.username, name: null, avatarUrl: u.avatarUrl }"
              size-class="h-9 w-9"
              bg-class="moh-surface"
            />
            <Transition name="moh-avatar-pause-fade">
              <div
                v-if="u.paused"
                class="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center moh-avatar-pause"
                aria-hidden="true"
              >
                <i class="pi pi-pause" aria-hidden="true" />
              </div>
            </Transition>
          </NuxtLink>
        </TransitionGroup>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RadioStation } from '~/types/api'
import { tinyTooltip } from '~/utils/tiny-tooltip'

function listenerProfileTo(u: { id: string; username?: string | null }): string {
  return u.username ? `/u/${encodeURIComponent(u.username)}` : `/u/id/${u.id}`
}

definePageMeta({
  layout: 'app',
  title: 'Radio',
  hideTopBar: true,
})

usePageSeo({
  title: 'Radio',
  description: 'Radio stations for focus and calm.',
  canonicalPath: '/radio',
  noindex: true,
})

const { stations, stationsLoading, stationId, currentStation, isPlaying, isBuffering, error, listeners, play, pause } = useRadioPlayer()

function onStationRowClick(s: RadioStation) {
  // Simple behavior: clicking the row always plays that station (requires user gesture anyway).
  void play(s)
}

function onPlayPauseClick(s: RadioStation) {
  // If this is the active station, toggle play/pause; otherwise play the selected one.
  if (stationId.value === s.id) {
    if (isPlaying.value) pause()
    else void play(s)
    return
  }
  void play(s)
}
</script>

<style scoped>
/* Smooth list reordering + fade in/out for listener avatars. */
.moh-radio-avatars-move {
  transition: transform 260ms ease;
}
.moh-radio-avatars-enter-active,
.moh-radio-avatars-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}
.moh-radio-avatars-enter-from,
.moh-radio-avatars-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
.moh-radio-avatars-leave-active {
  /* Remove from layout immediately so remaining avatars move smoothly. */
  position: absolute;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .moh-radio-avatars-move,
  .moh-radio-avatars-enter-active,
  .moh-radio-avatars-leave-active {
    transition: none !important;
  }
}
</style>

