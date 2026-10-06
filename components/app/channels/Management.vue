<template>
  <Dialog v-model:visible="visible" modal :header="channel ? `${channel.icon ? `${channel.icon} ` : '#'}${channelTitle(channel)}` : 'New channel'" class="w-full max-w-lg">
    <form class="flex flex-col gap-4" @submit.prevent="save">
      <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
      <div v-if="!fixedIdentity && (!channel || channel.capabilities.canManage)" class="text-sm">
        <span id="channel-icon-label">Icon</span>
        <div class="mt-1 flex items-center gap-3">
          <span class="flex size-12 items-center justify-center rounded-xl border moh-border bg-[var(--moh-surface-1)]" aria-hidden="true"><AppChannelsChannelIcon :channel="{ icon, privacy: privateChannel ? 'private' : 'normal' }" :size="26" /></span>
          <button type="button" class="moh-focus min-h-11 rounded-lg border moh-border px-3 text-sm font-medium" :aria-expanded="iconsOpen" aria-controls="channel-icon-grid" @click="iconsOpen = !iconsOpen">{{ icon ? 'Change icon' : 'Choose icon' }}</button>
          <button v-if="icon" type="button" class="moh-focus min-h-11 px-2 text-sm moh-text-muted" @click="icon = null">Use #</button>
        </div>
        <div class="icon-drawer" :data-open="iconsOpen">
          <div class="icon-drawer-inner">
            <div id="channel-icon-grid" role="radiogroup" aria-labelledby="channel-icon-label" class="grid grid-cols-6 gap-1 pt-2">
              <button v-for="(option, index) in CHANNEL_ICONS" :key="option" type="button" role="radio" :aria-checked="icon === option" :aria-label="`Use ${option}`" :tabindex="iconsOpen ? 0 : -1" :style="{ '--i': index }" class="icon-option moh-focus flex size-11 items-center justify-center rounded-xl border-2 text-[22px]" :class="icon === option ? 'border-[rgb(var(--moh-brass-rgb))] bg-[var(--moh-surface-1)]' : 'border-transparent hover:bg-[var(--moh-surface-1)]'" @click="icon = option; iconsOpen = false">{{ option }}</button>
            </div>
          </div>
        </div>
      </div>
      <label v-if="!fixedIdentity" class="text-sm">Display name<InputText v-model="displayName" class="mt-1 w-full" maxlength="80" placeholder="Morning Workout" @input="syncHandle" /></label>
      <label v-if="!fixedIdentity" class="text-sm">Handle<span class="mt-1 flex items-center gap-1"><span class="moh-text-muted" aria-hidden="true">#</span><InputText v-model="name" class="w-full" maxlength="80" placeholder="morning-workout" aria-describedby="channel-handle-hint" required @input="handleTouched = true" /></span><span id="channel-handle-hint" class="mt-1 block text-xs moh-text-soft">Lowercase letters, numbers and hyphens. It doesn’t have to match the display name.</span></label>
      <label class="text-sm">Topic<textarea v-model="topic" class="moh-focus mt-1 min-h-20 w-full rounded-lg border moh-border bg-transparent p-3" maxlength="500" :disabled="!!channel && !channel.capabilities.canManage" /></label>
      <p v-if="fixedIdentity" class="text-xs moh-text-soft">The name and icon of this default channel can’t be changed.</p>
      <label v-if="!channel" class="flex min-h-11 items-center gap-3 text-sm"><input v-model="privateChannel" type="checkbox">Private channel</label>
      <p class="text-sm moh-text-muted">{{ privateChannel ? 'Only invited members can see this channel and its retained history. Private channels stay private.' : `Everyone in ${group.name} can see this channel.` }}</p>
      <Button v-if="!channel || channel.capabilities.canManage" type="submit" :label="channel ? 'Save changes' : 'Create channel'" :loading="busy" />
    </form>
    <template v-if="channel">
      <div class="mt-5 border-t moh-border pt-4"><label class="text-sm">Notifications<select v-model="preference" class="moh-focus mt-2 min-h-11 w-full rounded-lg border moh-border bg-transparent px-3" @change="updatePreference"><option value="all">All messages</option><option value="mentions">Mentions &amp; replies</option><option value="off">Off</option></select></label><p class="mt-2 text-xs moh-text-muted">Numbers show mentions and followed replies. Off silences pushes and activity dots; personal attention remains in For you.</p></div>
      <div v-if="marv?.enabled" class="mt-5 border-t moh-border pt-4">
        <h3 class="font-semibold">MARV</h3>
        <p class="mt-2 text-sm moh-text-muted">{{ !marv.inGroup ? 'Add MARV to the group before inviting him here.' : marv.participating ? 'Replies when mentioned in this channel.' : 'MARV is not in this channel.' }}</p>
        <Button v-if="marv.canManage && marv.inGroup" class="mt-3" :label="marv.participating ? 'Remove MARV' : 'Invite MARV'" :loading="busy" @click="marvConfirm = true" />
      </div>
      <div v-if="privateChannel" class="mt-5 border-t moh-border pt-4"><h3 class="font-semibold">Members</h3><div v-for="member in members" :key="member.user.id" class="flex min-h-11 items-center justify-between gap-2 text-sm"><span>{{ member.user.name ?? member.user.username }}</span><button v-if="channel.capabilities.canInvite && member.user.id !== user?.id" type="button" class="moh-focus min-h-11 px-2" @click="removeTarget = member">Remove</button></div>
        <template v-if="channel.capabilities.canInvite"><InputText v-model="memberQuery" class="mt-3 w-full" placeholder="Find a group member" aria-label="Find a group member to add" /><button v-for="member in candidates" :key="member.userId" type="button" class="moh-focus flex min-h-11 w-full items-center justify-between text-sm" @click="inviteTarget = member"><span>{{ member.name ?? member.username }}</span><span>Add</span></button></template>
        <button type="button" class="moh-focus mt-2 min-h-11 text-sm text-red-600" @click="leaveConfirm = true">Leave channel</button>
      </div>
      <div v-if="channel.capabilities.canManage && !channel.defaultPurpose" class="mt-5 border-t moh-border pt-3"><button type="button" class="moh-focus min-h-11 text-sm" :class="channel.archivedAt ? '' : 'text-red-600'" @click="archiveConfirm = true">{{ channel.archivedAt ? 'Restore channel' : 'Archive channel' }}</button></div>
    </template>
    <Dialog v-model:visible="marvConfirm" modal :header="marv?.participating ? 'Remove MARV?' : 'Invite MARV?'" class="w-full max-w-sm">
      <p class="mb-4">{{ marv?.participating ? 'MARV will stop replying here. Existing replies remain.' : 'MARV can use retained history here and in the group’s normal channels. Replies use the requesting member’s consent and credits. Private history stays in this channel.' }}</p>
      <Button :label="marv?.participating ? 'Remove MARV' : 'Invite MARV'" :loading="busy" @click="setMarv" />
    </Dialog>
    <Dialog :visible="!!inviteTarget" modal header="Add member?" class="w-full max-w-sm" @update:visible="inviteTarget = undefined"><p class="mb-4">{{ inviteTarget?.name ?? inviteTarget?.username }} can read all retained messages and attachments immediately.</p><Button label="Add member" :loading="busy" @click="addMember" /></Dialog>
    <Dialog :visible="!!removeTarget || leaveConfirm" modal :header="leaveConfirm ? 'Leave channel?' : 'Remove member?'" class="w-full max-w-sm" @update:visible="removeTarget = undefined; leaveConfirm = false"><p class="mb-4">Access ends immediately. Returning requires a new invitation.</p><Button :label="leaveConfirm ? 'Leave channel' : 'Remove member'" severity="danger" :loading="busy" @click="removeMember" /></Dialog>
    <Dialog v-model:visible="archiveConfirm" modal :header="channel?.archivedAt ? 'Restore channel?' : 'Archive channel?'" class="w-full max-w-sm"><p class="mb-4">{{ channel?.archivedAt ? 'Members can send messages again.' : 'Members can still read authorized history. New messages and changes will stop.' }}</p><Button :label="channel?.archivedAt ? 'Restore' : 'Archive'" :loading="busy" @click="archive" /></Dialog>
  </Dialog>
