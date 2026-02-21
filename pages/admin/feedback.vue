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
        @keydown.enter.prevent="refresh()"
      />
      <Button
        label="Search"
        severity="secondary"
        :loading="loading"
        :disabled="loading"
        @click="refresh()"
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
          <div class="flex items-start gap-3 min-w-0">
            <AppUserAvatar
              v-if="item.user"
              :user="item.user"
              size-class="h-8 w-8"
              :enable-preview="false"
              :show-presence="false"
            />
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

  <AppModal
    v-model="detailsOpen"
    title="Feedback details"
    max-width-class="max-w-[44rem]"
    body-class="p-4"
    :disable-close="saving"
  >
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
          <div class="flex items-center gap-2">
            <AppUserAvatar
              v-if="selected.user"
              :user="selected.user"
              size-class="h-6 w-6"
              :show-presence="false"
            />
            <span>
              <span v-if="selected.user?.username">@{{ selected.user.username }}</span>
              <span v-else-if="selected.user?.name">{{ selected.user.name }}</span>
              <span v-else>Anonymous</span>
            </span>
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
      <div class="flex items-center justify-end gap-2">
        <Button label="Close" severity="secondary" text :disabled="saving" @click="detailsOpen = false" />
        <Button label="Save" :loading="saving" :disabled="saving || !canSave" @click="saveDetails()">
          <template #icon>
            <Icon name="tabler:check" aria-hidden="true" />
          </template>
        </Button>
      </div>
    </template>
  </AppModal>
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

const { apiFetchData } = useApiClient()
const { addAdminCallback, removeAdminCallback } = usePresence()
import { formatDateTime } from '~/utils/time-format'
import { useFormSubmit } from '~/composables/useFormSubmit'
import type { AdminFeedbackItem, AdminFeedbackListData, FeedbackCategory, FeedbackStatus } from '~/types/api'
import { useMentionAutocomplete } from '~/composables/useMentionAutocomplete'
import type { AdminCallback } from '~/composables/usePresence'
import { useCursorFeed } from '~/composables/useCursorFeed'

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

const { items, nextCursor, loading, loadingMore, error, refresh, loadMore } = useCursorFeed<AdminFeedbackItem>({
  stateKey: 'admin-feedback',
  buildRequest: (cursor) => ({
    path: '/admin/feedback',
    query: {
      limit: 50,
      cursor: cursor ?? undefined,
      q: feedbackQuery.value.trim() || undefined,
      status: statusFilter.value === 'all' ? undefined : statusFilter.value,
      category: categoryFilter.value === 'all' ? undefined : categoryFilter.value,
    },
  }),
  defaultErrorMessage: 'Failed to load feedback.',
  loadMoreErrorMessage: 'Failed to load more feedback.',
})

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

const adminCb: AdminCallback = {
  onUpdated: (payload) => {
    if (payload?.kind !== 'feedback') return
    void refresh()
  },
}
onMounted(() => {
  void refresh()
  addAdminCallback(adminCb)
})

onBeforeUnmount(() => {
  removeAdminCallback(adminCb)
})

watch([statusFilter, categoryFilter], () => void refresh())

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
