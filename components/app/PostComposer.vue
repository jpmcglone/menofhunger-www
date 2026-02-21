<template>
  <!-- Composer -->
  <div
    :class="[
      'pb-4',
      omitAvatar ? 'pr-[var(--moh-gutter-x)]' : 'moh-gutter-x',
      inReplyThread ? 'pt-2' : 'pt-4',
      showDivider ? 'border-b moh-border' : ''
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
          <Icon v-if="effectiveVisibility === 'onlyMe'" name="tabler:eye-off" class="mr-1 text-[10px]" aria-hidden="true" />
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
          tabindex="-1"
          aria-hidden="true"
          disabled
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
          <!-- Textarea wrapper: border/background live on wrapper so it stays visually consistent -->
          <div class="moh-composer-field relative rounded-xl border moh-border-subtle moh-surface-2">
            <div
              ref="composerMirrorEl"
              class="pointer-events-none absolute inset-0 overflow-x-hidden overflow-y-auto rounded-xl px-3 py-2 text-[16px] leading-6 whitespace-pre-wrap break-words moh-text"
              :style="composerTextareaVars"
              aria-hidden="true"
            >
              <template v-for="(seg, i) in composerBodySegments" :key="i">
                <!-- IMPORTANT: avoid font-weight changes in mirror; it desyncs caret alignment vs textarea -->
                <span
                  v-if="seg.type === 'mention'"
                  :style="mentionTierToStyle(seg.tier)"
                >{{ seg.value }}</span>
                <span
                  v-else-if="seg.type === 'hashtag'"
                  :style="{ ...(mentionTierToStyle(seg.tier) ?? {}), opacity: '0.9' }"
                >{{ seg.value }}</span>
                <span v-else>{{ seg.value }}</span>
              </template>
            </div>
            <textarea
              ref="composerTextareaEl"
              v-model="draft"
              rows="3"
              enterkeyhint="enter"
              inputmode="text"
              class="moh-composer-textarea relative z-10 w-full resize-none overflow-hidden rounded-xl bg-transparent px-3 py-2 text-[16px] leading-6 text-transparent caret-[color:var(--moh-text)] placeholder:text-[color:var(--moh-text-muted)] placeholder:opacity-70 focus:outline-none"
              :style="composerTextareaVars"
              :placeholder="composerPlaceholder"
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

            <AppHashtagAutocompletePopover
              v-bind="hashtag.popoverProps"
              @select="hashtag.onSelect"
              @highlight="hashtag.onHighlight"
              @requestClose="hashtag.onRequestClose"
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

          <AppComposerPoll
            v-if="poll && !composerMedia.length"
            class="mt-3"
            :model-value="poll"
            @update:model-value="onUpdatePoll"
            @remove="clearPoll"
            @status="onPollStatus"
          />

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
              <template v-if="!disableMedia">
                <Button
                  text
                  rounded
                  severity="secondary"
                  aria-label="Add media"
                  :disabled="!canAddMoreMedia || hasPoll"
                  class="moh-focus"
                  v-tooltip.bottom="tinyTooltip(hasPoll ? 'Remove poll to add media' : (canAddMoreMedia ? 'Add image/GIF' : 'Max 4 attachments'))"
                  @click="onClickAddMedia"
                >
                  <template #icon>
                    <Icon name="tabler:photo" aria-hidden="true" />
                  </template>
                </Button>
                <Button
                  text
                  rounded
                  severity="secondary"
                  class="moh-focus"
                  aria-label="Add GIF"
                  :disabled="!canAddMoreMedia || hasPoll"
                  v-tooltip.bottom="tinyTooltip(hasPoll ? 'Remove poll to add media' : (canAddMoreMedia ? 'Add GIF (Giphy)' : 'Max 4 attachments'))"
                  @click="onClickAddGiphy"
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
                <Button
                  v-if="!replyTo"
                  text
                  rounded
                  severity="secondary"
                  class="moh-focus"
                  aria-label="Add poll"
                  :disabled="hasPoll || (isPremium && composerMedia.length > 0)"
                  v-tooltip.bottom="tinyTooltip(hasPoll ? 'Poll added' : ((isPremium && composerMedia.length > 0) ? 'Remove media to add a poll' : 'Add poll'))"
                  @click="onClickAddPoll"
                >
                  <template #icon>
                    <Icon name="tabler:chart-bar" class="rotate-90" aria-hidden="true" />
                  </template>
                </Button>
              </template>
              <AppEmojiPickerButton
                tooltip="Emoji"
                aria-label="Insert emoji"
                @select="insertEmoji"
              />
            </div>
            <div class="flex items-center gap-2">
            <div
              class="moh-meta tabular-nums"
              :class="
                postCharCount > postMaxLen
                  ? 'text-red-600 dark:text-red-400 font-semibold'
                  : ''
              "
            >
              {{ postCharCount }}/{{ postMaxLen }}
            </div>
            <Button
              :label="mode === 'edit' ? 'Save' : (replyTo ? 'Reply' : 'Post')"
              rounded
              :outlined="postButtonOutlined"
              severity="secondary"
              :class="[postButtonClass, '!min-h-0 !py-1.5 !px-5 !text-sm !font-semibold']"
              :disabled="
                submitting ||
                !canPost ||
                (mode === 'edit' ? !draft.trim() : (!(draft.trim() || composerMedia.length || hasPoll))) ||
                postCharCount > postMaxLen ||
                composerUploading ||
                composerHasFailedMedia ||
                pollUploading ||
                pollHasFailed
              "
              :title="composerHasFailedMedia ? 'Remove failed items to post' : (pollHasFailed ? 'Remove failed poll images to post' : undefined)"
              :loading="submitting"
              @click="submit"
            />
          </div>
          </div>
          <p
            v-if="composerHasFailedMedia || pollHasFailed"
            class="text-xs text-amber-600 dark:text-amber-400"
            role="status"
          >
            Remove failed items to post.
          </p>
        </div>
      </div>
    </div>

    <!-- Logged-out: full disabled composer. Clicking it shows a login prompt; the Log in button navigates directly. -->
    <div
      v-else
      role="button"
      tabindex="0"
      aria-label="Log in to post"
      class="cursor-pointer"
      :class="omitAvatar ? 'flex flex-col gap-2' : 'grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 items-start'"
      @click="showLoginPrompt"
      @keydown.enter="showLoginPrompt"
      @keydown.space.prevent="showLoginPrompt"
    >
      <!-- Row 1: "Public" scope tag -->
      <div :class="omitAvatar ? 'flex justify-end' : 'col-start-2 flex justify-end items-end mb-3 sm:mb-2'">
        <span
          class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border moh-text-muted border-gray-300 dark:border-zinc-600 select-none"
          aria-hidden="true"
        >
          Public
        </span>
      </div>

      <!-- Row 2: avatar placeholder -->
      <template v-if="!omitAvatar">
        <div
          class="row-start-1 sm:row-start-2 col-start-1 mb-3 sm:mb-0 shrink-0 h-8 w-8 sm:h-10 sm:w-10 rounded-full ring-1 ring-gray-300 dark:ring-zinc-600 bg-gray-100 dark:bg-zinc-800 flex items-center justify-center"
          aria-hidden="true"
        >
          <Icon name="tabler:user" class="text-gray-400 dark:text-zinc-500 text-[14px] sm:text-[16px]" />
        </div>
      </template>

      <!-- Textarea + bottom bar -->
      <div
        :class="omitAvatar ? 'min-w-0 moh-composer-tint' : 'row-start-2 col-span-2 sm:col-span-1 sm:col-start-2 min-w-0 moh-composer-tint'"
        class="pointer-events-none select-none"
      >
        <div class="moh-composer-field relative rounded-xl border moh-border-subtle moh-surface-2">
          <div class="px-3 py-2 text-[16px] leading-6 min-h-[4.5rem] text-gray-400 dark:text-zinc-500 opacity-70">
            What's happening?
          </div>
        </div>

        <div class="mt-3 flex items-center justify-between">
          <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400 opacity-40">
            <Button text rounded severity="secondary" disabled aria-hidden="true">
              <template #icon>
                <Icon name="tabler:photo" aria-hidden="true" />
              </template>
            </Button>
            <Button text rounded severity="secondary" disabled aria-hidden="true">
              <template #icon>
                <span class="inline-flex h-[22px] w-[22px] items-center justify-center rounded-md border border-current/30 bg-transparent text-[10px] font-black leading-none" aria-hidden="true">GIF</span>
              </template>
            </Button>
            <Button text rounded severity="secondary" disabled aria-hidden="true">
              <template #icon>
                <Icon name="tabler:chart-bar" class="rotate-90" aria-hidden="true" />
              </template>
            </Button>
          </div>
          <div class="flex items-center gap-2">
            <div class="moh-meta tabular-nums opacity-40">0/200</div>
            <NuxtLink
              :to="loginTo"
              class="pointer-events-auto cursor-pointer shrink-0 inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold
                     bg-gray-900 text-white hover:bg-gray-700
                     dark:bg-white dark:text-black dark:hover:bg-gray-100
                     transition-colors moh-focus"
              aria-label="Log in to post"
              @click.stop
            >
              Log in
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
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
import { makeLocalId } from '~/composables/composer/types'
import type { CreatePostData, PostVisibility } from '~/types/api'
import type { CreateMediaPayload } from '~/composables/useComposerMedia'
import { PRIMARY_ONLYME_PURPLE, PRIMARY_PREMIUM_ORANGE, PRIMARY_TEXT_DARK, PRIMARY_TEXT_LIGHT, PRIMARY_VERIFIED_BLUE, primaryPaletteToCssVars } from '~/utils/theme-tint'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { visibilityTagClasses, visibilityTagLabel } from '~/utils/post-visibility'
import { useFormSubmit } from '~/composables/useFormSubmit'
import { useMentionAutocomplete } from '~/composables/useMentionAutocomplete'
import { useHashtagAutocomplete } from '~/composables/useHashtagAutocomplete'
import { segmentComposerBodyWithMentionAndHashtagTiers } from '~/utils/mention-composer-segments'
import { mentionTierToStyle } from '~/utils/mention-tier-style'

