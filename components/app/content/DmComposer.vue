<template>
  <div
    class="flex w-full flex-col gap-1.5"
    @dragenter="onComposerAreaDragEnter"
    @dragover="onComposerAreaDragOver"
    @dragleave="onComposerAreaDragLeave"
    @drop.prevent="onComposerDrop"
    @paste.capture="onComposerPaste"
  >
    <!-- Hidden file input for media picker -->
    <input
      ref="mediaFileInputEl"
      type="file"
      :accept="acceptTypes"
      class="hidden"
      tabindex="-1"
      aria-hidden="true"
      disabled
      @change="guardedOnMediaFilesSelected"
    >

    <AppDmReplyPreview :reply-to="replyTo" @cancel="emit('cancel-reply')" />

    <!-- Input row -->
    <div class="flex items-end gap-2">
      <!-- Left toolbar: photo + GIF buttons -->
      <div v-if="!voice.recording.value && !voice.starting.value && !pendingVoice" class="flex shrink-0 items-center gap-0.5 pb-[5px]">
        <!-- Add image/video button -->
        <button
          type="button"
          aria-label="Attach image or video"
          :disabled="disabled || (canSendMedia && !canAddMoreMedia)"
          class="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
          @mousedown.prevent
          @click="onMediaPickerClick"
        >
          <Icon name="tabler:photo" size="18" aria-hidden="true" />
        </button>

        <button
          v-if="showMic"
          type="button"
          aria-label="Record a voice note"
          data-testid="chat-voice-mic"
          :disabled="disabled"
          class="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
          @mousedown.prevent
          @click="onMicClick"
        >
          <Icon name="tabler:microphone" size="18" aria-hidden="true" />
        </button>

        <!-- GIF button -->
        <button
          type="button"
          aria-label="Add a GIF"
          :disabled="disabled || (canSendMedia && !canAddMoreMedia)"
          class="flex h-8 items-center justify-center rounded-full px-1.5 text-gray-500 transition-colors hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
          @mousedown.prevent
          @click="onGifPickerClick"
        >
          <span
            class="inline-flex h-[22px] w-[22px] items-center justify-center rounded-md border border-current/30 bg-transparent text-[10px] font-black leading-none"
            aria-hidden="true"
          >GIF</span>
        </button>
      </div>

      <!-- Right column: media preview + text pill (share the same left edge) -->
      <div class="flex flex-1 flex-col gap-1.5">
        <!-- Media preview (when attached) — aligns with the text pill -->
        <Transition name="moh-fade">
          <div v-if="composerMedia.length > 0 && !pendingVoice" class="relative inline-block">
            <div class="relative">
              <!-- Video preview -->
              <video
                v-if="composerMedia[0]!.kind === 'video'"
                :src="composerMedia[0]!.previewUrl"
                class="h-32 max-w-[200px] rounded-xl border moh-border object-cover bg-black"
                muted
                playsinline
                preload="metadata"
              />
              <!-- Image / GIF preview -->
              <img
                v-else
                :src="composerMedia[0]!.previewUrl"
                class="h-32 max-w-[200px] rounded-xl border moh-border object-cover bg-black/5 dark:bg-white/5"
                :alt="composerMedia[0]!.altText ?? ''"
                loading="lazy"
              >

              <!-- Upload progress bar (matches post composer treatment) -->
              <div
                v-if="composerMedia[0]!.uploadStatus && composerMedia[0]!.uploadStatus !== 'done'"
                class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-xl"
              >
                <span
                  v-if="composerMedia[0]!.uploadStatus !== 'error'"
                  class="text-[10px] font-medium text-white drop-shadow-sm"
                >
                  {{
                    composerMedia[0]!.uploadStatus === 'compressing' ? 'Compressing…'
                    : composerMedia[0]!.uploadStatus === 'uploading' ? 'Uploading…'
                    : composerMedia[0]!.uploadStatus === 'processing' ? 'Processing…'
                    : composerMedia[0]!.uploadStatus === 'queued' ? 'Queued'
                    : null
                  }}
                </span>
                <div class="relative h-1.5 w-14 overflow-hidden rounded-full bg-black/25">
                  <!-- Determinate progress -->
                  <div
                    v-if="(composerMedia[0]!.uploadStatus === 'uploading' || composerMedia[0]!.uploadStatus === 'compressing') && typeof composerMedia[0]!.uploadProgress === 'number'"
                    class="h-full rounded-full bg-white transition-[width] duration-300 ease-out"
                    :style="{ width: `${Math.max(0, Math.min(100, composerMedia[0]!.uploadProgress ?? 0))}%` }"
                    aria-hidden="true"
                  />
                  <!-- Error bar -->
                  <div
                    v-else-if="composerMedia[0]!.uploadStatus === 'error'"
                    class="h-full w-full rounded-full bg-red-500/90"
                    aria-hidden="true"
                  />
                  <!-- Indeterminate (processing / queued / no progress value) -->
                  <div
                    v-else
                    class="dm-upload-indeterminate absolute inset-y-0 left-0 w-1/2 rounded-full bg-white"
                    aria-hidden="true"
                  />
                </div>
              </div>

              <!-- Remove button -->
              <button
                type="button"
                class="absolute -right-2 -top-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-zinc-800 dark:bg-black dark:text-gray-200 dark:hover:bg-zinc-900"
                aria-label="Remove media"
                @click.stop="removeComposerMedia(composerMedia[0]!.localId)"
              >
                <span class="text-[12px] leading-none" aria-hidden="true">×</span>
              </button>
            </div>
          </div>
        </Transition>

        <div v-if="voice.recording.value || voice.starting.value || pendingVoice" class="rounded-2xl border moh-border px-3 py-2" data-testid="chat-voice-recording">
          <div v-if="voice.recording.value || voice.starting.value" class="flex items-center gap-2">
            <AppChatVoiceLevel v-if="voice.recording.value" :level="voice.level.value" />
            <span v-else class="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
            <span class="min-w-0 flex-1 text-sm tabular-nums">{{ voice.starting.value ? 'Allow microphone access…' : `Recording · ${formatVoiceClock(voice.elapsed.value)} / 2:00` }}</span>
            <button type="button" class="min-h-11 px-2 text-sm" @click="cancelVoice">Discard</button>
            <button v-if="voice.recording.value" type="button" class="min-h-11 px-3 text-sm font-semibold" @click="stopVoice">Stop</button>
          </div>
          <template v-else>
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm">Voice message · {{ formatVoiceClock(pendingVoiceSeconds) }}</span>
              <button type="button" class="min-h-11 px-2 text-sm" :disabled="sendingVoice" @click="cancelVoice">Discard</button>
              <button type="button" class="min-h-11 rounded-full bg-[var(--moh-text)] px-4 text-sm font-semibold text-[var(--moh-surface-0)] disabled:opacity-50" :disabled="sendingVoice || disabled" data-testid="chat-voice-send" @click="sendVoice">{{ sendingVoice ? 'Sending…' : 'Send' }}</button>
            </div>
            <audio v-if="voicePreviewUrl" ref="voicePreviewEl" :src="voicePreviewUrl" controls preload="metadata" class="h-10 w-full" aria-label="Preview voice message" />
          </template>
        </div>

        <!-- Text pill (emoji inside on the left) -->
        <div v-else class="relative flex items-stretch" :class="outlineClass">
          <!-- Emoji button inside the pill, left side -->
          <div class="dm-composer-emoji absolute left-2 top-1/2 -translate-y-1/2 z-10">
            <AppEmojiPickerButton
              ref="emojiPickerEl"
              tooltip="Emoji"
              aria-label="Insert emoji"
              persistent
              :disabled="disabled"
              @select="insertEmoji"
            />
          </div>

          <div class="dm-composer-textarea-scroll w-full min-w-0" :class="{ 'is-capped': isCapped }">
            <AppStyledTextarea
              ref="styledTextareaEl"
              :model-value="modelValue"
              :placeholder="placeholder"
              :disabled="disabled"
              :auto-focus="autoFocus"
              :priority-users="priorityUsers"
              :priority-section-title="prioritySectionTitle"
              :hashtag-color="userHashtagColor"
              @update:model-value="onTextChange"
              @send="onSend"
              @media-files="(files) => ingestMediaFiles(files, 'paste')"
            />
          </div>

          <Transition name="moh-fade">
            <button
              v-if="hasContent"
              type="button"
              aria-label="Send"
              :disabled="loading || composerUploading"
              class="absolute right-2 bottom-2 flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-50"
              :class="sendButtonClass"
              @mousedown.prevent
              @click="emitSend"
            >
              <Icon v-if="loading || composerUploading" name="tabler:loader" class="text-sm animate-spin" aria-hidden="true" />
              <Icon v-else name="tabler:arrow-up" class="text-sm" aria-hidden="true" />
            </button>
          </Transition>

          <!-- Char counter — only visible when approaching the limit -->
          <Transition name="moh-fade">
            <span
              v-if="showCharCount"
              class="absolute right-2 top-1.5 text-[10px] tabular-nums leading-none select-none pointer-events-none"
              :class="charsRemaining <= 0 ? 'text-red-500' : charsRemaining <= 50 ? 'text-amber-500 dark:text-amber-400' : 'text-gray-400 dark:text-zinc-500'"
              aria-live="polite"
              :aria-label="`${charsRemaining} characters remaining`"
            >{{ charsRemaining }}</span>
          </Transition>

          <!-- Drop overlay -->
          <AppComposerDropOverlay
            :visible="dropOverlayVisible"
            :remaining-slots="remainingMediaSlots"
            :max-slots="1"
            tight-bottom
          />
        </div>
        <AppComposerLinkPreview
          v-if="!composerMedia.length && !voice.recording.value && !pendingVoice"
          :text="modelValue"
          class="mt-2"
        />
      </div>
    </div>

    <!-- GIF picker dialog -->
    <AppComposerGiphyPickerDialog
      :open="giphyOpen"
      :query="giphyQuery"
      :loading="giphyLoading"
      :error="giphyError ?? null"
      :items="giphyItems"
      :can-add-more="canAddMoreMedia"
      @update:open="giphyOpen = $event"
      @update:query="giphyQuery = $event"
      @search="searchGiphy"
      @select="selectGiphyGif"
    />
  </div>
