<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="`Invite to ${shell.name}`"
    :style="{ width: '420px' }"
    :closable="!anyInflight"
    @hide="onHide"
    @show="onShow"
  >
    <div class="space-y-3">
      <p class="text-xs moh-text-muted">
        Search for someone to invite. They'll get a notification and can accept
        from their inbox.
      </p>

      <label class="block text-sm font-medium moh-text">Personal note <span class="moh-text-muted font-normal">(optional)</span></label>
      <Textarea
        v-model="note"
        class="w-full min-h-[60px]"
        maxlength="500"
        :disabled="anyInflight"
        placeholder="Add a quick note — they'll see it with the invite."
      />

      <div>
        <label class="block text-sm font-medium moh-text mb-1">Find someone</label>
        <InputText
          v-model="query"
          class="w-full"
          placeholder="Search by username or name…"
          aria-label="User search"
          autofocus
          @keydown.enter.prevent="onSubmitFirst"
        />
      </div>

      <div v-if="loading" class="text-xs moh-text-muted">Searching…</div>
      <AppInlineAlert v-if="searchError" severity="danger">{{ searchError }}</AppInlineAlert>

      <div
        v-if="rows.length > 0"
        class="max-h-72 overflow-y-auto rounded-lg border moh-border divide-y divide-gray-100 dark:divide-white/5"
      >
        <button
          v-for="row in rows"
          :key="row.user.id"
          type="button"
          class="flex w-full items-start gap-3 px-3 py-2 text-left transition-colors"
          :class="rowClass(row)"
          :disabled="!isSelectable(row) || rowInflight[row.user.id]"
          :title="!isSelectable(row) ? hintFor(row) : undefined"
          @click="onPick(row)"
        >
          <AppUserAvatar :user="row.user" size-class="h-9 w-9" />
          <div class="min-w-0 flex-1">
            <AppUserIdentityLine :user="row.user" class="min-w-0" />
            <p
              v-if="hintFor(row)"
              :class="['mt-0.5 text-[11px]', hintToneClass(row)]"
            >
              {{ hintFor(row) }}
            </p>
          </div>
          <div v-if="rowInflight[row.user.id]" class="shrink-0 self-center">
            <AppLogoLoader compact />
          </div>
          <div
            v-else-if="rowJustInvited[row.user.id]"
            class="shrink-0 self-center text-[11px] font-semibold text-green-600 dark:text-green-400 whitespace-nowrap"
          >
            Invited
          </div>
        </button>
      </div>

      <div
        v-else-if="!loading && !searchError"
        class="text-xs moh-text-muted px-1"
      >
        No matching people found.
      </div>

      <AppInlineAlert v-if="sendError" severity="danger">{{ sendError }}</AppInlineAlert>
    </div>

    <template #footer>
      <Button
        :label="anyInvited ? 'Done' : 'Close'"
        text
        severity="secondary"
        :disabled="anyInflight"
        @click="close"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import type {
  CommunityGroupInvitableUser,
  CommunityGroupInvitableUserStatus,
  CommunityGroupShell,
} from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

const props = defineProps<{
  modelValue: boolean
  shell: CommunityGroupShell
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'invited', payload: { inviteeUserId: string }): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const groupInvites = useGroupInvites()
const { push: pushToast } = useAppToast()

const note = ref('')
const query = ref('')
const rows = ref<CommunityGroupInvitableUser[]>([])
const loading = ref(false)
const searchError = ref<string | null>(null)
const sendError = ref<string | null>(null)
const rowInflight = ref<Record<string, boolean>>({})
const rowJustInvited = ref<Record<string, boolean>>({})

const anyInflight = computed(() => Object.values(rowInflight.value).some(Boolean))
const anyInvited = computed(() => Object.values(rowJustInvited.value).some(Boolean))

let searchTimer: ReturnType<typeof setTimeout> | null = null
let lastReqId = 0

async function runSearch(q: string) {
  const reqId = ++lastReqId
  loading.value = true
  searchError.value = null
  try {
    const res = await groupInvites.listInvitableUsers({
      groupId: props.shell.id,
      q: q || null,
      limit: 20,
    })
    if (reqId !== lastReqId) return
    rows.value = res
  } catch (e) {
    if (reqId !== lastReqId) return
    searchError.value = getApiErrorMessage(e) || 'Could not search.'
    rows.value = []
  } finally {
    if (reqId === lastReqId) loading.value = false
  }
}

