<template>
  <!-- Composer -->
  <div
    :class="[
      'px-4 py-4',
      showDivider ? 'border-b border-gray-200 dark:border-zinc-800' : ''
    ]"
  >
    <div v-if="isAuthed" class="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3">
      <!-- Row 1: visibility picker (above, right-aligned) -->
      <div class="col-start-2 flex justify-end items-end mb-3 sm:mb-2">
        <AppComposerVisibilityPicker
          v-model="visibility"
          :allowed="allowedComposerVisibilities"
          :viewer-is-verified="viewerIsVerified"
          :is-premium="isPremium"
        />
      </div>

      <!-- Row 2: avatar + textarea start aligned -->
      <NuxtLink
        v-if="myProfilePath"
        :to="myProfilePath"
        class="row-start-1 sm:row-start-2 col-start-1 mb-3 sm:mb-0 group shrink-0"
        aria-label="View your profile"
      >
        <div class="transition-opacity duration-200 group-hover:opacity-80">
          <AppAvatarCircle
            :src="meAvatarUrl"
            :name="user?.name ?? null"
            :username="user?.username ?? null"
            size-class="h-8 w-8 sm:h-10 sm:w-10"
          />
        </div>
      </NuxtLink>
      <div v-else class="row-start-1 sm:row-start-2 col-start-1 mb-3 sm:mb-0 shrink-0" aria-hidden="true">
        <AppAvatarCircle
          :src="meAvatarUrl"
          :name="user?.name ?? null"
          :username="user?.username ?? null"
          size-class="h-8 w-8 sm:h-10 sm:w-10"
        />
      </div>

      <div class="row-start-2 col-span-2 sm:col-span-1 sm:col-start-2 min-w-0 moh-composer-tint">
        <input
          ref="mediaFileInputEl"
          type="file"
          accept="image/*"
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
          <!-- Textarea wrapper so the empty-state overlay only hugs the field -->
          <div class="relative">
            <textarea
              ref="composerTextareaEl"
              v-model="draft"
              rows="3"
              class="moh-composer-textarea w-full resize-none overflow-hidden rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-[15px] leading-6 text-gray-900 placeholder:text-gray-500 focus:outline-none dark:border-zinc-700 dark:text-gray-50 dark:placeholder:text-zinc-500"
              :style="composerTextareaVars"
              placeholder="What’s happening?"
              :maxlength="postMaxLen"
              @input="resizeComposerTextarea"
              @keydown="onComposerKeydown"
              @paste="onComposerPaste"
            />

            <!-- Drag overlay (no media): hug just the textarea -->
            <AppComposerDropOverlay
              :visible="dropOverlayVisible && !composerMedia.length"
              :remaining-slots="remainingMediaSlots"
              :max-slots="4"
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

        <div class="mt-3 flex items-center justify-between">
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
          </div>
          <div class="flex items-center gap-2">
            <div class="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
              {{ postCharCount }}/{{ postMaxLen }}
            </div>
            <Button
              label="Post"
              rounded
              :outlined="postButtonOutlined"
              severity="secondary"
              :class="[postButtonClass, '!min-h-0 !py-1.5 !px-5 !text-sm !font-semibold']"
              :disabled="submitting || !canPost || (!(draft.trim() || composerMedia.length) ) || postCharCount > postMaxLen || composerUploading"
              :loading="submitting"
              @click="submit"
            />
          </div>
        </div>
      </div>
    </div>

    <button
      v-else
      type="button"
      class="w-full text-left rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 hover:bg-gray-100 dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:bg-zinc-900/40"
      @click="goLogin"
    >
      <div class="flex items-center justify-between gap-3">
        <div class="space-y-1">
          <div class="font-semibold text-gray-900 dark:text-gray-50">Log in to post</div>
          <div class="text-sm text-gray-600 dark:text-gray-300">
            Join the conversation and share updates with the brotherhood.
          </div>
        </div>
        <i class="pi pi-angle-right text-gray-500 dark:text-gray-400" aria-hidden="true" />
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
import type { CreatePostResponse, PostVisibility } from '~/types/api'
import type { CreateMediaPayload } from '~/composables/useComposerMedia'
import { PRIMARY_ONLYME_PURPLE, PRIMARY_PREMIUM_ORANGE, PRIMARY_TEXT_DARK, PRIMARY_TEXT_LIGHT, PRIMARY_VERIFIED_BLUE, primaryPaletteToCssVars } from '~/utils/theme-tint'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { getApiErrorMessage } from '~/utils/api-error'

