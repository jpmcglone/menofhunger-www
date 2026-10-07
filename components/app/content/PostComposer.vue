<template>
  <!-- Single root so fallthrough attrs (e.g. class from parents) can merge; Giphy dialog is a sibling inside. -->
  <div>
  <div
    :class="[
      inlineAudience && !checkinPrompt ? 'moh-home-composer pb-3' : 'pb-4',
      mode === 'edit' && !scheduledEditId ? 'moh-edit-composer' : '',
      checkinPrompt ? 'moh-prompt-composer' : '',
      omitAvatar ? 'pr-[var(--moh-gutter-x)]' : 'moh-gutter-x',
      inReplyThread ? 'pt-2' : 'pt-4',
      showDivider ? 'border-b moh-border' : ''
    ]"
  >
    <div v-if="isAuthed">
      <div
        :class="omitAvatar ? 'flex flex-col gap-2' : 'grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-5 items-start'"
      >
      <div
        v-if="!inlineAudience && (!replyTo || $slots.close)"
        :class="[
          mode === 'edit' && !scheduledEditId ? 'row-start-1 flex items-center gap-2' : 'row-start-1 flex flex-wrap items-center gap-2',
          checkinPrompt ? 'col-span-2 mb-5' : 'col-span-2 mb-3',
        ]"
      >
        <slot name="close" />
        <slot name="audience">
          <AppComposerAudienceChrome
            :reply-to="replyTo"
            :inline-audience="inlineAudience"
            :checkin-prompt="checkinPrompt"
            :can-choose-group="canChooseGroup"
            :visibility="visibility"
            :allowed="allowedComposerVisibilities"
            :is-premium="isPremium"
            :groups="myGroups"
            :selected-group-id="selectedGroupId"
            :loading="myGroupsLoading"
            :error="myGroupsError"
            :shows-chat="showChatDestination"
            :show-visibility-picker="showVisibilityPicker"
            :viewer-is-verified="viewerIsVerified"
            :effective-group-id="effectiveGroupId"
            :scope-tag-tooltip="scopeTagTooltip"
            :scope-tag-label="scopeTagLabel"
            :effective-visibility="effectiveVisibility"
            :show-group-scope-icon="showGroupScopeIcon"
            :mode="mode"
            :selected-group-read-label="selectedGroupReadLabel"
            :select-chat="handoffToChat"
            :select-visibility="selectDestinationVisibility"
            :select-group="selectGroup"
            :on-open="loadMyGroups"
            @update:visibility="visibility = $event"
          />
        </slot>
        <button
          v-if="!checkinPrompt && scheduledAt && isPremium && mode === 'create' && !replyTo && !quotedPost"
          v-tooltip.bottom="`Click to change schedule`"
          type="button"
          class="inline-flex items-center gap-1 text-[11px] font-semibold moh-focus"
          :style="scheduleAccentColor ? { color: scheduleAccentColor } : {}"
          :aria-label="`Scheduled for ${scheduledAtDisplay}. Click to change.`"
          @click="openSchedulePicker"
        >
          <Icon name="tabler:calendar-time" class="text-[12px]" aria-hidden="true" />
          <span>{{ scheduledAtDisplay }}</span>
        </button>
      </div>

      <AppComposerPromptContext
        v-if="checkinPrompt"
        :prompt="checkinPrompt"
        class="row-start-2 col-span-2 mb-5"
      />

      <template v-if="!omitAvatar">
        <NuxtLink
          v-if="myProfilePath"
          :to="myProfilePath"
          class="col-start-1 group shrink-0"
          :class="checkinPrompt ? 'row-start-3' : (inlineAudience ? 'row-start-1 row-span-2' : 'row-start-2')"
          aria-label="View your profile"
        >
          <div class="transition-opacity duration-200 group-hover:opacity-80">
            <AppUserAvatar
              :user="user"
              size-class="h-10 w-10"
              :show-empty-status="enableAvatarStatusEditor"
              :status-behavior="enableAvatarStatusEditor ? 'custom' : 'view'"
              @status-click="openStatusEditor"
            />
          </div>
        </NuxtLink>
        <div v-else class="col-start-1 shrink-0" :class="checkinPrompt ? 'row-start-3' : (inlineAudience ? 'row-start-1 row-span-2' : 'row-start-2')" aria-hidden="true">
          <AppUserAvatar
            :user="user"
            size-class="h-10 w-10"
            :show-empty-status="enableAvatarStatusEditor"
            :status-behavior="enableAvatarStatusEditor ? 'custom' : 'view'"
            @status-click="openStatusEditor"
          />
        </div>
      </template>

      <div
        :class="[omitAvatar ? 'min-w-0 moh-composer-tint' : 'col-start-2 min-w-0 moh-composer-tint', checkinPrompt ? 'row-start-3' : (inlineAudience ? 'row-start-1' : 'row-start-2')]"
      >
        <p v-if="checkinPrompt" class="mb-2 text-[13px] font-medium moh-text-muted">Your answer</p>
        <div v-if="$slots['above-textarea']" class="pb-2 text-sm moh-text-muted">
          <slot name="above-textarea" />
        </div>
        <input
          ref="mediaFileInputEl"
          type="file"
          :accept="composerAcceptTypes"
          class="hidden"
          multiple
          tabindex="-1"
          aria-hidden="true"
          disabled
          @change="onMediaFilesSelected"
        >

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
              :disabled="destinationDrafts.loading.value || submitting"
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

        <div v-if="quotedPost" class="select-none pointer-events-none">
          <AppEmbeddedPostPreview :preloaded-post="quotedPost" />
        </div>

        <div v-if="inlineAudience" class="flex min-w-0 flex-wrap items-center gap-2">
          <slot name="audience">
            <AppComposerAudienceChrome
              :reply-to="replyTo"
              :inline-audience="inlineAudience"
              :checkin-prompt="checkinPrompt"
              :can-choose-group="canChooseGroup"
              :visibility="visibility"
              :allowed="allowedComposerVisibilities"
              :is-premium="isPremium"
              :groups="myGroups"
              :selected-group-id="selectedGroupId"
              :loading="myGroupsLoading"
              :error="myGroupsError"
              :shows-chat="showChatDestination"
              :show-visibility-picker="showVisibilityPicker"
              :viewer-is-verified="viewerIsVerified"
              :effective-group-id="effectiveGroupId"
              :scope-tag-tooltip="scopeTagTooltip"
              :scope-tag-label="scopeTagLabel"
              :effective-visibility="effectiveVisibility"
              :show-group-scope-icon="showGroupScopeIcon"
              :mode="mode"
              :selected-group-read-label="selectedGroupReadLabel"
              :select-chat="handoffToChat"
              :select-visibility="selectDestinationVisibility"
              :select-group="selectGroup"
              :on-open="loadMyGroups"
              @update:visibility="visibility = $event"
            />
          </slot>
          <button
            v-if="!checkinPrompt && scheduledAt && isPremium && mode === 'create' && !replyTo && !quotedPost"
            v-tooltip.bottom="`Click to change schedule`"
            type="button"
            class="inline-flex items-center gap-1 text-[11px] font-semibold moh-focus"
            :style="scheduleAccentColor ? { color: scheduleAccentColor } : {}"
            :aria-label="`Scheduled for ${scheduledAtDisplay}. Click to change.`"
            @click="openSchedulePicker"
          >
            <Icon name="tabler:calendar-time" class="text-[12px]" aria-hidden="true" />
            <span>{{ scheduledAtDisplay }}</span>
          </button>
        </div>

        <ClientOnly>
          <Teleport to="body">
            <div
              v-if="dragGhost"
              class="moh-drag-ghost"
              :style="dragGhostStyle"
              aria-hidden="true"
            >
              <img
                :src="dragGhost.src"
                class="h-full w-full rounded-lg border moh-border object-cover bg-black/5 dark:bg-white/5 shadow-2xl"
                alt=""
                draggable="false"
              >
            </div>
          </Teleport>
        </ClientOnly>

        <Teleport :to="actionsTarget ?? 'body'" :disabled="!actionsTarget">
          <div :class="[actionsTarget ? '' : checkinPrompt ? 'mt-5 border-t moh-border pt-4' : (composerMedia.length ? 'mt-5' : inlineAudience ? 'mt-0' : 'mt-3'), mode === 'edit' && !scheduledEditId && 'moh-edit-actions']" class="flex flex-col gap-1">
            <AppComposerTools
              :submit-target="submitTarget"
              :disable-media="disableMedia"
              :disable-poll="disablePoll"
              :has-poll="hasPoll"
              :can-add-more-media="canAddMoreMedia"
              :reply-to="replyTo"
              :quoted-post="quotedPost"
              :is-premium="isPremium"
              :viewer-is-verified="viewerIsVerified"
              :media-count="composerMedia.length"
              :mode="mode"
              :scheduled-at="scheduledAt"
              :scheduled-at-display="scheduledAtDisplay"
              :scheduled-count="scheduledCount"
              :schedule-accent-color="scheduleAccentColor"
              :post-char-count="postCharCount"
              :post-max-len="postMaxLen"
              :submit-label="submitLabel"
              :post-button-class="postButtonClass"
              :inline-audience="inlineAudience"
              :checkin-prompt="checkinPrompt"
              :submit-disabled="submitDisabled"
              :composer-has-failed-media="composerHasFailedMedia"
              :poll-has-failed="pollHasFailed"
              :submitting="submitting"
              :on-click-add-media="onClickAddMedia"
              :on-click-add-giphy="onClickAddGiphy"
              :on-click-add-poll="onClickAddPoll"
              :insert-emoji="insertEmoji"
              :open-schedule-picker="openSchedulePicker"
              :submit="submit"
              :set-emoji-picker-el="setEmojiPickerEl"
            />
            <p v-if="pollIncomplete" class="text-xs moh-text-muted" role="status">
              Add at least two poll options, or remove the poll.
            </p>
            <p
              v-if="composerHasFailedMedia || pollHasFailed"
              class="text-xs text-amber-600 dark:text-amber-400"
              role="status"
            >
              Remove failed items to post.
            </p>
          </div>
        </Teleport>
      </div>
      </div>
    </div>

    <AppComposerGuest
      v-else
      :omit-avatar="omitAvatar"
      :inline-audience="inlineAudience"
      :mode="mode"
      :scheduled-edit-id="scheduledEditId"
      :login-to="loginTo"
      :show-login-prompt="showLoginPrompt"
    />
  </div>

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
  </div>
