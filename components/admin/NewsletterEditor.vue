<template>
  <div class="relative tiptap-editor-wrap toolbar-tone-public">
    <div class="toolbar-scroll flex flex-nowrap items-center gap-1 border-b moh-border px-2 py-2 overflow-x-auto no-scrollbar">
      <button
        v-for="item in toolbarItems"
        :key="item.title"
        type="button"
        class="shrink-0 flex items-center justify-center rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        :class="item.active?.() ? 'toolbar-item-active' : ''"
        :title="item.title"
        :disabled="disabled"
        @click="item.action()"
      >
        <Icon :name="item.icon" class="text-[16px]" />
      </button>
      <div class="mx-1 h-4 w-px shrink-0 self-center bg-gray-200 dark:bg-zinc-700" />
      <button
        v-for="token in variableItems"
        :key="token.value"
        type="button"
        class="shrink-0 rounded px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        :title="`Insert ${token.label}`"
        :disabled="disabled"
        @click="insertVariable(token.value)"
      >
        {{ token.short }}
      </button>
      <div class="mx-1 h-4 w-px shrink-0 self-center bg-gray-200 dark:bg-zinc-700" />
      <button
        type="button"
        class="shrink-0 flex items-center justify-center rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        title="Insert image"
        :disabled="disabled || uploading"
        @click="triggerImageUpload"
      >
        <Icon v-if="uploading" name="tabler:loader-2" class="text-[16px] animate-spin" />
        <Icon v-else name="tabler:photo" class="text-[16px]" />
      </button>
      <input
        ref="imageInputEl"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        class="hidden"
        @change="onImageFileChange"
      >
    </div>
    <EditorContent :editor="editor" class="tiptap-editor-content px-3 py-2" />

    <Dialog
      :visible="linkDialogVisible"
      modal
      header="Insert link"
      :draggable="false"
      :style="{ width: 'min(32rem, 92vw)' }"
      @update:visible="onCloseLinkDialog"
    >
      <div class="space-y-2">
        <label class="block text-sm font-medium moh-text" for="newsletter-editor-url">URL</label>
        <input
          id="newsletter-editor-url"
          v-model.trim="linkDialogUrl"
          type="url"
          class="w-full rounded-lg border moh-border moh-surface px-3 py-2 text-sm moh-text outline-none"
          placeholder="https://"
          autocomplete="off"
          @keydown.enter.prevent="onSubmitLinkDialog"
        >
      </div>
      <template #footer>
        <Button label="Cancel" text severity="secondary" @click="onCloseLinkDialog(false)" />
        <Button label="Remove link" text severity="danger" @click="onRemoveLink" />
        <Button label="Apply link" severity="secondary" :disabled="!linkDialogUrl" @click="onSubmitLinkDialog" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { getSafeUserErrorMessage } from '~/utils/api-error'

const props = defineProps<{
  modelValue: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
}>()

const { apiFetchData } = useApiClient()
const { assetUrl } = useAssets()
const toast = useAppToast()
const imageInputEl = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const linkDialogVisible = ref(false)
const linkDialogUrl = ref('')

const variableItems = [
  { label: 'First name', short: 'First name', value: '{{firstName}}' },
  { label: 'Name', short: 'Name', value: '{{name}}' },
  { label: 'Username', short: 'Username', value: '{{username}}' },
]

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
  editable: !props.disabled,
  extensions: [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      codeBlock: false,
      link: { openOnClick: false, autolink: true },
      underline: {},
    }),
    Image.configure({ inline: false }),
    Placeholder.configure({ placeholder: 'Write the lodge letter…' }),
  ],
  editorProps: {
    attributes: {
      class: 'focus:outline-none min-h-[16rem] prose prose-gray dark:prose-invert max-w-none',
    },
    handlePaste(_view, event) {
      if (props.disabled) return false
      const clipboard = event.clipboardData
      if (!clipboard) return false
      if (clipboard.getData('text/plain').trim()) return false
      const imageFiles = Array.from(clipboard.items ?? [])
        .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null)
      if (imageFiles.length === 0) return false
      event.preventDefault()
      for (const file of imageFiles) {
        void uploadAndInsertImage(file)
      }
      return true
    },
  },
  onUpdate: ({ editor: instance }) => {
    emit('update:modelValue', JSON.stringify(instance.getJSON()))
  },
})

