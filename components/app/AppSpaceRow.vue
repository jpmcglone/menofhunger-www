<template>
  <div
    class="relative overflow-hidden transition-colors"
    :class="[
      preview || compact ? '' : 'border-b moh-border',
      !compact && selectedSpaceId === space.id ? 'bg-black/[0.03] dark:bg-white/[0.04]' : '',
    ]"
    @click.stop
  >
    <!-- Visualizer background when this space is playing -->
    <div
      v-if="selectedSpaceId === space.id && isPlaying"
      :style="{ opacity: SPACE_VISUALIZER_BACKGROUND_OPACITY }"
      class="absolute inset-0 pointer-events-none"
      aria-hidden="true"
    >
      <AppSpaceVisualizer background-only class="w-full h-full" />
    </div>

    <!-- Row content -->
    <div
      class="relative z-10 flex items-center"
      :class="compact ? 'gap-2 px-3 py-1.5' : 'gap-3 px-4 py-2.5'"
    >

      <!-- Far left: lobby count badge (always reserves space; hidden when 0) -->
      <span
        :class="[
          'inline-flex items-center justify-center px-1 rounded font-medium tabular-nums shrink-0',
          'moh-text-muted bg-black/10 dark:bg-white/10',
          compact ? 'min-w-[1rem] h-4 text-[10px]' : 'min-w-[1.25rem] h-5 text-[11px]',
          lobbyCountForSpace(space.id) === 0 ? 'invisible' : '',
        ]"
        aria-hidden="true"
      >{{ lobbyCountForSpace(space.id) }}</span>

      <!-- Left: enter button -->
      <button
        type="button"
        class="min-w-0 flex-1 text-left moh-focus"
        :class="compact ? 'py-0' : 'py-0.5'"
        :aria-label="`Enter ${space.name}`"
        @click="onEnterSpace"
      >
        <!-- Compact: single line — name · station -->
        <div v-if="compact" class="flex items-center gap-1.5 leading-none">
          <span class="font-semibold moh-text text-xs truncate">{{ space.name }}</span>
          <span
            v-if="selectedSpaceId === space.id && isPlaying"
            class="inline-flex shrink-0 items-center gap-0.5 rounded-full px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider bg-[var(--p-primary-color)]/15 text-[var(--p-primary-color)]"
          >
            <span class="h-1 w-1 rounded-full bg-[var(--p-primary-color)] animate-pulse" aria-hidden="true" />
            Live
          </span>
          <span
            v-else-if="selectedSpaceId === space.id"
            class="inline-flex shrink-0 items-center rounded-full px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider bg-[var(--p-primary-color)]/10 text-[var(--p-primary-color)]"
          >
            Active
          </span>
          <span v-if="space.station" class="shrink-0 text-[10px] moh-meta opacity-70">· {{ space.station.name }}</span>
        </div>

        <!-- Standard: two lines -->
        <template v-else>
          <div class="flex items-center gap-1.5 leading-snug">
            <span class="font-semibold moh-text text-sm">{{ space.name }}</span>
            <span
              v-if="selectedSpaceId === space.id && isPlaying"
              class="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-[var(--p-primary-color)]/15 text-[var(--p-primary-color)]"
            >
              <span class="h-1 w-1 rounded-full bg-[var(--p-primary-color)] animate-pulse" aria-hidden="true" />
              Live
            </span>
            <span
              v-else-if="selectedSpaceId === space.id"
              class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-[var(--p-primary-color)]/10 text-[var(--p-primary-color)]"
            >
              Active
            </span>
          </div>
          <div class="mt-0.5 text-[11px] moh-meta leading-none">
            <span v-if="space.station">{{ space.station.name }}</span>
            <span v-else class="opacity-40">No music</span>
          </div>
        </template>
      </button>

      <!-- Middle: avatar stack (selected space) or raw count -->
      <div class="shrink-0 flex items-center gap-1.5">
        <!-- Avatar stack — only for the selected space (we have member data) -->
        <TransitionGroup
          v-if="selectedSpaceId === space.id && lobbyMembers.length > 0"
          name="moh-space-stack"
          tag="div"
          class="flex items-center"
          :class="compact ? '-space-x-1.5' : '-space-x-2'"
        >
          <template v-for="u in lobbyStack" :key="u.id">
            <NuxtLink
              v-if="u.username"
              :to="`/u/${encodeURIComponent(u.username)}`"
              class="relative block moh-focus rounded-full"
              v-tooltip.top="tinyTooltip(`@${u.username}`)"
              @click.stop
            >
              <AppUserAvatar
                :user="{ id: u.id, username: u.username, avatarUrl: u.avatarUrl }"
                :size-class="compact ? 'h-5 w-5' : 'h-7 w-7'"
                bg-class="moh-surface dark:bg-black"
                :show-presence="false"
              />
              <Transition name="moh-avatar-pause-fade">
                <div
                  v-if="u.paused || u.muted"
                  class="absolute -bottom-0.5 -right-0.5 rounded-full bg-black/70 flex items-center justify-center ring-1 ring-white/20"
                  :class="compact ? 'h-3 w-3' : 'h-4 w-4'"
                  aria-hidden="true"
                >
                  <Icon :name="u.paused ? 'tabler:player-pause' : 'tabler:volume-off'" :class="compact ? 'text-[6px]' : 'text-[8px]'" class="text-white" />
                </div>
              </Transition>
            </NuxtLink>
            <div v-else class="relative" v-tooltip.top="tinyTooltip('User')">
              <AppUserAvatar
                :user="{ id: u.id, username: u.username, avatarUrl: u.avatarUrl }"
                :size-class="compact ? 'h-5 w-5' : 'h-7 w-7'"
                bg-class="moh-surface dark:bg-black"
                :show-presence="false"
              />
            </div>
          </template>
        </TransitionGroup>

        <!-- Overflow count / raw count for non-selected spaces -->
        <span
          v-if="selectedSpaceId === space.id && lobbyOverflow > 0"
          class="font-semibold tabular-nums moh-meta"
          :class="compact ? 'text-[10px]' : 'text-[11px]'"
        >+{{ lobbyOverflow }}</span>
        <span
          v-else-if="selectedSpaceId !== space.id && lobbyCountForSpace(space.id) > 0"
          class="inline-flex items-center gap-1 tabular-nums"
          :class="compact ? 'text-[10px]' : 'text-[11px]'"
        >
          <Icon name="tabler:users" :class="compact ? 'text-[10px]' : 'text-[12px]'" class="opacity-30" aria-hidden="true" />
          <span class="font-medium text-gray-900 dark:text-white">{{ lobbyCountForSpace(space.id) }}</span>
        </span>
      </div>

      <!-- Right: share (standard only) + play -->
      <div class="shrink-0 flex items-center" :class="compact ? 'gap-0' : 'gap-0.5'">
        <AppPostRowShareMenu
          v-if="!compact"
          :can-share="true"
          :tooltip="shareTooltip"
          :items="shareItems"
        />
        <button
          v-if="space.station"
          type="button"
          class="moh-tap moh-focus inline-flex items-center justify-center rounded-full transition-colors moh-surface-hover"
          :class="compact ? 'h-7 w-7' : 'h-9 w-9'"
          :aria-label="selectedSpaceId === space.id && isPlaying ? 'Pause' : 'Play'"
          @click.stop="onPlaySpace"
        >
          <Icon
            :name="selectedSpaceId === space.id && isPlaying ? 'tabler:player-pause' : 'tabler:player-play'"
            :class="compact ? 'text-[14px]' : 'text-[17px]'"
            class="opacity-90"
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MenuItem } from 'primevue/menuitem'
import type { Space } from '~/types/api'
import { siteConfig } from '~/config/site'
import { SPACE_VISUALIZER_BACKGROUND_OPACITY, primeSpaceAudioContext } from '~/composables/useSpaceAudio'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { useUsersStore } from '~/composables/useUsersStore'
import { useCopyToClipboard } from '~/composables/useCopyToClipboard'

