<template>
  <div
    class="flex w-full flex-col gap-1.5"
    @dragenter="onComposerAreaDragEnter"
    @dragover="onComposerAreaDragOver"
    @dragleave="onComposerAreaDragLeave"
    @drop.prevent="onComposerDrop"
    @paste="onComposerPaste"
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
    />

    <!-- Reply-to snippet -->
    <Transition name="moh-fade">
      <div
        v-if="replyTo"
        class="flex items-start gap-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/60 px-3 py-2 text-xs"
      >
        <Icon name="tabler:corner-up-right" size="13" class="shrink-0 text-gray-400 dark:text-zinc-500" aria-hidden="true" />
        <div class="min-w-0 flex-1">
          <span class="font-semibold text-gray-600 dark:text-gray-300 mr-1">
            {{ replyTo.senderUsername ? `@${replyTo.senderUsername}` : 'Reply' }}
          </span>
          <span class="text-gray-500 dark:text-gray-400 line-clamp-1">{{ replyTo.bodyPreview }}</span>
        </div>
        <!-- Thumbnail of media from the original message -->
        <img
          v-if="replyTo.mediaThumbnailUrl"
          :src="replyTo.mediaThumbnailUrl"
          class="shrink-0 h-9 w-9 rounded-md object-cover"
          aria-hidden="true"
        />
        <button
          type="button"
          aria-label="Cancel reply"
          class="shrink-0 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
          @click="emit('cancel-reply')"
        >
          <Icon name="tabler:x" size="13" aria-hidden="true" />
        </button>
      </div>
    </Transition>

    <!-- Input row -->
    <div class="flex items-end gap-2">
      <!-- Left toolbar: photo + GIF buttons -->
      <div class="flex shrink-0 items-center gap-0.5 pb-[5px]">
        <!-- Add image/video button -->
        <button
          type="button"
          aria-label="Attach image or video"
          :disabled="disabled || (canSendMedia && !canAddMoreMedia)"
          class="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
          @click="onMediaPickerClick"
        >
          <Icon name="tabler:photo" size="18" aria-hidden="true" />
        </button>

        <!-- GIF button -->
        <button
          type="button"
          aria-label="Add a GIF"
          :disabled="disabled || (canSendMedia && !canAddMoreMedia)"
          class="flex h-8 items-center justify-center rounded-full px-1.5 text-gray-500 transition-colors hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
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
          <div v-if="composerMedia.length > 0" class="relative inline-block">
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
              />

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

        <!-- Text pill (emoji inside on the left) -->
        <div class="relative flex items-stretch" :class="outlineClass">
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
          />

          <Transition name="moh-fade">
            <button
              v-if="hasContent"
              type="button"
              aria-label="Send"
              :disabled="loading || composerUploading"
              class="absolute right-2 bottom-2 flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-50"
              :class="sendButtonClass"
              @click="emitSend"
            >
              <Icon v-if="loading || composerUploading" name="tabler:loader" class="text-sm animate-spin" aria-hidden="true" />
              <Icon v-else name="tabler:arrow-up" class="text-sm" aria-hidden="true" />
            </button>
          </Transition>

          <!-- Drop overlay -->
          <AppComposerDropOverlay
            :visible="dropOverlayVisible"
            :remaining-slots="remainingMediaSlots"
            :max-slots="1"
            tight-bottom
          />
        </div>
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
import type { CreateMediaPayload } from '~/composables/composer/types'
import { userColorTier, userTierColorVar } from '~/utils/user-tier'
import { useComposerMedia } from '~/composables/useComposerMedia'

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

const isPremium = computed(() => Boolean(props.user?.premium || props.user?.premiumPlus))
const canSendMedia = computed(() => props.canSendMedia !== false)
const canAcceptVideoRef = computed(() => isPremium.value)

const {
  composerMedia,
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
  giphyOpen,
  giphyQuery,
  giphyLoading,
  giphyError,
  giphyItems,
  openGiphyPicker,
  searchGiphy,
  selectGiphyGif,
  toCreatePayload,
  clearAll,
} = useComposerMedia({
  maxSlots: 1,
  canAcceptVideo: canAcceptVideoRef,
  onMediaRejectedNeedPremium: () => usePremiumMediaModal().show(),
})

const acceptTypes = computed(() =>
  isPremium.value
    ? 'image/*,video/mp4,video/quicktime,video/webm,video/x-m4v'
    : 'image/*',
)

const hasText = computed(() => (props.modelValue ?? '').trim().length > 0)
const hasContent = computed(() => hasText.value || composerMedia.value.length > 0)

const userTier = computed(() => userColorTier(props.user))
const userHashtagColor = computed(() => userTierColorVar(userTier.value) ?? 'var(--p-primary-color)')
const ORG_CHAT_SILVER = '#313643'

const outlineClass = computed(() => {
  const radius = isMultiline.value ? 'rounded-2xl' : 'rounded-full'
  const base = `${radius} border`
  if (userTier.value === 'organization') return `${base} border-[${ORG_CHAT_SILVER}]`
  if (userTier.value === 'premium') return `${base} border-[var(--moh-premium)]`
  if (userTier.value === 'verified') return `${base} border-[var(--moh-verified)]`
  return `${base} border-gray-300 dark:border-zinc-600`
})

const sendButtonClass = computed(() => {
  if (userTier.value === 'organization') return `bg-[${ORG_CHAT_SILVER}] text-white hover:opacity-90`
  if (userTier.value === 'premium') return 'bg-[var(--moh-premium)] text-white hover:opacity-90'
  if (userTier.value === 'verified') return 'bg-[var(--moh-verified)] text-white hover:opacity-90'
  return 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100'
})

function onMediaPickerClick() {
  if (!isPremium.value || !canSendMedia.value) {
    usePremiumMediaModal().show()
    return
  }
  openMediaPicker()
}

function onGifPickerClick() {
  if (!isPremium.value || !canSendMedia.value) {
    usePremiumMediaModal().show()
    return
  }
  openGiphyPicker()
}

function guardedOnMediaFilesSelected(e: Event) {
  if (!isPremium.value || !canSendMedia.value) return
  onMediaFilesSelected(e)
}

function onTextChange(text: string) {
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
  })
}

watch(() => props.modelValue, checkMultiline)

defineExpose({ focus, getMedia, clearMedia })
</script>

<style scoped>
.dm-composer-emoji :deep(.p-button) {
  height: 32px;
  width: 32px;
  padding: 0;
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
