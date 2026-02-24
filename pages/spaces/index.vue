<template>
  <AppPageContent bottom="standard">
    <div class="w-full pb-6">

      <!-- Header -->
      <div class="moh-gutter-x pt-4 pb-3">
        <h1 class="moh-h1">Spaces</h1>
        <p class="mt-1 moh-meta">Enter a space, chat, and optionally play music while you build.</p>
      </div>

      <!-- Loading -->
      <div v-if="!loadedOnce" class="moh-gutter-x py-6 flex items-center gap-2 moh-meta" role="status" aria-live="polite">
        <Icon name="tabler:loader" class="text-[18px] opacity-80 animate-spin" aria-hidden="true" />
        <span>Loading spaces…</span>
      </div>
      <div v-else-if="spaces.length === 0 && !loading" class="moh-gutter-x py-4 moh-meta">
        No spaces available.
      </div>

      <!-- Space rows — edge to edge -->
      <TransitionGroup v-else tag="div" class="border-t moh-border" move-class="transition-transform duration-500 ease-in-out">
        <div
          v-for="space in sortedSpaces"
          :key="space.id"
          class="relative border-b moh-border overflow-hidden transition-colors"
          :class="selectedSpaceId === space.id ? 'bg-black/[0.03] dark:bg-white/[0.04]' : ''"
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
          <div class="relative z-10 flex items-center gap-3 px-4 py-2.5">

            <!-- Far left: lobby count badge (always reserves space; hidden when 0) -->
            <span
              :class="[
                'inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded text-[11px] font-medium tabular-nums shrink-0',
                'moh-text-muted bg-black/10 dark:bg-white/10',
                lobbyCountForSpace(space.id) === 0 ? 'invisible' : '',
              ]"
              aria-hidden="true"
            >{{ lobbyCountForSpace(space.id) }}</span>

            <!-- Left: enter button -->
            <button
              type="button"
              class="min-w-0 flex-1 text-left moh-focus py-0.5"
              :aria-label="`Enter ${space.name}`"
              @click="onEnterSpace(space)"
            >
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
            </button>

            <!-- Middle: avatar stack (selected space) or count pill -->
            <div class="shrink-0 flex items-center gap-2">
              <!-- Avatar stack — only for the selected space (we have member data) -->
              <TransitionGroup
                v-if="selectedSpaceId === space.id && lobbyMembers.length > 0"
                name="moh-space-stack"
                tag="div"
                class="flex items-center -space-x-2"
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
                      size-class="h-7 w-7"
                      bg-class="moh-surface dark:bg-black"
                      :show-presence="false"
                    />
                    <Transition name="moh-avatar-pause-fade">
                      <div
                        v-if="u.paused || u.muted"
                        class="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-black/70 flex items-center justify-center ring-1 ring-white/20"
                        aria-hidden="true"
                      >
                        <Icon :name="u.paused ? 'tabler:player-pause' : 'tabler:volume-off'" class="text-[8px] text-white" />
                      </div>
                    </Transition>
                  </NuxtLink>
                  <div v-else class="relative" v-tooltip.top="tinyTooltip('User')">
                    <AppUserAvatar
                      :user="{ id: u.id, username: u.username, avatarUrl: u.avatarUrl }"
                      size-class="h-7 w-7"
                      bg-class="moh-surface dark:bg-black"
                      :show-presence="false"
                    />
                  </div>
                </template>
              </TransitionGroup>

              <!-- Overflow count / raw count for non-selected spaces -->
              <span
                v-if="selectedSpaceId === space.id && lobbyOverflow > 0"
                class="text-[11px] font-semibold tabular-nums moh-meta"
              >+{{ lobbyOverflow }}</span>
              <span
                v-else-if="selectedSpaceId !== space.id && lobbyCountForSpace(space.id) > 0"
                class="inline-flex items-center gap-1 text-[11px] tabular-nums"
              >
                <Icon name="tabler:users" class="text-[12px] opacity-30" aria-hidden="true" />
                <span class="font-medium text-gray-900 dark:text-white">{{ lobbyCountForSpace(space.id) }}</span>
              </span>
            </div>

            <!-- Right: share + play -->
            <div class="shrink-0 flex items-center gap-0.5">
              <AppPostRowShareMenu
                :can-share="true"
                :tooltip="shareTooltip"
                :items="spaceShareItems(space)"
              />
              <button
                v-if="space.station"
                type="button"
                class="moh-tap moh-focus inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors moh-surface-hover"
                :aria-label="selectedSpaceId === space.id && isPlaying ? 'Pause' : 'Play'"
                @click.stop="onPlaySpace(space)"
              >
                <Icon
                  :name="selectedSpaceId === space.id && isPlaying ? 'tabler:player-pause' : 'tabler:player-play'"
                  class="text-[17px] opacity-90"
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>
        </div>
      </TransitionGroup>

      <!-- Empty state / member footer -->
      <div v-if="loadedOnce" class="moh-gutter-x pt-4">
        <p v-if="!currentSpace" class="moh-meta">
          Pick a space to see who's here. Share a space link to bring others in.
        </p>
        <p v-else-if="members.length === 0" class="moh-meta">
          You're the first in {{ currentSpace.name }} — share the link to invite others.
        </p>
      </div>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { MenuItem } from 'primevue/menuitem'
