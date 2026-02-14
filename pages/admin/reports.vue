<template>
  <AppPageContent bottom="standard">
  <div class="py-4 space-y-4">
    <div class="px-4">
      <AppPageHeader title="Reports" icon="tabler:flag" description="Review and triage reported posts and users.">
        <template #leading>
          <Button
            class="md:hidden"
            text
            severity="secondary"
            aria-label="Back"
            @click="navigateTo('/admin')"
          >
            <template #icon>
              <Icon name="tabler:chevron-left" aria-hidden="true" />
            </template>
          </Button>
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
      <Select
        v-model="targetFilter"
        :options="targetOptions"
        option-label="label"
        option-value="value"
        placeholder="Target"
        class="w-[9.5rem]"
      />
      <Select
        v-model="reasonFilter"
        :options="reasonOptions"
        option-label="label"
        option-value="value"
        placeholder="Reason"
        class="w-[12rem]"
      />
      <InputText
        v-model="reportsQuery"
        class="w-full sm:w-72"
        placeholder="Search details, admin notes…"
        @keydown.enter.prevent="loadReports(true)"
      />
      <Button
        label="Search"
        severity="secondary"
        :loading="loading"
        :disabled="loading"
        @click="loadReports(true)"
      >
        <template #icon>
          <Icon name="tabler:search" aria-hidden="true" />
        </template>
      </Button>
    </div>

    <div v-if="error" class="px-4">
      <AppInlineAlert severity="danger">
        {{ error }}
      </AppInlineAlert>
    </div>

    <div v-if="!loading && items.length === 0" class="px-4 text-sm moh-text-muted">
      No reports yet.
    </div>

    <div v-else class="divide-y divide-gray-200 dark:divide-zinc-800">
      <div
        v-for="item in items"
        :key="item.id"
        class="px-4 py-3 space-y-2 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <div class="font-semibold truncate">
                {{ targetLabel(item) }}
              </div>
              <Tag :value="statusLabel(item.status)" :severity="statusSeverity(item.status)" class="!text-xs" />
              <Tag :value="reasonLabel(item.reason)" severity="secondary" class="!text-xs" />
            </div>
            <div class="text-xs moh-text-muted">
              {{ formatDateTime(item.createdAt) }}
              <span class="mx-2">·</span>
              Reported by
              <span v-if="item.reporter?.username">@{{ item.reporter.username }}</span>
              <span v-else-if="item.reporter?.name">{{ item.reporter.name }}</span>
              <span v-else class="font-mono">{{ item.reporter.id }}</span>
            </div>
          </div>
          <Button label="Review" text severity="secondary" @click="openDetails(item)">
            <template #icon>
              <Icon name="tabler:eye" aria-hidden="true" />
            </template>
          </Button>
        </div>

        <div v-if="item.details" class="text-sm moh-text-muted line-clamp-2">
          {{ item.details }}
        </div>
        <div v-else class="text-sm moh-text-muted italic">
          No details provided.
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

  <Dialog v-model:visible="detailsOpen" modal header="Report details" :draggable="false" class="w-[min(46rem,calc(100vw-2rem))]">
    <div v-if="selected" class="space-y-4">
      <div class="space-y-1">
        <div class="text-xs moh-text-muted">Target</div>
        <div class="text-lg font-semibold">
          {{ targetLabel(selected) }}
        </div>
        <div class="text-xs moh-text-muted">
          <NuxtLink v-if="targetLink(selected)" :to="targetLink(selected)!" class="underline underline-offset-2">
            Open target
          </NuxtLink>
        </div>
      </div>

      <div class="rounded-xl border moh-border p-3 moh-surface space-y-2 text-sm">
        <div class="flex items-center justify-between gap-2">
          <div class="moh-text-muted">Reason</div>
          <div>{{ reasonLabel(selected.reason) }}</div>
        </div>
        <div class="flex items-center justify-between gap-2">
          <div class="moh-text-muted">Status</div>
          <div>{{ statusLabel(selected.status) }}</div>
        </div>
        <div class="flex items-center justify-between gap-2">
          <div class="moh-text-muted">Submitted</div>
          <div class="font-mono text-xs">{{ formatDateTime(selected.createdAt) }}</div>
        </div>
        <div class="flex items-center justify-between gap-2">
          <div class="moh-text-muted">Reporter</div>
          <div>
            <span v-if="selected.reporter?.username">@{{ selected.reporter.username }}</span>
            <span v-else-if="selected.reporter?.name">{{ selected.reporter.name }}</span>
            <span v-else class="font-mono text-xs">{{ selected.reporter.id }}</span>
          </div>
        </div>
        <div v-if="selected.resolvedAt" class="flex items-center justify-between gap-2">
          <div class="moh-text-muted">Resolved</div>
          <div class="font-mono text-xs">{{ formatDateTime(selected.resolvedAt) }}</div>
        </div>
        <div v-if="selected.resolvedByAdmin" class="flex items-center justify-between gap-2">
          <div class="moh-text-muted">Resolved by</div>
          <div>
            <span v-if="selected.resolvedByAdmin.username">@{{ selected.resolvedByAdmin.username }}</span>
            <span v-else-if="selected.resolvedByAdmin.name">{{ selected.resolvedByAdmin.name }}</span>
            <span v-else class="font-mono text-xs">{{ selected.resolvedByAdmin.id }}</span>
          </div>
        </div>
      </div>

      <div class="space-y-1">
        <div class="text-xs moh-text-muted">Details</div>
        <div v-if="selected.details" class="whitespace-pre-wrap text-sm moh-text">{{ selected.details }}</div>
        <div v-else class="text-sm moh-text-muted italic">No details provided.</div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Status</label>
          <Select
            v-model="editStatus"
            :options="statusOptions.slice(1)"
            option-label="label"
            option-value="value"
            placeholder="Select…"
            class="w-full"
          />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Admin note</label>
          <Textarea v-model="editAdminNote" class="w-full" rows="3" autoResize placeholder="Optional internal note…" />
        </div>
      </div>

      <AppInlineAlert v-if="detailsError" severity="danger">
        {{ detailsError }}
      </AppInlineAlert>
    </div>

    <template #footer>
      <Button label="Close" severity="secondary" text :disabled="saving" @click="detailsOpen = false" />
      <Button label="Save" :loading="saving" :disabled="saving || !canSave" @click="saveDetails()">
        <template #icon>
          <Icon name="tabler:check" aria-hidden="true" />
        </template>
      </Button>
    </template>
  </Dialog>
  </AppPageContent>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Reports',
  middleware: 'admin',
})

