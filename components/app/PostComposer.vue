<template>
  <!-- Composer -->
  <div
    :class="[
      'pb-4',
      omitAvatar ? 'pr-4' : 'px-4',
      inReplyThread ? 'pt-2' : 'pt-4',
      showDivider ? 'border-b border-gray-200 dark:border-zinc-800' : ''
    ]"
  >
    <div v-if="isAuthed" :class="omitAvatar ? 'flex flex-col gap-2' : 'grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 items-start'">
      <!-- Row 1: visibility picker, or read-only scope tag (when not omitScopeTagAbove) -->
      <div
        :class="omitAvatar ? 'flex justify-end' : 'col-start-2 flex justify-end items-end mb-3 sm:mb-2'"
      >
        <AppComposerVisibilityPicker
          v-if="showVisibilityPicker"
          v-model="visibility"
          :allowed="allowedComposerVisibilities"
          :viewer-is-verified="viewerIsVerified"
          :is-premium="isPremium"
        />
        <span
          v-else
          class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border cursor-default"
          :class="scopeTagClass ? scopeTagClass : 'moh-text-muted border-gray-300 dark:border-zinc-600'"
          v-tooltip.bottom="scopeTagTooltip"
          aria-label="Reply visibility"
        >
          <i v-if="effectiveVisibility === 'onlyMe'" class="pi pi-eye-slash mr-1 text-[10px]" aria-hidden="true" />
          {{ scopeTagLabel }}
        </span>
      </div>

      <!-- Row 2: avatar + textarea start aligned (avatar omitted when omitAvatar) -->
      <template v-if="!omitAvatar">
        <NuxtLink
          v-if="myProfilePath"
          :to="myProfilePath"
          class="row-start-1 sm:row-start-2 col-start-1 mb-3 sm:mb-0 group shrink-0"
          aria-label="View your profile"
        >
          <div class="transition-opacity duration-200 group-hover:opacity-80">
            <AppUserAvatar
              :user="user"
              size-class="h-8 w-8 sm:h-10 sm:w-10"
            />
          </div>
        </NuxtLink>
        <div v-else class="row-start-1 sm:row-start-2 col-start-1 mb-3 sm:mb-0 shrink-0" aria-hidden="true">
          <AppUserAvatar
            :user="user"
            size-class="h-8 w-8 sm:h-10 sm:w-10"
          />
        </div>
      </template>

      <div
        :class="omitAvatar ? 'min-w-0 moh-composer-tint' : 'row-start-2 col-span-2 sm:col-span-1 sm:col-start-2 min-w-0 moh-composer-tint'"
      >
        <!-- Optional content above textarea (e.g. "Replying to @username" in reply modal) -->
        <div v-if="$slots['above-textarea']" class="pb-2 text-sm moh-text-muted">
          <slot name="above-textarea" />
        </div>
        <input
          ref="mediaFileInputEl"
          type="file"
          :accept="composerAcceptTypes"
          class="hidden"
          multiple
          @change="onMediaFilesSelected"
        />

        <!-- Drop zone: textarea + attachments -->
        <div
          class="relative"
          :style="composerTextareaVars"
          @dragenter="onComposerAreaDragEnter"
          @dragover="onComposerAreaDragOver"
          @dragleave="onComposerAreaDragLeave"
          @drop.prevent="onComposerDrop"
        >
          <!-- Textarea wrapper: mirror shows @mentions styled; textarea on top with transparent text -->
          <div class="relative">
            <div
              ref="composerMirrorEl"
              class="pointer-events-none absolute inset-0 overflow-x-hidden overflow-y-auto rounded-xl border border-transparent px-3 py-2 text-[16px] leading-6 whitespace-pre-wrap break-words text-gray-900 dark:text-gray-50"
              :style="composerTextareaVars"
              aria-hidden="true"
            >
              <template v-for="(seg, i) in composerBodySegments" :key="i">
                <!-- IMPORTANT: avoid font-weight changes in mirror; it desyncs caret alignment vs textarea -->
                <span v-if="seg.type === 'mention'" :style="mentionTierToStyle(seg.tier)">{{ seg.value }}</span>
                <span v-else>{{ seg.value }}</span>
              </template>
            </div>
            <textarea
              ref="composerTextareaEl"
              v-model="draft"
              rows="3"
              enterkeyhint="enter"
              inputmode="text"
              class="moh-composer-textarea relative z-10 w-full resize-none overflow-hidden rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-[16px] leading-6 text-transparent caret-gray-900 placeholder:text-gray-500 focus:outline-none dark:border-zinc-700 dark:caret-gray-50 dark:placeholder:text-zinc-500"
              :style="composerTextareaVars"
              :placeholder="composerPlaceholder"
              :maxlength="postMaxLen"
              @input="onComposerInput"
              @keydown="onComposerKeydown"
              @paste="onComposerPaste"
              @scroll="syncComposerMirrorScroll"
            />

            <AppMentionAutocompletePopover
              v-bind="mention.popoverProps"
              @select="mention.onSelect"
              @highlight="mention.onHighlight"
              @requestClose="mention.onRequestClose"
            />

            <!-- Drag overlay (no media): hug just the textarea, less bottom inset to avoid extra padding -->
            <AppComposerDropOverlay
              :visible="dropOverlayVisible && !composerMedia.length"
              :remaining-slots="remainingMediaSlots"
              :max-slots="4"
              tight-bottom
            />
          </div>

          <AppInlineAlert v-if="submitError" class="mt-3" severity="danger">
            {{ submitError }}
          </AppInlineAlert>

          <!-- Media slots: always 4 once any media exists (avoid layout/animation weirdness) -->
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

          <!-- Drag overlay (with media): hug textarea + slots -->
          <AppComposerDropOverlay
            :visible="dropOverlayVisible && composerMedia.length > 0"
            :remaining-slots="remainingMediaSlots"
            :max-slots="4"
          />
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
              />
            </div>
          </Teleport>
        </ClientOnly>

        <div :class="composerMedia.length ? 'mt-5' : 'mt-3'" class="flex flex-col gap-1">
          <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <Button
              icon="pi pi-image"
              text
              rounded
              severity="secondary"
              aria-label="Add media"
              :disabled="!canAddMoreMedia"
              v-tooltip.bottom="tinyTooltip(canAddMoreMedia ? 'Add image/GIF' : 'Max 4 attachments')"
              @click="openMediaPicker"
            />
            <Button
              text
              severity="secondary"
              class="!rounded-xl"
              aria-label="Add GIF"
              :disabled="!canAddMoreMedia"
              v-tooltip.bottom="tinyTooltip(canAddMoreMedia ? 'Add GIF (Giphy)' : 'Max 4 attachments')"
              @click="openGiphyPicker((draft || '').trim().slice(0, 120))"
            >
              <template #icon>
                <span
                  class="inline-flex h-[22px] w-[22px] items-center justify-center rounded-md border border-current/30 bg-transparent text-[10px] font-black leading-none"
                  aria-hidden="true"
                >
                  GIF
                </span>
              </template>
            </Button>
            <AppEmojiPickerButton
              tooltip="Emoji"
              aria-label="Insert emoji"
              @select="insertEmoji"
            />
          </div>
          <div class="flex items-center gap-2">
            <div class="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
              {{ postCharCount }}/{{ postMaxLen }}
            </div>
            <Button
              :label="replyTo ? 'Reply' : 'Post'"
              rounded
              :outlined="postButtonOutlined"
              severity="secondary"
              :class="[postButtonClass, '!min-h-0 !py-1.5 !px-5 !text-sm !font-semibold']"
              :disabled="submitting || !canPost || (!(draft.trim() || composerMedia.length) ) || postCharCount > postMaxLen || composerUploading || composerHasFailedMedia"
              :title="composerHasFailedMedia ? 'Remove failed items to post' : undefined"
              :loading="submitting"
              @click="submit"
            />
          </div>
          </div>
          <p
            v-if="composerHasFailedMedia"
            class="text-xs text-amber-600 dark:text-amber-400"
            role="status"
          >
            Remove failed items to post.
          </p>
        </div>
      </div>
    </div>

    <button
      v-else
      type="button"
      class="w-full text-left rounded-2xl border px-5 py-5 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-black/10
             border-gray-200 bg-white hover:bg-gray-50
             dark:border-white dark:bg-transparent dark:hover:bg-white/5 dark:focus:ring-white/20"
      @click="goLogin"
    >
      <div class="flex items-center justify-between gap-4">
        <div class="flex min-w-0 items-start gap-4">
          <div
            class="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center text-gray-900 dark:text-white"
            aria-hidden="true"
          >
            <i class="pi pi-sign-in text-[18px]" />
          </div>
          <div class="min-w-0 space-y-1">
            <div class="text-[15px] font-semibold text-gray-900 dark:text-white">Log in to post</div>
            <div class="text-sm text-gray-700 dark:text-white/80">
              Join the conversation and share updates with the brotherhood.
            </div>
          </div>
        </div>

        <!-- Visual CTA button (same click target as the card). -->
        <div
          class="shrink-0 inline-flex items-center rounded-xl px-5 py-2.5 text-sm font-bold tracking-tight
                 shadow-sm ring-1 ring-black/5
                 bg-gray-900 text-white
                 dark:bg-white dark:text-black dark:ring-white/15"
          aria-hidden="true"
        >
          <span>Log in</span>
        </div>
      </div>
    </button>
  </div>

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
</template>

