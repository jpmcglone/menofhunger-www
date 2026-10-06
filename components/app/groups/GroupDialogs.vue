<template>
  <Dialog
    :visible="dialog.current.value === 'settings'"
    modal
    position="right"
    :draggable="false"
    :closable="false"
    :style="sheetStyle"
    :pt="sheetPt"
    @update:visible="onVisible"
  >
    <template #header>
      <div class="flex w-full items-center gap-2">
        <Button text severity="secondary" aria-label="Close group settings" @click="dialog.close()"><template #icon><Icon name="tabler:x" aria-hidden="true" /></template></Button>
        <h2 class="text-lg font-semibold moh-text">Group settings</h2>
      </div>
    </template>

    <div class="space-y-5 pb-6">
      <AppInlineAlert v-if="error" severity="danger">{{ error }}</AppInlineAlert>

      <section class="flex items-start gap-3" aria-label="Group">
        <AppGroupsGroupAvatar :name="shell.name" :src="shell.avatarImageUrl" :size="56" />
        <div class="min-w-0 flex-1">
          <h3 class="truncate text-base font-semibold moh-text">{{ shell.name }}</h3>
          <p class="text-sm moh-text-muted">{{ shell.memberCount.toLocaleString() }} members · {{ shell.joinPolicy === 'open' ? 'Open to verified members' : 'Approval required' }}</p>
          <p v-if="shell.description" class="mt-1 text-sm moh-text">{{ shell.description }}</p>
        </div>
        <Button v-if="canEdit" label="Edit" severity="secondary" size="small" @click="editOpen = true" />
      </section>

      <section v-if="shell.rules" class="space-y-1" aria-label="Rules">
        <h3 class="text-sm font-semibold moh-text">Rules</h3>
        <p class="whitespace-pre-line text-sm moh-text-muted">{{ shell.rules }}</p>
      </section>

      <section aria-label="People">
        <h3 class="mb-1 text-sm font-semibold moh-text">People</h3>
        <ul class="moh-divide rounded-xl border moh-border moh-surface">
          <li><NuxtLink :to="`/g/${slug}/members`" class="moh-focus flex min-h-11 items-center justify-between px-3 text-sm" @click="dialog.close()">Members<span class="moh-text-muted">{{ shell.memberCount.toLocaleString() }}</span></NuxtLink></li>
          <li v-if="isLeader && shell.joinPolicy === 'approval'">
            <NuxtLink :to="dialog.to('pending')" replace class="moh-focus flex min-h-11 items-center justify-between px-3 text-sm">
              Join requests
              <span v-if="pendingCount" class="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">{{ pendingCount }}</span>
              <span v-else class="moh-text-muted">None</span>
            </NuxtLink>
          </li>
          <li v-if="isLeader"><NuxtLink :to="`/g/${slug}/invites`" class="moh-focus flex min-h-11 items-center justify-between px-3 text-sm" @click="dialog.close()">Sent invites<span class="moh-text-muted">{{ shell.pendingInviteCount ?? 0 }}</span></NuxtLink></li>
        </ul>
      </section>

      <section aria-label="Preferences">
        <h3 class="mb-1 text-sm font-semibold moh-text">For you</h3>
        <ul class="moh-divide rounded-xl border moh-border moh-surface">
          <li><button type="button" class="moh-focus flex min-h-11 w-full items-center justify-between px-3 text-sm" @click="notificationsOpen = true">Notifications<Icon name="tabler:chevron-right" class="moh-text-muted" aria-hidden="true" /></button></li>
          <li><button type="button" class="moh-focus flex min-h-11 w-full items-center justify-between px-3 text-sm" @click="copyInvite">Copy invite link<Icon name="tabler:link" class="moh-text-muted" aria-hidden="true" /></button></li>
        </ul>
      </section>

      <section v-if="isLeader && shell.marv" class="space-y-2" aria-label="Marv">
        <h3 class="text-sm font-semibold moh-text">@{{ shell.marv.username ?? 'marv' }}</h3>
        <p class="text-sm moh-text-muted">{{ shell.marv.isMember ? 'Active in this group and responds to mentions.' : 'Not in this group, so it will not respond to mentions.' }}</p>
        <Button v-if="!shell.marv.isMember" label="Add to group" size="small" rounded :loading="busy === 'marv'" @click="toggleMarv(true)" />
        <Button v-else label="Remove from group" size="small" rounded severity="secondary" :loading="busy === 'marv'" @click="toggleMarv(false)" />
      </section>

      <section v-if="isSiteAdmin" class="space-y-3 rounded-xl border border-amber-300/60 p-3 dark:border-amber-500/30" aria-label="Site admin">
        <h3 class="text-sm font-semibold moh-text">Site admin</h3>
        <label class="flex min-h-11 items-center justify-between gap-3 text-sm">
          Featured group
          <ToggleSwitch :model-value="featured" :disabled="busy === 'featured'" aria-label="Featured group" @update:model-value="saveFeatured($event, featuredOrder)" />
        </label>
        <label v-if="featured" class="flex items-center justify-between gap-3 text-sm">
          Featured order
          <InputNumber v-model="featuredOrder" :min="0" :max="9999" :disabled="busy === 'featured'" input-class="w-24" @blur="saveFeatured(true, featuredOrder)" />
        </label>
      </section>

      <section v-if="canLeave" class="space-y-2 rounded-xl border border-red-200 p-3 dark:border-red-900/50" aria-label="Leave">
        <h3 class="text-sm font-semibold moh-text">Leave group</h3>
        <p class="text-sm moh-text-muted">You will lose access to this group and its channels. Rejoining does not restore private channel invitations.</p>
        <Button label="Leave group" rounded severity="danger" :loading="busy === 'leave'" @click="leave" />
      </section>
    </div>
  </Dialog>

  <Dialog
    :visible="dialog.current.value === 'pending'"
    modal
    position="right"
    :draggable="false"
    :closable="false"
    :style="sheetStyle"
    :pt="sheetPt"
    @update:visible="onVisible"
  >
    <template #header>
      <div class="flex w-full items-center gap-2">
        <Button text severity="secondary" aria-label="Close join requests" @click="dialog.close()"><template #icon><Icon name="tabler:x" aria-hidden="true" /></template></Button>
        <h2 class="text-lg font-semibold moh-text">Join requests</h2>
      </div>
    </template>
    <AppInlineAlert v-if="pendingError" severity="danger" class="mb-3">{{ pendingError }}</AppInlineAlert>
    <p v-if="!isLeader" class="py-6 text-center text-sm moh-text-muted">Only group owners and moderators can review requests.</p>
    <p v-else-if="shell.joinPolicy !== 'approval'" class="py-6 text-center text-sm leading-relaxed moh-text-muted">This group is open, so there are no requests to approve.</p>
    <p v-else-if="pendingLoading && !pending.length" class="py-6 text-center text-sm moh-text-muted" role="status">Loading…</p>
    <p v-else-if="!pending.length" class="py-6 text-center text-sm moh-text-muted">No pending requests.</p>
    <ul v-else class="moh-divide">
      <li v-for="row in pending" :key="row.userId" class="flex flex-wrap items-center justify-between gap-3 py-3">
        <div class="min-w-0">
          <NuxtLink v-if="row.username" :to="`/u/${encodeURIComponent(row.username)}`" class="moh-focus block truncate text-sm font-semibold moh-text hover:underline" @click="dialog.close()">{{ row.name || row.username }}</NuxtLink>
          <span v-else class="block truncate text-sm font-semibold moh-text">{{ row.name || row.userId }}</span>
          <div v-if="row.username" class="text-xs moh-text-muted">@{{ row.username }}</div>
        </div>
        <div class="flex shrink-0 gap-2">
          <Button label="Approve" size="small" rounded :loading="actingOn === row.userId" :disabled="Boolean(actingOn)" @click="decide(row.userId, 'approve')" />
          <Button label="Reject" size="small" rounded severity="secondary" :loading="actingOn === row.userId" :disabled="Boolean(actingOn)" @click="decide(row.userId, 'reject')" />
        </div>
      </li>
    </ul>
  </Dialog>

  <AppGroupsGroupNotificationPreferences v-model="notificationsOpen" :group="shell" />
  <AppGroupsEditGroupDialog v-if="canEdit" v-model="editOpen" :shell="shell" :is-owner="isOwner" :is-admin-override="isSiteAdmin && !isOwner" @updated="onShellUpdated" />
