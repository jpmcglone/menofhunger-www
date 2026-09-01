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
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="moh-h1">{{ displayTitle }}</h1>
              <AppSpaceStatusBadge :kind="spaceStatusKind" size="md" class="!text-[10px] !px-2" />
            </div>
            <p v-if="displaySubtitle" class="mt-1 moh-meta">{{ displaySubtitle }}</p>
            <p v-if="space.description" class="mt-1 moh-meta">{{ space.description }}</p>
            <p v-if="spaceScheduleLabel && !space.isActive" class="mt-1 moh-meta">
              <template v-if="isOwner">Scheduled {{ spaceScheduleLabel }}</template>
              <template v-else>Hosted by @{{ space.owner?.username ?? 'unknown' }} · {{ spaceScheduleLabel }}</template>
            </p>
            <p v-else-if="!isOwner" class="mt-1 moh-meta">
              Hosted by @{{ space.owner?.username ?? 'unknown' }}
            </p>
          </div>
          <div class="shrink-0 mt-1 flex items-center gap-2">
            <AppSpaceNotifyCount
              v-if="showHostReminders"
              :count="hostNotifyCount"
            />
            <button
              v-else-if="showSpaceNotifyMe"
              type="button"
              class="moh-tap moh-focus inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
              :class="space.viewerSubscribed
                ? 'bg-[var(--p-primary-color)]/15 text-[var(--p-primary-color)]'
                : 'border moh-border-subtle moh-meta moh-surface-hover'"
              :disabled="spaceNotifyBusy"
              :aria-label="space.viewerSubscribed ? 'Stop notifications' : 'Notify me'"
              @click="onToggleSpaceNotify"
            >
              {{ space.viewerSubscribed ? 'Notifying' : 'Notify me' }}
            </button>
            <template v-if="canJoinSpace">
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
            </template>
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
            <Button
              as="NuxtLink"
              :to="isAuthed ? '/tiers' : `/login?redirect=${encodeURIComponent(route.fullPath)}`"
              :label="isAuthed ? 'View tiers' : 'Log in'"
              rounded
              class="mt-4"
            >
              <template #icon>
                <Icon :name="isAuthed ? 'tabler:star' : 'tabler:login'" aria-hidden="true" />
              </template>
            </Button>
          </div>
        </div>

        <template v-else>
          <!-- Owner controls -->
          <div v-if="isOwner" class="moh-gutter-x pb-2">
            <SpaceOwnerPanel
              :space="space"
              @space-updated="(s) => { space = s; upsertSpace(s) }"
            />
          </div>

          <!-- Watch party hugs the 16:9 player. Radio / idle still fill. -->
          <div
            class="moh-gutter-x flex items-start justify-center"
            :class="space?.mode === 'WATCH_PARTY' && space?.watchPartyUrl
              ? 'shrink-0 pb-2'
              : 'flex-1 min-h-0 pb-3 min-h-[40vh]'"
          >
            <!-- Watch Party mode: YouTube player.
                 ClientOnly prevents hydration mismatches — the server never renders
                 this component (spaceReady=false), so Vue must not try to hydrate it
                 when Suspense resolves and onMounted fires during the hydration phase.
                 spaceReady gates the inner v-if until after emitSpacesJoin so the
                 player's onMounted requestCurrentState fires while we're already in
                 the socket room. -->
            <template v-if="space?.mode === 'WATCH_PARTY' && space?.watchPartyUrl">
              <div class="relative w-full max-h-full aspect-video">
                <ClientOnly>
                  <SpaceYouTubePlayer
                    :space="space"
                    :room-ready="spaceReady"
                    class="absolute inset-0 w-full h-full"
                  />
                </ClientOnly>
              </div>
            </template>
            <!-- Watch party with no video yet -->
            <div
              v-else-if="space.mode === 'WATCH_PARTY'"
              class="flex w-full h-full min-h-[12rem] items-center justify-center rounded-xl moh-surface"
              role="status"
            >
              <div class="px-4 text-center">
                <Icon name="tabler:device-tv" class="text-[48px] moh-meta" aria-hidden="true" />
                <p class="mt-3 text-sm moh-text">No video set yet</p>
              </div>
            </div>
            <!-- Radio mode: audio visualizer -->
            <AppSpaceVisualizer
              v-else-if="space.mode === 'RADIO' && space.radioStreamUrl"
              class="w-full h-full"
            />
            <!-- None mode: calm idle hearth -->
            <AppSpaceIdleAmbiance v-else class="w-full h-full" />
          </div>

          <!-- Reactions + who is here -->
          <div class="moh-gutter-x pb-4 pt-2 shrink-0 border-t moh-border">
            <div class="flex items-start justify-between gap-3">
              <div v-if="space" class="flex min-w-0 flex-wrap items-center gap-1.5">
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

            <div class="mt-4 text-sm text-gray-600 dark:text-gray-300">
              <span class="font-semibold tabular-nums text-gray-900 dark:text-gray-100">{{ members.length }}</span>
              <span> here</span>
            </div>

            <div v-if="isAloneHere" class="mt-3 text-sm text-gray-600 dark:text-gray-300">
              You're the first — share the link to invite others.
            </div>

            <div
              v-else-if="space && members.length"
              class="mt-2 -mx-4 max-h-52 overflow-y-auto overscroll-contain px-4 py-4"
            >
              <div class="grid grid-cols-[repeat(auto-fill,3.25rem)] justify-items-center gap-2">
              <template v-for="u in lobbyMembers" :key="u.id">
                <NuxtLink
                  v-if="u.username"
                  :to="`/u/${encodeURIComponent(u.username)}`"
                  class="group moh-focus flex h-[3.25rem] w-[3.25rem] items-center justify-center"
                  :aria-label="`View @${u.username}`"
                  v-tooltip.bottom="tinyTooltip(`@${u.username}`)"
                >
                  <div :ref="(el) => setAvatarEl(u.id, el as HTMLElement | null)" class="relative">
                    <AppUserAvatar
                      :user="u"
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
                  class="group flex h-[3.25rem] w-[3.25rem] items-center justify-center"
                  v-tooltip.bottom="tinyTooltip('User')"
                >
                  <div :ref="(el) => setAvatarEl(u.id, el as HTMLElement | null)" class="relative">
                    <AppUserAvatar
                      :user="u"
                      size-class="h-10 w-10"
                      bg-class="moh-surface dark:bg-black"
                      :show-presence="false"
                    />
                  </div>
                </div>
              </template>
              </div>
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
import { spaceStatusKind as resolveSpaceStatusKind } from '~/utils/space-display'