<script setup lang="ts">
import type { CreatePostData, PostVisibility } from '~/types/api'
import type { CreateMediaPayload } from '~/composables/useComposerMedia'
import { PRIMARY_ONLYME_PURPLE, PRIMARY_PREMIUM_ORANGE, PRIMARY_TEXT_DARK, PRIMARY_TEXT_LIGHT, PRIMARY_VERIFIED_BLUE, primaryPaletteToCssVars } from '~/utils/theme-tint'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { visibilityTagClasses, visibilityTagLabel } from '~/utils/post-visibility'
import { useFormSubmit } from '~/composables/useFormSubmit'
import { useMentionAutocomplete } from '~/composables/useMentionAutocomplete'
import { segmentComposerBodyWithMentionTiers } from '~/utils/mention-composer-segments'
import { mentionTierToStyle } from '~/utils/mention-tier-style'

const emit = defineEmits<{
  (e: 'posted', payload: { id: string; visibility: PostVisibility; post?: import('~/types/api').FeedPost }): void
}>()

const props = defineProps<{
  autoFocus?: boolean
  showDivider?: boolean
  /** Override textarea placeholder (e.g. "Reply to @john…" in reply modal). */
  placeholder?: string
  /** Optional initial draft text (e.g. "@username "). Applied once per mount/open. */
  initialText?: string
  /** Optional override for allowed visibilities (intersected with account tier rules). */
  allowedVisibilities?: PostVisibility[]
  /** When set, composer visibility is forced to this value (cannot be changed). */
  lockedVisibility?: PostVisibility
  /** Hide the visibility picker (useful with lockedVisibility). */
  hideVisibilityPicker?: boolean
  // Optional override. Return full FeedPost for replies (so it can be rendered immediately).
  createPost?: (body: string, visibility: PostVisibility, media: CreateMediaPayload[]) => Promise<{ id: string } | import('~/types/api').FeedPost | null>
  // When set, composer is in reply mode: visibility fixed to parent, parent_id + mentions sent.
  replyTo?: { parentId: string; visibility: PostVisibility; mentionUsernames: string[] }
  /** When true, use compact top padding for thread/reply modal layout (connects with thread line). */
  inReplyThread?: boolean
  /** When true, omit the avatar (used when parent renders avatar in shared thread column). */
  omitAvatar?: boolean
}>()

