<template>
  <AppPageContent bottom="standard">
    <div class="w-full max-w-lg mx-auto px-3 py-4 sm:px-4">
      <div class="flex items-center gap-2 mb-4">
        <NuxtLink
          :to="`/g/${encodeURIComponent(slug)}`"
          class="moh-tap flex h-9 w-9 items-center justify-center rounded-full moh-surface-hover"
          aria-label="Back to group"
        >
          <Icon name="tabler:chevron-left" class="text-lg" aria-hidden="true" />
        </NuxtLink>
        <h1 class="text-lg font-bold moh-text truncate flex-1">
          Pending invites
        </h1>
        <Button
          v-if="shell"
          label="Invite"
          rounded
          size="small"
          @click="inviteOpen = true"
        >
          <template #icon>
            <Icon name="tabler:user-plus" aria-hidden="true" />
          </template>
        </Button>
      </div>

      <p v-if="!shellLoading && shell" class="text-xs moh-text-muted mb-3">
        People you've invited to <span class="font-semibold moh-text">{{ shell.name }}</span> who
        haven't responded yet. Cancelling an invite removes their notification too.
      </p>

      <AppInlineAlert v-if="error" severity="danger" class="mb-3">
        {{ error }}
      </AppInlineAlert>

      <AppSubtleSectionLoader :loading="shellLoading || (loading && !invites.length)" min-height-class="min-h-[120px]">
        <p
          v-if="!shellLoading && !loading && !invites.length"
          class="text-sm moh-text-muted py-8 text-center"
        >
          No pending invites. Tap <span class="font-semibold moh-text">Invite</span> to add someone.
        </p>

        <ul
          v-else-if="invites.length"
          class="divide-y moh-border rounded-xl border moh-border overflow-hidden moh-surface"
        >
          <li
            v-for="inv in invites"
            :key="inv.id"
            class="flex flex-wrap items-start gap-3 px-3 py-3"
          >
            <NuxtLink
              :to="inv.invitee.username ? `/u/${encodeURIComponent(inv.invitee.username)}` : '#'"
              class="shrink-0"
              :class="!inv.invitee.username ? 'pointer-events-none' : ''"
            >
              <AppUserAvatar :user="inv.invitee" size-class="h-10 w-10" />
            </NuxtLink>

            <div class="min-w-0 flex-1">
              <AppUserIdentityLine :user="inv.invitee" class="min-w-0" />
              <div class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] moh-text-muted">
                <span>Invited {{ formatRelativeTime(inv.createdAt) }}</span>
                <span aria-hidden="true">·</span>
                <span>Expires {{ expiresLabel(inv.expiresAt) }}</span>
                <template v-if="inv.invitedBy.id !== viewerUserId">
                  <span aria-hidden="true">·</span>
                  <span class="truncate">
                    by <span class="moh-text font-medium">{{ inv.invitedBy.name || inv.invitedBy.username || 'a moderator' }}</span>
                  </span>
                </template>
                <template v-if="inv.lastDeclinedAt">
                  <span aria-hidden="true">·</span>
                  <span class="text-amber-600 dark:text-amber-400">Declined previously</span>
                </template>
              </div>
              <p
                v-if="inv.message"
                class="mt-1 text-xs moh-text whitespace-pre-wrap break-words rounded-md bg-[var(--moh-surface-2)] px-2 py-1.5"
              >
                "{{ inv.message }}"
              </p>
            </div>

            <div class="shrink-0 self-center">
              <Button
                label="Cancel"
                size="small"
                severity="secondary"
                rounded
                :loading="actingInviteId === inv.id"
                :disabled="!!actingInviteId && actingInviteId !== inv.id"
                @click="cancelOne(inv)"
              />
            </div>
          </li>
        </ul>
      </AppSubtleSectionLoader>

      <AppGroupsInviteToGroupDialog
        v-if="shell && isMod"
        v-model="inviteOpen"
        :shell="shell"
        @invited="onInvitedFromDialog"
      />
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type {
  CommunityGroupInvite,
  CommunityGroupInviteStatus,
  CommunityGroupShell,
} from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { formatRelativeTime } from '~/utils/time-format'

const route = useRoute()
const slug = computed(() => String(route.params.slug ?? '').trim())

definePageMeta({ layout: 'app', title: 'Pending invites', hideTopBar: true, ssr: false })

const { apiFetchData } = useApiClient()
const { confirm } = useAppConfirm()
const { push: pushToast } = useAppToast()
const { user: authUser } = useAuth()
const groupInvitesApi = useGroupInvites()
const {
  addGroupInviteCallback,
  removeGroupInviteCallback,
} = usePresence()

const viewerUserId = computed(() => authUser.value?.id ?? null)