// In-memory draft cache (survives SPA navigation, not a full reload).
// Keep module-scoped so it persists across route changes.
type CachedComposerDraft = {
  body: string
  // Keep as-is (may include non-serializable objects); never SSR-serialized.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  media: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  poll: any | null
}
const COMPOSER_DRAFT_CACHE = new Map<string, CachedComposerDraft>()

const emit = defineEmits<{
  (e: 'posted', payload: { id: string; visibility: PostVisibility; post?: import('~/types/api').FeedPost }): void
  (e: 'edited', payload: { id: string; post: import('~/types/api').FeedPost }): void
}>()

const props = defineProps<{
  autoFocus?: boolean
  showDivider?: boolean
  /** Override textarea placeholder (e.g. "Reply to @john…" in reply modal). */
  placeholder?: string
  /** Optional initial draft text (e.g. "@username "). Applied once per mount/open. */
  initialText?: string
  /** Optional initial media (used for publishing from only-me drafts). */
  initialMedia?: import('~/types/api').PostMedia[]
  /** Optional override for allowed visibilities (intersected with account tier rules). */
  allowedVisibilities?: PostVisibility[]
  /** When set, composer visibility is forced to this value (cannot be changed). */
  lockedVisibility?: PostVisibility
  /** Hide the visibility picker (useful with lockedVisibility). */
  hideVisibilityPicker?: boolean
  // Optional override. Return full FeedPost for replies (so it can be rendered immediately).
  createPost?: (body: string, visibility: PostVisibility, media: CreateMediaPayload[], poll?: ComposerPollPayload | null) => Promise<{ id: string } | import('~/types/api').FeedPost | null>
  // When set, composer is in reply mode: visibility fixed to parent, parent_id + mentions sent.
  replyTo?: { parentId: string; visibility: PostVisibility; mentionUsernames: string[] }
  /** When true, use compact top padding for thread/reply modal layout (connects with thread line). */
  inReplyThread?: boolean
  /** When true, omit the avatar (used when parent renders avatar in shared thread column). */
  omitAvatar?: boolean
  /** When set, composer is in edit mode (PATCH post). */
  mode?: 'create' | 'edit'
  /** Required when mode is edit. */
  editPostId?: string
  /** True when the edited post is a draft (only-me notes use /drafts/:id). */
  editPostIsDraft?: boolean
  /** When true, hide/disable all media capabilities (used for v1 post editing). */
  disableMedia?: boolean
  /** When false, success toast will not link to the new post. */
  successToPermalink?: boolean
  /** When false, do not register with the global unsaved-draft guard. */
  registerUnsavedGuard?: boolean
  /**
   * When set, persist this composer draft (text + media) in-memory across SPA navigation.
   * This survives route changes and modal open/close, but NOT a browser refresh.
   */
  persistKey?: string
}>()