const route = useRoute()
const { user } = useAuth()
const { apiFetchData } = useApiClient()
const toast = useAppToast()

const isAuthed = computed(() => Boolean(user.value?.id))
const isPremium = computed(() => Boolean(user.value?.premium))
const viewerIsVerified = computed(() => (user.value?.verifiedStatus ?? 'none') !== 'none')
const showDivider = computed(() => props.showDivider !== false)

const myProfilePath = computed(() => {
  const username = (user.value?.username ?? '').trim()
  return username ? `/u/${encodeURIComponent(username)}` : null
})
const draft = ref('')
const composerTextareaEl = ref<HTMLTextAreaElement | null>(null)
const composerMirrorEl = ref<HTMLDivElement | null>(null)
const initialTextApplied = ref(false)

const mention = useMentionAutocomplete({
  el: composerTextareaEl,
  getText: () => draft.value,
  setText: (next) => {
    draft.value = next
    void nextTick().then(() => resizeComposerTextarea())
  },
  contextUsernames: computed(() => props.replyTo?.mentionUsernames ?? []),
  debounceMs: 200,
  limit: 10,
})

/** Segments with tier for mirror: use highlightedUser tier while arrowing, mentionTiers after selection. */
const composerBodySegments = computed(() => {
  const highlightedUser = mention.highlightedUser.value
  return segmentComposerBodyWithMentionTiers({
    text: draft.value ?? '',
    mentionTiers: mention.mentionTiers.value,
    activeAtIndex: mention.active.value?.atIndex ?? null,
    highlightedTier: highlightedUser ? tierFromMentionUser(highlightedUser) : null,
  })
})