const shell = ref<CommunityGroupShell | null>(null)
const shellLoading = ref(true)
const invites = ref<CommunityGroupInvite[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const actingInviteId = ref<string | null>(null)
const inviteOpen = ref(false)

const isMod = computed(() => {
  const m = shell.value?.viewerMembership
  if (!m || m.status !== 'active') return false
  return m.role === 'owner' || m.role === 'moderator'
})

async function loadShell(opts?: { spinner?: boolean }) {
  const sp = opts?.spinner !== false
  if (sp) shellLoading.value = true
  try {
    shell.value = await apiFetchData<CommunityGroupShell>(
      `/groups/by-slug/${encodeURIComponent(slug.value)}`,
    )
  } catch (e: unknown) {
    const err = e as { statusCode?: number; status?: number; response?: { status?: number } }
    const status = Number(err?.statusCode ?? err?.status ?? err?.response?.status ?? 0) || null
    if (status === 404 || status === 403) {
      throw createError({ statusCode: 404, statusMessage: 'Not found' })
    }
    throw e
  } finally {
    if (sp) shellLoading.value = false
  }
}

async function loadInvites() {
  const s = shell.value
  if (!s || !isMod.value) {
    invites.value = []
    return
  }
  loading.value = true
  error.value = null
  try {
    const list = await groupInvitesApi.listGroupInvites(s.id)
    invites.value = list
  } catch (e: unknown) {
    const msg = getApiErrorMessage(e) || ''
    const lower = msg.toLowerCase()
    if (lower.includes('not allowed') || lower.includes('forbidden')) {
      throw createError({ statusCode: 404, statusMessage: 'Not found' })
    }
    error.value = msg || 'Failed to load pending invites.'
  } finally {
    loading.value = false
  }
}

async function cancelOne(inv: CommunityGroupInvite) {
  const s = shell.value
  if (!s || actingInviteId.value) return
  const target = inv.invitee.name || inv.invitee.username || 'this person'
  const ok = await confirm({
    header: 'Cancel invite?',
    message: `${target} will lose access to this invite. You can invite them again later.`,
    confirmLabel: 'Cancel invite',
    confirmSeverity: 'danger',
  })
  if (!ok) return
  actingInviteId.value = inv.id
  try {
    await groupInvitesApi.cancelInvite({ groupId: s.id, inviteId: inv.id })
    invites.value = invites.value.filter((row) => row.id !== inv.id)
    pushToast({ title: 'Invite cancelled', tone: 'success' })
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Could not cancel invite.'
  } finally {
    actingInviteId.value = null
  }
}

function onInvitedFromDialog() {
  // The send endpoint already emits a `groups:invite-updated` to the inviter,
  // which our realtime callback will catch and prepend. We refetch as a safety
  // net — listGroupInvites returns the canonical row including the inviter
  // identity for cross-mod visibility.
  void loadInvites()
}

function expiresLabel(iso: string): string {
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return 'soon'
  const diffMs = ts - Date.now()
  if (diffMs <= 0) return 'soon'
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 60) return `in ${Math.max(1, diffMin)}m`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `in ${diffHr}h`
  const diffDay = Math.floor(diffHr / 24)
  return diffDay === 1 ? 'in 1 day' : `in ${diffDay} days`
}

// ── Realtime: keep the list fresh across tabs / mods. ──────────────────────
//
// We get `groups:invite-updated` whenever a pending invite the viewer issued
// flips to accepted / declined / cancelled / expired (or is re-issued). Patch
// in place per the realtime-first rule (.cursor/rules/60-realtime-first.mdc).
const inviteCb = {
  onReceived(payload: { invite: { id: string; status: CommunityGroupInviteStatus; [key: string]: unknown } }) {
    if (!shell.value) return
    const id = payload?.invite?.id
    if (!id) return
    if (payload.invite.status !== 'pending') return
    // We received an invite (we are the invitee); not relevant to this page,
    // which lists invites we've sent. Ignore.
  },
  onUpdated(payload: { invite: { id: string; status: CommunityGroupInviteStatus; [key: string]: unknown } }) {
    const id = payload?.invite?.id
    const status = payload?.invite?.status
    if (!id || !status) return
    // Removed (no longer pending) — drop from list.
    if (status !== 'pending') {
      const before = invites.value.length
      invites.value = invites.value.filter((r) => r.id !== id)
      if (before !== invites.value.length) return
      // Wasn't in the list (maybe a fresh send for someone else from another
      // tab) — fall through to refetch.
    }
    // Pending insert/update: the WS payload may be a partial. Refetch the
    // canonical list rather than reconstruct here (cheap; owner/mod-scoped).
    void loadInvites()
  },
}

onMounted(async () => {
  try {
    await loadShell()
    if (!isMod.value) {
      throw createError({ statusCode: 404, statusMessage: 'Not found' })
    }
    await loadInvites()
  } catch (e: unknown) {
    if ((e as { statusCode?: number })?.statusCode === 404) throw e
    error.value = getApiErrorMessage(e) || 'Could not load this page.'
  }
  addGroupInviteCallback(inviteCb)
})
onBeforeUnmount(() => removeGroupInviteCallback(inviteCb))
</script>
