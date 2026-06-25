<template>
  <AppPageContent bottom="standard">
    <div class="w-full max-w-lg mx-auto px-3 py-4 sm:px-4 space-y-6">
      <div class="flex items-center gap-2">
        <NuxtLink
          :to="`/g/${encodeURIComponent(slug)}`"
          class="moh-tap flex h-9 w-9 items-center justify-center rounded-full moh-surface-hover"
          aria-label="Back to group"
        >
          <Icon name="tabler:chevron-left" class="text-lg" aria-hidden="true" />
        </NuxtLink>
        <h1 class="text-lg font-bold moh-text truncate">
          Group settings
        </h1>
      </div>

      <AppInlineAlert v-if="loadError" severity="danger">
        {{ loadError }}
      </AppInlineAlert>

      <div v-if="shellLoading" class="flex justify-center py-12">
        <AppLogoLoader />
      </div>

      <template v-else-if="shell">
        <section class="rounded-xl border moh-border moh-surface p-4 space-y-2">
          <h2 class="text-sm font-semibold moh-text">
            Notifications
          </h2>
          <p class="text-sm moh-text-muted">
            Per-group notification preferences are not available yet. Global settings are under
            <NuxtLink to="/settings/notifications" class="font-medium moh-text hover:underline">Settings → Notifications</NuxtLink>.
          </p>
        </section>

        <section
          v-if="isMod && shell.joinPolicy === 'approval'"
          class="rounded-xl border moh-border moh-surface p-4"
        >
          <NuxtLink
            :to="`/g/${encodeURIComponent(slug)}/pending`"
            class="text-sm font-semibold moh-text hover:underline inline-flex items-center gap-1"
          >
            Review pending requests
            <Icon name="tabler:chevron-right" class="text-base opacity-70" aria-hidden="true" />
          </NuxtLink>
        </section>

        <!-- Marv CTA: visible to owners/mods when Marv is configured -->
        <section
          v-if="isMod && shell.marv"
          class="rounded-xl border moh-border moh-surface p-4 space-y-3"
        >
          <div class="flex items-center gap-2">
            <NuxtLink :to="`/u/${encodeURIComponent(shell.marv.username ?? 'marv')}`" class="shrink-0" @click.stop>
              <span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--moh-premium)]/10">
                <Icon name="tabler:robot" class="text-base text-[color:var(--moh-premium)]" aria-hidden="true" />
              </span>
            </NuxtLink>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold moh-text">
                @{{ shell.marv.username ?? 'marv' }}
              </p>
              <p class="text-xs moh-text-muted">
                {{ shell.marv.isMember ? 'Active in this group — @marv will respond to mentions.' : '@marv is not in this group and will not respond to mentions.' }}
              </p>
            </div>
          </div>
          <Button
            v-if="!shell.marv.isMember"
            label="Add @marv to group"
            rounded
            size="small"
            :loading="marvBusy"
            @click="doAddMarv"
          />
          <Button
            v-else
            label="Remove @marv from group"
            rounded
            severity="secondary"
            size="small"
            :loading="marvBusy"
            @click="doRemoveMarv"
          />
        </section>

        <section v-if="canLeave" class="rounded-xl border border-red-200 dark:border-red-900/50 moh-surface p-4 space-y-3">
          <h2 class="text-sm font-semibold moh-text">
            Leave group
          </h2>
          <p class="text-sm moh-text-muted">
            You will stop seeing this group in your list and lose access to its posts.
          </p>
          <Button
            label="Leave group"
            rounded
            severity="danger"
            :loading="leaveBusy"
            @click="doLeave"
          />
        </section>
      </template>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { CommunityGroupShell } from '~/types/api'
import type { GroupFeedCallback } from '~/composables/presence/types'
import { getApiErrorMessage } from '~/utils/api-error'

const route = useRoute()
const slug = computed(() => String(route.params.slug ?? '').trim())
const { apiFetchData } = useApiClient()
const { addGroupFeedCallback, removeGroupFeedCallback, subscribeGroups, unsubscribeGroups } = usePresence()

definePageMeta({ layout: 'app', title: 'Group settings', hideTopBar: true, ssr: false })

const shell = ref<CommunityGroupShell | null>(null)
const shellLoading = ref(true)
const loadError = ref<string | null>(null)
const leaveBusy = ref(false)
const marvBusy = ref(false)
const { confirm } = useAppConfirm()