function syncComposerMirrorScroll() {
  const ta = composerTextareaEl.value
  const mirror = composerMirrorEl.value
  if (ta && mirror) mirror.scrollTop = ta.scrollTop
}

function insertEmoji(emoji: string) {
  const e = (emoji ?? '').trim()
  if (!e) return
  const el = composerTextareaEl.value
  const value = draft.value ?? ''
  if (el && typeof el.selectionStart === 'number' && typeof el.selectionEnd === 'number') {
    const start = el.selectionStart
    const end = el.selectionEnd
    const next = value.slice(0, start) + e + value.slice(end)
    draft.value = next
    void nextTick().then(() => {
      el.focus?.()
      try {
        const pos = start + e.length
        el.setSelectionRange?.(pos, pos)
      } catch {
        // ignore
      }
    })
  } else {
    const next = value + e
    draft.value = next
    void nextTick().then(() => {
      el?.focus?.()
      try {
        const pos = next.length
        el?.setSelectionRange?.(pos, pos)
      } catch {
        // ignore
      }
    })
  }
}

function resizeComposerTextarea() {
  if (!import.meta.client) return
  const el = composerTextareaEl.value
  if (!el) return
  // Auto-grow: reset to auto, then fit content height.
  el.style.height = 'auto'
  el.style.height = `${Math.max(el.scrollHeight, 0)}px`
}

function onComposerInput() {
  // Keep height in sync and recompute mention suggestions based on caret.
  resizeComposerTextarea()
  mention.recompute()
}

const {
  composerMedia,
  canAddMoreMedia,
  remainingMediaSlots,
  displaySlots,
  firstEmptySlotIndex,
  composerUploading,
  composerUploadStatusLabel,
  mediaFileInputEl,
  openMediaPicker,
  onMediaFilesSelected,
  removeComposerMedia,
  patchComposerMedia,
  draggingMediaId,
  dragGhost,
  dragGhostStyle,
  dropOverlayVisible,
  onComposerAreaDragEnter,
  onComposerAreaDragOver,
  onComposerAreaDragLeave,
  onComposerDrop,
  onComposerPaste,
  onMediaTilePointerDown,
  giphyOpen,
  giphyQuery,
  giphyLoading,
  giphyError,
  giphyItems,
  giphyInputRef,
  openGiphyPicker,
  searchGiphy,
  selectGiphyGif,
  toCreatePayload,
  clearAll,
} = useComposerMedia({
  textareaEl: composerTextareaEl,
  maxSlots: 4,
  canAcceptVideo: isPremium,
  onVideoRejectedNeedPremium: () => usePremiumVideoModal().show(),
})

