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
        <h1 class="text-lg font-bold moh-text truncate">
          Pending requests
        </h1>
      </div>

      <AppInlineAlert v-if="error" severity="danger" class="mb-3">
        {{ error }}
      </AppInlineAlert>

      <AppSubtleSectionLoader :loading="shellLoading || loading" min-height-class="min-h-[120px]">
        <p v-if="!shellLoading && notApplicableReason" class="text-sm moh-text-muted py-6 text-center leading-relaxed">
          {{ notApplicableReason }}
        </p>
        <p v-else-if="!shellLoading && !loading && !pending.length" class="text-sm moh-text-muted py-6 text-center">
          No pending requests.
        </p>
        <ul v-else-if="pending.length" class="divide-y moh-border rounded-xl border moh-border overflow-hidden moh-surface">
          <li
            v-for="row in pending"
            :key="row.userId"
            class="flex flex-wrap items-center justify-between gap-3 px-3 py-3"
          >
            <div class="min-w-0">
              <NuxtLink
                :to="row.username ? `/u/${encodeURIComponent(row.username)}` : '#'"
                class="font-semibold text-sm moh-text hover:underline truncate block"
                :class="!row.username ? 'pointer-events-none opacity-60' : ''"
              >
                {{ row.name || row.username || row.userId }}
              </NuxtLink>
              <div v-if="row.username" class="text-xs moh-text-muted">
                @{{ row.username }}
              </div>
            </div>
            <div class="flex gap-2 shrink-0">
              <Button
                label="Approve"
                size="small"
                rounded
                :loading="pendingActionId === row.userId"
                @click="approve(row.userId)"
              />
              <Button
                label="Reject"
                size="small"
                rounded
                severity="secondary"
                :loading="pendingActionId === row.userId"
                @click="reject(row.userId)"
              />
            </div>
          </li>
        </ul>
      </AppSubtleSectionLoader>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { CommunityGroupPendingMember, CommunityGroupShell } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

const route = useRoute()
const slug = computed(() => String(route.params.slug ?? '').trim())

definePageMeta({ layout: 'app', title: 'Pending', hideTopBar: true, ssr: false })

const { apiFetchData } = useApiClient()

const shell = ref<CommunityGroupShell | null>(null)
const shellLoading = ref(true)
const pending = ref<CommunityGroupPendingMember[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const pendingActionId = ref<string | null>(null)

/** Owner/mod on an open-join group: explain instead of a blank 404. */
const notApplicableReason = computed(() => {
  if (shellLoading.value || !shell.value || !isMod.value) return ''
  if (shell.value.joinPolicy !== 'approval') {
    return 'This group is open to join — there are no requests to approve.'
  }
  return ''
})

const isMod = computed(() => {
  const m = shell.value?.viewerMembership
  if (!m || m.status !== 'active') return false
  return m.role === 'owner' || m.role === 'moderator'
})

async function loadShell(opts?: { spinner?: boolean }) {
  const sp = opts?.spinner !== false
  if (sp) shellLoading.value = true
  try {
    shell.value = await apiFetchData<CommunityGroupShell>(`/groups/by-slug/${encodeURIComponent(slug.value)}`)
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

async function loadPending() {
  const s = shell.value
  if (!s || !isMod.value || s.joinPolicy !== 'approval') {
    pending.value = []
    return
  }
  loading.value = true
  error.value = null
  try {
    pending.value = await apiFetchData<CommunityGroupPendingMember[]>(
      `/groups/${encodeURIComponent(s.id)}/pending-members`,
    )
  } catch (e: unknown) {
    const msg = getApiErrorMessage(e) || ''
    const lower = msg.toLowerCase()
    if (lower.includes('not allowed') || lower.includes('forbidden')) {
      throw createError({ statusCode: 404, statusMessage: 'Not found' })
    }
    error.value = msg || 'Failed to load pending requests.'
    pending.value = []
  } finally {
    loading.value = false
  }
}

async function approve(userId: string) {
  const s = shell.value
  if (!s || pendingActionId.value) return
  pendingActionId.value = userId
  try {
    await apiFetchData(`/groups/${encodeURIComponent(s.id)}/members/${encodeURIComponent(userId)}/approve`, {
      method: 'POST',
      body: {},
    })
    await loadPending()
    await loadShell({ spinner: false })
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Approve failed.'
  } finally {
    pendingActionId.value = null
  }
}

async function reject(userId: string) {
  const s = shell.value
  if (!s || pendingActionId.value) return
  pendingActionId.value = userId
  try {
    await apiFetchData(`/groups/${encodeURIComponent(s.id)}/members/${encodeURIComponent(userId)}/reject`, {
      method: 'POST',
      body: {},
    })
    await loadPending()
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Reject failed.'
  } finally {
    pendingActionId.value = null
  }
}

onMounted(async () => {
  try {
    await loadShell()
    if (!isMod.value) {
      throw createError({ statusCode: 404, statusMessage: 'Not found' })
    }
    if (shell.value?.joinPolicy === 'approval') {
      await loadPending()
    }
  } catch (e: unknown) {
    if ((e as { statusCode?: number })?.statusCode === 404) throw e
    error.value = getApiErrorMessage(e) || 'Could not load this page.'
  }
})
</script>
