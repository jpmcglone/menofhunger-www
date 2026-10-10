<template>
  <button id="outside">Outside editor</button>
  <EditorContent :editor="editor" />
  <DestinationPicker :groups="groups" :model-value="group" :visibility="visibility" :allowed="['public', 'verifiedOnly']" :is-premium="false" @select-visibility="selectVisibility" @update:model-value="selectGroup" />
  <VisibilityPicker :model-value="visibility" :allowed="['public', 'verifiedOnly']" :viewer-is-verified="true" :is-premium="false" @update:model-value="selectVisibility" />
  <output>{{ draft }}</output>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import DestinationPicker from '../../components/app/composer/DestinationPicker.vue'
import VisibilityPicker from '../../components/app/composer/VisibilityPicker.vue'
import { useDestinationComposerDraft } from '../../composables/composer/useDestinationComposerDraft'
import type { PostVisibility } from '../../types/api'

const draft = ref('')
const visibility = ref<PostVisibility>('public')
const group = ref<string | null>(null)
const groups = [{ id: 'group-1', name: 'Daily Practice', joinPolicy: 'closed' }]
const key = computed(() => `alice:${group.value ?? visibility.value}`)
const drafts = useDestinationComposerDraft({ key, snapshot: () => ({ body: draft.value }), restore: value => { draft.value = value?.body ?? '' }, hasContent: () => !!draft.value, preserveInitial: () => false })
const editor = new Editor({ extensions: [StarterKit], onUpdate: ({ editor }) => { draft.value = editor.getText() } })
watch(draft, value => { if (editor.getText() !== value) editor.commands.setContent(value) })
watch(drafts.blockingLoad, value => editor.setEditable(!value))
function selectVisibility(value: PostVisibility) { drafts.changeDestination(() => { visibility.value = value; group.value = null }) }
function selectGroup(value: string | null) { drafts.changeDestination(() => { group.value = value }) }
onBeforeUnmount(() => editor.destroy())
</script>

<style>
body { font: 16px sans-serif; padding: 24px; }
button, input { padding: 12px; margin: 4px; }
.tiptap { border: 1px solid #888; min-height: 120px; padding: 12px; }
[role="dialog"] { background: white; padding: 24px; border: 1px solid #888; }
</style>