usePageSeo({
  title: 'Reports',
  description: 'Admin reports triage.',
  canonicalPath: '/admin/reports',
  noindex: true,
})

import { getApiErrorMessage } from '~/utils/api-error'
import { formatDateTime } from '~/utils/time-format'
import { useFormSubmit } from '~/composables/useFormSubmit'
import type { AdminReportItem, AdminReportListData, ReportReason, ReportStatus, ReportTargetType } from '~/types/api'
import type { AdminCallback } from '~/composables/usePresence'

const { apiFetch, apiFetchData } = useApiClient()
const { addAdminCallback, removeAdminCallback } = usePresence()

const statusOptions = [
  { label: 'All', value: 'all' as const },
  { label: 'Pending', value: 'pending' as const },
  { label: 'Dismissed', value: 'dismissed' as const },
  { label: 'Action taken', value: 'actionTaken' as const },
]

const targetOptions = [
  { label: 'All targets', value: 'all' as const },
  { label: 'Post', value: 'post' as const },
  { label: 'User', value: 'user' as const },
]

const reasonOptions = [
  { label: 'All reasons', value: 'all' as const },
  { label: 'Spam', value: 'spam' as const },
  { label: 'Harassment', value: 'harassment' as const },
  { label: 'Abusive content', value: 'hate' as const },
  { label: 'Sexual content', value: 'sexual' as const },
  { label: 'Violence', value: 'violence' as const },
  { label: 'Illegal content', value: 'illegal' as const },
  { label: 'Other', value: 'other' as const },
]

const statusFilter = ref<typeof statusOptions[number]['value']>('all')
const targetFilter = ref<typeof targetOptions[number]['value']>('all')
const reasonFilter = ref<typeof reasonOptions[number]['value']>('all')
const reportsQuery = ref('')

const items = ref<AdminReportItem[]>([])
const nextCursor = ref<string | null>(null)
const loading = ref(false)
const loadingMore = ref(false)
const error = ref<string | null>(null)

const detailsOpen = ref(false)
const selected = ref<AdminReportItem | null>(null)
const editStatus = ref<ReportStatus>('pending')
const editAdminNote = ref('')
const detailsError = ref<string | null>(null)

const canSave = computed(() => {
  if (!selected.value) return false
  const note = editAdminNote.value.trim()
  const existingNote = selected.value.adminNote ?? ''
  return editStatus.value !== selected.value.status || note !== existingNote
})

