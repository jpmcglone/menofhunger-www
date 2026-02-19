<template>
  <AppPageContent bottom="standard">
    <div class="w-full">
      <div class="moh-gutter-x pt-4 pb-3">
        <h1 class="moh-h1">Radio</h1>
        <p class="mt-1 moh-meta">Choose a station and listen while you build.</p>
      </div>

      <div class="moh-gutter-x pb-6 space-y-4">
        <!-- Stations -->
        <section class="moh-card moh-card-matte !rounded-2xl overflow-hidden">
          <div class="px-4 py-3 border-b moh-border-subtle flex items-center justify-between gap-3">
            <div class="moh-h2">Stations</div>
            <div v-if="stationsLoading" class="moh-meta">Refreshing…</div>
          </div>

          <div v-if="error" class="px-4 py-3">
            <AppInlineAlert severity="danger">
              {{ error }}
            </AppInlineAlert>
          </div>

          <div v-else class="p-3">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div
                v-for="s in stations"
                :key="s.id"
                :class="[
                  'relative rounded-2xl border p-3 flex items-start justify-between gap-3 transition-colors',
                  stationId === s.id
                    ? 'border-transparent ring-2 ring-[var(--p-primary-color)] bg-black/5 dark:bg-white/5'
                    : 'border-[var(--moh-border-subtle)] hover:bg-black/5 dark:hover:bg-white/5'
                ]"
              >
                <button
                  type="button"
                  class="min-w-0 flex-1 text-left moh-focus"
                  :aria-label="`Play ${s.name}`"
                  @click="onStationRowClick(s)"
                >
                  <div class="font-semibold moh-text leading-snug">
                    {{ s.name }}
                  </div>
                  <div class="mt-0.5 moh-meta tabular-nums">
                    <span :class="lobbyCountForStation(s.id) > 0 ? 'moh-text' : ''">
                      {{ lobbyCountForStation(s.id) }}
                    </span>
                    <span> in lobby</span>
                  </div>
                  <div v-if="s.attributionName" class="mt-0.5 moh-meta truncate">
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
                    <Icon name="tabler:loader" class="text-[18px] opacity-80 animate-spin" aria-hidden="true" />
                  </div>
                  <button
                    v-else
                    type="button"
                    class="moh-tap moh-focus inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors moh-surface-hover"
                    :aria-label="stationId === s.id && isPlaying ? 'Pause' : 'Play'"
                    @click="onPlayPauseClick(s)"
                  >
                    <Icon
                      :name="stationId === s.id && isPlaying ? 'tabler:player-pause' : 'tabler:player-play'"
                      class="text-[18px] opacity-90"
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>
            </div>

            <div v-if="stations.length === 0" class="px-1 py-2 moh-meta">
              No stations available.
            </div>
          </div>
        </section>

        <!-- Now playing -->
        <section v-if="currentStation" class="moh-card moh-card-matte !rounded-2xl overflow-hidden">
          <div class="px-4 py-3 border-b moh-border-subtle flex items-center justify-between gap-3">
            <div class="moh-h2">Now playing</div>
            <div class="moh-meta tabular-nums">
              {{ listeners.length }} listening
            </div>
          </div>

          <div class="px-4 py-4 space-y-3">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="font-semibold moh-text truncate">
                  {{ currentStation.name }}
                </div>
                <div class="mt-0.5 moh-meta">
                  <span v-if="isBuffering">Buffering…</span>
                  <span v-else-if="isPlaying">Playing</span>
                  <span v-else>Paused</span>
                </div>
              </div>

              <div class="shrink-0 flex items-center gap-1">
                <button
                  type="button"
                  class="moh-tap moh-focus inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors moh-surface-hover"
                  :aria-label="isPlaying ? 'Pause radio' : 'Play radio'"
                  @click="isPlaying ? pause() : play(currentStation)"
                >
                  <Icon
                    :name="isPlaying ? 'tabler:player-pause' : 'tabler:player-play'"
                    class="text-[18px] opacity-90"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>

            <div>
              <div v-if="listeners.length === 0" class="moh-meta">
                Nobody else is listening right now.
              </div>
              <TransitionGroup
                v-else
                name="moh-radio-avatars"
                tag="div"
                class="relative flex flex-wrap gap-2"
              >
                <template v-for="u in listeners" :key="u.id">
                  <NuxtLink
                    v-if="u.username"
                    :to="listenerProfileTo(u.username!)"
                    class="relative block shrink-0 cursor-pointer moh-focus rounded-full"
                    v-tooltip.bottom="tinyTooltip(`@${u.username}`)"
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
                        <Icon name="tabler:player-pause" aria-hidden="true" />
                      </div>
                      <div
                        v-else-if="u.muted"
                        class="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center moh-avatar-pause"
                        aria-hidden="true"
                      >
                        <Icon name="tabler:volume-off" aria-hidden="true" />
                      </div>
                    </Transition>
                  </NuxtLink>
                  <div
                    v-else
                    class="relative block shrink-0 rounded-full"
                    v-tooltip.bottom="tinyTooltip('User')"
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
                        <Icon name="tabler:player-pause" aria-hidden="true" />
                      </div>
                      <div
                        v-else-if="u.muted"
                        class="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center moh-avatar-pause"
                        aria-hidden="true"
                      >
                        <Icon name="tabler:volume-off" aria-hidden="true" />
                      </div>
                    </Transition>
                  </div>
                </template>
              </TransitionGroup>
            </div>
          </div>
        </section>

        <section v-else class="moh-card moh-card-matte !rounded-2xl overflow-hidden">
          <div class="px-4 py-3 border-b moh-border-subtle">
            <div class="moh-h2">Now playing</div>
          </div>
          <div class="px-4 py-4 moh-meta">
            Select a station to start listening.
          </div>
        </section>
      </div>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { RadioStation } from '~/types/api'
import { tinyTooltip } from '~/utils/tiny-tooltip'

function listenerProfileTo(username: string): string {
  return `/u/${encodeURIComponent(username)}`
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

const {
  stations,
  stationsLoading,
  stationId,
  currentStation,
  isPlaying,
  isBuffering,
  error,
  listeners,
  play,
  pause,
  lobbyCountForStation,
  subscribeLobbyCounts,
  unsubscribeLobbyCounts,
} = useRadioPlayer()

onMounted(() => {
  void subscribeLobbyCounts()
})

onBeforeUnmount(() => {
  unsubscribeLobbyCounts()
})

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

