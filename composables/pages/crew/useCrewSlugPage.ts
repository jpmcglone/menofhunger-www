import { usePresenceCallback } from '~/composables/presence/usePresenceCallback'
import { formatMonthYear } from '~/utils/time-format'
import type { CrewBySlugViewerMembership, CrewInvite, CrewMemberListItem, CrewPrivate, CrewPublic, FeedPost } from '~/types/api'
import type { CrewMemberActionTarget } from '~/components/app/crew/CrewMemberActionMenu.vue'
import { useLoadMoreObserver } from '~/composables/useLoadMoreObserver'
import { useMiddleScroller } from '~/composables/useMiddleScroller'
import type { CrewCallback, WsCrewWallPayload } from '~/composables/usePresence'
import { getApiErrorMessage } from '~/utils/api-error'
import { crewAvatarRoundClass } from '~/utils/avatar-rounding'
import type { ProfilePostsFilter } from '~/utils/post-visibility'
import type { FeedVisibilityFilter } from '~/composables/useFeedFilters'
import { tinyTooltip } from '~/utils/tiny-tooltip'

export function useCrewSlugPage() {
const crewAvatarRound = crewAvatarRoundClass()


const route = useRoute()

const loading = ref(true)
const notFound = ref(false)
const crew = ref<CrewPublic | null>(null)
const viewerMembership = ref<CrewBySlugViewerMembership | null>(null)
const canonicalSlug = ref<string | null>(null)
// Local override so we can optimistically zero the badge when the viewer clicks
// "Chat" (and bump it on `crew:wall:new` events while they're on the page).
const unreadChatOverride = ref<number | null>(null)

const crewApi = useCrew()
const { user: meUser } = useAuth()
const { markReadBySubject } = useNotifications()

const crewName = computed(() => {
  const n = (crew.value?.name ?? '').trim()
  return n.length > 0 ? n : 'Untitled Crew'
})

const isMember = computed(() => Boolean(viewerMembership.value))
const isOwner = computed(() => viewerMembership.value?.role === 'owner')
// Site admins can edit any crew (mirrors the same affordance on profiles + groups).
// `isAdminOverride` is true when the viewer is admin AND not the owner — the
// Edit button + dialog switch to an admin-styled affordance in that case.
const isViewerAdmin = computed(() => Boolean(meUser.value?.siteAdmin))
const canEditCrew = computed(() => isOwner.value || isViewerAdmin.value)
const isAdminOverride = computed(() => isViewerAdmin.value && !isOwner.value)

const editCrewOpen = ref(false)
const addMemberOpen = ref(false)
const leaving = ref(false)

// Pending invitees (members only). Populated after load() + kept fresh via
// realtime invite events so you don't have to refresh after (un)inviting.
const pendingInvitees = ref<CrewInvite[]>([])

// Add-member dialog: exclude current members + pending invitees
const addMemberExcludeIds = computed<string[]>(() => {
  const ids = new Set<string>()
  for (const m of crew.value?.members ?? []) ids.add(m.user.id)
  for (const inv of pendingInvitees.value) ids.add(inv.invitee.id)
  return [...ids]
})

const toast = useAppToast()
const { run } = useAsyncAction()

const memberMenuOpen = ref(false)
const memberMenuTarget = ref<CrewMemberActionTarget | null>(null)
const memberMenuAnchor = ref<HTMLElement | null>(null)

const removeConfirmOpen = ref(false)
const removingMember = ref(false)
const pendingRemoveUser = ref<{ id: string; name: string } | null>(null)

const removeConfirmHeader = computed(() => {
  const name = pendingRemoveUser.value?.name ?? 'this member'
  return `Remove ${name}?`
})
const removeConfirmMessage = computed(
  () => 'They will lose access to the crew chat and feed. You can invite them back later.',
)

function onMemberClick(payload: { member: CrewMemberListItem; anchorEl: HTMLElement }) {
  memberMenuTarget.value = {
    kind: 'member',
    user: payload.member.user,
    role: payload.member.role,
  }
  memberMenuAnchor.value = payload.anchorEl
  memberMenuOpen.value = true
}

function onPendingClick(payload: { invite: CrewInvite; anchorEl: HTMLElement }) {
  memberMenuTarget.value = {
    kind: 'pendingInvite',
    user: payload.invite.invitee,
    inviteId: payload.invite.id,
  }
  memberMenuAnchor.value = payload.anchorEl
  memberMenuOpen.value = true
}

function onRemoveMemberRequested(userId: string) {
  const m = (crew.value?.members ?? []).find((x) => x.user.id === userId)
  if (!m) return
  pendingRemoveUser.value = {
    id: userId,
    name: m.user.name ?? m.user.username ?? 'this member',
  }
  removeConfirmOpen.value = true
}

async function performRemoveMember() {
  const target = pendingRemoveUser.value
  if (!target) return
  removingMember.value = true
  await run(async () => {
    await crewApi.kickMember(target.id)
    if (crew.value) {
      crew.value = {
        ...crew.value,
        members: crew.value.members.filter((m) => m.user.id !== target.id),
        memberCount: Math.max(0, (crew.value.memberCount ?? 1) - 1),
      }
    }
    toast.push({ title: `Removed ${target.name}`, tone: 'success' })
  }, { error: 'Could not remove that member.' })
  removingMember.value = false
  removeConfirmOpen.value = false
  pendingRemoveUser.value = null
}

async function onCancelInviteRequested(inviteId: string) {
  const invite = pendingInvitees.value.find((i) => i.id === inviteId)
  const name = invite?.invitee.name ?? invite?.invitee.username ?? 'invite'
  pendingInvitees.value = pendingInvitees.value.filter((i) => i.id !== inviteId)
  await run(async () => {
    await crewApi.cancelInvite(inviteId)
    toast.push({ title: `Invite to ${name} withdrawn`, tone: 'success' })
  }, {
    error: 'Could not cancel the invite.',
    rollback: () => {
      if (invite) {
        pendingInvitees.value = [...pendingInvitees.value, invite].sort((a, b) =>
          a.createdAt.localeCompare(b.createdAt),
        )
      }
    },
  })
}

async function refreshPendingInvitees(crewId: string | null) {
  if (!import.meta.client || !crewId) {
    if (pendingInvitees.value.length > 0) pendingInvitees.value = []
    return
  }
  try {
    const all = await crewApi.listOutbox()
    const next = all
      .filter((inv) => inv.status === 'pending' && inv.crew?.id === crewId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    // Only reassign if the list actually changed — keeps Vue from re-keying
    // unchanged child rows and prevents avatar flicker on idempotent refreshes
    // (e.g., right after our own optimistic insert/remove).
    if (!sameInviteIds(pendingInvitees.value, next)) {
      pendingInvitees.value = next
    }
  } catch {
    // Non-fatal — leave existing list alone
  }
}

function sameInviteIds(a: CrewInvite[], b: CrewInvite[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i]?.id !== b[i]?.id) return false
  }
  return true
}

