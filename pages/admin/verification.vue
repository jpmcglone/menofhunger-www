<template>
  <AppPageContent bottom="standard">
  <div class="py-4 space-y-4">
    <div class="px-4">
      <AppPageHeader
        title="Verification"
        icon="pi-verified"
        description="Review and approve pending verification requests."
      >
        <template #leading>
          <Button
            class="md:hidden"
            text
            severity="secondary"
            icon="pi pi-chevron-left"
            aria-label="Back"
            @click="navigateTo('/admin')"
          />
        </template>
      </AppPageHeader>
    </div>

    <div class="px-4 flex flex-wrap items-center gap-2">
      <Select
        v-model="statusFilter"
        :options="statusOptions"
        option-label="label"
        option-value="value"
        placeholder="Status"
        class="w-[10rem]"
      />
      <InputText
        v-model="query"
        class="w-full sm:w-72"
        placeholder="Search username, name, phone, email…"
        @keydown.enter.prevent="loadRequests(true)"
      />
      <Button
        label="Search"
        icon="pi pi-search"
        severity="secondary"
        :loading="loading"
        :disabled="loading"
        @click="loadRequests(true)"
      />
    </div>

    <div v-if="error" class="px-4">
      <AppInlineAlert severity="danger">
        {{ error }}
      </AppInlineAlert>
    </div>

    <div v-else-if="!loading && items.length === 0" class="px-4 text-sm moh-text-muted">
      No verification requests yet.
    </div>

    <div v-else class="divide-y divide-gray-200 dark:divide-zinc-800">
      <div
        v-for="item in items"
        :key="item.id"
        class="px-4 py-3 space-y-2 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 items-start gap-3">
            <AppUserAvatar
              :user="{ id: item.user.id, name: item.user.name, username: item.user.username }"
              size-class="h-10 w-10"
              bg-class="moh-surface"
            />

            <div class="min-w-0 space-y-1">
              <div class="flex flex-wrap items-center gap-2 min-w-0">
                <div class="font-semibold truncate">
                  {{ item.user.name || item.user.username || 'User' }}
                </div>
                <Tag :value="statusLabel(item.status)" :severity="statusSeverity(item.status)" class="!text-xs" />
                <AppVerifiedBadge
                  :status="item.user.verifiedStatus"
                  :premium="Boolean(item.user.premium)"
                  :premium-plus="Boolean(item.user.premiumPlus)"
                />
              </div>

              <div class="text-sm truncate">
                <NuxtLink
                  v-if="item.user.usernameIsSet && item.user.username"
                  :to="`/u/${item.user.username}`"
                  class="font-semibold transition-opacity hover:opacity-85"
                  :class="usernameColorClass(item.user)"
                >
                  @{{ item.user.username }}
                </NuxtLink>
                <span v-else class="moh-text-muted">Username not set</span>
              </div>

              <div class="text-xs moh-text-muted">
                {{ formatDateTime(item.createdAt) }}
                <span class="mx-2">·</span>
                <span class="font-mono">{{ item.user.phone }}</span>
                <span v-if="item.user.email" class="mx-2">·</span>
                <span v-if="item.user.email">{{ item.user.email }}</span>
              </div>
            </div>
          </div>
          <Button label="Review" text severity="secondary" icon="pi pi-eye" @click="openDetails(item)" />
        </div>
      </div>
    </div>

    <div class="flex items-center justify-center pt-2 px-4">
      <Button
        v-if="nextCursor"
        label="Load more"
        severity="secondary"
        :loading="loadingMore"
        :disabled="loading || loadingMore"
        @click="loadMore()"
      />
    </div>
  </div>

  <Dialog
    v-model:visible="detailsOpen"
    modal
    header="Verification details"
    :draggable="false"
    class="w-[min(48rem,calc(100vw-2rem))]"
  >
    <div v-if="selected" class="space-y-4">
      <div class="rounded-xl border moh-border p-3 moh-surface space-y-2 text-sm">
        <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">User</div>
        <div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div class="text-xs moh-text-muted">User ID</div>
          <div class="text-sm font-mono">{{ selected.user.id }}</div>

          <div class="text-xs moh-text-muted">Joined</div>
          <div class="text-sm font-mono">{{ formatDateTime(selected.user.createdAt) }}</div>

          <div class="text-xs moh-text-muted">Username</div>
          <div class="text-sm">
            <span v-if="selected.user.username">@{{ selected.user.username }}</span>
            <span v-else class="moh-text-muted">—</span>
          </div>

          <div class="text-xs moh-text-muted">Premium</div>
          <div class="text-sm">
            <Tag :value="selected.user.premium ? 'Yes' : 'No'" :severity="selected.user.premium ? 'warning' : 'secondary'" class="!text-xs" />
          </div>

          <div class="text-xs moh-text-muted">Site admin</div>
          <div class="text-sm">
            <Tag :value="selected.user.siteAdmin ? 'Yes' : 'No'" :severity="selected.user.siteAdmin ? 'success' : 'secondary'" class="!text-xs" />
          </div>

          <div class="text-xs moh-text-muted">Verification</div>
          <div class="text-sm">
            <Tag :value="verifiedLabel(selected.user.verifiedStatus)" :severity="verifiedSeverity(selected.user.verifiedStatus)" class="!text-xs" />
          </div>

          <div class="text-xs moh-text-muted">Verified at</div>
          <div class="text-sm font-mono">{{ formatDateTime(selected.user.verifiedAt) }}</div>

          <div class="text-xs moh-text-muted">Unverified at</div>
          <div class="text-sm font-mono">{{ formatDateTime(selected.user.unverifiedAt) }}</div>
        </div>
      </div>

      <div class="rounded-xl border moh-border p-3 moh-surface space-y-2 text-sm">
        <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Request</div>
        <div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div class="text-xs moh-text-muted">Request ID</div>
          <div class="text-sm font-mono">{{ selected.id }}</div>

          <div class="text-xs moh-text-muted">Submitted</div>
          <div class="text-sm font-mono">{{ formatDateTime(selected.createdAt) }}</div>

          <div class="text-xs moh-text-muted">Status</div>
          <div class="text-sm">
            <Tag :value="statusLabel(selected.status)" :severity="statusSeverity(selected.status)" class="!text-xs" />
          </div>

          <div class="text-xs moh-text-muted">Reviewed</div>
          <div class="text-sm font-mono">{{ formatDateTime(selected.reviewedAt) }}</div>

          <div class="text-xs moh-text-muted">Provider</div>
          <div class="text-sm font-mono">{{ selected.provider || '—' }}</div>

          <div class="text-xs moh-text-muted">Provider request ID</div>
          <div class="text-sm font-mono">{{ selected.providerRequestId || '—' }}</div>
        </div>

        <div v-if="selected.reviewedByAdmin" class="pt-2 text-xs moh-text-muted">
          Reviewed by
          <span class="font-mono">{{ selected.reviewedByAdmin.username ? '@' + selected.reviewedByAdmin.username : selected.reviewedByAdmin.id }}</span>
        </div>

        <div v-if="selected.rejectionReason" class="pt-2 space-y-1">
          <div class="text-xs moh-text-muted">Rejection reason</div>
          <div class="text-sm moh-text whitespace-pre-wrap">{{ selected.rejectionReason }}</div>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Admin note</label>
          <Textarea v-model="editAdminNote" class="w-full" rows="3" autoResize placeholder="Optional internal note…" />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Reject reason</label>
          <Textarea v-model="editRejectionReason" class="w-full" rows="3" autoResize placeholder="Required only when rejecting…" />
        </div>
      </div>

      <AppInlineAlert v-if="detailsError" severity="danger">
        {{ detailsError }}
      </AppInlineAlert>
    </div>

    <template #footer>
      <Button label="Close" severity="secondary" text :disabled="saving" @click="detailsOpen = false" />
      <Button
        label="Reject"
        icon="pi pi-times"
        severity="danger"
        :loading="rejecting"
        :disabled="saving || !canReject"
        @click="reject()"
      />
      <Button
        label="Approve (manual)"
        icon="pi pi-check"
        :loading="approving"
        :disabled="saving || !canApprove"
        @click="approve()"
      />
    </template>
  </Dialog>
  </AppPageContent>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Verification',
  middleware: 'admin',
})

