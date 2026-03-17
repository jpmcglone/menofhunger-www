<template>
  <div ref="editorRootEl" class="flex min-h-screen flex-col">
    <!-- Top bar -->
    <div ref="topBarEl" class="sticky top-0 z-20 flex items-center gap-2 border-b border-gray-200 bg-white px-4 pb-2.5 pt-[calc(var(--moh-safe-top,0px)+0.5rem)] dark:border-zinc-800 dark:bg-black sm:gap-3 sm:py-3">
      <!-- Back -->
      <NuxtLink to="/articles" class="flex-shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-800">
        <Icon name="tabler:arrow-left" class="text-lg" aria-hidden="true" />
      </NuxtLink>

      <div class="flex-1 min-w-0">
        <!-- Visibility picker -->
        <AppComposerVisibilityPicker
          v-model="editor.visibility.value"
          :allowed="allowedVisibilities"
          :viewer-is-verified="isVerified || isPremium"
          :is-premium="isPremium"
        />
      </div>

      <div class="ml-auto flex items-center gap-2">
        <!-- Save status -->
        <p class="hidden truncate text-xs text-gray-400 dark:text-zinc-500 sm:block">
          <span v-if="editor.saveStatus.value === 'saving'">
            <Icon name="tabler:loader-2" class="animate-spin text-[10px] mr-0.5" aria-hidden="true" />
            Saving…
          </span>
          <span v-else-if="editor.lastSavedLabel.value">{{ editor.lastSavedLabel.value }}</span>
          <span v-else-if="editor.saveStatus.value === 'error'" class="text-red-500">Save failed</span>
          <span v-else>&nbsp;</span>
        </p>

        <!-- Save draft button -->
        <button
          type="button"
          class="hidden rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 sm:inline-flex"
          :disabled="!editor.isDirty.value || editor.saveStatus.value === 'saving'"
          @click="editor.save()"
        >
          Save draft
        </button>
        <button
          type="button"
          class="inline-flex rounded-lg border border-gray-200 p-2 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 sm:hidden"
          :disabled="!editor.isDirty.value || editor.saveStatus.value === 'saving'"
          aria-label="Save draft"
          @click="editor.save()"
        >
          <Icon name="tabler:device-floppy" class="text-base" aria-hidden="true" />
        </button>

        <button
          type="button"
          class="rounded-lg px-4 py-1.5 text-sm font-semibold transition-opacity hover:opacity-95 disabled:opacity-50"
          :class="primaryActionClass"
          :style="primaryActionStyle"
          :disabled="primaryActionDisabled"
          @click="onPrimaryAction"
        >
          {{ primaryActionLabel }}
        </button>
      </div>
    </div>

    <!-- Editor area -->
    <div
      class="mx-auto w-full max-w-3xl flex-1 pb-[calc(var(--moh-tabbar-height,4.5rem)+var(--moh-safe-bottom,0px))] pt-6 sm:pt-8"
      :style="editorViewportStyle"
    >
      <!-- Thumbnail upload -->
      <div ref="thumbnailSectionEl" class="mb-6 px-4 sm:px-6 lg:px-8">
        <div
          v-if="editor.thumbnailUrl.value"
          class="group relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-zinc-800"
        >
          <img :src="editor.thumbnailUrl.value" alt="Article thumbnail" class="h-full w-full object-cover" />
          <div class="absolute inset-0 flex items-center justify-center gap-3 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 max-sm:opacity-100">
            <button
              type="button"
              class="rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-900 hover:bg-white"
              @click="triggerThumbnailUpload"
            >
              Change
            </button>
            <button
              type="button"
              class="rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-white"
              @click="removeThumbnail"
            >
              Remove
            </button>
          </div>
        </div>
        <button
          v-else
          type="button"
          class="flex aspect-[16/9] w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 p-4 text-sm text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-500 dark:border-zinc-700 dark:text-zinc-500 dark:hover:border-zinc-600"
          :disabled="thumbnailUploading"
          @click="triggerThumbnailUpload"
        >
          <Icon v-if="thumbnailUploading" name="tabler:loader-2" class="animate-spin text-lg" aria-hidden="true" />
          <Icon v-else name="tabler:photo" class="text-lg" aria-hidden="true" />
          {{ thumbnailUploading ? 'Uploading…' : 'Add thumbnail' }}
        </button>
        <input ref="thumbnailInputEl" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="onThumbnailFileSelected" />
      </div>

      <!-- Thumbnail crop dialog -->
      <AppArticleThumbnailCropDialog
        v-model="cropDialogOpen"
        :file="pendingThumbnailFile"
        :disabled="thumbnailUploading"
        @cropped="uploadCroppedThumbnail"
        @cancel="pendingThumbnailFile = null"
      />

      <!-- Title input — Bug 7 fix: use template ref instead of document.querySelector -->
      <textarea
        ref="titleEl"
        v-model="editor.title.value"
        class="article-title-input mb-2 w-full resize-none border-0 bg-transparent px-4 text-3xl font-bold text-gray-900 placeholder-gray-300 focus:outline-none dark:text-gray-100 dark:placeholder-zinc-600 sm:px-6 lg:px-8"
        :class="titleToneClass"
        placeholder="Article title…"
        :rows="1"
        @input="onTitleInput"
      />

      <!-- Tags input — below title, above body -->
      <AppArticleTagInput
        v-model="editor.tags.value"
        class="mb-4"
        @update:model-value="editor.markDirty()"
      />

      <!-- Tiptap editor -->
      <AppArticleTiptapEditor
        v-model="editor.body.value"
        :visibility="editorVisibilityTone"
        placeholder="Start writing your article…"
        @change="editor.markDirty()"
      />
    </div>

    <!-- Publish success dialog -->
    <AppArticlePublishSuccessDialog
      v-if="justPublished"
      :article="justPublished"
      @close="justPublished = null"
    />
  </div>