const route = useRoute()
const username = computed(() => (route.params.username as string)?.trim() ?? '')

const { fetchSpaceByUsername, upsertSpace, getById, getByOwnerUsername } = useSpaces()
const { selectedSpaceId, select, leave, currentSpace, members } = useSpaceLobby()
const { requestCurrentState } = useWatchParty()
const { stop } = useSpaceAudio()
const { subscribeToSchedule, unsubscribeFromSchedule } = useSpaceOwner()
const { confirm } = useAppConfirm()
const { capture } = usePostHog()
const viewedSpaceId = ref<string | null>(null)
const spaceChatSheetOpen = useState<boolean>('space-chat-sheet-open', () => false)
const { user, ensureLoaded, isVerified, isPremium } = useAuth()
const isAuthed = computed(() => Boolean(user.value?.id))
const canJoinSpace = computed(() => isAuthed.value && (isVerified.value || isPremium.value))
const presence = usePresence()

const { reactions, loadReactions, addFloating, clearAllFloating } = useSpaceReactions()

const spaceLoading = ref(true)
const space = ref<Space | null>(null)
const displayTitle = useSpaceDisplayTitle(space)
const displaySubtitle = useSpaceDisplaySubtitle(space)
const spaceNotifyBusy = ref(false)
/** True after enterSpace() — the socket room join has been requested. */
const spaceReady = ref(false)

function trackSpaceViewed(s: Space) {
  if (viewedSpaceId.value === s.id) return
  viewedSpaceId.value = s.id
  capture('space_viewed', {
    space_id: s.id,
    mode: s.mode,
    is_active: s.isActive,
    is_owner: isOwner.value,
    can_join: canJoinSpace.value,
    has_schedule: Boolean(s.scheduledAt),
  })
}

function spacesLog(...args: unknown[]) {
  if (!import.meta.client || !import.meta.dev) return
  console.info('[spaces/page]', ...args)
}

// Lightweight SSR fetch for metadata only — gives bots/crawlers real og:title,
// og:description, and JSON-LD Event. We deliberately do NOT seed space.value
// from this so the interactive template (SpaceYouTubePlayer etc.) stays unmounted
// until onMounted runs and the socket is ready, preserving sync timing.
const { data: ssrSpace } = await useAsyncData(
  `space-${username.value}`,
  () => fetchSpaceByUsername(username.value),
  { server: true },
)

// Used only by usePageSeo below — falls back from the live ref to the SSR
// snapshot so bots get rich metadata even before onMounted runs.
const seoSpace = computed(() => space.value ?? ssrSpace.value)

const isOwner = computed(() => Boolean(user.value?.id && space.value?.owner?.id && user.value.id === space.value.owner.id))