usePageSeo({
  title: 'Verification',
  description: 'Admin verification review.',
  canonicalPath: '/admin/verification',
  noindex: true,
})

type VerifiedStatus = 'none' | 'identity' | 'manual'

const { apiFetch, apiFetchData } = useApiClient()
import { getApiErrorMessage } from '~/utils/api-error'
import { formatDateTime } from '~/utils/time-format'
import { useFormSubmit } from '~/composables/useFormSubmit'
import type { AdminVerificationListData, AdminVerificationRequest, VerificationRequestStatus } from '~/types/api'
import type { AdminVerificationUser } from '~/types/api'

const statusOptions = [
  { label: 'All', value: 'all' as const },
  { label: 'Pending', value: 'pending' as const },
  { label: 'Approved', value: 'approved' as const },
  { label: 'Rejected', value: 'rejected' as const },
  { label: 'Cancelled', value: 'cancelled' as const },
]

const statusFilter = ref<typeof statusOptions[number]['value']>('pending')
const query = ref('')
const items = ref<AdminVerificationRequest[]>([])
const nextCursor = ref<string | null>(null)
const loading = ref(false)
const loadingMore = ref(false)
const error = ref<string | null>(null)

const detailsOpen = ref(false)
const selected = ref<AdminVerificationRequest | null>(null)
const detailsError = ref<string | null>(null)

