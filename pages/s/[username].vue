<template>
  <AppPageContent bottom="standard" class="h-full">
    <div class="w-full flex flex-col h-full">
      <div v-if="!space" class="moh-gutter-x py-8">
        <div v-if="spaceLoading" class="flex items-center gap-2 moh-meta">
          <Icon name="tabler:loader" class="text-[18px] opacity-80 animate-spin" aria-hidden="true" />
          <span>Loading space…</span>
        </div>
        <div v-else class="moh-meta">
          <p>Space not found or is currently offline.</p>
          <NuxtLink to="/spaces" class="mt-2 inline-flex font-semibold text-[var(--p-primary-color)] hover:underline">
            Back to Spaces
          </NuxtLink>
        </div>
      </div>

      <template v-else>
        <div class="moh-gutter-x pt-4 pb-3 flex items-start justify-between gap-3 shrink-0">
          <div class="min-w-0">
            <h1 class="moh-h1">{{ space.title }}</h1>
            <p v-if="space.description" class="mt-1 moh-meta">{{ space.description }}</p>
            <p v-else class="mt-1 moh-meta">
              Hosted by @{{ space.owner?.username ?? 'unknown' }}
            </p>
          </div>
          <div v-if="canJoinSpace" class="shrink-0 mt-1 flex items-center gap-2">
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

        <!-- Gate: logged-out or unverified users see a CTA instead of interactive content -->
        <div v-if="!canJoinSpace" class="moh-gutter-x flex-1 flex items-center justify-center min-h-[40vh]">
          <div class="text-center max-w-sm">
            <Icon name="tabler:lock" class="text-[48px] opacity-20 mx-auto" aria-hidden="true" />
            <p class="mt-3 text-lg font-semibold moh-text">This space requires a verified account</p>
            <p class="mt-1 text-sm moh-meta">
              {{ isAuthed ? 'Upgrade to Verified or Premium to join spaces.' : 'Log in or create an account to join.' }}
            </p>
            <NuxtLink
              :to="isAuthed ? '/tiers' : `/login?redirect=${encodeURIComponent(route.fullPath)}`"
              class="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--p-primary-color)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              <Icon :name="isAuthed ? 'tabler:star' : 'tabler:login'" class="text-[16px]" aria-hidden="true" />
              {{ isAuthed ? 'View tiers' : 'Log in' }}
            </NuxtLink>
          </div>
        </div>

        <template v-else>
          <!-- Owner controls -->
          <SpaceOwnerPanel
            v-if="isOwner"
            :space="space"
            class="moh-gutter-x pb-3"
            @space-updated="(s) => { space = s; upsertSpace(s) }"
          />

          <!-- Canvas area -->
          <div class="moh-gutter-x flex-1 min-h-0 pb-3 min-h-[40vh]">
            <!-- Watch Party mode: YouTube player -->
            <SpaceYouTubePlayer
              v-if="space.mode === 'WATCH_PARTY' && space.watchPartyUrl"
              :space="space"
              class="w-full h-full"
            />
            <!-- Radio mode: audio visualizer -->
            <AppSpaceVisualizer
              v-else-if="space.mode === 'RADIO' && space.radioStreamUrl"
              class="w-full h-full"
            />
            <!-- None mode: blank canvas -->
            <div v-else class="w-full h-full flex items-center justify-center moh-meta">
              <div class="text-center">
                <Icon name="tabler:campfire" class="text-[48px] opacity-20" aria-hidden="true" />
                <p class="mt-2 opacity-50 text-sm">Space is idle</p>
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

            <div v-if="space && members.length === 0" class="mt-3 text-sm text-gray-600 dark:text-gray-300">
              You're the first — share the link to invite others.
            </div>

            <div v-else-if="space" class="mt-2 flex flex-wrap gap-3 py-1">
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
                        v-if="space.mode === 'RADIO' && (u.paused || u.muted)"
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
                  </div>
                </div>
              </template>
            </div>

            <div v-if="space" class="mt-4 flex flex-wrap items-center gap-1.5">
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
      </template>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { MenuItem } from 'primevue/menuitem'
import type { Space, SpaceModeChanged, SpaceReactionEvent } from '~/types/api'
import { siteConfig } from '~/config/site'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { registerAvatarPositionResolver } from '~/composables/useSpaceReactions'
import { useCopyToClipboard } from '~/composables/useCopyToClipboard'

const route = useRoute()
const username = computed(() => (route.params.username as string)?.trim() ?? '')

const { fetchSpaceByUsername, upsertSpace } = useSpaces()
const { selectedSpaceId, select, leave, currentSpace, members, subscribeLobbyCounts, unsubscribeLobbyCounts } = useSpaceLobby()
const { stop } = useSpaceAudio()
const spaceChatSheetOpen = useState<boolean>('space-chat-sheet-open', () => false)
const { user, ensureLoaded, isVerified, isPremium } = useAuth()
const isAuthed = computed(() => Boolean(user.value?.id))
const canJoinSpace = computed(() => isAuthed.value && (isVerified.value || isPremium.value))
const presence = usePresence()

const { reactions, loadReactions, addFloating, clearAllFloating } = useSpaceReactions()

const spaceLoading = ref(true)
const space = ref<Space | null>(null)

const isOwner = computed(() => Boolean(user.value?.id && space.value?.owner?.id && user.value.id === space.value.owner.id))

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
    if (!payload?.spaceId || payload.spaceId !== space.value?.id) return
    if (payload.userId === user.value?.id) return
    addFloating(payload.userId, payload.emoji, getAvatarPos(payload.userId))
  },
  onModeChanged: (payload: SpaceModeChanged) => {
    if (!payload?.spaceId || payload.spaceId !== space.value?.id) return
    if (space.value) {
      const updated = {
        ...space.value,
        mode: payload.mode,
        watchPartyUrl: payload.watchPartyUrl,
        radioStreamUrl: payload.radioStreamUrl,
      }
      space.value = updated
      upsertSpace(updated)
    }
  },
}