const isMod = computed(() => {
  const m = shell.value?.viewerMembership
  if (!m || m.status !== 'active') return false
  return m.role === 'owner' || m.role === 'moderator'
})

const canLeave = computed(() => {
  const m = shell.value?.viewerMembership
  if (!m || m.status !== 'active') return false
  return m.role !== 'owner'
})

async function loadShell() {
  shellLoading.value = true
  loadError.value = null
  try {
    const s = await apiFetchData<CommunityGroupShell>(`/groups/by-slug/${encodeURIComponent(slug.value)}`)
    shell.value = s
    if (!s.viewerMembership || s.viewerMembership.status !== 'active') {
      throw createError({ statusCode: 404, statusMessage: 'Not found' })
    }
  } catch (e: unknown) {
    shell.value = null
    const err = e as { statusCode?: number; status?: number; response?: { status?: number } }
    const status = Number(err?.statusCode ?? err?.status ?? err?.response?.status ?? 0) || null
    if (status === 404 || status === 403) {
      throw createError({ statusCode: 404, statusMessage: 'Not found' })
    }
    loadError.value = getApiErrorMessage(e) || 'Group not found.'
  } finally {
    shellLoading.value = false
  }
}

async function doAddMarv() {
  const s = shell.value
  if (!s || marvBusy.value) return
  marvBusy.value = true
  try {
    await apiFetchData(`/groups/${encodeURIComponent(s.id)}/marv`, { method: 'POST' })
    if (s.marv) s.marv = { ...s.marv, isMember: true }
  } catch (e: unknown) {
    loadError.value = getApiErrorMessage(e) || 'Could not add @marv.'
  } finally {
    marvBusy.value = false
  }
}

async function doRemoveMarv() {
  const s = shell.value
  if (!s || !s.marv || marvBusy.value) return
  const ok = await confirm({
    header: 'Remove @marv?',
    message: '@marv will no longer respond to mentions in this group.',
    confirmLabel: 'Remove',
    confirmSeverity: 'danger',
  })
  if (!ok) return
  marvBusy.value = true
  try {
    await apiFetchData(`/groups/${encodeURIComponent(s.id)}/members/${encodeURIComponent(s.marv.userId)}`, { method: 'DELETE' })
    if (s.marv) s.marv = { ...s.marv, isMember: false }
  } catch (e: unknown) {
    loadError.value = getApiErrorMessage(e) || 'Could not remove @marv.'
  } finally {
    marvBusy.value = false
  }
}

async function doLeave() {
  const s = shell.value
  if (!s || leaveBusy.value) return
  const ok = await confirm({
    header: 'Leave group?',
    message: "You'll lose access to the group's posts and feed. You can rejoin later.",
    confirmLabel: 'Leave',
    confirmSeverity: 'danger',
  })
  if (!ok) return
  leaveBusy.value = true
  try {
    await apiFetchData(`/groups/${encodeURIComponent(s.id)}/leave`, { method: 'POST', body: {} })
    await navigateTo('/groups')
  } catch (e: unknown) {
    loadError.value = getApiErrorMessage(e) || 'Could not leave.'
  } finally {
    leaveBusy.value = false
  }
}

// ─── Realtime: live Marv membership changes ───────────────────────────────────
// Other mods on the same group see Add/Remove CTA update without a manual reload.
const groupFeedCb: GroupFeedCallback = {
  onMarvChanged: (payload) => {
    const s = shell.value
    if (!s || s.id !== payload.groupId || !s.marv) return
    s.marv = { ...s.marv, isMember: payload.isMember }
  },
}

let subscribedGroupId: string | null = null

function syncRealtimeSubscription() {
  if (!import.meta.client) return
  const gid = shell.value?.id ?? null
  if (subscribedGroupId === gid) return
  if (subscribedGroupId) unsubscribeGroups([subscribedGroupId])
  subscribedGroupId = gid
  if (gid) subscribeGroups([gid])
}

watch(() => shell.value?.id, () => syncRealtimeSubscription())

onMounted(() => {
  if (import.meta.client) addGroupFeedCallback(groupFeedCb)
  void loadShell()
})

onActivated(() => {
  void loadShell()
})

onBeforeUnmount(() => {
  if (!import.meta.client) return
  removeGroupFeedCallback(groupFeedCb)
  if (subscribedGroupId) {
    unsubscribeGroups([subscribedGroupId])
    subscribedGroupId = null
  }
})
</script>