</template>

<script setup lang="ts">
import type { Article } from '~/types/api'

const props = defineProps<{
  article: Article
}>()

const { isVerified, isPremium } = useAuth()

// Visibility can only be increased (public → verified → premium), never decreased.
// For drafts all options remain available since no visibility is "committed" yet.
const VISIBILITY_RANK: Record<string, number> = { public: 0, verifiedOnly: 1, premiumOnly: 2 }
const ALL_ARTICLE_VISIBILITIES = ['public', 'verifiedOnly', 'premiumOnly'] as const
type ArticleVisibility = (typeof ALL_ARTICLE_VISIBILITIES)[number]

const allowedVisibilities = computed<ArticleVisibility[]>(() => {
  const isDraft = editor.article.value?.isDraft !== false
  if (isDraft) return [...ALL_ARTICLE_VISIBILITIES]
  const originalRank = VISIBILITY_RANK[initialArticleRef.value?.visibility ?? 'public'] ?? 0
  return ALL_ARTICLE_VISIBILITIES.filter(v => (VISIBILITY_RANK[v] ?? 0) >= originalRank)
})
const { apiFetchData } = useApiClient()
const toast = useAppToast()
const { assetUrl } = useAssets()

const initialArticleRef = ref<Article>({ ...props.article })
const editor = useArticleEditor(initialArticleRef as Ref<Article | null>)

const justPublished = ref<Article | null>(null)
const thumbnailInputEl = ref<HTMLInputElement | null>(null)
// Bug 7 fix: direct ref to the title textarea
const titleEl = ref<HTMLTextAreaElement | null>(null)
const thumbnailSectionEl = ref<HTMLElement | null>(null)
const thumbnailUploading = ref(false)
const cropDialogOpen = ref(false)
const pendingThumbnailFile = ref<File | null>(null)
const { keyboardHeight } = useKeyboardHeight()
const hydrated = ref(false)
const colorMode = useColorMode()
const editorRootEl = ref<HTMLElement | null>(null)
const topBarEl = ref<HTMLElement | null>(null)

function syncTopBarHeight() {
  const root = editorRootEl.value
  const bar = topBarEl.value
  if (!root || !bar) return
  root.style.setProperty('--editor-topbar-h', `${bar.offsetHeight}px`)
}

let topBarRo: ResizeObserver | null = null
onMounted(() => {
  syncTopBarHeight()
  if (typeof ResizeObserver !== 'undefined') {
    topBarRo = new ResizeObserver(syncTopBarHeight)
    if (topBarEl.value) topBarRo.observe(topBarEl.value)
  }
})
onBeforeUnmount(() => {
  topBarRo?.disconnect()
  topBarRo = null
})

const editorViewportStyle = computed(() => {
  if (hydrated.value && keyboardHeight.value > 0) {
    // Keep last lines above the software keyboard while composing on mobile.
    return { paddingBottom: `${keyboardHeight.value + 24}px` }
  }
  return undefined
})

const primaryActionLabel = computed(() => {
  const isDraft = editor.article.value?.isDraft !== false
  if (isDraft) return editor.publishing.value ? 'Publishing…' : 'Publish'
  return 'Save'
})