const canAddMember = computed(
  () => isOwner.value && (crew.value?.memberCount ?? 0) < 5,
)

const viewerCrew = useViewerCrew()

const unreadChatCount = computed(() => {
  if (unreadChatOverride.value !== null) return unreadChatOverride.value
  return viewerMembership.value?.unreadChatCount ?? 0
})

// Roster of user IDs to filter the feed by. Stable per slug; recomputed on
// realtime member changes via the `load()` refetch.
const crewMemberAuthorIds = computed<string[]>(() =>
  (crew.value?.members ?? []).map((m) => m.user.id).filter(Boolean),
)

const feedEnabled = computed(() => Boolean(crew.value && crewMemberAuthorIds.value.length > 0))

const {
  sort: feedSort,
  filter: feedFilter,
  viewerIsVerified,
  viewerIsPremium,
  isFiltered,
  resetFilters,
} = useUrlFeedFilters()

const {
  posts,
  displayItems,
  collapsedSiblingReplyCountFor,
  nextCursor,
  loading: feedLoading,
  initialLoading: feedInitialLoading,
  loadingMore,
  error: feedError,
  refresh: feedRefresh,
  loadMore,
  removePost,
  replacePost,
} = usePostsFeed({
  feedStateKey: 'crew-feed',
  cursorFeedStateMode: 'local',
  localInsertsStateKey: 'crew-feed-local-inserts',
  authorIds: crewMemberAuthorIds,
  enabled: feedEnabled,
  visibility: feedFilter,
  followingOnly: ref(false),
  sort: feedSort,
  showAds: ref(false),
})