</template>

<script setup lang="ts">
import type { CommunityGroupPendingMember, CommunityGroupShell } from '~/types/api'
import type { GroupFeedCallback } from '~/composables/presence/types'
import { getApiErrorMessage } from '~/utils/api-error'

const props = defineProps<{ group: CommunityGroupShell }>()
const dialog = useGroupDialog()
const { apiFetchData } = useApiClient()
const { user } = useAuth()
const { confirm } = useAppConfirm()
const toast = useAppToast()
const { invalidate: invalidateMyGroups } = useMyGroups()
const { markReadBySubject } = useNotifications()
const groupTabs = useGroupTabs()
const { addGroupFeedCallback, removeGroupFeedCallback, subscribeGroups, unsubscribeGroups } = usePresence()
const { header: appHeader } = useAppHeader()

const shell = ref<CommunityGroupShell>(props.group)
const error = ref<string | null>(null)
const busy = ref<'marv' | 'leave' | 'featured' | null>(null)
const editOpen = ref(false)
const notificationsOpen = ref(false)
const pending = ref<CommunityGroupPendingMember[]>([])
const pendingLoading = ref(false)
const pendingError = ref<string | null>(null)
const actingOn = ref<string | null>(null)
const featured = ref(props.group.isFeatured)
const featuredOrder = ref(props.group.featuredOrder ?? 0)

