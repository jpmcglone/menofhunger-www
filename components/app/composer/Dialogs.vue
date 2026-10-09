<template>
  <AppStatusEditorDialog
    :open="statusEditorOpen"
    :draft="statusDraft"
    :active-status="Boolean(activeStatus)"
    :saving="statusSaving"
    :error="statusError"
    title-id="composer-status-editor-title"
    @update:open="(open) => { if (!open) closeStatusEditor() }"
    @update:draft="statusDraft = $event"
    @save="saveStatus($event)"
    @edit="editStatus"
    @clear="clearStatus"
  />

  <AppComposerGiphyPickerDialog
    ref="giphyInputRef"
    :open="giphyOpen"
    :query="giphyQuery"
    :loading="giphyLoading"
    :error="giphyError"
    :items="giphyItems"
    :can-add-more="canAddMoreMedia"
    @update:open="(v) => (giphyOpen = v)"
    @update:query="(v) => (giphyQuery = v)"
    @search="searchGiphy"
    @select="selectGiphyGif"
  />

  <AppComposerScheduleDialog
    v-model:schedule-picker-open="schedulePickerOpen"
    v-model:scheduled-at-draft="scheduledAtDraft"
    v-model:schedule-more="scheduleMore"
    :is-premium="isPremium"
    :scheduled-at="scheduledAt"
    :schedule-min-date="scheduleMinDate"
    :schedule-max-date="scheduleMaxDate"
    :scheduled-at-draft-is-past="scheduledAtDraftIsPast"
    :scheduled-count="scheduledCount"
    :format-scheduled-at="formatScheduledAt"
    :clear-schedule="clearSchedule"
    :confirm-schedule="confirmSchedule"
  />

  <AppPostPreviewDialog
    v-if="previewOpen"
    :post="previewPost"
    :scheduled-label="scheduledAt ? scheduledAtDisplay : null"
    :destinations="previewDestinations"
    :initial-selection="crosspostChoice"
    :editing-scheduled="Boolean(scheduledEditId)"
    :busy="submitting"
    @close="previewOpen = false"
    @confirm="onPreviewConfirm"
  />
</template>

<script setup lang="ts">
import type { usePostComposer } from '~/composables/composer/usePostComposer'

const props = defineProps<{
  composer: ReturnType<typeof usePostComposer>
}>()

const {
  activeStatus,
  canAddMoreMedia,
  clearSchedule,
  clearStatus,
  closeStatusEditor,
  confirmSchedule,
  crosspostChoice,
  editStatus,
  formatScheduledAt,
  giphyError,
  giphyInputRef,
  giphyItems,
  giphyLoading,
  giphyOpen,
  giphyQuery,
  isPremium,
  onPreviewConfirm,
  previewDestinations,
  previewOpen,
  previewPost,
  saveStatus,
  scheduleMaxDate,
  scheduleMinDate,
  scheduleMore,
  schedulePickerOpen,
  scheduledAt,
  scheduledAtDisplay,
  scheduledAtDraft,
  scheduledAtDraftIsPast,
  scheduledCount,
  scheduledEditId,
  searchGiphy,
  selectGiphyGif,
  statusDraft,
  statusEditorOpen,
  statusError,
  statusSaving,
  submitting,
} = props.composer
</script>