const props = defineProps<{
  space: Space
  /** When true, removes the bottom border (use when embedded in a card/preview). */
  preview?: boolean
  /** When true, renders a compact single-line layout (for chat message previews). */
  compact?: boolean
}>()

const MAX_LOBBY_AVATARS = 4

const { selectedSpaceId, members, lobbyCountForSpace, select } = useSpaceLobby()
const { stationId: audioStationId, isPlaying, playSpace, pause } = useSpaceAudio()

const usersStore = useUsersStore()
const toast = useAppToast()
const { copyText: copyToClipboard } = useCopyToClipboard()

type MenuItemWithIcon = MenuItem & { iconName?: string }

const shareTooltip = tinyTooltip('Share')
const shareItems = computed<MenuItemWithIcon[]>(() => [
  {
    label: 'Copy link',
    iconName: 'tabler:link',
    command: async () => {
      if (!import.meta.client) return
      const url = `${siteConfig.url}/spaces/${encodeURIComponent(props.space.id)}`
      try {
        await copyToClipboard(url)
        toast.push({ title: 'Space link copied', tone: 'public', durationMs: 1400 })
      } catch {
        toast.push({ title: 'Copy failed', tone: 'error', durationMs: 1800 })
      }
    },
  },
])

const lobbyMembers = computed(() => {
  const list = (members.value ?? []) as any[]
  return list.map((u) => (u?.id ? (usersStore.overlay(u) as any) : u)).filter(Boolean)
})

const lobbyStack = computed(() => lobbyMembers.value.slice(0, MAX_LOBBY_AVATARS))
const lobbyOverflow = computed(() => Math.max(0, lobbyMembers.value.length - MAX_LOBBY_AVATARS))

function onEnterSpace() {
  const isSameSpace = selectedSpaceId.value === props.space.id
  const wasPlaying = isPlaying.value
  if (!isSameSpace && wasPlaying) primeSpaceAudioContext()
  void select(props.space.id).then(() => {
    if (!isSameSpace && wasPlaying) {
      void playSpace(props.space)
    }
    navigateTo(`/spaces/${encodeURIComponent(props.space.id)}`)
  })
}

function onPlaySpace() {
  primeSpaceAudioContext()
  void select(props.space.id).then(() => {
    if (isPlaying.value && audioStationId.value === (props.space.station?.id ?? null)) {
      pause()
    } else {
      void playSpace(props.space)
    }
  })
}
</script>