const sheetStyle = { width: 'min(34rem, 100vw)', height: '100dvh', maxHeight: '100dvh', margin: '0', borderRadius: '0' }
const sheetPt = { content: { class: 'flex-1 overflow-y-auto' } }

const slug = computed(() => encodeURIComponent(shell.value.slug))
const role = computed(() => shell.value.viewerMembership?.status === 'active' ? shell.value.viewerMembership.role : null)
const isOwner = computed(() => role.value === 'owner')
const isLeader = computed(() => role.value === 'owner' || role.value === 'moderator')
const isSiteAdmin = computed(() => Boolean(user.value?.siteAdmin))
const canEdit = computed(() => isOwner.value || isSiteAdmin.value)
const canLeave = computed(() => Boolean(role.value) && role.value !== 'owner')
const pendingCount = computed(() => shell.value.pendingMemberCount ?? 0)

function onVisible(open: boolean) { if (!open) dialog.close() }

function adopt(next: CommunityGroupShell) {
  shell.value = next
  featured.value = next.isFeatured
  featuredOrder.value = next.featuredOrder ?? 0
  if (groupTabs.value?.group.id === next.id) groupTabs.value = { ...groupTabs.value, group: next }
  if (appHeader.value?.group) appHeader.value = { ...appHeader.value, title: next.name, group: { name: next.name, avatarUrl: next.avatarImageUrl } }
}

async function refreshShell() {
  try { adopt(await apiFetchData<CommunityGroupShell>(`/groups/by-slug/${slug.value}`)) }
  catch (cause) { error.value = getApiErrorMessage(cause) || 'Couldn’t refresh this group.' }
}

async function loadPending() {
  if (!isLeader.value || shell.value.joinPolicy !== 'approval') { pending.value = []; return }
  pendingLoading.value = true
  pendingError.value = null
  try { pending.value = await apiFetchData<CommunityGroupPendingMember[]>(`/groups/${encodeURIComponent(shell.value.id)}/pending-members`) }
  catch (cause) { pendingError.value = getApiErrorMessage(cause) || 'Couldn’t load pending requests.' }
  finally { pendingLoading.value = false }
}

