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
          <div class="shrink-0 mt-1 flex items-center gap-2">
            <AppPostRowShareMenu
              :can-share="true"
              :tooltip="spaceShareTooltip"
              :items="spaceShareMenuItems"
            />
            <button
              type="button"
              class="moh-tap moh-focus inline-flex items-center gap-1.5 rounded-full border moh-border-subtle px-3 py-1.5 text-xs font-medium moh-meta moh-surface-hover transition-colors"
              aria-label="Leave space"
              @click="onLeave"
            >
              <Icon name="tabler:door-exit" class="text-[14px]" aria-hidden="true" />
              Leave
            </button>
          </div>
        </div>

        <!-- Visualizer / canvas area -->
        <div class="moh-gutter-x flex-1 min-h-0 pb-3 min-h-[40vh]">
          <AppSpaceVisualizer class="w-full h-full" />
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
            You're the first — share the link to invite others.
          </div>

          <div v-else-if="currentSpace" class="mt-2 flex flex-wrap gap-3 py-1">
            <template v-for="u in lobbyMembers" :key="u.id">
              <NuxtLink
                v-if="u.username"
                :to="`/u/${encodeURIComponent(u.username)}`"
                class="group moh-focus rounded-xl"
                :aria-label="`View @${u.username}`"
                v-tooltip.bottom="tinyTooltip(`@${u.username}`)"
              >
                <div :ref="(el) => setAvatarEl(u.id, el as HTMLElement | null)" class="relative">
                  <AppUserAvatar
                    :user="{ id: u.id, username: u.username, avatarUrl: u.avatarUrl }"
                    size-class="h-10 w-10"
                    bg-class="moh-surface dark:bg-black"
                    :show-presence="false"
                  />
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
                <div :ref="(el) => setAvatarEl(u.id, el as HTMLElement | null)" class="relative">
                  <AppUserAvatar
                    :user="{ id: u.id, username: u.username, avatarUrl: u.avatarUrl }"
                    size-class="h-10 w-10"
                    bg-class="moh-surface dark:bg-black"
                    :show-presence="false"
                  />
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

    <!-- Fullscreen emoji float overlay — rendered outside any clipping ancestor -->
    <Teleport to="body">
      <div class="fixed inset-0 pointer-events-none overflow-hidden" style="z-index: 9990;" aria-hidden="true">
        <span
          v-for="r in allPositionedFloating"
          :key="r.key"
          class="moh-emoji-float"
          :style="{
            left: `${r.startX}px`,
            top: `${r.startY}px`,
            '--fw-sway': `${r.sway}px`,
            '--fw-om': r.opacityMid,
            ...(r.color ? { color: r.color } : {}),
          }"
        >{{ r.emoji }}</span>
      </div>
    </Teleport>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { MenuItem } from 'primevue/menuitem'
import type { Space, SpaceReactionEvent } from '~/types/api'
import { siteConfig } from '~/config/site'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { registerAvatarPositionResolver } from '~/composables/useSpaceReactions'
import { useCopyToClipboard } from '~/composables/useCopyToClipboard'

const route = useRoute()
const id = computed(() => (route.params.id as string)?.trim() ?? '')

const { apiFetchData } = useApiClient()
const { spaces, loading, loadedOnce, loadSpaces, hydrateSpaces, getById } = useSpaces()
const { selectedSpaceId, select, leave, currentSpace, members, subscribeLobbyCounts, unsubscribeLobbyCounts } = useSpaceLobby()
const { stop } = useSpaceAudio()
const spaceChatSheetOpen = useState<boolean>('space-chat-sheet-open', () => false)
const { user, ensureLoaded } = useAuth()
const presence = usePresence()

const { reactions, loadReactions, addFloating, allPositionedFloating, clearAllFloating } = useSpaceReactions()

// Track avatar wrapper elements by userId so we can read their viewport position.
const avatarElMap = new Map<string, HTMLElement>()
function setAvatarEl(userId: string, el: HTMLElement | null) {
  if (el) avatarElMap.set(userId, el)
  else avatarElMap.delete(userId)
}
function getAvatarPos(userId: string): { x: number; y: number } | undefined {
  if (!import.meta.client) return undefined
  const el = avatarElMap.get(userId)
  if (!el) return undefined
  const rect = el.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

const spacesReactionsCb = {
  onReaction: (payload: SpaceReactionEvent) => {
    if (!payload?.spaceId || payload.spaceId !== id.value) return
    // Own reactions are already added optimistically in onReactionClick — skip the echo.
    if (payload.userId === user.value?.id) return
    addFloating(payload.userId, payload.emoji, getAvatarPos(payload.userId))
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

const spaceShareUrl = computed(() =>
  id.value ? `${siteConfig.url}/spaces/${encodeURIComponent(id.value)}` : '',
)
const toast = useAppToast()
const { copyText: copyToClipboard } = useCopyToClipboard()
type MenuItemWithIcon = MenuItem & { iconName?: string }
const spaceShareTooltip = tinyTooltip('Share')
const spaceShareMenuItems = computed<MenuItemWithIcon[]>(() => [
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

function onReactionClick(reactionId: string, emoji: string) {
  const meId = user.value?.id ?? null
  if (meId) addFloating(meId, emoji, getAvatarPos(meId))
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
  registerAvatarPositionResolver(getAvatarPos)
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
  registerAvatarPositionResolver(null)
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