const primaryActionDisabled = computed(() => {
  const isDraft = editor.article.value?.isDraft !== false
  if (isDraft) return !editor.article.value?.title?.trim() || editor.publishing.value
  return !editor.isDirty.value || editor.saveStatus.value === 'saving'
})

const editorVisibilityTone = computed<'public' | 'verifiedOnly' | 'premiumOnly'>(() => {
  if (editor.visibility.value === 'verifiedOnly') return 'verifiedOnly'
  if (editor.visibility.value === 'premiumOnly') return 'premiumOnly'
  return 'public'
})

const primaryActionClass = computed(() => {
  if (editorVisibilityTone.value === 'public') {
    return colorMode.value === 'dark' ? 'bg-white text-black' : 'bg-black text-white'
  }
  return 'text-white'
})

const primaryActionStyle = computed<Record<string, string> | undefined>(() => {
  if (editorVisibilityTone.value === 'verifiedOnly') {
    return { backgroundColor: 'var(--moh-verified)' }
  }
  if (editorVisibilityTone.value === 'premiumOnly') {
    return { backgroundColor: 'var(--moh-premium)' }
  }
  return undefined
})

const titleToneClass = computed(() => {
  if (editorVisibilityTone.value === 'verifiedOnly') return 'title-tone-verified'
  if (editorVisibilityTone.value === 'premiumOnly') return 'title-tone-premium'
  return 'title-tone-public'
})

const router = useRouter()

async function onPrimaryAction() {
  const isDraft = editor.article.value?.isDraft !== false
  if (isDraft) {
    void handlePublish()
    return
  }
  await editor.save()
  if (editor.saveStatus.value === 'saved') {
    const articleId = editor.article.value?.id
    if (articleId) await router.push(`/a/${articleId}`)
  }
}

// Bug 7 fix: use template ref directly
function onTitleInput() {
  editor.markDirty()
  const el = titleEl.value
  if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }
}

async function handlePublish() {
  const published = await editor.publish()
  if (published) {
    justPublished.value = published
  }
}

function triggerThumbnailUpload() {
  thumbnailInputEl.value?.click()
}

function removeThumbnail() {
  editor.thumbnailUrl.value = null
  editor.thumbnailR2Key.value = null
  // Bug 1 fix: mark thumbnailDirty so null gets sent to the API
  editor.thumbnailDirty.value = true
  editor.markDirty()
}

function onThumbnailFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  input.value = ''
  pendingThumbnailFile.value = file
  cropDialogOpen.value = true
}

async function uploadCroppedThumbnail(file: File) {
  thumbnailUploading.value = true
  try {
    const init = await apiFetchData<{ key: string; uploadUrl: string; headers: Record<string, string> }>(
      '/uploads/article-thumbnail/init',
      { method: 'POST', body: { contentType: file.type } },
    )
    const uploadRes = await fetch(init.uploadUrl, { method: 'PUT', body: file, headers: init.headers ?? {} })
    if (!uploadRes.ok) {
      throw new Error('Thumbnail upload failed during transfer.')
    }
    const commit = await apiFetchData<{ key: string }>('/uploads/article-thumbnail/commit', {
      method: 'POST',
      body: { key: init.key },
    })
    if (commit.key) {
      const resolvedUrl = assetUrl(commit.key)
      if (resolvedUrl) {
        editor.thumbnailUrl.value = resolvedUrl
      }
      editor.thumbnailR2Key.value = commit.key
      editor.thumbnailDirty.value = true
      editor.markDirty()
    }
  } catch (e: any) {
    toast.push({ title: e?.data?.meta?.errors?.[0]?.message ?? 'Thumbnail upload failed.', tone: 'error' })
  } finally {
    thumbnailUploading.value = false
    pendingThumbnailFile.value = null
  }
}

watch(() => editor.visibility.value, () => editor.markDirty())

onMounted(() => {
  hydrated.value = true
})
</script>

<style>
.title-tone-public {
  --article-editor-accent: #18181b;
}

.dark .title-tone-public {
  --article-editor-accent: #fafafa;
}

.title-tone-verified {
  --article-editor-accent: var(--moh-verified);
}

.title-tone-premium {
  --article-editor-accent: var(--moh-premium);
}

.article-title-input::selection {
  background-color: color-mix(in srgb, var(--article-editor-accent) 35%, transparent);
  color: inherit;
}

.article-title-input::-moz-selection {
  background-color: color-mix(in srgb, var(--article-editor-accent) 35%, transparent);
  color: inherit;
}
</style>
