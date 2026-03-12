<template>
  <div class="relative tiptap-editor-wrap" :class="toolbarToneClass">
    <!-- Sticky toolbar -->
    <div
      ref="toolbarEl"
      class="toolbar-scroll sticky z-10 mb-3 flex flex-nowrap items-center gap-1 border-b border-gray-100 px-4 py-2 transition-colors duration-200 dark:border-zinc-800 sm:px-6 lg:px-8"
      :style="{ top: 'var(--editor-topbar-h, 3.5rem)' }"
      :class="[
        isToolbarScrollable
          ? 'overflow-x-auto touch-pan-x no-scrollbar backdrop-blur toolbar-surface-raised'
          : 'overflow-x-hidden toolbar-surface',
      ]"
    >
      <button
        v-for="item in toolbarItems"
        :key="item.title"
        type="button"
        class="shrink-0 flex items-center justify-center rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        :class="item.active?.() ? 'toolbar-item-active' : ''"
        :title="item.title"
        @click="item.action()"
      >
        <Icon :name="item.icon" class="text-[16px]" />
      </button>

      <div class="mx-1 h-4 w-px shrink-0 self-center bg-gray-200 dark:bg-zinc-700" />

      <!-- Image insert -->
      <button
        type="button"
        class="shrink-0 flex items-center justify-center rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        title="Insert image"
        :disabled="uploading"
        @click="triggerImageUpload"
      >
        <Icon v-if="uploading" name="tabler:loader-2" class="text-[16px] animate-spin" />
        <Icon v-else name="tabler:photo" class="text-[16px]" />
      </button>
      <input ref="imageInputEl" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="onImageFileChange" />
    </div>

    <EditorContent :editor="editor" class="tiptap-editor-content px-4 sm:px-6 lg:px-8" />

    <Dialog
      :visible="linkDialogVisible"
      modal
      :header="linkDialogMode === 'youtube' ? 'Insert YouTube URL' : 'Insert link'"
      :draggable="false"
      :style="{ width: 'min(32rem, 92vw)' }"
      @update:visible="onCloseLinkDialog"
    >
      <div class="space-y-2">
        <label class="block text-sm font-medium text-gray-700 dark:text-zinc-200" for="article-editor-url-input">
          {{ linkDialogMode === 'youtube' ? 'YouTube URL' : 'URL' }}
        </label>
        <input
          id="article-editor-url-input"
          v-model.trim="linkDialogUrl"
          type="url"
          class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500"
          :placeholder="linkDialogMode === 'youtube' ? 'https://www.youtube.com/watch?v=...' : 'https://example.com'"
          autocomplete="off"
          @keydown.enter.prevent="onSubmitLinkDialog"
        >
      </div>

      <template #footer>
        <Button label="Cancel" text severity="secondary" @click="onCloseLinkDialog(false)" />
        <Button
          v-if="linkDialogMode === 'link'"
          label="Remove link"
          text
          severity="danger"
          @click="onRemoveLink"
        />
        <Button
          :label="linkDialogMode === 'youtube' ? 'Embed video' : 'Apply link'"
          severity="secondary"
          :disabled="!linkDialogUrl"
          @click="onSubmitLinkDialog"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import Youtube from '@tiptap/extension-youtube'
import { Callout } from '~/utils/tiptap-callout'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  visibility?: 'public' | 'verifiedOnly' | 'premiumOnly'
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'change'): void
}>()

const { apiFetchData } = useApiClient()
const toast = useAppToast()
const { assetUrl } = useAssets()
const toolbarEl = ref<HTMLDivElement | null>(null)
const imageInputEl = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const linkDialogVisible = ref(false)
const linkDialogMode = ref<'link' | 'youtube'>('link')
const linkDialogUrl = ref('')
const isToolbarScrollable = ref(false)
let toolbarResizeObserver: ResizeObserver | null = null

function parseBody(raw: string | null | undefined) {
  if (!raw) return ''
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && parsed.type === 'doc' ? parsed : ''
  } catch {
    return raw || ''
  }
}

const editor = useEditor({
  content: parseBody(props.modelValue),
  extensions: [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      codeBlock: {},
      // StarterKit v3 bundles link & underline — configure them here to avoid duplicates
      link: { openOnClick: false, autolink: true },
      underline: {},
    }),
    Image.configure({ inline: false }),
    Youtube.configure({ width: 720, height: 405, nocookie: true }),
    Callout,
    Placeholder.configure({ placeholder: props.placeholder || 'Start writing your article…' }),
  ],
  editorProps: {
    attributes: {
      class: 'focus:outline-none min-h-[72vh] prose prose-gray dark:prose-invert max-w-none article-body pb-16',
    },
  },
  onUpdate: ({ editor: e }) => {
    emit('update:modelValue', JSON.stringify(e.getJSON()))
    emit('change')
  },
})

