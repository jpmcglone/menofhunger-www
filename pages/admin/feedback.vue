<template>
  <AppPageContent bottom="standard">
  <div class="py-4 space-y-4">
    <div class="px-4">
      <AppPageHeader title="Feedback" icon="tabler:inbox" description="Review and triage user feedback.">
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
        class="w-[9.5rem]"
      />
      <Select
        v-model="categoryFilter"
        :options="categoryOptions"
        option-label="label"
        option-value="value"
        placeholder="Category"
        class="w-[10rem]"
      />
      <InputText
        v-model="feedbackQuery"
        class="w-full sm:w-72"
        placeholder="Search subject, details, email…"
        @keydown.enter.prevent="loadFeedback(true)"
      />
      <Button
        label="Search"
        severity="secondary"
        :loading="loading"
        :disabled="loading"
        @click="loadFeedback(true)"
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
      No feedback yet.
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
              <div class="font-semibold truncate">{{ item.subject }}</div>
              <Tag :value="statusLabel(item.status)" :severity="statusSeverity(item.status)" class="!text-xs" />
              <Tag :value="categoryLabel(item.category)" severity="secondary" class="!text-xs" />
            </div>
            <div class="text-xs moh-text-muted">
              {{ formatDateTime(item.createdAt) }}
              <span class="mx-2">·</span>
              <span v-if="item.user?.username">@{{ item.user.username }}</span>
              <span v-else-if="item.user?.name">{{ item.user.name }}</span>
              <span v-else>Anonymous</span>
              <span v-if="item.email" class="mx-2">·</span>
              <span v-if="item.email">{{ item.email }}</span>
            </div>
          </div>
          <Button label="Review" text severity="secondary" @click="openDetails(item)">
            <template #icon>
              <Icon name="tabler:eye" aria-hidden="true" />
            </template>
          </Button>
        </div>
        <div class="text-sm moh-text-muted line-clamp-2">
          {{ item.details }}
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

  <Dialog v-model:visible="detailsOpen" modal header="Feedback details" :draggable="false" class="w-[min(44rem,calc(100vw-2rem))]">
    <div v-if="selected" class="space-y-4">
      <div class="space-y-1">
        <div class="text-xs moh-text-muted">Subject</div>
        <div class="text-lg font-semibold">{{ selected.subject }}</div>
      </div>
      <div class="space-y-1">
        <div class="text-xs moh-text-muted">Details</div>
        <div class="whitespace-pre-wrap text-sm moh-text">{{ selected.details }}</div>
      </div>

      <div class="rounded-xl border moh-border p-3 moh-surface space-y-2 text-sm">
        <div class="flex items-center justify-between gap-2">
          <div class="moh-text-muted">Category</div>
          <div>{{ categoryLabel(selected.category) }}</div>
        </div>
        <div class="flex items-center justify-between gap-2">
          <div class="moh-text-muted">Submitted</div>
          <div class="font-mono text-xs">{{ formatDateTime(selected.createdAt) }}</div>
        </div>
        <div class="flex items-center justify-between gap-2">
          <div class="moh-text-muted">User</div>
          <div>
            <span v-if="selected.user?.username">@{{ selected.user.username }}</span>
            <span v-else-if="selected.user?.name">{{ selected.user.name }}</span>
            <span v-else>Anonymous</span>
          </div>
        </div>
        <div v-if="selected.email" class="flex items-center justify-between gap-2">
          <div class="moh-text-muted">Email</div>
          <div class="font-mono text-xs">{{ selected.email }}</div>
        </div>
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
          <div ref="adminNoteTextareaWrapEl" class="relative">
            <Textarea v-model="editAdminNote" class="w-full" rows="3" autoResize placeholder="Optional internal note…" />
            <AppMentionAutocompletePopover
              v-bind="adminNoteMention.popoverProps"
              @select="adminNoteMention.onSelect"
              @highlight="adminNoteMention.onHighlight"
              @requestClose="adminNoteMention.onRequestClose"
            />
          </div>
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
  title: 'Feedback',
  middleware: 'admin',
})

usePageSeo({
  title: 'Feedback',
  description: 'Admin feedback triage.',
  canonicalPath: '/admin/feedback',
  noindex: true,
})

const { apiFetch, apiFetchData } = useApiClient()
import { getApiErrorMessage } from '~/utils/api-error'
import { formatDateTime } from '~/utils/time-format'
import { useFormSubmit } from '~/composables/useFormSubmit'
import type { AdminFeedbackItem, AdminFeedbackListData, FeedbackCategory, FeedbackStatus } from '~/types/api'
import { useMentionAutocomplete } from '~/composables/useMentionAutocomplete'

