<template>
  <AppPageContent bottom="standard">
    <div class="w-full">
      <div v-if="!space" class="moh-gutter-x py-8">
        <div v-if="loading" class="flex items-center gap-2 moh-meta">
          <Icon name="tabler:loader" class="text-[18px] opacity-80 animate-spin" aria-hidden="true" />
          <span>Loading space…</span>
        </div>
        <div v-else class="moh-meta">
          <p>Space not found.</p>
          <NuxtLink to="/spaces" class="mt-2 inline-flex font-semibold text-[var(--p-primary-color)] hover:underline">
            Back to Spaces
          </NuxtLink>
        </div>
      </div>

      <template v-else>
        <div class="moh-gutter-x pt-4 pb-3 flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h1 class="moh-h1">{{ space.name }}</h1>
            <p class="mt-1 moh-meta">Live chat and music in the bar below. Share this link to bring others here.</p>
          </div>
          <button
            type="button"
            class="moh-tap moh-focus shrink-0 mt-1 inline-flex items-center gap-1.5 rounded-full border moh-border-subtle px-3 py-1.5 text-xs font-medium moh-meta moh-surface-hover transition-colors"
            aria-label="Leave space"
            @click="onLeave"
          >
            <Icon name="tabler:door-exit" class="text-[14px]" aria-hidden="true" />
            Leave
          </button>
        </div>

        <div class="moh-gutter-x pb-6 pt-1">
          <div class="flex items-center justify-between gap-3 text-sm text-gray-600 dark:text-gray-300">
            <div class="min-w-0 truncate">
              <span class="font-semibold tabular-nums text-gray-900 dark:text-gray-100">{{ members.length }}</span>
              <span> here</span>
            </div>
            <!-- Only shown on mobile; desktop shows chat in the right rail -->
            <button
              type="button"
              class="min-[962px]:hidden moh-tap moh-focus shrink-0 inline-flex items-center gap-1.5 rounded-full border moh-border-subtle px-3 py-1.5 text-xs font-medium moh-meta moh-surface-hover transition-colors"
              :aria-label="spaceChatSheetOpen ? 'Close chat' : 'Open chat'"
              @click="spaceChatSheetOpen = !spaceChatSheetOpen"
            >
              <Icon name="tabler:messages" class="text-[14px]" aria-hidden="true" />
              Chat
            </button>
          </div>

          <div v-if="currentSpace && members.length === 0" class="mt-3 text-sm text-gray-600 dark:text-gray-300">
            No one here yet. You’re the first.
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
      </template>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { Space } from '~/types/api'
import { tinyTooltip } from '~/utils/tiny-tooltip'

const route = useRoute()
const id = computed(() => (route.params.id as string)?.trim() ?? '')

const { apiFetchData } = useApiClient()
const { spaces, loading, loadedOnce, loadSpaces, hydrateSpaces, getById } = useSpaces()
const { selectedSpaceId, select, leave, currentSpace, members, subscribeLobbyCounts, unsubscribeLobbyCounts } = useSpaceLobby()
const { stop } = useSpaceAudio()
const spaceChatSheetOpen = useState<boolean>('space-chat-sheet-open', () => false)

// Fetch spaces for this page. Reuses existing client state when available (avoids refetch on
// client-side nav from /spaces). Falls back to API when state is empty (direct link, hard refresh).
const { data: spacesPayload } = await useAsyncData<Space[]>(
  'spaces-detail',
  async () => {
    if (loadedOnce.value && spaces.value.length > 0) return [...spaces.value]
    return apiFetchData<Space[]>('/spaces', { method: 'GET' })
  },
)

if (spacesPayload.value) hydrateSpaces(spacesPayload.value)

// SSR 404: if the route id isn't in the space list, return a proper 404 before rendering.
if (import.meta.server && id.value && spacesPayload.value) {
  if (!spacesPayload.value.some((s) => s.id === id.value)) {
    throw createError({ statusCode: 404, statusMessage: 'Space not found' })
  }
}

const space = computed(() => (id.value ? getById(id.value) : null))
const lobbyMembers = computed(() => members.value ?? [])

function onLeave() {
  spaceChatSheetOpen.value = false
  navigateTo('/spaces').then(() => {
    stop()
    leave()
  })
}

// Select the space. Called on initial mount and when navigating between spaces.
// Does not touch audio — play button in the card handles playback; link entry stays silent.
async function enterThisSpace(spaceId: string) {
  const spaceObj = getById(spaceId)
  if (!spaceObj) return
  await select(spaceId)
}

onMounted(async () => {
  // Fallback: if SSR fetch failed or this is an isolated navigation, ensure spaces are loaded.
  if (!loadedOnce.value) await loadSpaces()

  const spaceId = id.value
  if (spaceId && selectedSpaceId.value !== spaceId) {
    await enterThisSpace(spaceId)
  }

  await subscribeLobbyCounts()
  useNuxtApp().callHook('page:loading:end')
  useLoadingIndicator().finish({ force: true })
})

// Re-enter when navigating between two spaces (component is reused by Nuxt).
watch(id, async (newId) => {
  if (!import.meta.client || !newId) return
  await enterThisSpace(newId)
})

// Client 404 fallback: redirect to /spaces if the id resolves to nothing after load.
watch([id, space, loadedOnce], ([sid, s, loaded]) => {
  if (!import.meta.client || !loaded) return
  if (sid && !s) navigateTo('/spaces')
}, { immediate: true })

onBeforeUnmount(() => {
  unsubscribeLobbyCounts()
})

definePageMeta({
  layout: 'app',
  title: 'Spaces',
  hideTopBar: true,
  middleware: ['verified'],
})

usePageSeo({
  title: computed(() => (space.value?.name ? `${space.value.name} · Spaces` : 'Spaces')),
  description: computed(() =>
    space.value
      ? `Join ${space.value.name} — live chat and music.`
      : 'Enter spaces to chat and optionally play music.',
  ),
  canonicalPath: computed(() => (id.value ? `/spaces/${encodeURIComponent(id.value)}` : '/spaces')),
  noindex: true,
})
</script>