watch(() => props.modelValue, (val) => {
  if (!editor.value) return
  const current = JSON.stringify(editor.value.getJSON())
  if (current === val) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(editor.value as any).commands.setContent(parseBody(val), false)
})

const toolbarItems = computed(() => {
  const e = editor.value
  if (!e) return []
  return [
    { title: 'Bold', icon: 'tabler:bold', action: () => e.chain().focus().toggleBold().run(), active: () => e.isActive('bold') },
    { title: 'Italic', icon: 'tabler:italic', action: () => e.chain().focus().toggleItalic().run(), active: () => e.isActive('italic') },
    { title: 'Underline', icon: 'tabler:underline', action: () => e.chain().focus().toggleUnderline().run(), active: () => e.isActive('underline') },
    { title: 'H2', icon: 'tabler:h-2', action: () => e.chain().focus().toggleHeading({ level: 2 }).run(), active: () => e.isActive('heading', { level: 2 }) },
    { title: 'H3', icon: 'tabler:h-3', action: () => e.chain().focus().toggleHeading({ level: 3 }).run(), active: () => e.isActive('heading', { level: 3 }) },
    { title: 'Blockquote', icon: 'tabler:quote', action: () => e.chain().focus().toggleBlockquote().run(), active: () => e.isActive('blockquote') },
    { title: 'Bullet list', icon: 'tabler:list', action: () => e.chain().focus().toggleBulletList().run(), active: () => e.isActive('bulletList') },
    { title: 'Ordered list', icon: 'tabler:list-numbers', action: () => e.chain().focus().toggleOrderedList().run(), active: () => e.isActive('orderedList') },
    { title: 'Code block', icon: 'tabler:code', action: () => e.chain().focus().toggleCodeBlock().run(), active: () => e.isActive('codeBlock') },
    { title: 'Divider', icon: 'tabler:separator', action: () => e.chain().focus().setHorizontalRule().run(), active: () => false },
    { title: 'Link', icon: 'tabler:link', action: openLinkDialog, active: () => e.isActive('link') },
    { title: 'YouTube embed', icon: 'tabler:brand-youtube', action: openYoutubeDialog, active: () => false },
    { title: 'Info callout', icon: 'tabler:info-circle', action: () => toggleCallout('info'), active: () => e.isActive('callout', { type: 'info' }) },
    { title: 'Tip callout', icon: 'tabler:bulb', action: () => toggleCallout('tip'), active: () => e.isActive('callout', { type: 'tip' }) },
    { title: 'Warning callout', icon: 'tabler:alert-triangle', action: () => toggleCallout('warning'), active: () => e.isActive('callout', { type: 'warning' }) },
  ]
})

const toolbarToneClass = computed(() => {
  if (props.visibility === 'verifiedOnly') return 'toolbar-tone-verified'
  if (props.visibility === 'premiumOnly') return 'toolbar-tone-premium'
  return 'toolbar-tone-public'
})

function updateToolbarScrollable() {
  const el = toolbarEl.value
  if (!el) {
    isToolbarScrollable.value = false
    return
  }
  isToolbarScrollable.value = el.scrollWidth - el.clientWidth > 1
}

function openLinkDialog() {
  const e = editor.value
  if (!e) return
  linkDialogMode.value = 'link'
  linkDialogUrl.value = String(e.getAttributes('link').href ?? '')
  linkDialogVisible.value = true
}

function openYoutubeDialog() {
  linkDialogMode.value = 'youtube'
  linkDialogUrl.value = ''
  linkDialogVisible.value = true
}

function onCloseLinkDialog(visible = false) {
  linkDialogVisible.value = Boolean(visible)
  if (!visible) {
    linkDialogUrl.value = ''
  }
}

function onRemoveLink() {
  const e = editor.value
  if (!e) return
  e.chain().focus().unsetLink().run()
  onCloseLinkDialog(false)
}

function onSubmitLinkDialog() {
  const e = editor.value
  if (!e) return
  const url = linkDialogUrl.value.trim()
  if (!url) return
  if (linkDialogMode.value === 'youtube') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(e as any).chain().focus().setYoutubeVideo({ src: url }).run()
  } else {
    e.chain().focus().setLink({ href: url }).run()
  }
  onCloseLinkDialog(false)
}