const route = useRoute()
const { user, isAuthed, isPremium, isVerified: viewerIsVerified } = useAuth()
const { apiFetchData } = useApiClient()
const toast = useAppToast()

const mode = computed(() => props.mode ?? 'create')
const editPostId = computed(() => (props.editPostId ?? '').trim() || null)
const editPostIsDraft = computed(() => Boolean(props.editPostIsDraft))
const disableMedia = computed(() => Boolean(props.disableMedia) || (mode.value === 'edit' && !editPostIsDraft.value))
const showDivider = computed(() => props.showDivider !== false)

const persistKey = computed(() => {
  if (!import.meta.client) return null
  const raw = (props.persistKey ?? '').trim()
  if (!raw) return null
  const uid = (user.value?.id ?? 'anon').trim() || 'anon'
  return `composer-draft:${raw}:${uid}`
})

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

const hashtag = useHashtagAutocomplete({
  el: composerTextareaEl,
  getText: () => draft.value,
  setText: (next) => {
    draft.value = next
    void nextTick().then(() => resizeComposerTextarea())
  },
  debounceMs: 200,
  limit: 10,
})

/** Segments with tier for mirror: use highlightedUser tier while arrowing, mentionTiers after selection. */
const composerBodySegments = computed(() => {
  const highlightedUser = mention.highlightedUser.value
  const vis = effectiveVisibility.value
  const hashtagTier = vis === 'premiumOnly' ? 'premium' : vis === 'verifiedOnly' ? 'verified' : 'normal'
  return segmentComposerBodyWithMentionAndHashtagTiers({
    text: draft.value ?? '',
    mentionTiers: mention.mentionTiers.value,
    activeAtIndex: mention.active.value?.atIndex ?? null,
    highlightedTier: highlightedUser ? tierFromMentionUser(highlightedUser) : null,
    hashtagTier,
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
  hashtag.recompute()
}

type ComposerPollPayload = import('~/composables/composer/types').ComposerPollPayload
const poll = ref<ComposerPollPayload | null>(null)
const hasPoll = computed(() => poll.value != null)
const pollUploading = ref(false)
const pollHasFailed = ref(false)
function onPollStatus(v: { uploading: boolean; hasFailed: boolean }) {
  pollUploading.value = Boolean(v?.uploading)
  pollHasFailed.value = Boolean(v?.hasFailed)
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
  canAcceptImages: computed(() => Boolean(isPremium.value && !disableMedia.value && !hasPoll.value)),
  canAcceptVideo: computed(() => Boolean(isPremium.value && !disableMedia.value && !hasPoll.value)),
  onMediaRejectedNeedPremium: () => {
    if (disableMedia.value) return
    usePremiumMediaModal().show()
  },
})

function seedInitialMediaIfNeeded() {
  if (disableMedia.value) return
  const items = Array.isArray(props.initialMedia) ? props.initialMedia : null
  if (!items || items.length === 0) return
  // Only seed into an empty composer to avoid clobbering user changes.
  if ((composerMedia.value?.length ?? 0) > 0) return

  const seeded = items
    .filter((m) => m && !m.deletedAt)
    .slice(0, 4)
    .map((m) => {
      const isVideo = m.kind === 'video'
      const previewUrl = isVideo ? (m.thumbnailUrl || m.url) : m.url
      return {
        localId: makeLocalId(),
        source: m.source,
        kind: m.kind,
        previewUrl,
        url: m.source === 'giphy' ? m.url : undefined,
        mp4Url: m.mp4Url ?? undefined,
        width: m.width ?? null,
        height: m.height ?? null,
        durationSeconds: (m as any).durationSeconds ?? null,
        altText: m.alt ?? null,
        existingId: m.id,
        uploadStatus: 'done',
      }
    })

  composerMedia.value = seeded as any
}

function onClickAddMedia() {
  if (disableMedia.value) return
  if (hasPoll.value) return
  if (!isPremium.value) return usePremiumMediaModal().show()
  openMediaPicker()
}

function onClickAddGiphy() {
  if (disableMedia.value) return
  if (hasPoll.value) return
  if (!isPremium.value) return usePremiumMediaModal().show()
  openGiphyPicker((draft.value || '').trim().slice(0, 120))
}

function clearPoll() {
  poll.value = null
  pollUploading.value = false
  pollHasFailed.value = false
}

function onUpdatePoll(v: ComposerPollPayload) {
  poll.value = v
}

function onClickAddPoll() {
  if (disableMedia.value) return
  if (props.replyTo) return
  if (hasPoll.value) return
  if (!isPremium.value) return usePremiumMediaModal().show()
  if (composerMedia.value.length > 0) return
  poll.value = {
    options: [
      { text: '', image: null },
      { text: '', image: null },
    ],
    duration: { days: 1, hours: 0, minutes: 0 },
  }
}

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

const postMaxLen = computed(() => (isPremium.value ? 1000 : 200))
const composerPlaceholder = computed(
  () =>
    props.placeholder ??
    (props.replyTo ? 'Post your reply…' : (hasPoll.value ? 'Ask a question' : "What's happening?")),
)
const postCharCount = computed(() => draft.value.length)

function onUpdateAltText(localId: string, value: string) {
  patchComposerMedia(localId, { altText: value })
}

/** True when the composer has draft text or media (for "discard?" confirm before link nav). */
const hasUnsavedContent = computed(
  () => (draft.value?.trim() ?? '') !== '' || (composerMedia.value?.length ?? 0) > 0 || hasPoll.value,
)

function draftSnapshot(): import('~/composables/useUnsavedDraftGuard').UnsavedDraftSnapshot {
  return {
    body: String(draft.value ?? ''),
    media: toCreatePayload(composerMedia.value ?? []),
  }
}

function clearComposer() {
  draft.value = ''
  clearAll()
  clearPoll()
  void nextTick().then(() => resizeComposerTextarea())
}

defineExpose({ hasUnsavedContent, draftSnapshot, clearComposer })

const shouldRegisterUnsavedGuard = computed(() =>
  // Register for create + reply composers so refresh/close warns about losing work.
  props.registerUnsavedGuard !== false && mode.value === 'create',
)

let unregisterUnsavedGuard: (() => void) | null = null
const unsavedGuardId =
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `composer:${crypto.randomUUID()}`
    : `composer:${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

function registerUnsavedGuardIfNeeded() {
  if (!import.meta.client) return
  if (!shouldRegisterUnsavedGuard.value) return
  if (unregisterUnsavedGuard) return
  const { register } = useUnsavedDraftGuard()
  unregisterUnsavedGuard = register({
    id: unsavedGuardId,
    hasUnsaved: () => Boolean(hasUnsavedContent.value),
    snapshot: () => draftSnapshot(),
    clear: () => clearComposer(),
  })
}

onMounted(() => {
  registerUnsavedGuardIfNeeded()
})

onActivated(() => {
  // Keepalive pages can deactivate/activate; ensure guard stays registered.
  registerUnsavedGuardIfNeeded()
  // If the component was kept alive and re-activated, ensure we rehydrate from cache if needed.
  restoreDraftFromCacheIfNeeded()
})

onBeforeUnmount(() => {
  unregisterUnsavedGuard?.()
  unregisterUnsavedGuard = null
})

function restoreDraftFromCacheIfNeeded() {
  if (!import.meta.client) return
  const key = persistKey.value
  if (!key) return

  const cached = COMPOSER_DRAFT_CACHE.get(key)
  if (!cached) return

  // Only restore into an empty composer to avoid clobbering.
  const hasAny = Boolean((draft.value?.trim() ?? '') !== '' || (composerMedia.value?.length ?? 0) > 0 || hasPoll.value)
  if (hasAny) return

  draft.value = String(cached.body ?? '')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  composerMedia.value = (cached.media ?? []) as any
  poll.value = (cached.poll ?? null) as any
}

watch(
  [draft, composerMedia, poll, persistKey],
  () => {
    if (!import.meta.client) return
    const key = persistKey.value
    if (!key) return
    COMPOSER_DRAFT_CACHE.set(key, {
      body: String(draft.value ?? ''),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      media: (composerMedia.value ?? []) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      poll: (poll.value ?? null) as any,
    })
  },
  { deep: true },
)

// If auth finishes after mount (persistKey changes from anon → userId), try a restore once.
watch(
  persistKey,
  () => {
    restoreDraftFromCacheIfNeeded()
  },
  { flush: 'post' },
)

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
    if (mode.value === 'edit') {
      const id = editPostId.value
      if (!id) throw new Error('Missing editPostId.')
      const basePath = editPostIsDraft.value ? '/drafts/' : '/posts/'
      const patchBody: Record<string, unknown> = { body: draft.value }
      if (editPostIsDraft.value) {
        const mediaPayload: CreateMediaPayload[] = toCreatePayload(composerMedia.value)
        patchBody.media = mediaPayload
      }
      const updatedPost = await apiFetchData<import('~/types/api').FeedPost>(`${basePath}${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: patchBody,
      })
      emit('edited', { id, post: updatedPost })
      toast.push({ title: 'Saved', tone: 'success', durationMs: 1600 })
      return
    }

    const pollPayload = poll.value ? poll.value : null
    const mediaPayload: CreateMediaPayload[] = hasPoll.value ? [] : toCreatePayload(composerMedia.value)
    const vis = effectiveVisibility.value

    const created = props.createPost
      ? await props.createPost(draft.value, vis, mediaPayload, pollPayload)
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
            : {
                body: draft.value,
                visibility: vis,
                media: mediaPayload,
                ...(pollPayload ? { poll: pollPayload } : {}),
              },
        })

    draft.value = ''
    clearAll()
    clearPoll()
    void nextTick().then(() => resizeComposerTextarea())

    const id = (created as any)?.id as string | undefined
    if (id) {
      emit('posted', {
        id,
        visibility: vis,
        post: created as import('~/types/api').FeedPost,
      })
      const toneVisibility = vis
      toast.push({
        title: props.replyTo ? 'Reply posted' : 'Posted',
        message:
          toneVisibility === 'premiumOnly'
            ? 'Premium-only · Tap to view'
            : toneVisibility === 'verifiedOnly'
              ? 'Verified-only · Tap to view'
              : toneVisibility === 'onlyMe'
                ? 'Only you can see this · Tap to view'
                : 'Tap to view',
        tone:
          toneVisibility === 'premiumOnly'
            ? 'premiumOnly'
            : toneVisibility === 'verifiedOnly'
              ? 'verifiedOnly'
              : toneVisibility === 'onlyMe'
                ? 'onlyMe'
                : 'public',
        // Always deep-link successful posts to their permalink.
        to: `/p/${encodeURIComponent(id)}`,
        durationMs: 2600,
      })
    }
  },
  {
    defaultError: mode.value === 'edit' ? 'Failed to save.' : 'Failed to post.',
    onError: (message) => {
      toast.push({ title: message, tone: 'error', durationMs: 2500 })
    },
  },
)