const composerAcceptTypes = computed(
  () => 'image/*,video/mp4,video/quicktime,video/webm,video/x-m4v',
)

// Visibility + rules
const visibility = useCookie<PostVisibility>('moh.post.visibility.v1', {
  default: () => 'public',
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
})

const lockedVisibility = computed<PostVisibility | null>(() => props.lockedVisibility ?? null)

const allowedComposerVisibilities = computed<PostVisibility[]>(() => {
  if (!isAuthed.value) return ['public']
  if (lockedVisibility.value) return [lockedVisibility.value]

  const tierAllowed: PostVisibility[] = !viewerIsVerified.value
    ? ['onlyMe']
    : (isPremium.value ? ['public', 'verifiedOnly', 'premiumOnly', 'onlyMe'] : ['public', 'verifiedOnly', 'onlyMe'])

  const propAllowed = Array.isArray(props.allowedVisibilities) ? props.allowedVisibilities : null
  if (!propAllowed) return tierAllowed

  const propSet = new Set(propAllowed)
  const intersected = tierAllowed.filter((v) => propSet.has(v))
  // If the parent passes a restrictive list that removes all allowed visibilities,
  // fall back to the first requested option (or public) so state stays valid (posting will be disabled by `canPost`).
  if (!intersected.length) return [propAllowed[0] ?? 'public']
  return intersected
})

watch(
  allowedComposerVisibilities,
  (allowed) => {
    // In locked mode, effective visibility is forced and we should not mutate the user's cookie.
    if (lockedVisibility.value) return
    const set = new Set(allowed)
    if (!set.has(visibility.value)) visibility.value = allowed[0] ?? 'public'
  },
  { immediate: true },
)

const effectiveVisibility = computed(() =>
  props.replyTo ? props.replyTo.visibility : (lockedVisibility.value ?? visibility.value),
)

const showVisibilityPicker = computed(() => {
  if (props.replyTo) return false
  if (props.hideVisibilityPicker) return false
  if (lockedVisibility.value) return false
  return true
})
const scopeTagLabel = computed(
  () => visibilityTagLabel(effectiveVisibility.value) ?? 'Public',
)
const scopeTagClass = computed(() => visibilityTagClasses(effectiveVisibility.value))
const scopeTagTooltip = computed(() => {
  const v = effectiveVisibility.value
  if (v === 'verifiedOnly') return tinyTooltip('Visible to verified members')
  if (v === 'premiumOnly') return tinyTooltip('Visible to premium members')
  if (v === 'onlyMe') return tinyTooltip('Visible only to you')
  return tinyTooltip('Visible to everyone')
})

// Upload bar fill color matches effective visibility (parent tier when replying).
const composerUploadBarColor = computed(() => {
  const v = effectiveVisibility.value
  if (v === 'verifiedOnly') return 'var(--moh-verified)'
  if (v === 'premiumOnly') return 'var(--moh-premium)'
  if (v === 'onlyMe') return 'var(--moh-onlyme)'
  return 'var(--p-primary-color)'
})