const lobbyMembers = computed(() => members.value ?? [])

const spaceShareUrl = computed(() =>
  username.value ? `${siteConfig.url}/s/${encodeURIComponent(username.value)}` : '',
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
  if (meId) {
    addFloating(meId, emoji, getAvatarPos(meId))
    addFloating(meId, emoji, undefined, undefined, 'bar')
  }
  if (space.value?.id) presence.emitSpacesReaction(space.value.id, reactionId)
}

async function onLeave() {
  spaceChatSheetOpen.value = false
  await navigateTo('/spaces')
  stop()
  leave()
}

async function enterSpace(s: Space) {
  await select(s.id)
}

function addPageCallbacks() {
  presence.removeSpacesCallback(spacesReactionsCb as any)
  presence.addSpacesCallback(spacesReactionsCb as any)
}

function removePageCallbacks() {
  presence.removeSpacesCallback(spacesReactionsCb as any)
}

onMounted(async () => {
  registerAvatarPositionResolver(getAvatarPos)
  await ensureLoaded()

  const s = await fetchSpaceByUsername(username.value)
  spaceLoading.value = false
  if (!s) return
  space.value = s
  upsertSpace(s)

  if (!canJoinSpace.value) {
    useNuxtApp().callHook('page:loading:end')
    useLoadingIndicator().finish({ force: true })
    return
  }

  void loadReactions()
  await enterSpace(s)
  if (s.mode === 'WATCH_PARTY' && s.watchPartyUrl && !isOwner.value) {
    const { requestCurrentState } = useWatchParty()
    requestCurrentState(s.id)
  }
  addPageCallbacks()
  await subscribeLobbyCounts()
  useNuxtApp().callHook('page:loading:end')
  useLoadingIndicator().finish({ force: true })
})

// KeepAlive lifecycle: restore state when the user navigates back to this page.
onActivated(async () => {
  registerAvatarPositionResolver(getAvatarPos)
  // If the user explicitly left the space (selectedSpaceId is null) and navigated
  // back, re-enter the space so the socket room and lobby are restored.
  if (space.value && selectedSpaceId.value !== space.value.id) {
    await enterSpace(space.value)
    if (space.value.mode === 'WATCH_PARTY') {
      const { requestCurrentState } = useWatchParty()
      requestCurrentState(space.value.id)
    }
  }
  addPageCallbacks()
  void subscribeLobbyCounts()
})

// KeepAlive lifecycle: clean up callbacks when the user navigates away.
// The page (and its YouTube player) stays alive, so audio continues.
onDeactivated(() => {
  removePageCallbacks()
  registerAvatarPositionResolver(null)
  unsubscribeLobbyCounts()
})

// Final cleanup when the page is actually destroyed (evicted from the keepalive
// cache, e.g. when the user navigates to a different space).
onBeforeUnmount(() => {
  removePageCallbacks()
  registerAvatarPositionResolver(null)
  unsubscribeLobbyCounts()
})

watch(username, async (newUsername) => {
  if (!import.meta.client || !newUsername) return
  clearAllFloating()
  spaceLoading.value = true
  const s = await fetchSpaceByUsername(newUsername)
  spaceLoading.value = false
  if (!s) {
    space.value = null
    return
  }
  space.value = s
  upsertSpace(s)
  await enterSpace(s)
})

definePageMeta({
  layout: 'app',
  title: 'Space',
  hideTopBar: true,
  keepalive: { max: 1 },
})

const spaceMode = computed(() => {
  if (!space.value) return ''
  if (space.value.mode === 'WATCH_PARTY') return ' Watch party in progress.'
  if (space.value.mode === 'RADIO') return ' Radio playing live.'
  return ''
})

usePageSeo({
  title: computed(() => {
    if (!space.value) return 'Space'
    const host = space.value.owner?.username ? `@${space.value.owner.username}` : ''
    return host ? `${space.value.title} by ${host}` : space.value.title
  }),
  description: computed(() => {
    if (!space.value) return 'Join a live space on Men of Hunger — chat, watch parties, and radio with other men.'
    const desc = space.value.description
      ? `${space.value.description}`
      : `Join ${space.value.title} — a live space hosted by @${space.value.owner?.username ?? 'unknown'} on Men of Hunger.`
    return `${desc}${spaceMode.value} Verified members can join and chat live.`
  }),
  canonicalPath: computed(() => (username.value ? `/s/${encodeURIComponent(username.value)}` : '/spaces')),
  ogType: 'website',
  jsonLdGraph: computed(() => {
    if (!space.value) return []
    const s = space.value
    return [{
      '@type': 'Event',
      name: s.title,
      description: s.description || `Live space hosted by @${s.owner?.username ?? 'unknown'}`,
      eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
      eventStatus: s.isActive ? 'https://schema.org/EventScheduled' : 'https://schema.org/EventPostponed',
      location: {
        '@type': 'VirtualLocation',
        url: `${siteConfig.url}/s/${encodeURIComponent(username.value)}`,
      },
      organizer: {
        '@type': 'Person',
        name: s.owner?.username ? `@${s.owner.username}` : 'Unknown',
        url: s.owner?.username ? `${siteConfig.url}/u/${encodeURIComponent(s.owner.username)}` : undefined,
      },
      isAccessibleForFree: true,
    }]
  }),
})
</script>
