<template>
  <div
    class="relative"
    :style="composerTextareaVars"
    @dragenter="onComposerAreaDragEnter"
    @dragover="onComposerAreaDragOver"
    @dragleave="onComposerAreaDragLeave"
    @drop.prevent="onComposerDrop"
  >
    <div class="relative" @paste.capture="onComposerPaste">
      <AppStyledTextarea
        ref="composerEditorEl"
        :disabled="destinationDrafts.blockingLoad.value || submitting"
        :model-value="draft"
        :placeholder="composerPlaceholder"
        :auto-focus="autoFocus"
        :hashtag-color="composerHashtagColor"
        submit-trigger="cmd-enter"
        class="moh-composer-styled-textarea"
        @update:model-value="onDraftChange"
        @send="submit"
        @media-files="(files) => ingestMediaFiles(files, 'paste')"
      />
      <AppComposerDropOverlay
        :visible="dropOverlayVisible && !composerMedia.length"
        :remaining-slots="remainingMediaSlots"
        :max-slots="4"
        tight-bottom
      />
    </div>

    <AppComposerLinkPreview
      v-if="!quotedPost && !poll"
      :text="draft"
      :has-media="composerMedia.length > 0"
      class="mt-3"
    />

    <AppInlineAlert v-if="submitError" class="mt-3" severity="danger">
      {{ submitError }}
    </AppInlineAlert>

    <div v-if="composerMedia.length" class="mt-3">
      <AppComposerMediaSlots
        :slots="displaySlots"
        :first-empty-slot-index="firstEmptySlotIndex"
        :can-add-more="canAddMoreMedia"
        :dragging-media-id="draggingMediaId"
        :upload-bar-color="composerUploadBarColor"
        :upload-status-label="composerUploadStatusLabel"
        @add="openMediaPicker"
        @remove="removeComposerMedia"
        @pointerdown="onMediaTilePointerDown"
        @update-alt="onUpdateAltText"
      />
    </div>

    <AppComposerPoll
      v-if="poll && !composerMedia.length"
      class="mt-3"
      :model-value="poll"
      @update:model-value="onUpdatePoll"
      @remove="clearPoll"
      @status="onPollStatus"
    />

    <AppComposerDropOverlay
      :visible="dropOverlayVisible && composerMedia.length > 0"
      :remaining-slots="remainingMediaSlots"
      :max-slots="4"
    />
  </div>
</template>

<script setup lang="ts">
import type { usePostComposer } from '~/composables/composer/usePostComposer'

const props = defineProps<{
  composer: ReturnType<typeof usePostComposer>
  autoFocus?: boolean
}>()

const {
  canAddMoreMedia,
  clearPoll,
  composerEditorEl,
  composerHashtagColor,
  composerMedia,
  composerPlaceholder,
  composerTextareaVars,
  composerUploadBarColor,
  composerUploadStatusLabel,
  destinationDrafts,
  displaySlots,
  draft,
  draggingMediaId,
  dropOverlayVisible,
  firstEmptySlotIndex,
  ingestMediaFiles,
  onComposerAreaDragEnter,
  onComposerAreaDragLeave,
  onComposerAreaDragOver,
  onComposerDrop,
  onComposerPaste,
  onDraftChange,
  onMediaTilePointerDown,
  onPollStatus,
  onUpdateAltText,
  onUpdatePoll,
  openMediaPicker,
  poll,
  quotedPost,
  remainingMediaSlots,
  removeComposerMedia,
  submit,
  submitError,
  submitting,
} = props.composer
</script>