watch(query, (q) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => void runSearch(q.trim()), 200)
})

function onShow() {
  void runSearch('')
}

function onHide() {
  query.value = ''
  rows.value = []
  searchError.value = null
  sendError.value = null
  rowInflight.value = {}
  rowJustInvited.value = {}
  note.value = ''
  if (searchTimer) {
    clearTimeout(searchTimer)
    searchTimer = null
  }
}

function close() {
  if (anyInflight.value) return
  visible.value = false
}

function isSelectable(row: CommunityGroupInvitableUser): boolean {
  const s = row.inviteStatus
  if (s.kind === 'self' || s.kind === 'banned') return false
  if (s.kind === 'member' || s.kind === 'pending_join_request') return false
  if (s.kind === 'declined_cooldown') return false
  return true
}

function rowClass(row: CommunityGroupInvitableUser): string {
  const justInvited = rowJustInvited.value[row.user.id]
  if (justInvited) return 'bg-green-50/60 dark:bg-green-900/15'
  if (!isSelectable(row)) return 'opacity-60 cursor-not-allowed'
  return 'hover:bg-gray-50 dark:hover:bg-zinc-900'
}

function formatCooldown(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return 'soon'
  }
}

function hintFor(row: CommunityGroupInvitableUser): string {
  const s: CommunityGroupInvitableUserStatus = row.inviteStatus
  switch (s.kind) {
    case 'self':
      return 'That\u2019s you.'
    case 'banned':
      return 'This account isn\u2019t available.'
    case 'member':
      if (s.role === 'owner') return 'Already the owner.'
      if (s.role === 'moderator') return 'Already a moderator.'
      return 'Already a member.'
    case 'pending_join_request':
      return 'Has a pending join request — approve them in Pending requests.'
    case 'pending_invite':
      return 'Already invited — clicking will re-send the invite.'
    case 'declined_cooldown':
      return `Declined recently. You can invite again on ${formatCooldown(s.canReinviteAt)}.`
    case 'declined_invitable':
      return 'Previously declined — you can invite again.'
    default:
      return ''
  }
}

function hintToneClass(row: CommunityGroupInvitableUser): string {
  const k = row.inviteStatus.kind
  if (k === 'declined_cooldown') return 'text-amber-600 dark:text-amber-400'
  if (k === 'declined_invitable' || k === 'pending_invite') return 'text-gray-500 dark:text-gray-400'
  if (k === 'member' || k === 'pending_join_request') return 'text-gray-500 dark:text-gray-400'
  return 'moh-text-muted'
}

async function onPick(row: CommunityGroupInvitableUser) {
  if (!isSelectable(row) || rowInflight.value[row.user.id]) return
  sendError.value = null
  rowInflight.value = { ...rowInflight.value, [row.user.id]: true }
  try {
    await groupInvites.sendInvite({
      groupId: props.shell.id,
      inviteeUserId: row.user.id,
      message: note.value.trim() || null,
    })
    rowJustInvited.value = { ...rowJustInvited.value, [row.user.id]: true }
    // Promote the row to "pending_invite" so a second click clearly re-sends.
    const updated: CommunityGroupInvitableUser = {
      ...row,
      inviteStatus: {
        kind: 'pending_invite',
        inviteId: '',
        lastNotifiedAt: new Date().toISOString(),
      },
    }
    rows.value = rows.value.map((r) => (r.user.id === row.user.id ? updated : r))
    pushToast({ title: `Invited @${row.user.username ?? row.user.name ?? 'them'}`, tone: 'success' })
    emit('invited', { inviteeUserId: row.user.id })
  } catch (e) {
    sendError.value = getApiErrorMessage(e) || 'Could not send that invite.'
  } finally {
    const next = { ...rowInflight.value }
    delete next[row.user.id]
    rowInflight.value = next
  }
}

function onSubmitFirst() {
  const first = rows.value.find((r) => isSelectable(r) && !rowInflight.value[r.user.id])
  if (first) void onPick(first)
}
</script>
