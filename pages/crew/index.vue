<template>
  <AppPageContent bottom="standard">
    <div class="moh-gutter-x pt-4 pb-10 space-y-6">
      <div class="flex items-center gap-2">
        <h1 class="moh-h1">Your Crew</h1>
        <span class="ml-2 text-xs uppercase tracking-wide moh-text-muted">5 men, max</span>
      </div>

      <div v-if="loading" class="flex justify-center py-16">
        <AppLogoLoader />
      </div>

      <AppInlineAlert v-else-if="error" severity="danger">{{ error }}</AppInlineAlert>

      <!-- Unverified CTA -->
      <div
        v-else-if="!isVerified"
        class="rounded-2xl border moh-border p-6 space-y-3 text-center"
      >
        <Icon name="tabler:shield-check" class="text-3xl opacity-80" aria-hidden="true" />
        <h2 class="text-lg font-semibold moh-text">Crews are for verified men</h2>
        <p class="text-sm moh-text-muted max-w-md mx-auto">
          A Crew is a tight, private group of up to 5 verified men who hold each
          other accountable. Verify to create one or join an invite.
        </p>
        <Button
          as="NuxtLink"
          to="/verification"
          label="Get verified"
          rounded
          class="mt-2"
        />
      </div>

      <!-- No crew: invites inbox + outbox -->
      <div v-else class="space-y-6">
        <div class="rounded-2xl border moh-border p-6 space-y-3 text-center">
          <Icon name="tabler:users" class="text-3xl opacity-80" aria-hidden="true" />
          <h2 class="text-lg font-semibold moh-text">You’re not in a Crew yet</h2>
          <p class="text-sm moh-text-muted max-w-md mx-auto">
            Crews form when a verified man invites another, and the other
            accepts. Invite the man who pushes you hardest.
          </p>
          <div class="flex flex-wrap justify-center gap-2 pt-2">
            <Button
              label="Invite someone"
              rounded
              @click="openInviteDialog = true"
            >
              <template #icon>
                <Icon name="tabler:user-plus" aria-hidden="true" />
              </template>
            </Button>
          </div>
        </div>

        <!-- Open-to-crew toggle -->
        <div class="rounded-2xl border p-4 flex items-start justify-between gap-4" style="border-color: rgba(var(--moh-checkin-rgb), 0.35); background-color: var(--moh-checkin-soft)">
          <div class="flex-1 min-w-0">
            <div class="font-semibold" style="color: var(--moh-checkin)">Open to joining a crew</div>
            <div class="text-xs moh-text-muted mt-0.5">
              Show up in the directory so other verified men can invite you.
            </div>
          </div>
          <Checkbox
            v-model="openToCrew"
            binary
            :disabled="availabilityLoading"
            aria-label="Open to joining a crew"
            @update:model-value="onAvailabilityToggle"
          />
        </div>

        <!-- Men looking for a crew -->
        <section class="space-y-3">
          <h3 class="text-sm font-semibold moh-text uppercase tracking-wide">Men looking for a crew</h3>

          <div v-if="openMembersLoading" class="flex justify-center py-8">
            <AppLogoLoader compact />
          </div>

          <div v-else-if="displayedOpenMembers.length === 0" class="rounded-xl border moh-border moh-surface p-4 text-center text-sm moh-text-muted">
            No one has listed themselves as open yet — be the first.
          </div>

          <div v-else class="divide-y divide-gray-100 dark:divide-white/5 rounded-xl border moh-border">
            <div
              v-for="entry in displayedOpenMembers"
              :key="entry.user.id"
              class="p-3 flex items-start gap-3"
            >
              <AppUserAvatar :user="entry.user" size-class="h-10 w-10" />
              <div class="flex-1 min-w-0">
                <AppUserIdentityLine :user="entry.user" />
                <div v-if="entry.sharedInterests.length > 0" class="mt-1 flex flex-wrap gap-1">
                  <span
                    v-for="arena in entry.sharedInterests.slice(0, 3)"
                    :key="arena"
                    class="text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded-full moh-surface border moh-border moh-text-muted"
                  >{{ arena }}</span>
                </div>
              </div>
              <span
                v-if="entry.user.id === authUser?.id"
                class="shrink-0 text-[11px] font-medium moh-text-muted self-center"
              >You</span>
              <Button
                v-else
                label="Invite"
                size="small"
                rounded
                class="shrink-0"
                @click="openInviteDialogFor(entry.user)"
              />
            </div>
          </div>
        </section>

        <section v-if="inbox.length > 0" class="space-y-2">
          <h3 class="text-sm font-semibold moh-text uppercase tracking-wide">
            Invites received
          </h3>
          <div class="divide-y divide-gray-100 dark:divide-white/5 rounded-xl border moh-border">
            <div
              v-for="inv in inbox"
              :key="inv.id"
              class="p-3 flex items-start gap-3"
            >
              <AppUserAvatar :user="inv.invitedBy" size-class="h-10 w-10" />
              <div class="flex-1 min-w-0">
                <AppUserIdentityLine :user="inv.invitedBy" />
                <div class="mt-0.5 text-xs moh-text-muted">
                  invited you to <span class="font-semibold moh-text">{{ crewLabel(inv) }}</span>
                </div>
                <p v-if="inv.message" class="mt-1 text-xs moh-text-muted line-clamp-3">
                  “{{ inv.message }}”
                </p>
                <div class="mt-1 text-[11px] moh-text-muted">
                  Expires {{ formatRelative(inv.expiresAt) }}
                </div>
              </div>
              <div class="flex flex-col gap-1 shrink-0">
                <Button
                  label="Accept"
                  size="small"
                  rounded
                  :loading="actingInviteId === inv.id"
                  @click="accept(inv)"
                />
                <Button
                  label="Decline"
                  size="small"
                  rounded
                  severity="secondary"
                  :loading="actingInviteId === inv.id"
                  @click="decline(inv)"
                />
              </div>
            </div>
          </div>
        </section>

        <section v-if="outbox.length > 0" class="space-y-2">
          <h3 class="text-sm font-semibold moh-text uppercase tracking-wide">
            Invites sent
          </h3>
          <div class="divide-y divide-gray-100 dark:divide-white/5 rounded-xl border moh-border">
            <div
              v-for="inv in outbox"
              :key="inv.id"
              class="p-3 flex items-start gap-3"
            >
              <AppUserAvatar :user="inv.invitee" size-class="h-10 w-10" />
              <div class="flex-1 min-w-0">
                <AppUserIdentityLine :user="inv.invitee" />
                <div class="mt-0.5 text-xs moh-text-muted">Pending invite</div>
                <div class="mt-1 text-[11px] moh-text-muted">
                  Expires {{ formatRelative(inv.expiresAt) }}
                </div>
              </div>
              <Button
                label="Cancel"
                size="small"
                rounded
                severity="secondary"
                :loading="actingInviteId === inv.id"
                @click="cancelOutgoing(inv)"
              />
            </div>
          </div>
        </section>
      </div>
    </div>

    <Dialog
      v-model:visible="openInviteDialog"
      modal
      header="Invite to Crew"
      :style="{ width: '380px' }"
      :closable="!sendingInvite"
    >
      <div class="space-y-3">
        <p class="text-xs moh-text-muted">
          Search for the verified member you want to invite. The crew will form
          the moment they accept.
        </p>

        <label class="block text-sm font-medium moh-text">
          Crew name <span class="moh-text-muted font-normal">(optional)</span>
        </label>
        <InputText
          v-model="inviteCrewName"
          class="w-full"
          maxlength="80"
          placeholder="e.g. The Hungry Five"
          :disabled="sendingInvite"
        />
        <p class="text-[11px] moh-text-muted -mt-1">
          We'll use this when the crew is created on acceptance.
        </p>

        <label class="block text-sm font-medium moh-text">Member</label>
        <AppUserSearchPicker
          v-model="inviteUser"
          show="all"
          require-verified
          unselectable-hint="Crews are verified-only — this user isn't verified yet."
          placeholder="Search by username or name…"
          :exclude-user-ids="inviteExcludeIds"
          :disabled="sendingInvite"
          autofocus
        />
        <label class="block text-sm font-medium moh-text">Message (optional)</label>
        <Textarea
          v-model="inviteMessage"
          class="w-full min-h-[80px]"
          maxlength="500"
          :disabled="sendingInvite"
        />
        <AppInlineAlert v-if="inviteError" severity="danger">{{ inviteError }}</AppInlineAlert>
      </div>
      <template #footer>
        <Button
          label="Cancel"
          text
          severity="secondary"
          :disabled="sendingInvite"
          @click="openInviteDialog = false"
        />
        <Button
          label="Send invite"
          rounded
          :loading="sendingInvite"
          :disabled="!inviteUser"
          @click="submitInvite"
        />
      </template>
    </Dialog>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { CrewInvite, CrewUserSummary, FollowListUser, OpenCrewMember } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({
  layout: 'app',
  title: 'Your Crew',
  hideTopBar: true,
})

usePageSeo({
  title: 'Your Crew',
  description: 'Your Crew — up to 5 verified men holding each other accountable.',
  canonicalPath: '/crew',
  noindex: true,
})

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
      stewardBadgeEnabled: u.stewardBadgeEnabled ?? false,
      verifiedStatus: u.verifiedStatus ?? 'none',
      avatarUrl: u.avatarUrl ?? null,
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

function formatRelative(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now()
  if (!Number.isFinite(ms)) return ''
  const days = Math.round(ms / 86_400_000)
  if (days <= 0) return 'soon'
  if (days === 1) return 'in 1 day'
  return `in ${days} days`
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
</script>
