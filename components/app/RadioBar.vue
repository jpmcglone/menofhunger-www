<template>
  <!-- Own padding so layout containers can stay padding-free. -->
  <div v-if="displaySpace" class="w-full px-3 py-1.5 sm:px-4 sm:py-2">
    <div class="flex w-full items-center justify-between gap-3">
    <NuxtLink
      v-if="selectedSpaceId"
      :to="`/spaces/${encodeURIComponent(selectedSpaceId)}`"
      class="min-w-0 flex-1 text-left block"
    >
      <div class="min-w-0">
        <div class="text-sm font-semibold truncate">{{ displaySpace.name }}</div>
        <div class="text-[11px] text-gray-500 dark:text-white/70">
          <span v-if="hasStation">
            <span v-if="isBuffering">Buffering…</span>
            <span v-else-if="isPlaying">Playing</span>
            <span v-else>Paused</span>
          </span>
          <span v-else>No music</span>
          <span v-if="membersCount !== null" class="ml-2 tabular-nums">· {{ membersCount }}</span>
        </div>
      </div>
    </NuxtLink>
    <button
      v-else
      type="button"
      class="min-w-0 flex-1 cursor-pointer text-left"
      @click="navigateTo('/spaces')"
    >
      <div class="min-w-0">
        <div class="text-sm font-semibold truncate">{{ displaySpace?.name }}</div>
        <div class="text-[11px] text-gray-500 dark:text-white/70">
          <span v-if="hasStation">
            <span v-if="isBuffering">Buffering…</span>
            <span v-else-if="isPlaying">Playing</span>
            <span v-else>Paused</span>
          </span>
          <span v-else>No music</span>
          <span v-if="membersCount !== null" class="ml-2 tabular-nums">· {{ membersCount }}</span>
        </div>
      </div>
    </button>

      <div v-if="showListenerStack" class="pointer-events-none hidden sm:flex items-center gap-2">
        <TransitionGroup
          name="moh-space-stack"
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
                <div
                  v-else-if="u.muted"
                  class="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center moh-avatar-pause moh-avatar-pause-sm"
                  aria-hidden="true"
                >
                  <Icon name="tabler:volume-off" aria-hidden="true" />
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
                <div
                  v-else-if="u.muted"
                  class="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center moh-avatar-pause moh-avatar-pause-sm"
                  aria-hidden="true"
                >
                  <Icon name="tabler:volume-off" aria-hidden="true" />
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
      <div
        v-if="hasStation"
        :class="['flex items-center gap-1.5 shrink-0', showListenerStack ? 'ml-2 sm:ml-3' : '']"
      >
        <button
          type="button"
          class="moh-tap moh-focus inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors moh-surface-hover"
          :aria-label="isMuted ? 'Unmute' : 'Mute'"
          @click="toggleMute"
        >
          <Icon :name="volumeIconName" class="text-[18px] opacity-80" aria-hidden="true" />
        </button>
        <input
          v-model.number="volumePercent"
          type="range"
          name="space-volume"
          min="0"
          max="100"
          step="1"
          class="w-12 sm:w-16 accent-black dark:accent-white"
          aria-label="Volume"
        >
      </div>

      <div
        v-if="hasStation && isBuffering"
        class="h-8 w-8 flex items-center justify-center"
        aria-label="Loading"
        role="status"
      >
        <Icon name="tabler:loader" class="text-[18px] opacity-80 animate-spin" aria-hidden="true" />
      </div>

      <button
        v-else-if="hasStation"
        type="button"
        class="moh-tap moh-focus inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors moh-surface-hover"
        :aria-label="isPlaying ? 'Pause' : 'Play'"
        @click="toggle"
      >
        <Icon :name="isPlaying ? 'tabler:player-pause' : 'tabler:player-play'" class="text-[18px] opacity-90" aria-hidden="true" />
      </button>

      <!-- Toggle live chat overlay (all sizes for now) -->
      <button
        v-if="selectedSpaceId && !isRightRailChatVisible"
        type="button"
        class="moh-tap moh-focus inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/30 dark:border-white/30 transition-colors moh-surface-hover"
        :aria-label="spaceChatSheetOpen ? 'Close live chat' : 'Open live chat'"
        @click="toggleChatSheet"
      >
        <Icon name="tabler:messages" class="text-[18px] opacity-90" aria-hidden="true" />
      </button>

      <button
        type="button"
        class="moh-tap moh-focus inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors moh-surface-hover"
        aria-label="Leave space"
        @click="onLeaveClick"
      >
        <Icon name="tabler:x" class="text-[18px] opacity-90" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import type { Space, SpaceMember } from '~/types/api'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { useUsersStore } from '~/composables/useUsersStore'

function listenerProfileTo(username: string): string {
  return `/u/${encodeURIComponent(username)}`
}

const { selectedSpaceId, currentSpace, members, leave } = useSpaceLobby()
const { hasStation, isPlaying, isBuffering, toggle, stop, volume, setVolume } = useSpaceAudio()
const usersStore = useUsersStore()
const route = useRoute()
const { isRightRailForcedHidden } = useLayoutRules(route)
const isRightRailBreakpointUp = useMediaQuery('(min-width: 962px)')
const isRightRailVisible = computed(() => Boolean(isRightRailBreakpointUp.value) && !isRightRailForcedHidden.value)
const isRightRailChatVisible = computed(() => Boolean(selectedSpaceId.value) && isRightRailVisible.value)

// Keep last space around briefly so layout-level leave transitions can animate smoothly.
const lastSpace = ref<Space | null>(null)
watch(
  () => currentSpace.value,
  (s) => {
    if (s) lastSpace.value = s
  },
  { immediate: true },
)
const displaySpace = computed(() => currentSpace.value ?? lastSpace.value)
const membersCount = computed(() => (displaySpace.value ? members.value.length : null))

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

const listenerStack = computed<SpaceMember[]>(() => {
  if (!displaySpace.value) return []
  return (members.value ?? []).slice(0, 5).map((u) => (u?.id ? (usersStore.overlay(u as any) as any) : u))
})
const listenerOverflowCount = computed(() => {
  if (!displaySpace.value) return 0
  return Math.max(0, (members.value?.length ?? 0) - listenerStack.value.length)
})
const showListenerStack = computed(() => membersCount.value !== null && membersCount.value > 0)

const spaceChatSheetOpen = useState<boolean>('space-chat-sheet-open', () => false)
function toggleChatSheet() {
  if (!selectedSpaceId.value) return
  if (isRightRailChatVisible.value) return
  spaceChatSheetOpen.value = !spaceChatSheetOpen.value
}

async function onLeaveClick() {
  spaceChatSheetOpen.value = false
  if (route.path.startsWith('/spaces/')) {
    // Navigate to the list first, then leave so the transition feels natural.
    await navigateTo('/spaces')
    stop()
    leave()
  } else {
    stop()
    leave()
  }
}
</script>

<style scoped>
.moh-space-stack-move {
  transition: transform 260ms ease;
}
.moh-space-stack-enter-active,
.moh-space-stack-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}
.moh-space-stack-enter-from,
.moh-space-stack-leave-to {
  opacity: 0;
  transform: translateY(2px) scale(0.98);
}
.moh-space-stack-leave-active {
  position: absolute;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .moh-space-stack-move,
  .moh-space-stack-enter-active,
  .moh-space-stack-leave-active {
    transition: none !important;
  }
}
</style>

