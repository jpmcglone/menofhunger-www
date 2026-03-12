<template>
  <div class="relative">
    <textarea
      ref="textareaEl"
      v-model="model"
      :class="[
        'article-comment-textarea w-full resize-none rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-100 dark:placeholder-zinc-500',
        rowsClass,
      ]"
      :placeholder="placeholder"
      :rows="rows ?? 3"
      :disabled="disabled"
      :autofocus="autofocus"
    />
    <AppMentionAutocompletePopover
      v-bind="mention.popoverProps"
      @select="mention.onSelect"
      @highlight="mention.onHighlight"
      @request-close="mention.onRequestClose"
    />
  </div>
</template>

<script setup lang="ts">
import type { FollowListUser } from '~/types/api'
import { useMentionAutocomplete } from '~/composables/useMentionAutocomplete'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  rows?: number
  disabled?: boolean
  autofocus?: boolean
  priorityUsers?: FollowListUser[]
}>()

const emit = defineEmits<{
  'update:modelValue': [string]
  submit: []
  esc: []
}>()

const textareaEl = ref<HTMLTextAreaElement | null>(null)

const model = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const rowsClass = computed(() => {
  switch (props.rows) {
    case 2: return 'py-2'
    default: return 'py-2.5'
  }
})

const mention = useMentionAutocomplete({
  el: textareaEl,
  getText: () => props.modelValue,
  setText: (v) => emit('update:modelValue', v),
  priorityUsers: computed(() => props.priorityUsers ?? null),
  prioritySectionTitle: 'In this article',
})

// Use capture phase so we fire BEFORE the composable's bubble-phase keydown listener.
// This lets us intercept Cmd+Enter (submit) and Esc (cancel) without fighting the composable.
function handleKeydownCapture(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    // Stop the composable from trying to select a mention on Cmd+Enter.
    e.stopImmediatePropagation()
    e.preventDefault()
    emit('submit')
    return
  }
  if (e.key === 'Escape') {
    if (!mention.popoverProps.open) {
      // Popover is already closed — let parent decide to cancel the compose/reply.
      emit('esc')
    }
    // When popover is open, do nothing here; the composable handles Esc to close it.
  }
}

onMounted(() => {
  textareaEl.value?.addEventListener('keydown', handleKeydownCapture, { capture: true })
})

onBeforeUnmount(() => {
  textareaEl.value?.removeEventListener('keydown', handleKeydownCapture, { capture: true })
})

defineExpose({ focus: () => textareaEl.value?.focus({ preventScroll: true }), el: textareaEl })
</script>

<style scoped>
.article-comment-textarea:focus {
  border-color: var(--article-accent);
}
</style>
