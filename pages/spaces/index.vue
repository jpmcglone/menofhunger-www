<template>
  <AppPageContent bottom="standard">
    <div class="w-full">
      <div class="moh-gutter-x pt-4 pb-3">
        <h1 class="moh-h1">Spaces</h1>
        <p class="mt-1 moh-meta">Enter a space, chat, and optionally play music while you build.</p>
      </div>

      <div class="moh-gutter-x pb-6 space-y-4">
        <section class="moh-card moh-card-matte !rounded-2xl overflow-hidden">
          <div class="px-4 py-3 border-b moh-border-subtle flex items-center justify-between gap-3">
            <div class="moh-h2">Spaces</div>
            <div v-if="loading" class="moh-meta">
              {{ loadedOnce ? 'Refreshing…' : 'Loading…' }}
            </div>
          </div>

          <div v-if="!loadedOnce" class="px-4 py-6 flex items-center gap-2 moh-meta" role="status" aria-live="polite">
            <Icon name="tabler:loader" class="text-[18px] opacity-80 animate-spin" aria-hidden="true" />
            <span>Loading spaces…</span>
          </div>

          <div v-else-if="spaces.length === 0 && !loading" class="px-4 py-4 moh-meta">
            No spaces available.
          </div>

          <div v-else class="p-3">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div
                v-for="space in spaces"
                :key="space.id"
                :class="[
                  'relative rounded-2xl border p-3 flex items-start justify-between gap-3 transition-colors',
                  selectedSpaceId === space.id
                    ? 'border-transparent ring-2 ring-[var(--p-primary-color)] bg-black/5 dark:bg-white/5'
                    : 'border-[var(--moh-border-subtle)] hover:bg-black/5 dark:hover:bg-white/5'
                ]"
              >
                <button
                  type="button"
                  class="min-w-0 flex-1 text-left moh-focus block"
                  :aria-label="`Enter ${space.name}`"
                  @click="onEnterSpace(space)"
                >
                  <div class="font-semibold moh-text leading-snug">
                    {{ space.name }}
                  </div>
                  <div class="mt-0.5 moh-meta tabular-nums">
                    <span :class="lobbyCountForSpace(space.id) > 0 ? 'moh-text' : ''">
                      {{ lobbyCountForSpace(space.id) }}
                    </span>
                    <span> here</span>
                  </div>
                  <div v-if="space.station" class="mt-0.5 moh-meta truncate">
                    Music: {{ space.station.name }}
                  </div>
                  <div v-else class="mt-0.5 moh-meta truncate">
                    No music
                  </div>
                </button>

                <div class="shrink-0 pt-0.5 flex items-center gap-2">
                  <button
                    v-if="space.station"
                    type="button"
                    class="moh-tap moh-focus inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors moh-surface-hover"
                    :aria-label="selectedSpaceId === space.id && isPlaying ? 'Pause' : 'Play'"
                    @click="onPlaySpace(space)"
                  >
                    <Icon
                      :name="selectedSpaceId === space.id && isPlaying ? 'tabler:player-pause' : 'tabler:player-play'"
                      class="text-[18px] opacity-90"
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div class="pt-1">
          <div v-if="currentSpace" class="flex items-center justify-between gap-3 text-sm text-gray-600 dark:text-gray-300">
            <div class="min-w-0 truncate">
              <span class="font-semibold tabular-nums text-gray-900 dark:text-gray-100">{{ members.length }}</span>
              <span> here in </span>
              <span class="font-semibold text-gray-900 dark:text-gray-100">{{ currentSpace.name }}</span>
            </div>
          </div>
          <div v-else class="text-sm text-gray-600 dark:text-gray-300">
            Pick a space to see who’s here.
          </div>

          <div v-if="currentSpace && members.length === 0" class="mt-3 text-sm text-gray-600 dark:text-gray-300">
            No one here yet.
          </div>

          <div v-else-if="currentSpace" class="mt-3 flex flex-wrap gap-3">
            <template v-for="u in lobbyMembers" :key="u.id">
              <NuxtLink
                v-if="u.username"
                :to="`/u/${encodeURIComponent(u.username)}`"
                class="group moh-focus rounded-xl"
                :aria-label="`View @${u.username}`"
                v-tooltip.bottom="tinyTooltip(`@${u.username}`)"
              >
                <div class="relative">
                  <AppUserAvatar
                    :user="{ id: u.id, username: u.username, avatarUrl: u.avatarUrl }"
                    size-class="h-10 w-10"
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
              </NuxtLink>

              <div
                v-else
                class="group rounded-xl"
                v-tooltip.bottom="tinyTooltip('User')"
              >
                <div class="relative">
                  <AppUserAvatar
                    :user="{ id: u.id, username: u.username, avatarUrl: u.avatarUrl }"
                    size-class="h-10 w-10"
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
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { Space } from '~/types/api'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { useUsersStore } from '~/composables/useUsersStore'

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

const { spaces, loading, loadedOnce, loadSpaces } = useSpaces()
const { selectedSpaceId, currentSpace, members, lobbyCountForSpace, subscribeLobbyCounts, unsubscribeLobbyCounts, select } = useSpaceLobby()
const { stationId: audioStationId, isPlaying, playSpace, pause, stop } = useSpaceAudio()
const spaceChatSheetOpen = useState<boolean>('space-chat-sheet-open', () => false)

const usersStore = useUsersStore()
const lobbyMembers = computed(() => {
  const list = (members.value ?? []) as any[]
  return list.map((u) => (u?.id ? (usersStore.overlay(u) as any) : u)).filter(Boolean)
})

onMounted(() => {
  if (!loadedOnce.value) void loadSpaces()
  void subscribeLobbyCounts()
})

onBeforeUnmount(() => {
  unsubscribeLobbyCounts()
})

function onEnterSpace(space: Space) {
  const isSameSpace = selectedSpaceId.value === space.id
  void select(space.id).then(() => {
    // Switching spaces: stop audio so we don't auto-play the new one.
    // Re-entering the already-selected space: leave audio as-is.
    if (!isSameSpace) pause()
    navigateTo(`/spaces/${encodeURIComponent(space.id)}`)
  })
}

function onPlaySpace(space: Space) {
  void select(space.id).then(() => {
    if (isPlaying.value && audioStationId.value && audioStationId.value === (space.station?.id ?? null)) {
      pause()
    } else {
      void playSpace(space)
    }
    navigateTo(`/spaces/${encodeURIComponent(space.id)}`)
  })
}
</script>

