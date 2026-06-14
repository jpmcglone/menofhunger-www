<template>
  <AppPageContent bottom="standard">
    <!-- Header -->
    <div class="moh-gutter-x border-b moh-border pt-4 pb-4 flex items-center gap-3">
      <Icon name="tabler:calendar-time" class="text-xl moh-text-muted" aria-hidden="true" />
      <h1 class="moh-h2">Scheduled Posts</h1>
    </div>

    <AppSubtleSectionLoader :loading="showInitialLoader" min-height-class="min-h-[220px]">
      <!-- Error -->
      <div v-if="error" class="moh-gutter-x mt-4">
        <AppInlineAlert severity="danger">{{ error }}</AppInlineAlert>
      </div>

      <!-- Empty state -->
      <div v-else-if="items.length === 0 && !loading" class="moh-gutter-x py-8 text-center">
        <Icon name="tabler:calendar-time" class="text-3xl moh-text-muted mb-2" aria-hidden="true" />
        <p class="text-sm moh-text-muted">No scheduled posts yet.</p>
        <p class="text-xs moh-text-muted mt-1">
          Use the <Icon name="tabler:calendar-time" class="inline text-sm" aria-hidden="true" /> button in the composer to schedule a post.
        </p>
      </div>

      <!-- List — each row owns its own border-b moh-border -->
      <TransitionGroup v-else name="moh-scheduled-row" tag="div" class="relative">
        <AppScheduledPostRow
          v-for="item in items"
          :key="item.id"
          :item="item"
          @edit="openEdit"
          @delete="confirmDelete"
        />
      </TransitionGroup>

      <!-- Load more -->
      <div v-if="nextCursor" class="moh-gutter-x pt-6 pb-0 sm:pb-6 flex justify-center">
        <Button label="Load more" severity="secondary" :loading="loading" :disabled="loading" @click="loadMore" />
      </div>
    </AppSubtleSectionLoader>
  </AppPageContent>

  <!-- Edit modal -->
  <Dialog
    v-if="editing"
    v-model:visible="editDialogOpen"
    modal
    header="Edit scheduled post"
    :draggable="false"
    class="w-[min(40rem,calc(100vw-2rem))]"
    @hide="closeEdit"
  >
    <AppPostComposer
      auto-focus
      :show-divider="false"
      :register-unsaved-guard="false"
      mode="edit"
      :edit-scheduled-id="editing.id"
      :initial-text="editing.body"
      :initial-media="(editing.media as any)"
      :initial-poll="editing.poll"
      :initial-visibility="editing.scheduledVisibility"
      :initial-scheduled-at="editing.scheduledAt"
      :community-group-id="editing.scheduledCommunityGroupId ?? null"
      @scheduled-updated="onScheduledUpdated"
    />
  </Dialog>
</template>

<script setup lang="ts">
import type { ScheduledPost } from '~/types/api'

definePageMeta({ layout: 'app', middleware: 'premium', ssr: false })
usePageSeo({ title: 'Scheduled Posts' })

const confirm = useAppConfirm()

const { items, nextCursor, loading, error, loadMore, deleteScheduled, patchItem } = useScheduledPosts()

const showInitialLoader = computed(() => loading.value && items.value.length === 0)

// ─── Edit modal ───────────────────────────────────────────────────────────────
const editing = ref<ScheduledPost | null>(null)
const editDialogOpen = ref(false)

function openEdit(item: ScheduledPost) {
  editing.value = item
  editDialogOpen.value = true
}

function closeEdit() {
  editDialogOpen.value = false
  // Keep `editing` alive until Dialog finishes its leave transition, then clear.
  setTimeout(() => { editing.value = null }, 300)
}

function onScheduledUpdated(updated: ScheduledPost) {
  patchItem(updated.id, updated)
  closeEdit()
}

// ─── Delete ───────────────────────────────────────────────────────────────────
const deletingId = ref<string | null>(null)

async function confirmDelete(item: ScheduledPost) {
  const ok = await confirm.confirm({
    header: 'Delete scheduled post?',
    message: 'This cannot be undone.',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    confirmSeverity: 'danger',
  })
  if (!ok) return
  deletingId.value = item.id
  try {
    await deleteScheduled(item.id)
  } finally {
    deletingId.value = null
  }
}
</script>