const didInitialLoad = ref(false)
const adminCb: AdminCallback = {
  onUpdated: (payload) => {
    if (payload?.kind !== 'reports') return
    void loadReports(true)
  },
}
onMounted(() => {
  if (didInitialLoad.value) return
  didInitialLoad.value = true
  void loadReports(true)
  addAdminCallback(adminCb)
})

onBeforeUnmount(() => {
  removeAdminCallback(adminCb)
})

watch([statusFilter, targetFilter, reasonFilter], () => void loadReports(true))

function queryParams(reset: boolean) {
  return {
    limit: 50,
    cursor: reset ? undefined : nextCursor.value ?? undefined,
    q: reportsQuery.value.trim() || undefined,
    status: statusFilter.value === 'all' ? undefined : statusFilter.value,
    targetType: targetFilter.value === 'all' ? undefined : targetFilter.value,
    reason: reasonFilter.value === 'all' ? undefined : reasonFilter.value,
  }
}

async function loadReports(reset: boolean) {
  if (loading.value) return
  loading.value = true
  error.value = null
  try {
    if (reset) {
      items.value = []
      nextCursor.value = null
    }
    const res = await apiFetch<AdminReportListData>('/admin/reports', {
      method: 'GET',
      query: queryParams(reset) as Record<string, string | number | undefined>,
    })
    const list = res.data ?? []
    items.value = reset ? list : [...items.value, ...list]
    nextCursor.value = res.pagination?.nextCursor ?? null
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to load reports.'
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (!nextCursor.value) return
  if (loadingMore.value || loading.value) return
  loadingMore.value = true
  try {
    const res = await apiFetch<AdminReportListData>('/admin/reports', {
      method: 'GET',
      query: queryParams(false) as Record<string, string | number | undefined>,
    })
    const list = res.data ?? []
    items.value = [...items.value, ...list]
    nextCursor.value = res.pagination?.nextCursor ?? null
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to load more reports.'
  } finally {
    loadingMore.value = false
  }
}

function openDetails(item: AdminReportItem) {
  selected.value = item
  editStatus.value = item.status
  editAdminNote.value = item.adminNote ?? ''
  detailsError.value = null
  detailsOpen.value = true
}

const { submit: saveDetails, submitting: saving } = useFormSubmit(
  async () => {
    if (!selected.value) return
    detailsError.value = null
    const updated = await apiFetchData<AdminReportItem>(`/admin/reports/${encodeURIComponent(selected.value.id)}`, {
      method: 'PATCH',
      body: {
        status: editStatus.value,
        adminNote: editAdminNote.value.trim() ? editAdminNote.value.trim() : null,
      },
    })

    items.value = items.value.map((item) => (item.id === updated.id ? updated : item))
    selected.value = updated
  },
  {
    defaultError: 'Failed to save report.',
    onError: (message) => {
      detailsError.value = message
    },
  },
)

function statusLabel(status: ReportStatus) {
  if (status === 'dismissed') return 'Dismissed'
  if (status === 'actionTaken') return 'Action taken'
  return 'Pending'
}

function statusSeverity(status: ReportStatus) {
  if (status === 'dismissed') return 'secondary'
  if (status === 'actionTaken') return 'success'
  return 'warning'
}

function reasonLabel(reason: ReportReason) {
  if (reason === 'harassment') return 'Harassment'
  if (reason === 'hate') return 'Abusive content'
  if (reason === 'sexual') return 'Sexual content'
  if (reason === 'violence') return 'Violence'
  if (reason === 'illegal') return 'Illegal content'
  if (reason === 'other') return 'Other'
  return 'Spam'
}

function targetLabel(item: Pick<AdminReportItem, 'targetType' | 'subjectUser' | 'subjectPost'>) {
  if (item.targetType === 'post') {
    const post = item.subjectPost
    const author = post?.user?.username ? `@${post.user.username}` : post?.user?.name || 'User'
    return post ? `Post by ${author}` : 'Post'
  }
  const u = item.subjectUser
  return u?.username ? `User @${u.username}` : u?.name ? `User ${u.name}` : 'User'
}

function targetLink(item: Pick<AdminReportItem, 'targetType' | 'subjectUser' | 'subjectPost'>): string | null {
  if (item.targetType === 'post') {
    const pid = item.subjectPost?.id
    return pid ? `/p/${encodeURIComponent(pid)}` : null
  }
  const username = item.subjectUser?.username
  return username ? `/u/${encodeURIComponent(username)}` : null
}
</script>

