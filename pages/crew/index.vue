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
            accepts. Invite the brother who pushes you hardest.
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
          placeholder="e.g. The Iron Brotherhood"
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
import type { CrewInvite, FollowListUser } from '~/types/api'
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

const { isVerified } = useAuth()

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
      void navigateTo(`/c/${encodeURIComponent(crew.slug)}`, { replace: true })
      return
    }
    const [inb, out] = await Promise.all([
      crewApi.listInbox(),
      crewApi.listOutbox(),
    ])
    inbox.value = inb
    outbox.value = out
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