import type { Space } from '~/types/api'
import { siteConfig } from '~/config/site'
import { SPACE_VISUALIZER_BACKGROUND_OPACITY, primeSpaceAudioContext } from '~/composables/useSpaceAudio'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { useUsersStore } from '~/composables/useUsersStore'
import { useCopyToClipboard } from '~/composables/useCopyToClipboard'

definePageMeta({
  layout: 'app',
  title: 'Spaces',
  hideTopBar: true,
  middleware: ['verified'],
})

usePageSeo({
  title: 'Spaces',
  description: 'Enter spaces to chat and optionally play music.',
  canonicalPath: '/spaces',
  noindex: true,
})

const MAX_LOBBY_AVATARS = 4

const { spaces, loading, loadedOnce, loadSpaces } = useSpaces()
const { selectedSpaceId, currentSpace, members, lobbyCountForSpace, subscribeLobbyCounts, unsubscribeLobbyCounts, select } = useSpaceLobby()
const sortedSpaces = computed(() =>
  [...(spaces.value ?? [])].sort((a, b) => lobbyCountForSpace(b.id) - lobbyCountForSpace(a.id))
)
const { stationId: audioStationId, isPlaying, playSpace, pause } = useSpaceAudio()

const usersStore = useUsersStore()
const toast = useAppToast()
const { copyText: copyToClipboard } = useCopyToClipboard()
type MenuItemWithIcon = MenuItem & { iconName?: string }
const shareTooltip = tinyTooltip('Share')
function spaceShareItems(space: Space): MenuItemWithIcon[] {
  return [
    {
      label: 'Copy link',
      iconName: 'tabler:link',
      command: async () => {
        if (!import.meta.client) return
        const url = `${siteConfig.url}/spaces/${encodeURIComponent(space.id)}`
        try {
          await copyToClipboard(url)
          toast.push({ title: 'Space link copied', tone: 'public', durationMs: 1400 })
        } catch {
          toast.push({ title: 'Copy failed', tone: 'error', durationMs: 1800 })
        }
      },
    },
  ]
}

const lobbyMembers = computed(() => {
  const list = (members.value ?? []) as any[]
  return list.map((u) => (u?.id ? (usersStore.overlay(u) as any) : u)).filter(Boolean)
})

const lobbyStack = computed(() => lobbyMembers.value.slice(0, MAX_LOBBY_AVATARS))
const lobbyOverflow = computed(() => Math.max(0, lobbyMembers.value.length - MAX_LOBBY_AVATARS))

onMounted(() => {
  if (!loadedOnce.value) void loadSpaces()
  void subscribeLobbyCounts()
})

onBeforeUnmount(() => {
  unsubscribeLobbyCounts()
})

function onEnterSpace(space: Space) {
  const isSameSpace = selectedSpaceId.value === space.id
  const wasPlaying = isPlaying.value
  // Prime synchronously — Safari drops user-gesture context after any await,
  // so this must happen before select()'s async chain starts.
  if (!isSameSpace && wasPlaying) primeSpaceAudioContext()
  void select(space.id).then(() => {
    if (!isSameSpace && wasPlaying) {
      void playSpace(space)
    }
    navigateTo(`/spaces/${encodeURIComponent(space.id)}`)
  })
}

function onPlaySpace(space: Space) {
  // Toggle play/pause in place — no navigation.
  // Prime synchronously — Safari drops user-gesture context after any await,
  // so this must happen before select()'s async chain starts.
  primeSpaceAudioContext()
  void select(space.id).then(() => {
    if (isPlaying.value && audioStationId.value === (space.station?.id ?? null)) {
      pause()
    } else {
      void playSpace(space)
    }
  })
}
</script>