// FeedFiltersBar emits the wider ProfilePostsFilter (which includes 'onlyMe'),
// but the crew feed only supports the FeedVisibilityFilter set. Coerce 'onlyMe'
// to 'all' so the assignment type-checks and the URL stays in a valid state.
const crewFeedTopEl = ref<HTMLElement | null>(null)
const crewFeedContentEl = ref<HTMLElement | null>(null)
const { scrollToTop: scrollFeedToTop } = useFeedScrollToTop(crewFeedContentEl, crewFeedTopEl)

function onCrewFeedSortChange(next: 'new' | 'trending') {
  feedSort.value = next
  scrollFeedToTop()
}

function onCrewFeedFilterChange(next: ProfilePostsFilter) {
  feedFilter.value = next === 'onlyMe' ? 'all' : (next as FeedVisibilityFilter)
  scrollFeedToTop()
}

function onCrewFeedReset() {
  resetFilters()
  scrollFeedToTop()
}

const seoDescription = computed(
  () => crew.value?.tagline ?? 'A Crew on Men of Hunger — verified men holding each other accountable.',
)
const seoCanonical = computed(() => `/c/${canonicalSlug.value ?? String(route.params.slug)}`)

usePageSeo({
  title: crewName,
  description: seoDescription,
  canonicalPath: seoCanonical,
})

function onEdited(payload: { id: string; post: FeedPost }) {
  replacePost(payload.post)
}

function onOpenChat() {
  // Reading the chat clears its unread count server-side; reflect that locally
  // so the badge disappears immediately instead of waiting for a refetch.
  unreadChatOverride.value = 0
}

// Optimistically reflect dialog edits in the page header. We splice the
// CrewPrivate response into our CrewPublic ref (CrewPrivate extends CrewPublic)
// and update the viewer-specific successor field. A `crew:updated` socket
// event will trigger a full refetch right after, so this is mostly to avoid a
// brief stale-render flash.
function onCrewUpdated(updated: CrewPrivate) {
  crew.value = updated
  if (viewerMembership.value) {
    viewerMembership.value = {
      ...viewerMembership.value,
      designatedSuccessorUserId: updated.designatedSuccessorUserId,
    }
  }
  if (import.meta.client && updated.slug && updated.slug !== String(route.params.slug)) {
    void navigateTo(`/c/${encodeURIComponent(updated.slug)}`, { replace: true })
  }
}

function onMemberInvited(invite: CrewInvite) {
  // Optimistic insert — no full reload (avoids the page-level spinner flash).
  // The realtime crew:invite-received event will fire shortly after; the
  // refresh path is idempotent and will leave the array untouched if the IDs
  // already match.
  if (!crew.value || invite.crew?.id !== crew.value.id) return
  if (pendingInvitees.value.some((i) => i.id === invite.id)) return
  pendingInvitees.value = [...pendingInvitees.value, invite].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  )
}

function onCrewDisbanded() {
  viewerCrew.clear()
  void navigateTo('/crew', { replace: true })
}

async function confirmLeave() {
  if (!isMember.value || isOwner.value) return
  if (!confirm('Leave this Crew? You can be re-invited later.')) return
  leaving.value = true
  try {
    await crewApi.leaveCrew()
    viewerCrew.clear()
    void navigateTo('/crew', { replace: true })
  } catch (e) {
    alert(getApiErrorMessage(e) || 'Could not leave the Crew.')
  } finally {
    leaving.value = false
  }
}

const loadMoreSentinelEl = ref<HTMLElement | null>(null)
const middleScrollerRef = useMiddleScroller()
useLoadMoreObserver(
  loadMoreSentinelEl,
  middleScrollerRef,
  computed(() => Boolean(nextCursor.value)),
  () => void loadMore(),
)

