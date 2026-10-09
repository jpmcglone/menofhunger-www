<template>
  <div class="moh-styled-textarea" :style="{ '--moh-hashtag-color': hashtagColor }">
    <EditorContent :editor="editor" />
    <AppMentionAutocompletePopover
      v-bind="mentionPopover"
      @select="onMentionSelect"
      @highlight="onMentionHighlight"
      @request-close="onMentionClose"
    />
    <AppHashtagAutocompletePopover
      v-bind="hashtagPopover"
      @select="onHashtagSelect"
      @highlight="onHashtagHighlight"
      @request-close="onHashtagClose"
    />
    <AppCashtagAutocompletePopover
      v-bind="cashtagPopover"
      @select="onCashtagSelect"
      @highlight="onCashtagHighlight"
      @request-close="onCashtagClose"
    />
  </div>
</template>

<script setup lang="ts">
import type { StyledTextareaProps, StyledTextareaEmits } from '../../../composables/composer/styled-textarea-types'
import { EditorContent } from '@tiptap/vue-3'
import { useStyledTextarea } from '~/composables/composer/useStyledTextarea'

// ─── Props / Emits ────────────────────────────────────────────

const props = withDefaults(
  defineProps<StyledTextareaProps>(),
  {
    placeholder: 'Type a chat…',
    disabled: false,
    autoFocus: false,
    priorityUsers: null,
    prioritySectionTitle: undefined,
    hashtagColor: 'var(--p-primary-color)',
    submitTrigger: 'enter',
  },
)

const emit = defineEmits<StyledTextareaEmits>()

const {
  mentionPopover,
  onMentionSelect,
  onMentionHighlight,
  onMentionClose,
  hashtagPopover,
  onHashtagSelect,
  onHashtagHighlight,
  onHashtagClose,
  cashtagPopover,
  onCashtagSelect,
  onCashtagHighlight,
  onCashtagClose,
  editor,
  focus,
  insertAtCursor,
  insertMention,
  clear,
} = useStyledTextarea(props, emit)

defineExpose({ focus, insertAtCursor, insertMention, clear, editor })
</script>

<style>
.moh-styled-textarea {
  position: relative;
  width: 100%;
}

.moh-styled-textarea-editor {
  min-height: 44px;
  width: 100%;
  border: 0;
  background: transparent;
  padding: 0.625rem 3rem;
  font-size: 16px;
  line-height: normal;
  color: var(--moh-text);
  outline: none;
  word-break: break-word;
  overflow-wrap: break-word;
}

@media (min-width: 640px) {
  .moh-styled-textarea-editor {
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
  }
}

.moh-styled-textarea-editor p {
  margin: 0;
}

/* Tiptap placeholder via the Placeholder extension */
.moh-styled-textarea-editor p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: var(--moh-text-muted);
  pointer-events: none;
  height: 0;
}

.moh-styled-textarea-editor .moh-mention {
  color: var(--p-primary-color);
}

.moh-styled-textarea-editor .moh-hashtag {
  color: var(--moh-hashtag-color, var(--p-primary-color));
}

.moh-styled-textarea-editor .moh-cashtag {
  color: var(--moh-cashtag-color, var(--p-primary-color));
}

.moh-styled-textarea-editor:focus {
  outline: none;
  box-shadow: none;
}
</style>
