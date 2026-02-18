<template>
  <!-- Own padding so layout containers can stay padding-free. -->
  <div v-if="displayStation" class="w-full px-3 py-1.5 sm:px-4 sm:py-2">
    <div class="flex w-full items-center justify-between gap-3">
    <button
      type="button"
      class="min-w-0 flex-1 text-left"
      @click="navigateTo('/radio')"
    >
      <div class="min-w-0">
        <div class="text-sm font-semibold truncate">{{ displayStation.name }}</div>
        <div class="text-[11px] text-gray-500 dark:text-white/70">
          <span v-if="isPlaying">Playing</span>
          <span v-else-if="!isBuffering">Paused</span>
          <span v-if="listenersCount !== null" class="ml-2 tabular-nums">· {{ listenersCount }}</span>
        </div>
      </div>
    </button>

      <div v-if="showListenerStack" class="pointer-events-none hidden sm:flex items-center gap-2">
        <TransitionGroup
          name="moh-radio-stack"
          tag="div"
          class="relative flex items-center -space-x-2"
        >
          <template v-for="u in listenerStack" :key="u.id">
            <NuxtLink
              v-if="u.username"
              :to="listenerProfileTo(u.username!)"
              class="relative pointer-events-auto cursor-pointer"
              v-tooltip.bottom="tinyTooltip(`@${u.username}`)"
            >
              <AppUserAvatar
                :user="{ id: u.id, username: u.username, avatarUrl: u.avatarUrl }"
                size-class="h-6 w-6"
                bg-class="moh-surface dark:bg-black"
                :show-presence="false"
              />
              <Transition name="moh-avatar-pause-fade">
                <div
                  v-if="u.paused"
                  class="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center moh-avatar-pause moh-avatar-pause-sm"
                  aria-hidden="true"
                >
                  <Icon name="tabler:player-pause" aria-hidden="true" />
                </div>
              </Transition>
            </NuxtLink>
            <div
              v-else
              class="relative pointer-events-auto"
              v-tooltip.bottom="tinyTooltip('User')"
            >
              <AppUserAvatar
                :user="{ id: u.id, username: u.username, avatarUrl: u.avatarUrl }"
                size-class="h-6 w-6"
                bg-class="moh-surface dark:bg-black"
                :show-presence="false"
              />
              <Transition name="moh-avatar-pause-fade">
                <div
                  v-if="u.paused"
                  class="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center moh-avatar-pause moh-avatar-pause-sm"
                  aria-hidden="true"
                >
                  <Icon name="tabler:player-pause" aria-hidden="true" />
                </div>
              </Transition>
            </div>
          </template>
        </TransitionGroup>
        <div v-if="listenerOverflowCount > 0" class="text-xs font-semibold tabular-nums text-gray-500 dark:text-white/80">
          +{{ listenerOverflowCount }}
        </div>
      </div>

      <!-- Volume (smaller + to the right of avatars) -->
      <div :class="['flex items-center gap-1.5 shrink-0', showListenerStack ? 'ml-2 sm:ml-3' : '']">
        <button
          type="button"
          class="moh-tap moh-focus inline-flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-full transition-colors moh-surface-hover"
          :aria-label="isMuted ? 'Unmute radio' : 'Mute radio'"
          @click="toggleMute"
        >
          <Icon :name="volumeIconName" class="text-[18px] opacity-80" aria-hidden="true" />
        </button>
        <input
          v-model.number="volumePercent"
          type="range"
          name="radio-volume"
          min="0"
          max="100"
          step="1"
          class="w-12 sm:w-16 accent-black dark:accent-white"
          aria-label="Radio volume"
        >
      </div>

      <div
        v-if="isBuffering"
        class="h-8 w-8 flex items-center justify-center"
        aria-label="Loading"
        role="status"
      >
        <Icon name="tabler:loader" class="text-[18px] opacity-80 animate-spin" aria-hidden="true" />
      </div>
      <button
        v-else
        type="button"
        class="moh-tap moh-focus inline-flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-full transition-colors moh-surface-hover"
        :aria-label="isPlaying ? 'Pause radio' : 'Play radio'"
        @click="toggle"
      >
        <Icon :name="isPlaying ? 'tabler:player-pause' : 'tabler:player-play'" class="text-[18px] opacity-90" aria-hidden="true" />
      </button>

      <button
        type="button"
        class="moh-tap moh-focus inline-flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-full transition-colors moh-surface-hover"
        aria-label="Close radio"
        @click="stop"
      >
        <Icon name="tabler:x" class="text-[18px] opacity-90" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RadioListener, RadioStation } from '~/types/api'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { useUsersStore } from '~/composables/useUsersStore'

function listenerProfileTo(username: string): string {
  return `/u/${encodeURIComponent(username)}`
}

const { currentStation, isPlaying, isBuffering, listeners, toggle, stop, volume, setVolume } = useRadioPlayer()
const usersStore = useUsersStore()

// Keep last station around briefly so layout-level leave transitions can animate smoothly
// even after `stop()` clears `currentStation`.
const lastStation = ref<RadioStation | null>(null)
watch(
  () => currentStation.value,
  (s) => {
    if (s) lastStation.value = s
  },
  { immediate: true },
)
const displayStation = computed(() => currentStation.value ?? lastStation.value)
const listenersCount = computed(() => (displayStation.value ? listeners.value.length : null))

const preMuteVolume = ref<number | null>(null)

const volumePercent = computed<number>({
  get() {
    return Math.round((volume.value ?? 0.5) * 100)
  },
  set(v) {
    const n = Number(v)
    if (!Number.isFinite(n)) return
    setVolume(Math.max(0, Math.min(1, n / 100)))
    if (n > 0) preMuteVolume.value = null
  },
})

const isMuted = computed(() => (volume.value ?? 0.5) <= 0.001)

function toggleMute() {
  const v = volume.value ?? 0.5
  if (v <= 0.001) {
    setVolume(preMuteVolume.value ?? 0.5)
    preMuteVolume.value = null
  } else {
    preMuteVolume.value = v
    setVolume(0)
  }
}

const volumeIconName = computed(() => {
  const v = volume.value ?? 0.5
  if (v <= 0.001) return 'tabler:volume-off'
  if (v < 0.5) return 'tabler:volume-2'
  return 'tabler:volume'
})

const listenerStack = computed<RadioListener[]>(() => {
  if (!displayStation.value) return []
  return (listeners.value ?? []).slice(0, 5).map((u) => (u?.id ? (usersStore.overlay(u as any) as any) : u))
})
const listenerOverflowCount = computed(() => {
  if (!displayStation.value) return 0
  return Math.max(0, (listeners.value?.length ?? 0) - listenerStack.value.length)
})
const showListenerStack = computed(() => listenersCount.value !== null && listenersCount.value > 0)
</script>

<style scoped>
.moh-radio-stack-move {
  transition: transform 260ms ease;
}
.moh-radio-stack-enter-active,
.moh-radio-stack-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}
.moh-radio-stack-enter-from,
.moh-radio-stack-leave-to {
  opacity: 0;
  transform: translateY(2px) scale(0.98);
}
.moh-radio-stack-leave-active {
  position: absolute;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .moh-radio-stack-move,
  .moh-radio-stack-enter-active,
  .moh-radio-stack-leave-active {
    transition: none !important;
  }
}
</style>