// Composer tint CSS for moh-composer-tint class (beats global theme overrides).
const composerTintCss = computed(() => {
  const v = effectiveVisibility.value
  const baseSel = 'html .moh-composer-tint'
  const darkSel = 'html.dark .moh-composer-tint'
  if (v === 'verifiedOnly') {
    return primaryPaletteToCssVars(PRIMARY_VERIFIED_BLUE, baseSel, '#ffffff') + primaryPaletteToCssVars(PRIMARY_VERIFIED_BLUE, darkSel, '#000000')
  }
  if (v === 'premiumOnly') {
    return primaryPaletteToCssVars(PRIMARY_PREMIUM_ORANGE, baseSel, '#ffffff') + primaryPaletteToCssVars(PRIMARY_PREMIUM_ORANGE, darkSel, '#000000')
  }
  if (v === 'onlyMe') {
    return primaryPaletteToCssVars(PRIMARY_ONLYME_PURPLE, baseSel, '#ffffff') + primaryPaletteToCssVars(PRIMARY_ONLYME_PURPLE, darkSel, '#000000')
  }
  return primaryPaletteToCssVars(PRIMARY_TEXT_LIGHT, baseSel, '#ffffff') + primaryPaletteToCssVars(PRIMARY_TEXT_DARK, darkSel, '#000000')
})
useHead({ style: [{ key: 'moh-composer-tint', textContent: () => composerTintCss.value }] })

// Textarea styling (uses effective visibility so reply composer matches parent tier).
const isDarkMode = computed(() => Boolean(useColorMode().value === 'dark'))
const composerTextareaVars = computed<Record<string, string>>(() => {
  const v = effectiveVisibility.value
  if (v === 'verifiedOnly') return { '--moh-compose-accent': 'var(--moh-verified)', '--moh-compose-ring': 'var(--moh-verified-ring)' }
  if (v === 'premiumOnly') return { '--moh-compose-accent': 'var(--moh-premium)', '--moh-compose-ring': 'var(--moh-premium-ring)' }
  if (v === 'onlyMe') return { '--moh-compose-accent': 'var(--moh-onlyme)', '--moh-compose-ring': 'var(--moh-onlyme-ring)' }
  return isDarkMode.value
    ? { '--moh-compose-accent': 'rgba(255, 255, 255, 0.85)', '--moh-compose-ring': 'rgba(255, 255, 255, 0.25)' }
    : { '--moh-compose-accent': 'rgba(0, 0, 0, 0.85)', '--moh-compose-ring': 'rgba(0, 0, 0, 0.18)' }
})

const postMaxLen = computed(() => (isPremium.value ? 500 : 200))
const composerPlaceholder = computed(
  () =>
    props.placeholder ??
    (props.replyTo ? 'Post your reply…' : "What's happening?"),
)
const postCharCount = computed(() => draft.value.length)

function onUpdateAltText(localId: string, value: string) {
  patchComposerMedia(localId, { altText: value })
}

/** True when the composer has draft text or media (for "discard?" confirm before link nav). */
const hasUnsavedContent = computed(
  () => (draft.value?.trim() ?? '') !== '' || (composerMedia.value?.length ?? 0) > 0,
)
defineExpose({ hasUnsavedContent })

const canPost = computed(() => Boolean(isAuthed.value && (viewerIsVerified.value || effectiveVisibility.value === 'onlyMe')))

/** True when any upload slot is in error state; user must remove before posting. */
const composerHasFailedMedia = computed(
  () => composerMedia.value?.some((m) => m.source === 'upload' && m.uploadStatus === 'error') ?? false,
)

const postButtonOutlined = computed(() => effectiveVisibility.value === 'public')
const postButtonClass = computed(() => {
  const v = effectiveVisibility.value
  if (v === 'verifiedOnly') return 'moh-btn-verified moh-btn-tone'
  if (v === 'premiumOnly') return 'moh-btn-premium moh-btn-tone'
  if (v === 'onlyMe') return 'moh-btn-onlyme moh-btn-tone'
  return 'moh-btn-public'
})

