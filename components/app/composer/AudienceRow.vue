<template>
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
</template>

<script setup lang="ts">
import type { usePostComposer, PostComposerProps } from '~/composables/composer/usePostComposer'

const props = defineProps<{
  composer: ReturnType<typeof usePostComposer>
  replyTo?: PostComposerProps['replyTo']
  inlineAudience?: boolean
  checkinPrompt?: string
}>()

const {
  allowedComposerVisibilities,
  canChooseGroup,
  effectiveGroupId,
  effectiveVisibility,
  handoffToChat,
  isPremium,
  loadMyGroups,
  mode,
  myGroups,
  myGroupsError,
  myGroupsLoading,
  openSchedulePicker,
  quotedPost,
  scheduleAccentColor,
  scheduledAt,
  scheduledAtDisplay,
  scopeTagLabel,
  scopeTagTooltip,
  selectDestinationVisibility,
  selectGroup,
  selectedGroupId,
  selectedGroupReadLabel,
  showChatDestination,
  showGroupScopeIcon,
  showVisibilityPicker,
  viewerIsVerified,
  visibility,
} = props.composer
</script>