function toggleCallout(type: 'info' | 'tip' | 'warning') {
  const e = editor.value
  if (!e) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(e as any).chain().focus().toggleCallout({ type }).run()
}

function triggerImageUpload() {
  imageInputEl.value?.click()
}

async function onImageFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  input.value = ''
  uploading.value = true
  try {
    const init = await apiFetchData<{ key: string; uploadUrl: string; headers: Record<string, string> }>(
      '/uploads/article-media/init',
      { method: 'POST', body: { contentType: file.type } },
    )
    const uploadRes = await fetch(init.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: init.headers ?? {},
    })
    if (!uploadRes.ok) {
      throw new Error('Image upload failed during transfer.')
    }
    const commit = await apiFetchData<{ key: string }>('/uploads/article-media/commit', {
      method: 'POST',
      body: { key: init.key },
    })
    if (commit.key) {
      const imageUrl = assetUrl(commit.key)
      if (!imageUrl) {
        throw new Error('Missing public assets base URL.')
      }
      editor.value?.chain().focus().setImage({ src: imageUrl }).run()
      emit('change')
    }
  } catch (e: any) {
    toast.push({ title: e?.data?.meta?.errors?.[0]?.message ?? 'Image upload failed.', tone: 'error' })
  } finally {
    uploading.value = false
  }
}

onMounted(() => {
  nextTick(() => {
    updateToolbarScrollable()
  })
  if (typeof ResizeObserver !== 'undefined') {
    toolbarResizeObserver = new ResizeObserver(() => {
      updateToolbarScrollable()
    })
    if (toolbarEl.value) {
      toolbarResizeObserver.observe(toolbarEl.value)
    }
  }
  window.addEventListener('resize', updateToolbarScrollable, { passive: true })
})

watch(() => toolbarItems.value.length, () => {
  nextTick(() => {
    updateToolbarScrollable()
  })
})

onBeforeUnmount(() => {
  if (toolbarResizeObserver) {
    toolbarResizeObserver.disconnect()
    toolbarResizeObserver = null
  }
  window.removeEventListener('resize', updateToolbarScrollable)
  editor.value?.destroy()
})
</script>

<style>
.tiptap-editor-content .ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: #9ca3af; /* gray-400 */
  pointer-events: none;
  height: 0;
}

.dark .tiptap-editor-content .ProseMirror p.is-editor-empty:first-child::before {
  color: #52525b; /* zinc-600 */
}

.tiptap-editor-content .ProseMirror {
  outline: none;
  min-height: 48vh;
}

@media (min-width: 640px) {
  .tiptap-editor-content .ProseMirror {
    min-height: 72vh;
  }
}

.tiptap-editor-content .ProseMirror img {
  border-radius: 0.5rem;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.dark .tiptap-editor-content .ProseMirror img {
  border-color: rgba(255, 255, 255, 0.1);
}

/* Keep callouts tighter while composing. */
.tiptap-editor-content .ProseMirror .article-callout {
  margin-top: 0.65em;
  margin-bottom: 0.65em;
  padding-top: 0.75em;
  padding-bottom: 0.75em;
}

.tiptap-editor-content .ProseMirror .article-callout > :first-child {
  margin-top: 0;
}

.tiptap-editor-content .ProseMirror .article-callout > :last-child {
  margin-bottom: 0;
}

.toolbar-scroll {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.toolbar-scroll::-webkit-scrollbar {
  display: none;
}

.toolbar-surface {
  background-color: var(--moh-surface-1);
}

.toolbar-surface-raised {
  background-color: color-mix(in srgb, var(--moh-surface-1) 88%, transparent);
}

.toolbar-item-active {
  color: var(--article-editor-accent);
  background-color: color-mix(in srgb, var(--article-editor-accent) 22%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--article-editor-accent) 40%, transparent);
}

.toolbar-tone-public {
  --article-editor-accent: #18181b;
}

.dark .toolbar-tone-public {
  --article-editor-accent: #fafafa;
}

.toolbar-tone-verified {
  --article-editor-accent: var(--moh-verified);
}

.toolbar-tone-premium {
  --article-editor-accent: var(--moh-premium);
}

.tiptap-editor-wrap .ProseMirror ::selection,
.tiptap-editor-wrap .ProseMirror::selection {
  background-color: color-mix(in srgb, var(--article-editor-accent) 35%, transparent);
  color: inherit;
}

.tiptap-editor-wrap .ProseMirror ::-moz-selection,
.tiptap-editor-wrap .ProseMirror::-moz-selection {
  background-color: color-mix(in srgb, var(--article-editor-accent) 35%, transparent);
  color: inherit;
}
</style>