const spaceScheduleLabel = computed(() => {
  const iso = space.value?.scheduledAt
  if (!iso || space.value?.isActive) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime()) || d.getTime() <= Date.now()) return null
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d)
})

const spaceStatusKind = computed(() => {
  if (!space.value) return 'idle'
  return resolveSpaceStatusKind(space.value)
})

const showHostReminders = computed(() => isOwner.value && spaceStatusKind.value === 'scheduled')

const hostNotifyCount = computed(() => Math.max(0, Number(space.value?.subscriberCount) || 0))

const showSpaceNotifyMe = computed(() => {
  if (!space.value) return false
  if (isOwner.value) return false
  return spaceStatusKind.value === 'scheduled'
})

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
  onUpdated: (payload: import('~/types/api').WsSpacesUpdatedPayload) => {
    if (!payload?.spaceId || payload.spaceId !== space.value?.id) return
    if (!space.value || !payload.patch) return
    if (payload.patch.deleted) {
      space.value = null
      return
    }
    const wasInactive = !space.value.isActive
    const { deleted: _deleted, ...rest } = payload.patch
    const updated = { ...space.value, ...rest }
    space.value = updated
    upsertSpace(updated)
    // Non-owner join is a silent no-op while inactive. Re-join now that we're live
    // so members, watch-party sync, and room events start flowing without a refresh.
    if (wasInactive && updated.isActive && canJoinSpace.value) {
      void joinNowThatLive(updated)
    }
  },
}

const lobbyMembers = computed(() => members.value ?? [])

/** Empty lobby after a silent join looks like “you're first.” Only say that when we actually joined a live room and we're the only member. */
const isAloneHere = computed(() => {
  if (!space.value?.isActive) return false
  const list = members.value ?? []
  if (list.length !== 1) return false
  return list[0]?.id === user.value?.id
})

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
  }
  if (space.value?.id) presence.emitSpacesReaction(space.value.id, reactionId)
}

async function onLeave() {
  spaceChatSheetOpen.value = false
  await navigateTo('/spaces')
  stop()
  leave()
}

async function onToggleSpaceNotify() {
  if (!space.value || spaceNotifyBusy.value) return
  if (!user.value?.id) {
    await navigateTo(`/login?redirect=${encodeURIComponent(route.fullPath)}`)
    return
  }
  if (space.value.viewerSubscribed) {
    const ok = await confirm({
      header: 'Stop notifications?',
      message: 'You will no longer get reminders when this space is about to go live.',
      confirmLabel: 'Stop notifying',
      confirmSeverity: 'danger',
      cancelLabel: 'Keep notifying',
    })
    if (!ok) return
  }
  spaceNotifyBusy.value = true
  try {
    const updated = space.value.viewerSubscribed
      ? await unsubscribeFromSchedule(space.value.id)
      : await subscribeToSchedule(space.value.id)
    if (updated) {
      space.value = updated
      upsertSpace(updated)
      toast.push({
        title: updated.viewerSubscribed ? 'You will be notified' : 'Notifications off',
        tone: 'public',
        durationMs: 1400,
      })
    }
  } finally {
    spaceNotifyBusy.value = false
  }
}

async function enterSpace(s: Space) {
  await select(s.id)
}

function markJoined(_s: Space) {
  spaceReady.value = true
}

async function joinNowThatLive(s: Space) {
  spacesLog('go-live:rejoin', { spaceId: s.id, mode: s.mode })
  await enterSpace(s)
  spaceReady.value = true
  if (s.mode === 'WATCH_PARTY') {
    requestCurrentState(s.id)
  }
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

  spacesLog('mount:start', { username: username.value })
  const s = await fetchSpaceByUsername(username.value)
  spaceLoading.value = false
  if (!s) {
    spacesLog('mount:space-not-found', { username: username.value })
    return
  }
  space.value = s
  upsertSpace(s)
  trackSpaceViewed(s)
  spacesLog('mount:space-loaded', {
    id: s.id,
    mode: s.mode,
    hasWatchPartyUrl: Boolean(s.watchPartyUrl),
    isOwner: isOwner.value,
    canJoinSpace: canJoinSpace.value,
  })

  if (!canJoinSpace.value) {
    spacesLog('mount:join-blocked', { reason: 'not-authed-or-not-eligible' })
    useNuxtApp().callHook('page:loading:end')
    useLoadingIndicator().finish({ force: true })
    return
  }

  void loadReactions()
  spacesLog('mount:enter-space:start', { spaceId: s.id })
  await enterSpace(s)
  markJoined(s)
  spacesLog('mount:enter-space:done', { spaceId: s.id, spaceReady: spaceReady.value })
  addPageCallbacks()
  useNuxtApp().callHook('page:loading:end')
  useLoadingIndicator().finish({ force: true })
})

