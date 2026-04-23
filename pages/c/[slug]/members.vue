<template>
  <AppPageContent bottom="standard">
    <div v-if="loading" class="flex justify-center py-16">
      <AppLogoLoader />
    </div>

    <div v-else-if="notFound" class="moh-gutter-x pt-10 pb-16 max-w-xl mx-auto text-center space-y-3">
      <Icon name="tabler:shield-off" class="text-3xl opacity-60" aria-hidden="true" />
      <h1 class="moh-h1">Crew not found</h1>
      <Button as="NuxtLink" to="/" label="Back home" rounded />
    </div>

    <div v-else-if="crew" class="moh-gutter-x pt-6 pb-10 max-w-3xl mx-auto space-y-5">
      <div class="flex items-center gap-3">
        <NuxtLink
          :to="`/c/${encodeURIComponent(crew.slug)}`"
          class="inline-flex items-center gap-1 text-sm moh-text-muted hover:moh-text"
          :aria-label="`Back to ${crewName}`"
        >
          <Icon name="tabler:arrow-left" aria-hidden="true" />
          <span class="hidden sm:inline">Back to {{ crewName }}</span>
        </NuxtLink>
      </div>

      <div class="flex items-center gap-3">
        <div
          class="h-10 w-10 overflow-hidden bg-gray-200 dark:bg-zinc-800 shrink-0"
          :class="crewAvatarRound"
        >
          <img
            v-if="crew.avatarUrl"
            :src="crew.avatarUrl"
            alt=""
            class="h-full w-full object-cover"
          >
        </div>
        <div class="min-w-0 flex-1">
          <h1 class="text-xl font-semibold moh-text truncate">{{ crewName }}</h1>
          <p class="text-xs moh-text-muted tabular-nums">
            {{ crew.memberCount }} / 5 members · max 5
          </p>
        </div>
      </div>

      <AppInlineAlert v-if="error" severity="danger">{{ error }}</AppInlineAlert>

      <ul class="divide-y divide-gray-100 dark:divide-white/5 rounded-xl border moh-border">
        <li v-for="m in crew.members" :key="m.user.id" class="p-3 flex items-center gap-3">
          <NuxtLink
            v-if="m.user.username"
            :to="`/u/${encodeURIComponent(m.user.username)}`"
            class="shrink-0"
          >
            <AppUserAvatar :user="m.user" size-class="h-10 w-10" />
          </NuxtLink>
          <AppUserAvatar v-else :user="m.user" size-class="h-10 w-10" />
          <div class="flex-1 min-w-0">
            <AppUserIdentityLine :user="m.user">
              <template #after-name>
                <span
                  v-if="m.role === 'owner'"
                  class="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300"
                >
                  Owner
                </span>
                <span
                  v-if="m.isDesignatedSuccessor"
                  class="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-700 dark:text-indigo-300"
                >
                  Successor
                </span>
              </template>
            </AppUserIdentityLine>
            <div class="text-[11px] moh-text-muted">Joined {{ formatDate(m.joinedAt) }}</div>
          </div>
          <!-- Row actions: open the shared popover (View profile / Remove from crew). -->
          <button
            v-if="isMember && canShowMemberMenu(m)"
            type="button"
            class="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full moh-text-muted hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            :aria-label="`Actions for ${m.user.name ?? m.user.username ?? 'member'}`"
            @click="onMemberMenu($event, m)"
          >
            <Icon name="tabler:dots" class="text-lg" aria-hidden="true" />
          </button>
        </li>

        <!-- Pending invitees (members only) -->
        <li
          v-for="inv in pendingInvitees"
          :key="`inv-${inv.id}`"
          class="p-3 flex items-center gap-3"
        >
          <div class="shrink-0 opacity-40 saturate-0">
            <AppUserAvatar :user="inv.invitee" size-class="h-10 w-10" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm moh-text truncate">
              {{ inv.invitee.name ?? inv.invitee.username ?? 'Invited user' }}
            </div>
            <div class="text-[11px] moh-text-muted inline-flex items-center gap-1">
              <Icon name="tabler:clock" class="text-[10px]" aria-hidden="true" />
              Invite pending · sent {{ formatDate(inv.createdAt) }}
            </div>
          </div>
          <button
            type="button"
            class="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full moh-text-muted hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            :aria-label="`Actions for pending invite to ${inv.invitee.name ?? inv.invitee.username ?? 'user'}`"
            @click="onPendingMenu($event, inv)"
          >
            <Icon name="tabler:dots" class="text-lg" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </div>

    <AppCrewMemberActionMenu
      :open="memberMenuOpen"
      :target="memberMenuTarget"
      :anchor-el="memberMenuAnchor"
      :viewer-is-owner="isOwner"
      :viewer-user-id="meUser?.id ?? null"
      @update:open="memberMenuOpen = $event"
      @remove-member="onRemoveMemberRequested"
      @cancel-invite="onCancelInviteRequested"
    />

    <AppConfirmDialog
      v-model:visible="removeConfirmOpen"
      :header="removeConfirmHeader"
      :message="removeConfirmMessage"
      confirm-label="Remove"
      confirm-severity="danger"
      :loading="removingMember"
      @confirm="performRemoveMember"
    />
  </AppPageContent>
</template>

<script setup lang="ts">
import type { CrewBySlugViewerMembership, CrewInvite, CrewMemberListItem, CrewPublic } from '~/types/api'
import type { CrewMemberActionTarget } from '~/components/app/crew/CrewMemberActionMenu.vue'
import { getApiErrorMessage } from '~/utils/api-error'
import { crewAvatarRoundClass } from '~/utils/avatar-rounding'