</template>


<script setup lang="ts">
import type { FollowListUser, MessageReplySnippet } from '~/types/api'
import type { ComposerMediaItem, CreateMediaPayload } from '~/composables/composer/types'
import { dmComposerOutlineClass, dmComposerSendButtonClass, userColorTier, userTierColorVar } from '~/utils/user-tier'
import { useComposerMedia } from '~/composables/useComposerMedia'
import { useDmVoiceComposer } from '~/composables/chat/useDmVoiceComposer'

const MAX_CHARS = 10_000

const props = withDefaults(
  defineProps<{
    modelValue: string
    user?: Partial<Pick<FollowListUser, 'isOrganization' | 'premium' | 'premiumPlus' | 'verifiedStatus'>> | null
    placeholder?: string
    loading?: boolean
    disabled?: boolean
    autoFocus?: boolean
    priorityUsers?: FollowListUser[] | null
    prioritySectionTitle?: string
    replyTo?: MessageReplySnippet | null
    /** When false, photo/GIF buttons are still tappable but show the premium modal instead of opening pickers. */
    canSendMedia?: boolean
  }>(),
  {
    placeholder: 'Message',
    loading: false,
    disabled: false,
    user: null,
    autoFocus: false,
    priorityUsers: null,
    prioritySectionTitle: undefined,
    replyTo: null,
    canSendMedia: true,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  send: []
  'cancel-reply': []
}>()

const styledTextareaEl = ref<InstanceType<typeof import('./StyledTextarea.vue').default> | null>(null)
const emojiPickerEl = ref<{ close: () => void } | null>(null)
const isMultiline = ref(false)
const isCapped = ref(false)
const EDITOR_MAX_PX = 160

const isPremium = computed(() => Boolean(props.user?.premium || props.user?.premiumPlus))
const isVerified = computed(() => props.user?.verifiedStatus !== 'none' && props.user?.verifiedStatus != null)
const canSendMedia = computed(() => props.canSendMedia !== false)
const canAcceptVideoRef = computed(() => isPremium.value)
const canUseMedia = computed(() => isVerified.value && canSendMedia.value)

const {
  composerMedia,
  restoreDraftMedia,
  canAddMoreMedia,
  remainingMediaSlots,
  composerUploading,
  mediaFileInputEl,
  openMediaPicker,
  onMediaFilesSelected,
  removeComposerMedia,
  dropOverlayVisible,
  onComposerAreaDragEnter,
  onComposerAreaDragOver,
  onComposerAreaDragLeave,
  onComposerDrop,
  onComposerPaste,
  ingestMediaFiles,
  giphyOpen,
  giphyQuery,
  giphyLoading,
  giphyError,
  giphyItems,
  openGiphyPicker,
  searchGiphy,
  selectGiphyGif,
  toCreatePayload,
  enqueueAudio,
  waitForUploads,
  clearAll,
} = useComposerMedia({
  maxSlots: 1,
  canAcceptImages: canUseMedia,
  canAcceptVideo: canAcceptVideoRef,
  onMediaRejectedNeedPremium: () => usePremiumUpsell().show('media'),
})

const acceptTypes = computed(() =>
  isPremium.value
    ? 'image/*,video/mp4,video/quicktime,video/webm,video/x-m4v'
    : 'image/*',
)

const hasText = computed(() => (props.modelValue ?? '').trim().length > 0)
const hasContent = computed(() => hasText.value || composerMedia.value.length > 0)
const showMic = computed(() =>
  isVerified.value && canSendMedia.value && !hasText.value && composerMedia.value.length === 0 && !props.replyTo,
)

const {
  voice,
  pendingVoice,
  sendingVoice,
  voicePreviewUrl,
  voicePreviewEl,
  pendingVoiceSeconds,
  formatVoiceClock,
  onMicClick,
  stopVoice,
  cancelVoice,
  sendVoice,
} = useDmVoiceComposer({
  canRecord: canUseMedia,
  disabled: computed(() => props.disabled),
  media: { composerMedia, removeComposerMedia, enqueueAudio, waitForUploads },
  onSend: () => emit('send'),
})

const charsRemaining = computed(() => MAX_CHARS - (props.modelValue?.length ?? 0))
const showCharCount = computed(() => charsRemaining.value <= 200)

const userTier = computed(() => userColorTier(props.user))
const userHashtagColor = computed(() => userTierColorVar(userTier.value) ?? 'var(--p-primary-color)')
const outlineClass = computed(() => dmComposerOutlineClass(userTier.value, isMultiline.value))
const sendButtonClass = computed(() => dmComposerSendButtonClass(userTier.value))

/** Media pickers are verified-only; everyone else sees the premium modal. */
function withMediaGate(open: () => void) {
  if (!canUseMedia.value) {
    usePremiumUpsell().show('media')
    return
  }
  open()
}
const onMediaPickerClick = () => withMediaGate(openMediaPicker)
const onGifPickerClick = () => withMediaGate(openGiphyPicker)

function guardedOnMediaFilesSelected(e: Event) {
  if (!canUseMedia.value) return
  onMediaFilesSelected(e)
}

function onTextChange(text: string) {
  if (text.length > MAX_CHARS) return
  emit('update:modelValue', text)
  checkMultiline()
}

function onSend() {
  if (hasContent.value && !composerUploading.value) {
    emojiPickerEl.value?.close()
    emit('send')
  }
}

function emitSend() {
  if (!hasContent.value || props.loading || composerUploading.value) return
  emojiPickerEl.value?.close()
  emit('send')
}

function insertEmoji(emoji: string) {
  styledTextareaEl.value?.insertAtCursor(emoji + ' ')
}

function focus() {
  styledTextareaEl.value?.focus()
}

function insertMention(username: string) {
  styledTextareaEl.value?.insertMention(username)
}

function getMedia(): CreateMediaPayload[] {
  return toCreatePayload(composerMedia.value)
}

function clearMedia() {
  clearAll()
}

function checkMultiline() {
  nextTick(() => {
    const editorEl = styledTextareaEl.value?.$el?.querySelector('.moh-styled-textarea-editor') as HTMLElement | null
    if (!editorEl) return
    const style = window.getComputedStyle(editorEl)
    const lh = parseFloat(style.lineHeight) || 20
    const pt = parseFloat(style.paddingTop) || 0
    const pb = parseFloat(style.paddingBottom) || 0
    const contentH = Math.max(0, editorEl.scrollHeight - pt - pb)
    isMultiline.value = lh > 0 ? Math.round(contentH / lh) >= 2 : false
    // iOS Safari will not scroll a parent of a focused contenteditable. Give the
    // editor a definite height once it hits the cap so the field itself scrolls.
    isCapped.value = editorEl.scrollHeight > EDITOR_MAX_PX + 0.5
  })
}

watch(() => props.modelValue, checkMultiline)

function getDraftMedia(): ComposerMediaItem[] {
  return composerMedia.value.map(item => {
    const { abortController: _abort, ...value } = toRaw(item)
    return { ...value, previewUrl: value.previewUrl.startsWith('blob:') ? '' : value.previewUrl }
  })
}
defineExpose({ focus, insertMention, getMedia, clearMedia, getDraftMedia, restoreDraftMedia })
</script>

<style scoped>
.dm-composer-emoji :deep(.p-button) {
  height: 32px;
  width: 32px;
  padding: 0;
}

/* Cap at ~5 lines. Overflow MUST live on the contenteditable — iOS Safari
   ignores overflow on a parent of a focused TipTap field, so a wrapper-only
   scrollport leaves the caret stranded behind the keyboard. */
.dm-composer-textarea-scroll :deep(.moh-styled-textarea-editor) {
  max-height: 160px;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
}

.dm-composer-textarea-scroll.is-capped :deep(.moh-styled-textarea-editor) {
  height: 160px;
}

.dm-upload-indeterminate {
  animation: dm-upload-indeterminate 900ms ease-in-out infinite;
}

@keyframes dm-upload-indeterminate {
  0% {
    transform: translateX(-110%);
  }
  100% {
    transform: translateX(210%);
  }
}
</style>