</template>

<script setup lang="ts">
import AppComposerPromptContext from '~/components/app/composer/PromptContext.vue'
import { usePostComposer, type PostComposerProps } from '~/composables/composer/usePostComposer'
import type { ScheduledPost } from '~/types/api'

const emit = defineEmits<{
  (e: 'handoff-chat', payload: { body: string; files: File[] }): void
  (e: 'posted', payload: { id: string; visibility: import('~/types/api').PostVisibility; post?: import('~/types/api').FeedPost }): void
  (e: 'edited', payload: { id: string; post: import('~/types/api').FeedPost }): void
  (e: 'scheduled', payload: { scheduledPost: ScheduledPost }): void
  (e: 'scheduled-updated', updated: ScheduledPost): void
  (
    e: 'pending',
    payload: {
      localId: string
      optimisticPost: import('~/types/api').FeedPost
      perform: () => Promise<import('~/types/api').FeedPost | { id: string } | null | undefined>
    },
  ): void
}>()

const props = defineProps<PostComposerProps>()
const {
  user, isAuthed, isPremium, viewerIsVerified, mode, disableMedia, disablePoll, showDivider,
  enableAvatarStatusEditor, quotedPost, myProfilePath, draft, composerEditorEl,
  poll, hasPoll, pollIncomplete, pollUploading, pollHasFailed, onPollStatus, onUpdatePoll, clearPoll,
  onClickAddPoll, selectedGroupId, myGroups, myGroupsLoading, myGroupsError, effectiveGroupId,
  canChooseGroup, selectedGroupReadLabel, loadMyGroups, visibility, selectDestinationVisibility,
  selectGroup, allowedComposerVisibilities, effectiveVisibility, showChatDestination,
  showVisibilityPicker, showGroupScopeIcon, scopeTagLabel, scopeTagTooltip, scheduledAt,
  scheduledAtDraft, schedulePickerOpen, scheduleMore, scheduledEditId, scheduleMinDate, scheduleMaxDate,
  formatScheduledAt, scheduledAtDisplay, scheduledAtDraftIsPast, openSchedulePicker, confirmSchedule,
  clearSchedule, statusEditorOpen, statusDraft, statusSaving, statusError, activeStatus,
  openStatusEditor, closeStatusEditor, saveStatus, editStatus, clearStatus, composerHashtagColor,
  composerUploadBarColor, scheduleAccentColor, composerTextareaVars, postButtonClass, composerMedia,
  canAddMoreMedia, remainingMediaSlots, displaySlots, firstEmptySlotIndex, composerUploading,
  composerUploadStatusLabel, mediaFileInputEl, openMediaPicker, onMediaFilesSelected,
  removeComposerMedia, draggingMediaId, dragGhost, dragGhostStyle, dropOverlayVisible,
  onComposerAreaDragEnter, onComposerAreaDragOver, onComposerAreaDragLeave, onComposerDrop,
  onComposerPaste, ingestMediaFiles, onMediaTilePointerDown, giphyOpen, giphyQuery, giphyLoading,
  giphyError, giphyItems, giphyInputRef, searchGiphy, selectGiphyGif, scheduledCount,
  destinationDrafts, hasEditChanges, canPost, composerHasFailedMedia, postMaxLen, postCharCount,
  composerPlaceholder, composerAcceptTypes, previewOpen, previewPost, previewDestinations,
  onPreviewConfirm, submitting, submitError, submit, crosspostChoice, onDraftChange, insertEmoji,
  onUpdateAltText, onClickAddMedia, onClickAddGiphy, handoffToChat, loginTo, showLoginPrompt,
  clearComposer, focus, draftText, draftSnapshot, hasUnsavedContent, setEmojiPickerEl,
} = usePostComposer(props, emit)

