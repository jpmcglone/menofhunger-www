<template>
  <AppComposerActionBar :submit-target="submitTarget">
    <template #tools>
      <template v-if="!disableMedia">
        <Button
          v-tooltip.bottom="tinyTooltip(hasPoll ? 'Remove poll to add media' : (canAddMoreMedia ? 'Add image/GIF' : 'Max 4 attachments'))"
          text
          rounded
          severity="secondary"
          aria-label="Add media"
          :disabled="!canAddMoreMedia || hasPoll"
          class="moh-focus"
          @click="onClickAddMedia"
        >
          <template #icon>
            <AppIconGlyph name="image" :size="22" />
          </template>
        </Button>
        <Button
          v-tooltip.bottom="tinyTooltip(hasPoll ? 'Remove poll to add media' : (canAddMoreMedia ? 'Add GIF (Giphy)' : 'Max 4 attachments'))"
          text
          rounded
          severity="secondary"
          class="moh-focus"
          aria-label="Add GIF"
          :disabled="!canAddMoreMedia || hasPoll"
          @click="onClickAddGiphy"
        >
          <template #icon>
            <AppIconGlyph name="gif" :size="22" />
          </template>
        </Button>
        <Button
          v-if="!replyTo && !disablePoll"
          v-tooltip.bottom="tinyTooltip(hasPoll ? 'Poll added' : ((isPremium && mediaCount > 0) ? 'Remove media to add a poll' : 'Add poll'))"
          text
          rounded
          severity="secondary"
          class="moh-focus"
          aria-label="Add poll"
          :disabled="hasPoll || (isPremium && mediaCount > 0)"
          @click="onClickAddPoll"
        >
          <template #icon>
            <Icon name="tabler:chart-bar" class="rotate-90 size-[22px]" aria-hidden="true" />
          </template>
        </Button>
      </template>
      <AppEmojiPickerButton
        :ref="setEmojiPickerEl"
        tooltip="Emoji"
        aria-label="Insert emoji"
        persistent
        @select="insertEmoji"
      />
      <div
        v-if="(isPremium || viewerIsVerified) && mode === 'create' && !replyTo && !quotedPost"
        class="relative inline-flex"
      >
        <Button
          v-tooltip.bottom="scheduledAt ? 'Click to change schedule' : 'Schedule post'"
          text
          rounded
          severity="secondary"
          class="moh-focus"
          :style="scheduleAccentColor ? { color: scheduleAccentColor } : {}"
          :aria-label="scheduledAt ? `Scheduled: ${scheduledAtDisplay}` : (scheduledCount > 0 ? `Schedule post. You have ${scheduledCount} scheduled.` : 'Schedule post')"
          @click="openSchedulePicker"
        >
          <template #icon>
            <AppIconGlyph name="scheduled" :size="22" />
          </template>
        </Button>
        <span
          v-if="scheduledCount > 0"
          class="pointer-events-none absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-[18px] text-center tabular-nums bg-[var(--moh-premium)] text-black"
          aria-hidden="true"
        >
          {{ scheduledCount > 99 ? '99+' : scheduledCount }}
        </span>
      </div>
    </template>
    <template #count>
      <div
        v-if="postCharCount > 0"
        class="moh-meta tabular-nums"
        :class="postCharCount > postMaxLen ? 'text-red-600 dark:text-red-400 font-semibold' : ''"
      >
        {{ postCharCount }}/{{ postMaxLen }}
      </div>
    </template>
    <template #submit>
      <Button
        :label="submitLabel"
        rounded
        severity="secondary"
        :class="[postButtonClass, inlineAudience && !checkinPrompt && 'disabled:!border-[var(--moh-button-disabled-fill)] disabled:!bg-[var(--moh-button-disabled-fill)] disabled:!text-[var(--moh-text-muted)]', 'moh-pressable !rounded-full !min-h-11 !py-1.5 !px-5 !text-sm !font-semibold']"
        :disabled="submitDisabled"
        :title="composerHasFailedMedia ? 'Remove failed items to post' : (pollHasFailed ? 'Remove failed poll images to post' : undefined)"
        :loading="submitting"
        @click="submit"
      />
    </template>
  </AppComposerActionBar>
</template>

<script setup lang="ts">
import AppComposerActionBar from '~/components/app/composer/ActionBar.vue'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import type { ComponentPublicInstance } from 'vue'

defineProps<{
  submitTarget?: HTMLElement | null
  disableMedia: boolean
  disablePoll: boolean
  hasPoll: boolean
  canAddMoreMedia: boolean
  replyTo?: unknown
  quotedPost?: unknown
  isPremium: boolean
  viewerIsVerified: boolean
  mediaCount: number
  mode: 'create' | 'edit'
  scheduledAt: Date | null
  scheduledAtDisplay: string
  scheduledCount: number
  scheduleAccentColor: string | null
  postCharCount: number
  postMaxLen: number
  submitLabel: string
  postButtonClass: string
  inlineAudience?: boolean
  checkinPrompt?: string
  submitDisabled: boolean
  composerHasFailedMedia: boolean
  pollHasFailed: boolean
  submitting: boolean
  onClickAddMedia: () => void
  onClickAddGiphy: () => void
  onClickAddPoll: () => void
  insertEmoji: (emoji: string) => void
  openSchedulePicker: () => void
  submit: () => void
  setEmojiPickerEl: (el: Element | ComponentPublicInstance | { close: () => void } | null) => void
}>()
</script>
