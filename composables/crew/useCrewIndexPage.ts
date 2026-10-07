import { formatFutureRelative } from '~/utils/time-format'
import type { CrewInvite, CrewUserSummary, FollowListUser, OpenCrewMember } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

export function useCrewIndexPage() {
const { isVerified, user: authUser } = useAuth()

const router = useRouter()
const crewApi = useCrew()
const viewerCrew = useViewerCrew()
const { addCrewCallback, removeCrewCallback } = usePresence()

const loading = ref(true)
const error = ref<string | null>(null)

const inbox = ref<CrewInvite[]>([])
const outbox = ref<CrewInvite[]>([])

// Invite dialog
const openInviteDialog = ref(false)
useOverlayDismiss(openInviteDialog, () => (openInviteDialog.value = false))
const inviteUser = ref<FollowListUser | null>(null)
const inviteMessage = ref('')
const sendingInvite = ref(false)
const inviteError = ref<string | null>(null)
// Optional crew-name field shown in the founding-invite dialog. We're always in
// the founding case here (this page only renders for users without a crew).
const inviteCrewName = ref('')

// Hide users who already have a pending invite from us.
const inviteExcludeIds = computed<string[]>(() => {
  const ids = new Set<string>()
  for (const inv of outbox.value) if (inv.status === 'pending') ids.add(inv.invitee.id)
  return [...ids]
})

watch(openInviteDialog, (open) => {
  if (!open) {
    inviteUser.value = null
    inviteMessage.value = ''
    inviteError.value = null
    inviteCrewName.value = ''
  }
})

const actingInviteId = ref<string | null>(null)

// Open-to-crew directory
const openToCrew = ref(false)

// Seed open-to-crew toggle from the auth user if already known.
watch(authUser, (u) => {
  if (u && typeof u.openToCrew === 'boolean') openToCrew.value = u.openToCrew
}, { immediate: true })
const availabilityLoading = ref(false)
const openMembers = ref<OpenCrewMember[]>([])
const openMembersLoading = ref(false)

// Synthesize the viewer's own entry so they can see themselves in the directory.
const viewerEntry = computed<OpenCrewMember | null>(() => {
  const u = authUser.value
  if (!u || !openToCrew.value) return null
  return {
    user: {
      id: u.id,
      username: u.username ?? null,
      name: u.name ?? null,
      premium: u.premium ?? false,
      premiumPlus: u.premiumPlus ?? false,
      isOrganization: u.isOrganization ?? false,
      verifiedStatus: u.verifiedStatus ?? 'none',
      avatarUrl: u.avatarUrl ?? null, avatarVideo: u.avatarVideo ?? null,
    },
    sharedInterests: [],
  }
})

// Viewer appears at the top when open, de-duped against whatever the API returned.
const displayedOpenMembers = computed<OpenCrewMember[]>(() => {
  const base = openMembers.value.filter((m) => m.user.id !== authUser.value?.id)
  return viewerEntry.value ? [viewerEntry.value, ...base] : base
})

async function loadOpenMembers() {
  openMembersLoading.value = true
  try {
    openMembers.value = await crewApi.listOpenMembers()
  } catch {
    // Non-critical — directory is a best-effort surface.
  } finally {
    openMembersLoading.value = false
  }
}

async function onAvailabilityToggle(val: boolean) {
  availabilityLoading.value = true
  try {
    await crewApi.setAvailability(val)
    // Refresh the directory after toggling so the viewer appears/disappears.
    void loadOpenMembers()
  } catch (e) {
    // Roll back the optimistic toggle.
    openToCrew.value = !val
    error.value = getApiErrorMessage(e) ?? 'Could not update availability.'
  } finally {
    availabilityLoading.value = false
  }
}

function openInviteDialogFor(user: CrewUserSummary) {
  inviteUser.value = user as unknown as FollowListUser
  openInviteDialog.value = true
}

/**
 * Resolve the viewer's crew status. If they're already in a crew, redirect to
 * the crew's public page (`/c/<slug>`) — that page now hosts the wall, members,
 * and owner controls. Only users without a crew see this page.
 */
async function load() {
  loading.value = true
  error.value = null
  try {
    const crew = await crewApi.getMyCrew()
    viewerCrew.setFromCrew(crew)
    if (crew) {
      void router.replace(`/c/${encodeURIComponent(crew.slug)}`)
      return
    }
    const [inb, out] = await Promise.all([
      crewApi.listInbox(),
      crewApi.listOutbox(),
    ])
    inbox.value = inb
    outbox.value = out
    // Load open-members directory alongside invite lists (non-blocking).
    void loadOpenMembers()
  } catch (e) {
    error.value = getApiErrorMessage(e) || 'Could not load your Crew.'
  } finally {
    loading.value = false
  }
}

function crewLabel(inv: CrewInvite): string {
  if (!inv.crew) return 'a new Crew'
  const n = (inv.crew.name ?? '').trim()
  return n.length > 0 ? n : 'Untitled Crew'
}

async function submitInvite() {
  const target = inviteUser.value
  if (!target) return
  sendingInvite.value = true
  inviteError.value = null
  try {
    const desiredName = inviteCrewName.value.trim().slice(0, 80)
    await crewApi.sendInvite({
      inviteeUserId: target.id,
      message: inviteMessage.value.trim() || null,
      crewName: desiredName.length > 0 ? desiredName : null,
    })
    useNuxtApp().$posthog?.capture('crew_invite_sent', {
      founding: true,
      crew_named: desiredName.length > 0,
    })
    openInviteDialog.value = false
    await load()
  } catch (e) {
    inviteError.value = getApiErrorMessage(e) || 'Could not send that invite.'
  } finally {
    sendingInvite.value = false
  }
}

async function accept(inv: CrewInvite) {
  actingInviteId.value = inv.id
  try {
    await crewApi.acceptInvite(inv.id)
    useNuxtApp().$posthog?.capture('crew_invite_accepted', {
      founding: !inv.crew,
    })
    await load()
  } catch (e) {
    error.value = getApiErrorMessage(e) || 'Could not accept that invite.'
  } finally {
    actingInviteId.value = null
  }
}

async function decline(inv: CrewInvite) {
  actingInviteId.value = inv.id
  try {
    await crewApi.declineInvite(inv.id)
    inbox.value = inbox.value.filter((i) => i.id !== inv.id)
  } catch (e) {
    error.value = getApiErrorMessage(e) || 'Could not decline that invite.'
  } finally {
    actingInviteId.value = null
  }
}

async function cancelOutgoing(inv: CrewInvite) {
  actingInviteId.value = inv.id
  try {
    await crewApi.cancelInvite(inv.id)
    outbox.value = outbox.value.filter((i) => i.id !== inv.id)
  } catch (e) {
    error.value = getApiErrorMessage(e) || 'Could not cancel that invite.'
  } finally {
    actingInviteId.value = null
  }
}

// Realtime: when a new invite lands or one of ours is accepted/cancelled,
// refresh inbox/outbox; if the viewer just joined a crew somewhere, `load()`
// will redirect to /c/<slug>.
const crewRealtimeCb = {
  onMembersChanged() {
    void load()
  },
  onInviteUpdated() {
    void load()
  },
  onInviteReceived() {
    void load()
  },
}
onMounted(() => addCrewCallback(crewRealtimeCb))
onBeforeUnmount(() => removeCrewCallback(crewRealtimeCb))

void load()
const initialLoading = useInitialLoading(loading, false, error)
  return {
    loadOpenMembers,
    onAvailabilityToggle,
    openInviteDialogFor,
    load,
    crewLabel,
    submitInvite,
    accept,
    decline,
    cancelOutgoing,
    router,
    crewApi,
    viewerCrew,
    loading,
    error,
    inbox,
    outbox,
    openInviteDialog,
    inviteUser,
    inviteMessage,
    sendingInvite,
    inviteError,
    inviteCrewName,
    inviteExcludeIds,
    actingInviteId,
    openToCrew,
    availabilityLoading,
    openMembers,
    openMembersLoading,
    viewerEntry,
    displayedOpenMembers,
    crewRealtimeCb,
    initialLoading,
    formatFutureRelative,
    getApiErrorMessage,
    isVerified,
    authUser,
    addCrewCallback,
    removeCrewCallback,
  }
}