// Composer submit
const { submit: submitPost, submitting, submitError } = useFormSubmit(
  async () => {
    const mediaPayload: CreateMediaPayload[] = toCreatePayload(composerMedia.value)
    const vis = effectiveVisibility.value

    const created = props.createPost
      ? await props.createPost(draft.value, vis, mediaPayload)
      : await apiFetchData<CreatePostData>('/posts', {
          method: 'POST',
          body: props.replyTo
            ? {
                body: draft.value,
                visibility: vis,
                parent_id: props.replyTo.parentId,
                mentions: props.replyTo.mentionUsernames,
                media: mediaPayload,
              }
            : { body: draft.value, visibility: vis, media: mediaPayload },
        })

    draft.value = ''
    clearAll()
    void nextTick().then(() => resizeComposerTextarea())

    const id = (created as any)?.id as string | undefined
    console.log('[PostComposer] submit success - id:', id, 'vis:', vis)
    if (id) {
      emit('posted', {
        id,
        visibility: vis,
        post: created as import('~/types/api').FeedPost,
      })
      const toneVisibility = vis
      console.log('[PostComposer] pushing toast - tone:', toneVisibility, 'to:', `/p/${encodeURIComponent(id)}`)
      toast.push({
        title: props.replyTo ? 'Reply posted' : 'Posted',
        message:
          toneVisibility === 'premiumOnly'
            ? 'Premium-only post · Tap to view.'
            : toneVisibility === 'verifiedOnly'
              ? 'Verified-only post · Tap to view.'
              : toneVisibility === 'onlyMe'
                ? 'Only you can see this · Tap to view.'
                : 'Tap to view.',
        tone:
          toneVisibility === 'premiumOnly'
            ? 'premiumOnly'
            : toneVisibility === 'verifiedOnly'
              ? 'verifiedOnly'
              : toneVisibility === 'onlyMe'
                ? 'onlyMe'
                : 'public',
        to: `/p/${encodeURIComponent(id)}`,
        durationMs: 2600,
      })
    }
  },
  {
    defaultError: 'Failed to post.',
    onError: (message) => {
      toast.push({ title: message, tone: 'error', durationMs: 2500 })
    },
  },
)

const submit = async () => {
  if (!canPost.value) return
  if (!(draft.value.trim() || composerMedia.value.length)) return
  if (postCharCount.value > postMaxLen.value) return
  if (composerUploading.value) return
  if (composerHasFailedMedia.value) return

  submitError.value = null
  await submitPost()
}

function onComposerKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault()
    void submit()
  }
}

const goLogin = () => {
  const redirect = encodeURIComponent(route.fullPath || '/home')
  return navigateTo(`/login?redirect=${redirect}`)
}

function applyInitialTextIfNeeded() {
  if (initialTextApplied.value) return
  const t = (props.initialText ?? '').toString()
  if (!t.trim()) {
    initialTextApplied.value = true
    return
  }
  // Only prefill into an empty composer to avoid clobbering user input.
  if (!draft.value) {
    draft.value = t
  }
  initialTextApplied.value = true
}

onMounted(() => {
  applyInitialTextIfNeeded()
  if (!props.autoFocus) return
  void nextTick().then(() => {
    resizeComposerTextarea()
    const el = composerTextareaEl.value
    el?.focus?.()
    // Place caret at end (useful for "@username " prefills).
    try {
      const end = (el?.value ?? '').length
      el?.setSelectionRange?.(end, end)
    } catch {
      // ignore
    }
  })
})

watch(
  () => props.initialText,
  () => {
    // If the composer instance is reused and initialText is provided later, apply once.
    applyInitialTextIfNeeded()
  },
)

watch(
  draft,
  () => {
    // Keep height in sync with content changes (typing, paste, programmatic clears).
    void nextTick().then(() => resizeComposerTextarea())
  },
  { flush: 'post' },
)
</script>

<style scoped>
.composer-media-slot {
  flex: 0 0 auto;
  width: 5rem; /* h-20 / w-20 */
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
  z-index: 2000;
  pointer-events: none;
  transform: translateZ(0);
  will-change: left, top;
  opacity: 0.98;
}

.moh-upload-indeterminate {
  animation: moh-upload-indeterminate 900ms ease-in-out infinite;
}

@keyframes moh-upload-indeterminate {
  0% {
    transform: translateX(-110%);
  }
  100% {
    transform: translateX(210%);
  }
}
</style>

