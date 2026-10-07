import type { MenuItem } from 'primevue/menuitem'
import type { Space, SpaceModeChanged, SpaceReactionEvent } from '~/types/api'
import { siteConfig } from '~/config/site'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { registerAvatarPositionResolver } from '~/composables/useSpaceReactions'
import { useCopyToClipboard } from '~/composables/useCopyToClipboard'
import { spaceDisplayTitle, spaceStatusKind as resolveSpaceStatusKind } from '~/utils/space-display'
import { computeSpaceSeo } from '~/utils/spaceSeo'
import { WATCH_PLAYER_PINNED_HEIGHT } from '~/utils/watchPartyLayout'

export async function useSpaceUsernamePage() {
const route = useRoute()
const username = computed(() => (route.params.username as string)?.trim() ?? '')

const { fetchSpaceByUsername, upsertSpace, getById, getByOwnerUsername } = useSpaces()
const { selectedSpaceId, select, leave, members } = useSpaceLobby()
const { requestCurrentState } = useWatchParty()
const { stop } = useSpaceAudio()
const { subscribeToSchedule, unsubscribeFromSchedule } = useSpaceOwner()
const { confirm } = useAppConfirm()
const { capture } = usePostHog()
const viewedSpaceId = ref<string | null>(null)
const spaceChatSheetOpen = useState<boolean>('space-chat-sheet-open', () => false)
/** Keep the YouTube iframe on-screen when mobile chat opens — iOS pauses covered players. */
const pinWatchPlayerForChat = computed(() =>
  Boolean(
    spaceChatSheetOpen.value
    && space.value?.mode === 'WATCH_PARTY'
    && space.value?.watchPartyUrl,
  ),
)
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
const ssrSpaceRequest = useAsyncData(
  `space-${username.value}`,
  () => fetchSpaceByUsername(username.value),
  { server: true },
)

// Used only by usePageSeo below — falls back from the live ref to the SSR
// snapshot so bots get rich metadata even before onMounted runs.
const { data: ssrSpace } = ssrSpaceRequest
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

const PRESENCE_STACK_MAX = 8
const presenceStack = computed(() => (members.value ?? []).slice(0, PRESENCE_STACK_MAX))
const presenceOverflowCount = computed(() =>
  Math.max(0, (members.value?.length ?? 0) - presenceStack.value.length),
)

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


const seo = computed(() =>
  computeSpaceSeo(
    seoSpace.value
      ? { ...seoSpace.value, ownerUsername: seoSpace.value.owner?.username ?? null }
      : null,
  ),
)

usePageSeo({
  title: computed(() => seo.value.title),
  description: computed(() => seo.value.description),
  image: computed(() => seo.value.image ?? undefined),
  imageAlt: computed(() => seo.value.imageAlt),
  twitterCard: computed(() => seo.value.twitterCard),
  canonicalPath: computed(() => (username.value ? `/s/${encodeURIComponent(username.value)}` : '/spaces')),
  ogType: 'website',
  jsonLdGraph: computed(() => {
    if (!seoSpace.value) return []
    const s = seoSpace.value
    const name = spaceDisplayTitle(s) || 'Space'
    return [{
      '@type': 'Event',
      name,
      description: seo.value.description,
      ...(seo.value.image ? { image: seo.value.image } : {}),
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
await ssrSpaceRequest
  return {
    setAvatarEl,
    onReactionClick,
    onLeave,
    onToggleSpaceNotify,
    route,
    username,
    spaceChatSheetOpen,
    pinWatchPlayerForChat,
    isAuthed,
    canJoinSpace,
    presence,
    spaceLoading,
    space,
    displayTitle,
    displaySubtitle,
    spaceNotifyBusy,
    spaceReady,
    isOwner,
    spaceScheduleLabel,
    spaceStatusKind,
    showHostReminders,
    hostNotifyCount,
    showSpaceNotifyMe,
    presenceStack,
    presenceOverflowCount,
    spaceShareTooltip,
    spaceShareMenuItems,
    upsertSpace,
    members,
    requestCurrentState,
    user,
    reactions,
  }
}