async function load() {
  const slug = String(route.params.slug || '').toLowerCase()
  if (!slug) {
    notFound.value = true
    loading.value = false
    return
  }
  // Only show the page-level spinner on the very first load. Subsequent
  // reloads (realtime member/owner changes, etc.) refresh in place to avoid
  // flashing the whole page back to a loading state.
  if (crew.value === null) loading.value = true
  notFound.value = false
  try {
    const res = await crewApi.getCrewBySlug(slug)
    crew.value = res.crew
    viewerMembership.value = res.viewerMembership
    canonicalSlug.value = res.crew.slug
    // A fresh server count supersedes any local optimistic override.
    unreadChatOverride.value = null
    // Visiting a crew page surfaces every crew_* notification (members joining/leaving,
    // wall mentions, owner changes, invite outcomes, etc.) — clear them all in one shot.
    if (import.meta.client && res.viewerMembership && res.crew.id) {
      void markReadBySubject({ crew_id: res.crew.id })
    }
    if (res.viewerMembership) {
      void refreshPendingInvitees(res.crew.id)
    } else {
      pendingInvitees.value = []
    }
    if (import.meta.client && res.crew.slug && res.crew.slug !== slug) {
      void navigateTo(`/c/${encodeURIComponent(res.crew.slug)}`, { replace: true })
    }
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
}

watch(() => route.params.slug, () => {
  // Different crew page — clear stale data so the page-level spinner shows.
  crew.value = null
  viewerMembership.value = null
  pendingInvitees.value = []
  void load()
})

// Realtime: refresh the page when something material changes about the crew
// (rename, members joined/left, new owner). The feed component refreshes
// automatically when `crewMemberAuthorIds` changes (member join/leave).
const realtimeCb: CrewCallback = {
  onUpdated() {
    void load()
  },
  onMembersChanged() {
    void load()
  },
  onOwnerChanged() {
    void load()
  },
  onDisbanded(payload: { crewId: string }) {
    // Only flip if the disbanded crew is the one this page is showing. The
    // viewer can receive a `crew:disbanded` event for an OLD crew (e.g. their
    // solo crew was auto-disbanded when they accepted an invite) while sitting
    // on a different crew page — without this guard, that page would
    // incorrectly flash "not found".
    if (!crew.value || payload?.crewId !== crew.value.id) return
    notFound.value = true
    crew.value = null
  },
  onInviteReceived() {
    if (isMember.value) void refreshPendingInvitees(crew.value?.id ?? null)
  },
  onInviteUpdated() {
    if (isMember.value) void refreshPendingInvitees(crew.value?.id ?? null)
  },
  onWallNew(payload: WsCrewWallPayload) {
    // Bump the chat badge for new messages on this crew while we're on the page,
    // unless the message was just sent by the viewer themselves.
    if (!crew.value || payload?.crewId !== crew.value.id) return
    const meId = meUser.value?.id ?? null
    const senderId = (payload?.message as { senderId?: string | null } | null | undefined)?.senderId ?? null
    if (meId && senderId === meId) return
    const base = unreadChatOverride.value ?? viewerMembership.value?.unreadChatCount ?? 0
    unreadChatOverride.value = base + 1
  },
}
usePresenceCallback('Crew', realtimeCb)

onMounted(() => {
  // Fire the initial feed load once roster + auth are settled (the composable's
  // watcher won't fire for the first render since values haven't changed).
  if (feedEnabled.value && !posts.value.length) void feedRefresh()
})

void load()
  return {
    onMemberClick,
    onPendingClick,
    onRemoveMemberRequested,
    performRemoveMember,
    onCancelInviteRequested,
    onCrewFeedSortChange,
    onCrewFeedFilterChange,
    onEdited,
    onOpenChat,
    onCrewUpdated,
    onMemberInvited,
    onCrewDisbanded,
    confirmLeave,
    crewAvatarRound,
    loading,
    notFound,
    crew,
    viewerMembership,
    crewName,
    isMember,
    isOwner,
    canEditCrew,
    isAdminOverride,
    editCrewOpen,
    addMemberOpen,
    leaving,
    pendingInvitees,
    addMemberExcludeIds,
    memberMenuOpen,
    memberMenuTarget,
    memberMenuAnchor,
    removeConfirmOpen,
    removingMember,
    removeConfirmHeader,
    removeConfirmMessage,
    canAddMember,
    unreadChatCount,
    crewFeedTopEl,
    crewFeedContentEl,
    loadMoreSentinelEl,
    meUser,
    feedSort,
    feedFilter,
    viewerIsVerified,
    viewerIsPremium,
    posts,
    displayItems,
    collapsedSiblingReplyCountFor,
    nextCursor,
    feedLoading,
    feedInitialLoading,
    loadingMore,
    feedError,
    removePost,
  }
}