const editAdminNote = ref('')
const editRejectionReason = ref('')

const saving = computed(() => Boolean(approving.value || rejecting.value))

const didInitialLoad = ref(false)
onMounted(() => {
  if (didInitialLoad.value) return
  didInitialLoad.value = true
  void loadRequests(true)
})

watch(statusFilter, () => void loadRequests(true))

function queryParams(reset: boolean) {
  return {
    limit: 50,
    cursor: reset ? undefined : nextCursor.value ?? undefined,
    q: query.value.trim() || undefined,
    status: statusFilter.value === 'all' ? undefined : statusFilter.value,
  }
}

async function loadRequests(reset: boolean) {
  if (loading.value) return
  loading.value = true
  error.value = null
  try {
    if (reset) {
      items.value = []
      nextCursor.value = null
    }
    const res = await apiFetch<AdminVerificationListData>('/admin/verification', {
      method: 'GET',
      query: queryParams(reset) as Record<string, string | number | undefined>,
    })
    const list = res.data ?? []
    items.value = reset ? list : [...items.value, ...list]
    nextCursor.value = res.pagination?.nextCursor ?? null
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to load verification requests.'
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (!nextCursor.value) return
  if (loadingMore.value || loading.value) return
  loadingMore.value = true
  try {
    const res = await apiFetch<AdminVerificationListData>('/admin/verification', {
      method: 'GET',
      query: queryParams(false) as Record<string, string | number | undefined>,
    })
    const list = res.data ?? []
    items.value = [...items.value, ...list]
    nextCursor.value = res.pagination?.nextCursor ?? null
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to load more verification requests.'
  } finally {
    loadingMore.value = false
  }
}

function openDetails(item: AdminVerificationRequest) {
  selected.value = item
  editAdminNote.value = item.adminNote ?? ''
  editRejectionReason.value = ''
  detailsError.value = null
  detailsOpen.value = true
}

const canApprove = computed(() => Boolean(selected.value && selected.value.status === 'pending'))
const canReject = computed(() => Boolean(selected.value && selected.value.status === 'pending' && editRejectionReason.value.trim()))

const { submit: approve, submitting: approving } = useFormSubmit(
  async () => {
    if (!selected.value) return
    detailsError.value = null
    const updated = await apiFetchData<AdminVerificationRequest>(
      `/admin/verification/${encodeURIComponent(selected.value.id)}/approve`,
      {
        method: 'PATCH',
        body: {
          adminNote: editAdminNote.value.trim() ? editAdminNote.value.trim() : null,
        },
      },
    )
    items.value = items.value.map((x) => (x.id === updated.id ? updated : x))
    selected.value = updated
  },
  {
    defaultError: 'Failed to approve request.',
    onError: (message) => {
      detailsError.value = message
    },
  },
)

const { submit: reject, submitting: rejecting } = useFormSubmit(
  async () => {
    if (!selected.value) return
    detailsError.value = null
    const updated = await apiFetchData<AdminVerificationRequest>(
      `/admin/verification/${encodeURIComponent(selected.value.id)}/reject`,
      {
        method: 'PATCH',
        body: {
          rejectionReason: editRejectionReason.value.trim(),
          adminNote: editAdminNote.value.trim() ? editAdminNote.value.trim() : null,
        },
      },
    )
    items.value = items.value.map((x) => (x.id === updated.id ? updated : x))
    selected.value = updated
  },
  {
    defaultError: 'Failed to reject request.',
    onError: (message) => {
      detailsError.value = message
    },
  },
)

function statusLabel(status: VerificationRequestStatus) {
  if (status === 'approved') return 'Approved'
  if (status === 'rejected') return 'Rejected'
  if (status === 'cancelled') return 'Cancelled'
  return 'Pending'
}

function statusSeverity(status: VerificationRequestStatus) {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'danger'
  if (status === 'cancelled') return 'secondary'
  return 'warning'
}

function verifiedLabel(status: VerifiedStatus) {
  if (status === 'identity') return 'Identity verified'
  if (status === 'manual') return 'Manually verified'
  return 'Not verified'
}

function verifiedSeverity(status: VerifiedStatus) {
  if (status === 'identity' || status === 'manual') return 'info'
  return 'secondary'
}

function usernameColorClass(u: AdminVerificationUser) {
  // Premium: warm highlight. Verified: cool highlight. Default: normal text.
  if (u.premium) return 'text-amber-700 dark:text-amber-400'
  if (u.verifiedStatus !== 'none') return 'text-sky-700 dark:text-sky-400'
  return 'text-gray-800 dark:text-gray-100'
}
</script>