</template>
<script setup lang="ts">
import type { GroupChannelMarvStatusDto } from '~/types/api-contracts.gen'
import type { CommunityGroupShell, CommunityGroupMemberListItem, GroupChannel } from '~/types/api'
import { channelHandleFor, channelPath, channelTitle } from '~/utils/channels/reducer'
import { getSafeUserErrorMessage } from '~/utils/api-error'
const props = defineProps<{ group: CommunityGroupShell; channel?: GroupChannel }>()
const visible = defineModel<boolean>({ required: true })
const emit = defineEmits<{ updated: [] }>()
const { apiFetchData } = useApiClient(), { user } = useAuth()
const CHANNEL_ICONS = ['📣', '💬', '🔥', '💪', '🏔️', '📸', '🎵', '📚', '🙏', '☕', '🍺', '🏋️', '🚴', '🎯', '🧠', '❤️', '💡', '📅', '🛠️', '🌲', '🌅', '⚔️', '📝', '🎉']
const icon = ref<string | null>(null), iconsOpen = ref(false)
const name = ref(''), displayName = ref(''), handleTouched = ref(false), topic = ref(''), privateChannel = ref(false), preference = ref('mentions'), busy = ref(false), error = ref<string | null>(null)
const memberQuery = ref(''), candidates = ref<CommunityGroupMemberListItem[]>([])
type Member = { user: { id: string; name: string | null; username: string | null } }
const members = ref<Member[]>([]), inviteTarget = ref<CommunityGroupMemberListItem>(), removeTarget = ref<Member>(), leaveConfirm = ref(false), archiveConfirm = ref(false)
const marv = ref<GroupChannelMarvStatusDto | null>(null), marvConfirm = ref(false)
async function loadMarv() { marv.value = props.channel ? await apiFetchData<GroupChannelMarvStatusDto>(`${path.value}/marv`) : null }
async function setMarv() { await run(async () => { await apiFetchData(`${path.value}/marv`, { method: 'PUT', body: { invited: !marv.value?.participating, historyAcknowledged: true } }); marvConfirm.value = false; await loadMarv() }) }
const fixedIdentity = computed(() => !!props.channel && !props.channel.capabilities.canRename)
const path = computed(() => channelPath(props.group.id, props.channel?.id ?? ''))
async function run(operation: () => Promise<void>) { busy.value = true; error.value = null; try { await operation(); emit('updated') } catch (cause) { error.value = getSafeUserErrorMessage(cause) } finally { busy.value = false } }
async function loadMembers() { if (props.channel?.privacy === 'private') members.value = await apiFetchData<Member[]>(`${path.value}/members`) }
function syncHandle() { if (!props.channel && !handleTouched.value) name.value = channelHandleFor(displayName.value) }
async function save() { await run(async () => { if (props.channel) await apiFetchData(path.value, { method: 'PATCH', body: { ...(props.channel.capabilities.canRename ? { name: name.value, displayName: displayName.value.trim() || null } : {}), topic: topic.value, ...(props.channel.capabilities.canRename ? { icon: icon.value } : {}) } }); else await apiFetchData(`/groups/${props.group.id}/channels`, { method: 'POST', body: { name: name.value, displayName: displayName.value.trim() || null, topic: topic.value, icon: icon.value, privacy: privateChannel.value ? 'private' : 'normal' } }); visible.value = false }) }
async function updatePreference() { await run(async () => { await apiFetchData(`${path.value}/preference`, { method: 'PUT', body: { preference: preference.value } }) }) }
async function addMember() { if (!inviteTarget.value) return; await run(async () => { await apiFetchData(`${path.value}/members`, { method: 'POST', body: { userId: inviteTarget.value!.userId, historyAcknowledged: true } }); inviteTarget.value = undefined; await loadMembers() }) }
async function removeMember() { const userId = leaveConfirm.value ? user.value?.id : removeTarget.value?.user.id; if (!userId) return; await run(async () => { await apiFetchData(`${path.value}/members/${userId}`, { method: 'DELETE' }); removeTarget.value = undefined; if (leaveConfirm.value) { leaveConfirm.value = false; visible.value = false } else await loadMembers() }) }
async function archive() { await run(async () => { await apiFetchData(path.value, { method: 'PATCH', body: { archived: !props.channel?.archivedAt } }); archiveConfirm.value = false; visible.value = false }) }
watch(visible, async open => { if (!open) return; name.value = props.channel?.name ?? ''; displayName.value = props.channel?.displayName ?? ''; handleTouched.value = !!props.channel; icon.value = props.channel?.icon ?? null; iconsOpen.value = false; topic.value = props.channel?.topic ?? ''; privateChannel.value = props.channel?.privacy === 'private'; preference.value = props.channel?.preference ?? 'mentions'; error.value = null; marv.value = null; await run(async () => { await Promise.all([loadMembers(), loadMarv()]) }) })
let queryGeneration = 0
watch(memberQuery, async query => {
  const generation = ++queryGeneration
  if (!query.trim()) { candidates.value = []; return }
  try {
    const list = await apiFetchData<CommunityGroupMemberListItem[]>(`/groups/${props.group.id}/members`, { query: { q: query } })
    if (generation === queryGeneration) candidates.value = list.filter(member => !members.value.some(current => current.user.id === member.userId))
  } catch (cause) { if (generation === queryGeneration) error.value = getSafeUserErrorMessage(cause) }
})
onBeforeUnmount(() => { queryGeneration++ })
</script>
<style scoped>
.icon-drawer { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.5s cubic-bezier(0.22, 1, 0.36, 1); }
.icon-drawer[data-open='true'] { grid-template-rows: 1fr; }
.icon-drawer-inner { min-height: 0; overflow: hidden; visibility: hidden; transition: visibility 0s linear 0.5s; }
.icon-drawer[data-open='true'] .icon-drawer-inner { visibility: visible; transition-delay: 0s; }
.icon-option { opacity: 0; transform: translateY(8px) scale(0.8); transition: opacity 0.18s ease, transform 0.18s ease, background-color 0.15s ease; }
.icon-drawer[data-open='true'] .icon-option { opacity: 1; transform: none; transition: opacity 0.35s ease-out calc(var(--i) * 22ms + 120ms), transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) calc(var(--i) * 22ms + 120ms), background-color 0.15s ease; }
@media (prefers-reduced-motion: reduce) { .icon-drawer, .icon-option, .icon-drawer[data-open='true'] .icon-option { transition: none; } }
</style>