const emit = defineEmits<{
  (e: 'posted', payload: { id: string; visibility: PostVisibility }): void
}>()

const props = defineProps<{
  autoFocus?: boolean
  showDivider?: boolean
  // Optional override used on /home so the new post can be inserted optimistically.
  createPost?: (body: string, visibility: PostVisibility, media: CreateMediaPayload[]) => Promise<{ id: string } | null>
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
const meAvatarUrl = computed(() => user.value?.avatarUrl ?? null)

const draft = ref('')
const composerTextareaEl = ref<HTMLTextAreaElement | null>(null)

function resizeComposerTextarea() {
  if (!import.meta.client) return
  const el = composerTextareaEl.value
  if (!el) return
  // Auto-grow: reset to auto, then fit content height.
  el.style.height = 'auto'
  el.style.height = `${Math.max(el.scrollHeight, 0)}px`
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
} = useComposerMedia({ textareaEl: composerTextareaEl, maxSlots: 4 })

// Visibility + rules
const visibility = useCookie<PostVisibility>('moh.post.visibility.v1', {
  default: () => 'public',
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
})

const allowedComposerVisibilities = computed<PostVisibility[]>(() => {
  if (!isAuthed.value) return ['public']
  if (!viewerIsVerified.value) return ['onlyMe']
  return isPremium.value ? ['public', 'verifiedOnly', 'premiumOnly', 'onlyMe'] : ['public', 'verifiedOnly', 'onlyMe']
})

watch(
  allowedComposerVisibilities,
  (allowed) => {
    const set = new Set(allowed)
    if (!set.has(visibility.value)) visibility.value = allowed[0] ?? 'public'
  },
  { immediate: true },
)

// Upload bar fill color matches composer visibility: blue (verified), orange (premium), purple (only me), normal primary (public).
const composerUploadBarColor = computed(() => {
  if (visibility.value === 'verifiedOnly') return 'var(--moh-verified)'
  if (visibility.value === 'premiumOnly') return 'var(--moh-premium)'
  if (visibility.value === 'onlyMe') return 'var(--moh-onlyme)'
  return 'var(--p-primary-color)'
})

// Composer tint CSS for moh-composer-tint class (beats global theme overrides).
const composerTintCss = computed(() => {
  const baseSel = 'html .moh-composer-tint'
  const darkSel = 'html.dark .moh-composer-tint'
  if (visibility.value === 'verifiedOnly') {
    return primaryPaletteToCssVars(PRIMARY_VERIFIED_BLUE, baseSel, '#ffffff') + primaryPaletteToCssVars(PRIMARY_VERIFIED_BLUE, darkSel, '#000000')
  }
  if (visibility.value === 'premiumOnly') {
    return primaryPaletteToCssVars(PRIMARY_PREMIUM_ORANGE, baseSel, '#ffffff') + primaryPaletteToCssVars(PRIMARY_PREMIUM_ORANGE, darkSel, '#000000')
  }
  if (visibility.value === 'onlyMe') {
    return primaryPaletteToCssVars(PRIMARY_ONLYME_PURPLE, baseSel, '#ffffff') + primaryPaletteToCssVars(PRIMARY_ONLYME_PURPLE, darkSel, '#000000')
  }
  return primaryPaletteToCssVars(PRIMARY_TEXT_LIGHT, baseSel, '#ffffff') + primaryPaletteToCssVars(PRIMARY_TEXT_DARK, darkSel, '#000000')
})
useHead({ style: [{ key: 'moh-composer-tint', textContent: () => composerTintCss.value }] })

// Textarea styling
const isDarkMode = computed(() => Boolean(useColorMode().value === 'dark'))
const composerTextareaVars = computed<Record<string, string>>(() => {
  if (visibility.value === 'verifiedOnly') return { '--moh-compose-accent': 'var(--moh-verified)', '--moh-compose-ring': 'var(--moh-verified-ring)' }
  if (visibility.value === 'premiumOnly') return { '--moh-compose-accent': 'var(--moh-premium)', '--moh-compose-ring': 'var(--moh-premium-ring)' }
  if (visibility.value === 'onlyMe') return { '--moh-compose-accent': 'var(--moh-onlyme)', '--moh-compose-ring': 'var(--moh-onlyme-ring)' }
  return isDarkMode.value
    ? { '--moh-compose-accent': 'rgba(255, 255, 255, 0.85)', '--moh-compose-ring': 'rgba(255, 255, 255, 0.25)' }
    : { '--moh-compose-accent': 'rgba(0, 0, 0, 0.85)', '--moh-compose-ring': 'rgba(0, 0, 0, 0.18)' }
})

const postMaxLen = computed(() => (isPremium.value ? 500 : 200))
const postCharCount = computed(() => draft.value.length)

const canPost = computed(() => Boolean(isAuthed.value && (viewerIsVerified.value || visibility.value === 'onlyMe')))

const postButtonOutlined = computed(() => visibility.value === 'public')
const postButtonClass = computed(() => {
  if (visibility.value === 'verifiedOnly') return 'moh-btn-verified moh-btn-tone'
  if (visibility.value === 'premiumOnly') return 'moh-btn-premium moh-btn-tone'
  if (visibility.value === 'onlyMe') return 'moh-btn-onlyme moh-btn-tone'
  return 'moh-btn-public'
})

// Composer submit
const submitting = ref(false)
const submitError = ref<string | null>(null)

const submit = async () => {
  if (!canPost.value) return
  if (submitting.value) return
  if (!(draft.value.trim() || composerMedia.value.length)) return
  if (postCharCount.value > postMaxLen.value) return
  if (composerUploading.value) return

  submitError.value = null
  submitting.value = true
  try {
    const mediaPayload: CreateMediaPayload[] = toCreatePayload(composerMedia.value)

    const created =
      (await props.createPost?.(draft.value, visibility.value, mediaPayload)) ??
      (await apiFetchData<CreatePostResponse>('/posts', { method: 'POST', body: { body: draft.value, visibility: visibility.value, media: mediaPayload } })).post

    draft.value = ''
    clearAll()
    void nextTick().then(() => resizeComposerTextarea())

    const id = (created as any)?.id as string | undefined
    if (id) {
      emit('posted', { id, visibility: visibility.value })
      toast.push({
        title: 'Posted',
        message:
          visibility.value === 'premiumOnly'
            ? 'Premium-only post · Tap to view.'
            : visibility.value === 'verifiedOnly'
              ? 'Verified-only post · Tap to view.'
              : visibility.value === 'onlyMe'
                ? 'Only you can see this · Tap to view.'
                : 'Tap to view.',
        tone:
          visibility.value === 'premiumOnly'
            ? 'premiumOnly'
            : visibility.value === 'verifiedOnly'
              ? 'verifiedOnly'
              : visibility.value === 'onlyMe'
                ? 'onlyMe'
                : 'public',
        to: `/p/${encodeURIComponent(id)}`,
        durationMs: 2600,
      })
    }
  } catch (e: unknown) {
    const msg = getApiErrorMessage(e) || 'Failed to post.'
    submitError.value = msg
    toast.push({ title: msg, tone: 'error', durationMs: 2500 })
  } finally {
    submitting.value = false
  }
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

onMounted(() => {
  if (!props.autoFocus) return
  void nextTick().then(() => {
    resizeComposerTextarea()
    composerTextareaEl.value?.focus?.()
  })
})

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