watch(() => props.group, next => { if (dialog.current.value === null) adopt(next) })
watch(() => dialog.current.value, async name => {
  if (!name) return
  error.value = null
  await refreshShell()
  if (name === 'pending') {
    await loadPending()
    if (isLeader.value) void markReadBySubject({ group_id: shell.value.id })
  }
}, { immediate: true })

async function decide(userId: string, action: 'approve' | 'reject') {
  if (actingOn.value) return
  actingOn.value = userId
  pendingError.value = null
  try {
    await apiFetchData(`/groups/${encodeURIComponent(shell.value.id)}/members/${encodeURIComponent(userId)}/${action}`, { method: 'POST', body: {} })
    pending.value = pending.value.filter(row => row.userId !== userId)
    await refreshShell()
  } catch (cause) { pendingError.value = getApiErrorMessage(cause) || `Couldn’t ${action} this request.` }
  finally { actingOn.value = null }
}

async function toggleMarv(add: boolean) {
  const marv = shell.value.marv
  if (!marv || busy.value) return
  if (!add) {
    const ok = await confirm({ header: 'Remove @marv?', message: '@marv will no longer respond to mentions in this group.', confirmLabel: 'Remove', confirmSeverity: 'danger' })
    if (!ok) return
  }
  busy.value = 'marv'
  error.value = null
  try {
    await apiFetchData(add ? `/groups/${encodeURIComponent(shell.value.id)}/marv` : `/groups/${encodeURIComponent(shell.value.id)}/members/${encodeURIComponent(marv.userId)}`, { method: add ? 'POST' : 'DELETE' })
    shell.value = { ...shell.value, marv: { ...marv, isMember: add } }
  } catch (cause) { error.value = getApiErrorMessage(cause) || 'Couldn’t update @marv.' }
  finally { busy.value = null }
}

async function saveFeatured(isFeatured: boolean, order: number) {
  if (busy.value) return
  busy.value = 'featured'
  error.value = null
  try {
    adopt(await apiFetchData<CommunityGroupShell>(`/groups/${encodeURIComponent(shell.value.id)}`, { method: 'PATCH', body: { isFeatured, featuredOrder: order ?? 0 } }))
  } catch (cause) { error.value = getApiErrorMessage(cause) || 'Couldn’t update featuring.'; featured.value = shell.value.isFeatured }
  finally { busy.value = null }
}

async function leave() {
  if (busy.value) return
  const ok = await confirm({ header: 'Leave group?', message: 'You’ll lose group and channel access. Rejoining will not restore private channel invitations.', confirmLabel: 'Leave', confirmSeverity: 'danger' })
  if (!ok) return
  busy.value = 'leave'
  try {
    await apiFetchData(`/groups/${encodeURIComponent(shell.value.id)}/leave`, { method: 'POST', body: {} })
    invalidateMyGroups()
    await navigateTo('/groups')
  } catch (cause) { error.value = getApiErrorMessage(cause) || 'Couldn’t leave.' }
  finally { busy.value = null }
}

async function copyInvite() {
  try {
    await navigator.clipboard.writeText(`${window.location.origin}/g/${slug.value}`)
    toast.push({ title: 'Invite link copied', tone: 'success', durationMs: 1400 })
  } catch { toast.push({ title: 'Couldn’t copy the link', tone: 'error', durationMs: 1800 }) }
}

const feedCallback: GroupFeedCallback = {
  onMarvChanged: (payload) => {
    const s = shell.value
    if (s.id !== payload.groupId || !s.marv) return
    shell.value = { ...s, marv: { ...s.marv, isMember: payload.isMember } }
  },
}
onMounted(() => { addGroupFeedCallback(feedCallback); subscribeGroups([props.group.id]) })
onBeforeUnmount(() => { removeGroupFeedCallback(feedCallback); unsubscribeGroups([props.group.id]) })

function onShellUpdated(next: CommunityGroupShell) { adopt(next); void refreshShell() }
</script>