// KeepAlive lifecycle: restore state when the user navigates back to this page.
onActivated(async () => {
  registerAvatarPositionResolver(getAvatarPos)
  const cached =
    (space.value?.id ? getById(space.value.id) : null) ?? getByOwnerUsername(username.value)
  if (cached) {
    space.value = cached
  } else if (username.value) {
    const fresh = await fetchSpaceByUsername(username.value)
    if (fresh) space.value = fresh
  }
  // If the user explicitly left the space (selectedSpaceId is null) and navigated
  // back, re-enter the space so the socket room and lobby are restored.
  if (space.value && selectedSpaceId.value !== space.value.id) {
    await enterSpace(space.value)
    if (space.value.mode === 'WATCH_PARTY') {
      requestCurrentState(space.value.id)
    }
  }
  addPageCallbacks()
})

// KeepAlive lifecycle: clean up callbacks when the user navigates away.
// The page (and its YouTube player) stays alive, so audio continues.
// Lobby counts stay subscribed at the app shell while authed / in a space.
onDeactivated(() => {
  removePageCallbacks()
  registerAvatarPositionResolver(null)
})

// Final cleanup when the page is actually destroyed (evicted from the keepalive
// cache, e.g. when the user navigates to a different space).
onBeforeUnmount(() => {
  removePageCallbacks()
  registerAvatarPositionResolver(null)
})

watch(username, async (newUsername) => {
  if (!import.meta.client || !newUsername) return
  clearAllFloating()
  spaceReady.value = false
  spacesLog('username:changed', { username: newUsername, spaceReady: spaceReady.value })
  spaceLoading.value = true
  const s = await fetchSpaceByUsername(newUsername)
  spaceLoading.value = false
  if (!s) {
    space.value = null
    spacesLog('username:space-not-found', { username: newUsername })
    return
  }
  space.value = s
  upsertSpace(s)
  trackSpaceViewed(s)
  spacesLog('username:space-loaded', {
    id: s.id,
    mode: s.mode,
    hasWatchPartyUrl: Boolean(s.watchPartyUrl),
  })
  spacesLog('username:enter-space:start', { spaceId: s.id })
  await enterSpace(s)
  markJoined(s)
  spacesLog('username:enter-space:done', { spaceId: s.id, spaceReady: spaceReady.value })
})

watch(
  [() => space.value?.mode, () => space.value?.watchPartyUrl, () => spaceReady.value],
  ([mode, watchPartyUrl, ready]) => {
    spacesLog('render-state', {
      mode,
      hasWatchPartyUrl: Boolean(watchPartyUrl),
      spaceReady: ready,
      selectedSpaceId: selectedSpaceId.value,
    })
  },
  { immediate: true },
)

definePageMeta({
  layout: 'app',
  title: 'Space',
  hideTopBar: true,
  keepalive: { max: 1 },
})

const spaceMode = computed(() => {
  if (!seoSpace.value) return ''
  if (seoSpace.value.mode === 'WATCH_PARTY') return ' Watch party in progress.'
  if (seoSpace.value.mode === 'RADIO') return ' Radio playing live.'
  return ''
})

usePageSeo({
  title: computed(() => {
    if (!seoSpace.value) return 'Space'
    const host = seoSpace.value.owner?.username ? `@${seoSpace.value.owner.username}` : ''
    return host ? `${seoSpace.value.title} by ${host}` : seoSpace.value.title
  }),
  description: computed(() => {
    if (!seoSpace.value) return 'Join a live space on Men of Hunger — chat, watch parties, and radio with other men.'
    const desc = seoSpace.value.description
      ? `${seoSpace.value.description}`
      : `Join ${seoSpace.value.title} — a live space hosted by @${seoSpace.value.owner?.username ?? 'unknown'} on Men of Hunger.`
    return `${desc}${spaceMode.value} Verified members can join and chat live.`
  }),
  canonicalPath: computed(() => (username.value ? `/s/${encodeURIComponent(username.value)}` : '/spaces')),
  ogType: 'website',
  jsonLdGraph: computed(() => {
    if (!seoSpace.value) return []
    const s = seoSpace.value
    return [{
      '@type': 'Event',
      name: s.title,
      description: s.description || `Live space hosted by @${s.owner?.username ?? 'unknown'}`,
      eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
      eventStatus: s.isActive
        ? 'https://schema.org/EventScheduled'
        : s.scheduledAt
          ? 'https://schema.org/EventScheduled'
          : 'https://schema.org/EventCancelled',
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