const { inlineAudience, checkinPrompt, omitAvatar, inReplyThread, replyTo, autoFocus, actionsTarget, submitTarget } = toRefs(props)

const submitLabel = computed(() =>
  mode.value === 'edit' && scheduledEditId.value
    ? 'Save'
    : (scheduledAt.value ? 'Schedule' : (mode.value === 'edit' ? 'Save' : (replyTo.value ? 'Reply' : (checkinPrompt.value ? 'Post answer' : 'Post')))),
)
const submitDisabled = computed(() =>
  submitting.value
  || !canPost.value
  || (mode.value === 'edit' && !scheduledEditId.value
    ? (!draft.value.trim() || !hasEditChanges.value)
    : !(draft.value.trim() || composerMedia.value.length || hasPoll.value))
  || postCharCount.value > postMaxLen.value
  || composerUploading.value
  || composerHasFailedMedia.value
  || pollUploading.value
  || pollHasFailed.value
  || pollIncomplete.value,
)

defineExpose({ hasUnsavedContent, hasEditChanges, submitting, draftSnapshot, clearComposer, focus, draftText })
</script>

<style scoped>
.composer-media-slot {
  flex: 0 0 auto;
  width: 5rem;
  height: 5rem;
}

.composer-media-move {
  transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.composer-media-enter-active,
.composer-media-leave-active {
  transition: opacity 0.2s ease, transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.composer-media-enter-from,
.composer-media-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.composer-slot-enter-active,
.composer-slot-leave-active {
  transition: opacity 0.14s ease, transform 0.18s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.composer-slot-enter-from,
.composer-slot-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

.moh-drag-ghost {
  position: fixed;
  z-index: var(--moh-z-drag-ghost);
  pointer-events: none;
  transform: translateZ(0);
  will-change: left, top;
  opacity: 0.98;
}

.moh-composer-styled-textarea :deep(.moh-styled-textarea-editor) {
  min-height: 3.5rem;
  max-height: min(15rem, 40dvh);
  overflow-y: auto;
  padding: 0.375rem 0;
  font-size: 20px;
  line-height: 1.75rem;
}

.moh-home-composer { padding-top: 12px; }
.moh-home-composer .moh-composer-styled-textarea :deep(.moh-styled-textarea-editor) { min-height: 44px; }
.moh-home-composer :deep(.composer-tools .iconify) { width: 22px; height: 22px; font-size: 22px; }

.moh-edit-composer { padding: 20px 24px; }
.moh-edit-composer .moh-composer-styled-textarea :deep(.moh-styled-textarea-editor) {
  min-height: 0;
  max-height: min(24rem, 50dvh);
  padding-block: 4px;
}
.moh-edit-actions :deep(.composer-action-layout) { flex-direction: row; align-items: center; }
.moh-edit-actions :deep(.composer-tools) { flex: 1 1 0; }
.moh-edit-actions :deep(.composer-publish) { flex: 0 0 auto; gap: 16px; }
@media (max-width: 639px) { .moh-edit-composer { padding: 16px; } }

.moh-prompt-composer {
  padding: 16px 24px 20px;
}
.moh-prompt-composer .moh-composer-styled-textarea :deep(.moh-styled-textarea-editor) {
  min-height: 120px;
  padding-top: 0;
  font-size: 18px;
  line-height: 1.625rem;
}
@media (max-width: 639px) {
  .moh-prompt-composer { padding-inline: 16px; }
}

.moh-upload-indeterminate {
  animation: moh-upload-indeterminate 900ms ease-in-out infinite;
}

@keyframes moh-upload-indeterminate {
  0% { transform: translateX(-110%); }
  100% { transform: translateX(210%); }
}
</style>
