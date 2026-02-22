<template>
  <!-- Own padding so layout containers can stay padding-free. -->
  <div v-if="displaySpace" class="w-full px-3 py-1.5 sm:px-4 sm:py-2 relative overflow-hidden">
    <!-- Subtle visualizer in background when playing -->
    <div
      v-if="isPlaying"
      :style="{ opacity: SPACE_VISUALIZER_BACKGROUND_OPACITY }"
      class="absolute inset-0 pointer-events-none rounded-lg"
      aria-hidden="true"
    >
      <AppSpaceVisualizer background-only class="w-full h-full" />
    </div>
    <div ref="barEl" class="relative z-10 flex w-full items-center justify-between gap-3">
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
              :ref="(el) => setAvatarRef(u.id, el as HTMLElement | null)"
              :to="listenerProfileTo(u.username!)"
              class="relative pointer-events-auto cursor-pointer"
              v-tooltip.bottom="tinyTooltip(`@${u.username}`)"
            >
              <AppUserAvatar
                :user="{ id: u.id, username: u.username, avatarUrl: u.avatarUrl }"
                size-class="h-8 w-8"
                bg-class="moh-surface dark:bg-black"
                :show-presence="false"
              />
              <Transition name="moh-avatar-pause-fade">
                <div
                  v-if="u.paused || u.muted"
                  class="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-black/70 flex items-center justify-center ring-1 ring-white/20"
                  aria-hidden="true"
                >
                  <Icon
                    :name="u.paused ? 'tabler:player-pause' : 'tabler:volume-off'"
                    class="text-[11px] text-white"
                    aria-hidden="true"
                  />
                </div>
              </Transition>
            </NuxtLink>
            <div
              v-else
              :ref="(el) => setAvatarRef(u.id, el as HTMLElement | null)"
              class="relative pointer-events-auto"
              v-tooltip.bottom="tinyTooltip('User')"
            >
              <AppUserAvatar
                :user="{ id: u.id, username: u.username, avatarUrl: u.avatarUrl }"
                size-class="h-8 w-8"
                bg-class="moh-surface dark:bg-black"
                :show-presence="false"
              />
              <Transition name="moh-avatar-pause-fade">
                <div
                  v-if="u.paused || u.muted"
                  class="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-black/70 flex items-center justify-center ring-1 ring-white/20"
                  aria-hidden="true"
                >
                  <Icon
                    :name="u.paused ? 'tabler:player-pause' : 'tabler:volume-off'"
                    class="text-[11px] text-white"
                    aria-hidden="true"
                  />
                </div>
              </Transition>
            </div>
          </template>
        </TransitionGroup>
        <div v-if="listenerOverflowCount > 0" class="text-xs font-semibold tabular-nums text-gray-500 dark:text-white/80">
          +{{ listenerOverflowCount }}
        </div>
      </div>

      <!-- Controls: volume, play/pause, chat, leave -->
      <div ref="controlsEl" class="shrink-0 flex items-center gap-1.5">
        <!-- Volume -->
        <div v-if="hasStation" class="flex items-center gap-1.5">
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

        <!-- Buffering spinner or play/pause -->
        <div
          v-if="hasStation && isBuffering"
          class="inline-flex h-11 w-11 items-center justify-center rounded-full"
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

        <!-- Share space link -->
        <div v-if="selectedSpaceId" class="flex items-center">
          <AppPostRowShareMenu
            :can-share="true"
            :tooltip="shareTooltip"
            :items="shareMenuItems"
          />
        </div>

        <!-- Toggle live chat overlay -->
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
  </div>
</template>

<script setup lang="ts">
import { useMediaQuery, useElementSize } from '@vueuse/core'
import type { MenuItem } from 'primevue/menuitem'
import type { Space, SpaceMember } from '~/types/api'
import { siteConfig } from '~/config/site'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { useUsersStore } from '~/composables/useUsersStore'
import { SPACE_VISUALIZER_BACKGROUND_OPACITY } from '~/composables/useSpaceAudio'
import { useCopyToClipboard } from '~/composables/useCopyToClipboard'

