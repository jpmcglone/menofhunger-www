<template>
  <AppPageContent bottom="standard" class="h-full">
    <div class="w-full flex flex-col h-full">
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
        <div class="moh-gutter-x pt-4 pb-3 flex items-start justify-between gap-3 shrink-0">
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

        <!-- Canvas area -->
        <div class="moh-gutter-x flex-1 min-h-0 pb-3">
          <div class="w-full h-full min-h-[40vh] rounded-xl border-2 border-dashed border-gray-300 dark:border-zinc-600 bg-gray-50/50 dark:bg-zinc-900/50 flex items-center justify-center">
            <div class="text-center moh-meta opacity-50 select-none px-4">
              <Icon name="tabler:video" class="text-3xl mb-2 block mx-auto" aria-hidden="true" />
              <p class="text-sm">Canvas</p>
              <p class="text-xs mt-1">Videos and content coming soon</p>
            </div>
          </div>
        </div>

        <!-- Users + reactions -->
        <div class="moh-gutter-x pb-4 pt-2 shrink-0 border-t moh-border">
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

          <div v-else-if="currentSpace" class="mt-2 flex flex-wrap gap-3 max-h-[8rem] overflow-y-auto">
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
                  <TransitionGroup name="moh-reaction-float">
                    <span
                      v-for="r in getFloating(u.id)"
                      :key="r.key"
                      class="moh-reaction-float absolute inset-0 flex items-center justify-center text-2xl font-bold pointer-events-none select-none"
                      :style="r.color ? { color: r.color } : undefined"
                      aria-hidden="true"
                    >{{ r.emoji }}</span>
                  </TransitionGroup>
                  <Transition name="moh-avatar-pause-fade">
                    <div
                      v-if="u.paused || u.muted"
                      class="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-black/70 flex items-center justify-center ring-1 ring-white/20"
                      aria-hidden="true"
                    >
                      <Icon
                        :name="u.paused ? 'tabler:player-pause' : 'tabler:volume-off'"
                        class="text-[13px] text-white"
                        aria-hidden="true"
                      />
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
                  <TransitionGroup name="moh-reaction-float">
                    <span
                      v-for="r in getFloating(u.id)"
                      :key="r.key"
                      class="moh-reaction-float absolute inset-0 flex items-center justify-center text-2xl font-bold pointer-events-none select-none"
                      :style="r.color ? { color: r.color } : undefined"
                      aria-hidden="true"
                    >{{ r.emoji }}</span>
                  </TransitionGroup>
                  <Transition name="moh-avatar-pause-fade">
                    <div
                      v-if="u.paused || u.muted"
                      class="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-black/70 flex items-center justify-center ring-1 ring-white/20"
                      aria-hidden="true"
                    >
                      <Icon
                        :name="u.paused ? 'tabler:player-pause' : 'tabler:volume-off'"
                        class="text-[13px] text-white"
                        aria-hidden="true"
                      />
                    </div>
                  </Transition>
                </div>
              </div>
            </template>
          </div>

          <div v-if="currentSpace" class="mt-4 flex flex-wrap items-center gap-1.5">
            <button
              v-for="r in reactions"
              :key="r.id"
              type="button"
              class="moh-tap moh-focus rounded-lg p-2 text-xl leading-none transition-transform active:scale-90 moh-surface-hover"
              :aria-label="r.label"
              @click="onReactionClick(r.id, r.emoji)"
            >
              {{ r.emoji }}
            </button>
          </div>
        </div>
      </template>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { Space, SpaceReactionEvent } from '~/types/api'
import { tinyTooltip } from '~/utils/tiny-tooltip'

const route = useRoute()
const id = computed(() => (route.params.id as string)?.trim() ?? '')

const { apiFetchData } = useApiClient()
const { spaces, loading, loadedOnce, loadSpaces, hydrateSpaces, getById } = useSpaces()
const { selectedSpaceId, select, leave, currentSpace, members, subscribeLobbyCounts, unsubscribeLobbyCounts } = useSpaceLobby()
const { stop } = useSpaceAudio()
const spaceChatSheetOpen = useState<boolean>('space-chat-sheet-open', () => false)
const { user, ensureLoaded } = useAuth()
const presence = usePresence()

const { reactions, loadReactions, addFloating, getFloating, clearAllFloating } = useSpaceReactions()

const spacesReactionsCb = {
  onReaction: (payload: SpaceReactionEvent) => {
    if (!payload?.spaceId || payload.spaceId !== id.value) return
    addFloating(payload.userId, payload.emoji)
  },
}

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

function onReactionClick(reactionId: string, emoji: string) {
  const meId = user.value?.id ?? null
  if (meId) addFloating(meId, emoji)
  presence.emitSpacesReaction(id.value, reactionId)
}

async function onLeave() {
  spaceChatSheetOpen.value = false
  await navigateTo('/spaces')
  stop()
  leave()
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
  await ensureLoaded()
  void loadReactions()

  const spaceId = id.value
  if (spaceId && selectedSpaceId.value !== spaceId) {
    await enterThisSpace(spaceId)
  }
  presence.addSpacesCallback(spacesReactionsCb as any)

  await subscribeLobbyCounts()
  useNuxtApp().callHook('page:loading:end')
  useLoadingIndicator().finish({ force: true })
})

onBeforeUnmount(() => {
  presence.removeSpacesCallback(spacesReactionsCb as any)
})

// Re-enter when navigating between two spaces (component is reused by Nuxt).
watch(id, async (newId) => {
  if (!import.meta.client || !newId) return
  clearAllFloating()
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