const crewAvatarRound = crewAvatarRoundClass()

definePageMeta({
  layout: 'app',
  title: 'Crew members',
  hideTopBar: true,
})

const route = useRoute()

const loading = ref(true)
const notFound = ref(false)
const error = ref<string | null>(null)
const crew = ref<CrewPublic | null>(null)
const viewerMembership = ref<CrewBySlugViewerMembership | null>(null)
const pendingInvitees = ref<CrewInvite[]>([])

const crewApi = useCrew()
const { addCrewCallback, removeCrewCallback } = usePresence()
const { markReadBySubject } = useNotifications()
const { user: meUser } = useAuth()
const toast = useAppToast()

const crewName = computed(() => {
  const n = (crew.value?.name ?? '').trim()
  return n.length > 0 ? n : 'Untitled Crew'
})

const isMember = computed(() => Boolean(viewerMembership.value))
const isOwner = computed(() => viewerMembership.value?.role === 'owner')

usePageSeo({
  title: computed(() => `${crewName.value} — members`),
  noindex: true,
})

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString()
  } catch {
    return ''
  }
}

// View profile always works. Remove-from-crew is owner-only and excludes the
// owner row + yourself — so hide the whole menu button when there's nothing to
// do. (Clicking your own avatar elsewhere won't offer Remove either.)
function canShowMemberMenu(m: CrewMemberListItem): boolean {
  if (m.user.username) return true
  return isOwner.value && m.role !== 'owner' && m.user.id !== meUser.value?.id
}

// --- Popover + confirm state ---

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

function onMemberMenu(event: MouseEvent, member: CrewMemberListItem) {
  memberMenuTarget.value = {
    kind: 'member',
    user: member.user,
    role: member.role,
  }
  memberMenuAnchor.value = event.currentTarget as HTMLElement
  memberMenuOpen.value = true
}

function onPendingMenu(event: MouseEvent, invite: CrewInvite) {
  memberMenuTarget.value = {
    kind: 'pendingInvite',
    user: invite.invitee,
    inviteId: invite.id,
  }
  memberMenuAnchor.value = event.currentTarget as HTMLElement
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
  error.value = null
  try {
    await crewApi.kickMember(target.id)
    if (crew.value) {
      crew.value = {
        ...crew.value,
        members: crew.value.members.filter((m) => m.user.id !== target.id),
        memberCount: Math.max(0, (crew.value.memberCount ?? 1) - 1),
      }
    }
    toast.push({ title: `Removed ${target.name}`, tone: 'success' })
  } catch (e) {
    error.value = getApiErrorMessage(e) || 'Could not remove that member.'
  } finally {
    removingMember.value = false
    removeConfirmOpen.value = false
    pendingRemoveUser.value = null
  }
}

async function onCancelInviteRequested(inviteId: string) {
  const invite = pendingInvitees.value.find((i) => i.id === inviteId)
  const name = invite?.invitee.name ?? invite?.invitee.username ?? 'invite'
  pendingInvitees.value = pendingInvitees.value.filter((i) => i.id !== inviteId)
  try {
    await crewApi.cancelInvite(inviteId)
    toast.push({ title: `Invite to ${name} withdrawn`, tone: 'success' })
  } catch (e) {
    if (invite) {
      pendingInvitees.value = [...pendingInvitees.value, invite].sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt),
      )
    }
    toast.push({ title: getApiErrorMessage(e) || 'Could not cancel the invite.', tone: 'error' })
  }
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

async function load() {
  const slug = String(route.params.slug || '').toLowerCase()
  if (!slug) {
    notFound.value = true
    loading.value = false
    return
  }
  if (crew.value === null) loading.value = true
  notFound.value = false
  try {
    const res = await crewApi.getCrewBySlug(slug)
    crew.value = res.crew
    viewerMembership.value = res.viewerMembership
    if (import.meta.client && res.viewerMembership && res.crew.id) {
      void markReadBySubject({ crew_id: res.crew.id })
    }
    if (res.viewerMembership) {
      void refreshPendingInvitees(res.crew.id)
    } else {
      pendingInvitees.value = []
    }
    if (import.meta.client && res.crew.slug && res.crew.slug !== slug) {
      void navigateTo(`/c/${encodeURIComponent(res.crew.slug)}/members`, { replace: true })
    }
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
}

watch(() => route.params.slug, () => {
  crew.value = null
  viewerMembership.value = null
  pendingInvitees.value = []
  void load()
})

const realtimeCb = {
  onMembersChanged() {
    void load()
  },
  onOwnerChanged() {
    void load()
  },
  onUpdated() {
    void load()
  },
  onDisbanded(payload: { crewId: string }) {
    // Guard against late-arriving disband events for an OLD crew (e.g. solo
    // auto-disband on invite accept) flashing this unrelated page as "not found".
    if (!crew.value || payload?.crewId !== crew.value.id) return
    notFound.value = true
  },
  onInviteReceived() {
    if (isMember.value) void refreshPendingInvitees(crew.value?.id ?? null)
  },
  onInviteUpdated() {
    if (isMember.value) void refreshPendingInvitees(crew.value?.id ?? null)
  },
}
onMounted(() => addCrewCallback(realtimeCb))
onBeforeUnmount(() => removeCrewCallback(realtimeCb))

void load()
</script>