watch(() => props.modelValue, (val) => {
  if (!editor.value) return
  const current = JSON.stringify(editor.value.getJSON())
  if (current === val) return
  editor.value.commands.setContent(parseBody(val), { emitUpdate: false })
})

watch(() => props.disabled, (disabled) => {
  editor.value?.setEditable(!disabled)
})

const toolbarItems = computed(() => {
  const instance = editor.value
  if (!instance) return []
  return [
    { title: 'Bold', icon: 'tabler:bold', action: () => instance.chain().focus().toggleBold().run(), active: () => instance.isActive('bold') },
    { title: 'Italic', icon: 'tabler:italic', action: () => instance.chain().focus().toggleItalic().run(), active: () => instance.isActive('italic') },
    { title: 'H2', icon: 'tabler:h-2', action: () => instance.chain().focus().toggleHeading({ level: 2 }).run(), active: () => instance.isActive('heading', { level: 2 }) },
    { title: 'H3', icon: 'tabler:h-3', action: () => instance.chain().focus().toggleHeading({ level: 3 }).run(), active: () => instance.isActive('heading', { level: 3 }) },
    { title: 'Quote', icon: 'tabler:quote', action: () => instance.chain().focus().toggleBlockquote().run(), active: () => instance.isActive('blockquote') },
    { title: 'List', icon: 'tabler:list', action: () => instance.chain().focus().toggleBulletList().run(), active: () => instance.isActive('bulletList') },
    { title: 'Divider', icon: 'tabler:separator', action: () => instance.chain().focus().setHorizontalRule().run(), active: () => false },
    { title: 'Link', icon: 'tabler:link', action: openLinkDialog, active: () => instance.isActive('link') },
  ]
})

function insertVariable(token: string) {
  editor.value?.chain().focus().insertContent(token).run()
}

function triggerImageUpload() {
  if (props.disabled || uploading.value) return
  imageInputEl.value?.click()
}

async function uploadAndInsertImage(file: File) {
  if (props.disabled) return
  uploading.value = true
  try {
    const init = await apiFetchData<{ key: string; uploadUrl: string; headers: Record<string, string> }>(
      '/uploads/article-media/init',
      { method: 'POST', body: { contentType: file.type || 'image/jpeg' } },
    )
    const uploadRes = await fetch(init.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: init.headers ?? {},
    })
    if (!uploadRes.ok) throw new Error('Image upload failed.')
    const commit = await apiFetchData<{ key: string }>('/uploads/article-media/commit', {
      method: 'POST',
      body: { key: init.key },
    })
    const imageUrl = assetUrl(commit.key)
    if (!imageUrl) throw new Error('Missing public assets base URL.')
    editor.value?.chain().focus().setImage({ src: imageUrl }).run()
  } catch (e) {
    toast.push({ title: getSafeUserErrorMessage(e, 'Image upload failed.'), tone: 'error' })
  } finally {
    uploading.value = false
  }
}

async function onImageFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  await uploadAndInsertImage(file)
}

function openLinkDialog() {
  const instance = editor.value
  if (!instance) return
  linkDialogUrl.value = String(instance.getAttributes('link').href ?? '')
  linkDialogVisible.value = true
}

function onCloseLinkDialog(visible = false) {
  linkDialogVisible.value = Boolean(visible)
  if (!visible) linkDialogUrl.value = ''
}

function onRemoveLink() {
  editor.value?.chain().focus().unsetLink().run()
  onCloseLinkDialog(false)
}

function onSubmitLinkDialog() {
  const url = linkDialogUrl.value.trim()
  if (!url || !editor.value) return
  editor.value.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  onCloseLinkDialog(false)
}

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>