// If the user changes the composer after an error, clear the inline error so it doesn't "stick"
// after a later successful post (or after correcting validation issues like poll duration).
watch(
  [draft, composerMedia, poll],
  () => {
    if (submitError.value) submitError.value = null
  },
  { deep: true },
)

const submit = async () => {
  if (!canPost.value) return
  if (mode.value === 'edit') {
    if (!draft.value.trim()) return
  } else {
    if (!(draft.value.trim() || composerMedia.value.length || hasPoll.value)) return
  }
  if (postCharCount.value > postMaxLen.value) return
  if (composerUploading.value) return
  if (composerHasFailedMedia.value) return
  if (pollUploading.value) return
  if (pollHasFailed.value) return
  if (hasPoll.value && poll.value) {
    const opts = (poll.value.options ?? []).filter(Boolean) as Array<{ image: any }>
    const anyHasImage = opts.some((o) => Boolean(o?.image?.r2Key))
    const allHaveImages = opts.every((o) => Boolean(o?.image?.r2Key))
    if (anyHasImage && !allHaveImages) {
      toast.push({
        title: 'Poll images must be all or none',
        message: 'If you add an image to any choice, every choice must have an image.',
        tone: 'error',
        durationMs: 2600,
      })
      return
    }
  }

  submitError.value = null
  await submitPost()
}

function onComposerKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault()
    void submit()
  }
}

const loginTo = computed(() => {
  const redirect = encodeURIComponent(route.fullPath || '/home')
  return `/login?redirect=${redirect}`
})

const { show: showAuthActionModal } = useAuthActionModal()
function showLoginPrompt() {
  showAuthActionModal({ kind: 'login', action: 'post' })
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
  restoreDraftFromCacheIfNeeded()
  applyInitialTextIfNeeded()
  seedInitialMediaIfNeeded()
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
  () => props.initialMedia,
  () => {
    // If initial media is provided later (e.g. overlay open), seed once.
    seedInitialMediaIfNeeded()
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