const statusOptions = [
  { label: 'All', value: 'all' as const },
  { label: 'New', value: 'new' as const },
  { label: 'Triaged', value: 'triaged' as const },
  { label: 'Resolved', value: 'resolved' as const },
]

const categoryOptions = [
  { label: 'All categories', value: 'all' as const },
  { label: 'Bug', value: 'bug' as const },
  { label: 'Feature request', value: 'feature' as const },
  { label: 'Account', value: 'account' as const },
  { label: 'Other', value: 'other' as const },
]

const statusFilter = ref<typeof statusOptions[number]['value']>('all')
const categoryFilter = ref<typeof categoryOptions[number]['value']>('all')
const feedbackQuery = ref('')
const items = ref<AdminFeedbackItem[]>([])
const nextCursor = ref<string | null>(null)
const loading = ref(false)
const loadingMore = ref(false)
const error = ref<string | null>(null)

const detailsOpen = ref(false)
const selected = ref<AdminFeedbackItem | null>(null)
const editStatus = ref<FeedbackStatus>('new')
const editAdminNote = ref('')
const detailsError = ref<string | null>(null)

const adminNoteTextareaWrapEl = ref<HTMLElement | null>(null)
const adminNoteTextareaEl = ref<HTMLTextAreaElement | null>(null)
const adminNoteMention = useMentionAutocomplete({
  el: adminNoteTextareaEl,
  getText: () => editAdminNote.value,
  setText: (next) => {
    editAdminNote.value = next
  },
  debounceMs: 200,
  limit: 10,
})

const canSave = computed(() => {
  if (!selected.value) return false
  const note = editAdminNote.value.trim()
  const existingNote = selected.value.adminNote ?? ''
  return editStatus.value !== selected.value.status || note !== existingNote
})

const didInitialLoad = ref(false)
onMounted(() => {
  if (didInitialLoad.value) return
  didInitialLoad.value = true
  void loadFeedback(true)
})

watch([statusFilter, categoryFilter], () => void loadFeedback(true))

function queryParams(reset: boolean) {
  return {
    limit: 50,
    cursor: reset ? undefined : nextCursor.value ?? undefined,
    q: feedbackQuery.value.trim() || undefined,
    status: statusFilter.value === 'all' ? undefined : statusFilter.value,
    category: categoryFilter.value === 'all' ? undefined : categoryFilter.value,
  }
}

async function loadFeedback(reset: boolean) {
  if (loading.value) return
  loading.value = true
  error.value = null
  try {
    if (reset) {
      items.value = []
      nextCursor.value = null
    }
    const res = await apiFetch<AdminFeedbackListData>('/admin/feedback', {
      method: 'GET',
      query: queryParams(reset) as Record<string, string | number | undefined>,
    })
    const list = res.data ?? []
    items.value = reset ? list : [...items.value, ...list]
    nextCursor.value = res.pagination?.nextCursor ?? null
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to load feedback.'
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (!nextCursor.value) return
  if (loadingMore.value || loading.value) return
  loadingMore.value = true
  try {
    const res = await apiFetch<AdminFeedbackListData>('/admin/feedback', {
      method: 'GET',
      query: queryParams(false) as Record<string, string | number | undefined>,
    })
    const list = res.data ?? []
    items.value = [...items.value, ...list]
    nextCursor.value = res.pagination?.nextCursor ?? null
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to load more feedback.'
  } finally {
    loadingMore.value = false
  }
}

function openDetails(item: AdminFeedbackItem) {
  selected.value = item
  editStatus.value = item.status
  editAdminNote.value = item.adminNote ?? ''
  detailsError.value = null
  detailsOpen.value = true
  void nextTick().then(() => {
    adminNoteTextareaEl.value = (adminNoteTextareaWrapEl.value?.querySelector('textarea') as HTMLTextAreaElement | null) ?? null
  })
}

const { submit: saveDetails, submitting: saving } = useFormSubmit(
  async () => {
    if (!selected.value) return
    detailsError.value = null
    const updated = await apiFetchData<AdminFeedbackItem>(`/admin/feedback/${encodeURIComponent(selected.value.id)}`, {
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
    defaultError: 'Failed to save feedback.',
    onError: (message) => {
      detailsError.value = message
    },
  },
)

function statusLabel(status: FeedbackStatus) {
  if (status === 'triaged') return 'Triaged'
  if (status === 'resolved') return 'Resolved'
  return 'New'
}

function statusSeverity(status: FeedbackStatus) {
  if (status === 'triaged') return 'info'
  if (status === 'resolved') return 'success'
  return 'warning'
}

function categoryLabel(category: FeedbackCategory) {
  if (category === 'feature') return 'Feature request'
  if (category === 'account') return 'Account'
  if (category === 'other') return 'Other'
  return 'Bug'
}

</script>
