<template>
  <div class="relative">
    <textarea
      ref="textareaEl"
      v-model="model"
      :class="[
        'article-comment-textarea w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-100 dark:placeholder-zinc-500',
        'overflow-y-auto',
      ]"
      :style="textareaStyle"
      :placeholder="placeholder"
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
  <div v-if="maxlength" class="mt-1 flex justify-end">
    <span
      class="text-[11px] tabular-nums transition-colors"
      :class="isOverLimit ? 'text-red-500 font-medium' : isNearLimit ? 'text-amber-500' : 'text-gray-400 dark:text-zinc-500'"
    >
      {{ model.length }} / {{ maxlength }}
    </span>
  </div>
</template>

<script setup lang="ts">
import type { FollowListUser } from '~/types/api'
import { useMentionAutocomplete } from '~/composables/useMentionAutocomplete'

const MIN_HEIGHT_PX = 80 // ~3 rows
const MAX_HEIGHT_PX = 200

const props = defineProps<{
  modelValue: string
  placeholder?: string
  maxlength?: number
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
const currentHeight = ref(MIN_HEIGHT_PX)

const model = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const isOverLimit = computed(() => props.maxlength !== undefined && model.value.length > props.maxlength)
const isNearLimit = computed(() => props.maxlength !== undefined && model.value.length >= props.maxlength * 0.9)

const textareaStyle = computed(() => ({
  minHeight: `${MIN_HEIGHT_PX}px`,
  maxHeight: `${MAX_HEIGHT_PX}px`,
  height: `${currentHeight.value}px`,
}))

function autoResize() {
  const el = textareaEl.value
  if (!el) return
  el.style.height = 'auto'
  const newHeight = Math.min(Math.max(el.scrollHeight, MIN_HEIGHT_PX), MAX_HEIGHT_PX)
  currentHeight.value = newHeight
  el.style.height = `${newHeight}px`
}

watch(model, () => {
  nextTick(autoResize)
})

onMounted(() => {
  autoResize()
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

defineExpose({
  focus: () => textareaEl.value?.focus({ preventScroll: true }),
  focusEnd: () => {
    const el = textareaEl.value
    if (!el) return
    el.focus({ preventScroll: true })
    const len = el.value.length
    el.setSelectionRange(len, len)
  },
  el: textareaEl,
})
</script>

<style scoped>
.article-comment-textarea:focus {
  border-color: var(--article-accent);
}
</style>