function listenerProfileTo(username: string): string {
  return `/u/${encodeURIComponent(username)}`
}

const { selectedSpaceId, currentSpace, members, leave } = useSpaceLobby()
const { addFloating } = useSpaceReactions()
const { hasStation, isPlaying, isBuffering, toggle, stop, volume, setVolume } = useSpaceAudio()
const usersStore = useUsersStore()
const presence = usePresence()
const { user } = useAuth()

// Track avatar element positions so emojis can float over the full screen.
const avatarEls = new Map<string, HTMLElement>()

function setAvatarRef(userId: string, el: HTMLElement | null) {
  if (el) avatarEls.set(userId, el)
  else avatarEls.delete(userId)
}

function getAvatarViewportCenter(userId: string): { x: number; y: number } | undefined {
  const el = avatarEls.get(userId)
  if (!el) return undefined
  const rect = el.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

const radioBarReactionsCb = {
  onReaction: (payload: import('~/types/api').SpaceReactionEvent) => {
    if (!payload?.spaceId || payload.spaceId !== selectedSpaceId.value) return
    // Own reactions are handled by the spaces page optimistically — skip to avoid duplicates.
    if (payload.userId === user.value?.id) return
    addFloating(payload.userId, payload.emoji, getAvatarViewportCenter(payload.userId))
  },
}

onMounted(() => {
  presence.addSpacesCallback(radioBarReactionsCb as any)
})
onBeforeUnmount(() => {
  presence.removeSpacesCallback(radioBarReactionsCb as any)
})
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

const barEl = ref<HTMLElement | null>(null)
const controlsEl = ref<HTMLElement | null>(null)
const { width: barWidth } = useElementSize(barEl)
const { width: controlsWidth } = useElementSize(controlsEl)

// Avatar: h-8 w-8 = 32px, -space-x-2 = 8px overlap → N avatars = 8 + N×24px
// Solving: N = floor((available - 8) / 24)
// Reserve ~140px for the space name on the left, plus gap-3 spacing
const maxStackVisible = computed(() => {
  if (!barWidth.value || !controlsWidth.value) return 5
  const available = barWidth.value - controlsWidth.value - 140 - 24
  if (available < 32) return 0
  return Math.min(5, Math.max(0, Math.floor((available - 8) / 24)))
})

const listenerStack = computed<SpaceMember[]>(() => {
  if (!displaySpace.value) return []
  return (members.value ?? []).slice(0, maxStackVisible.value).map((u) => (u?.id ? (usersStore.overlay(u as any) as any) : u))
})
const listenerOverflowCount = computed(() => {
  if (!displaySpace.value) return 0
  return Math.max(0, (members.value?.length ?? 0) - listenerStack.value.length)
})
const showListenerStack = computed(() => membersCount.value !== null && membersCount.value > 0)

const spaceShareUrl = computed(() =>
  selectedSpaceId.value
    ? `${siteConfig.url}/spaces/${encodeURIComponent(selectedSpaceId.value)}`
    : '',
)
const toast = useAppToast()
const { copyText: copyToClipboard } = useCopyToClipboard()
type MenuItemWithIcon = MenuItem & { iconName?: string }
const shareTooltip = tinyTooltip('Share')
const shareMenuItems = computed<MenuItemWithIcon[]>(() => [
  {
    label: 'Copy link',
    iconName: 'tabler:link',
    command: async () => {
      if (!import.meta.client || !spaceShareUrl.value) return
      try {
        await copyToClipboard(spaceShareUrl.value)
        toast.push({ title: 'Space link copied', tone: 'public', durationMs: 1400 })
      } catch {
        toast.push({ title: 'Copy failed', tone: 'error', durationMs: 1800 })
      }
    },
  },
])

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

