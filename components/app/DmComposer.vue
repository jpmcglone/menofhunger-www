<template>
  <div class="flex w-full items-end gap-2">
    <!-- Emoji button: outside the pill, left side -->
    <AppEmojiPickerButton
      tooltip="Emoji"
      aria-label="Insert emoji"
      :disabled="disabled"
      @select="insertEmoji"
    />

    <!-- Text pill -->
    <div
      class="relative flex w-full items-stretch overflow-hidden"
      :class="outlineClass"
    >
      <textarea
        ref="textareaEl"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        rows="1"
        class="dm-composer-input min-h-[44px] w-full resize-none border-0 bg-transparent py-3 pl-4 pr-12 text-[16px] text-[var(--moh-text)] placeholder:text-[var(--moh-text-muted)] focus:outline-none focus:ring-0 disabled:opacity-60"
        @input="onInput"
        @keydown="onKeydown"
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
      <Transition name="moh-fade">
        <button
          v-if="hasText"
          type="button"
          aria-label="Send"
          :disabled="loading"
          class="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full transition-colors disabled:opacity-50"
          :class="sendButtonClass"
          @click="emitSend"
        >
          <Icon v-if="loading" name="tabler:loader" class="text-sm animate-spin" aria-hidden="true" />
          <Icon v-else name="tabler:arrow-up" class="text-sm" aria-hidden="true" />
        </button>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FollowListUser } from '~/types/api'
import { useMentionAutocomplete } from '~/composables/useMentionAutocomplete'
import { useHashtagAutocomplete } from '~/composables/useHashtagAutocomplete'

const props = withDefaults(
  defineProps<{
    modelValue: string
    user?: Pick<FollowListUser, 'premium' | 'verifiedStatus'> | null
    placeholder?: string
    loading?: boolean
    disabled?: boolean
    autoFocus?: boolean
  }>(),
  {
    placeholder: 'Type a chat…',
    loading: false,
    disabled: false,
    user: null,
    autoFocus: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  send: []
}>()

const textareaEl = ref<HTMLTextAreaElement | null>(null)

const mention = useMentionAutocomplete({
  el: textareaEl,
  getText: () => props.modelValue ?? '',
  setText: (next) => emit('update:modelValue', next),
  debounceMs: 200,
  limit: 10,
})

const hashtag = useHashtagAutocomplete({
  el: textareaEl,
  getText: () => props.modelValue ?? '',
  setText: (next) => emit('update:modelValue', next),
  debounceMs: 200,
  limit: 10,
})

const hasText = computed(() => props.modelValue.trim().length > 0)

function focus() {
  textareaEl.value?.focus?.()
}

const userTier = computed<'premium' | 'verified' | 'normal'>(() => {
  const u = props.user
  if (u?.premium) return 'premium'
  if (u?.verifiedStatus && u.verifiedStatus !== 'none') return 'verified'
  return 'normal'
})

const outlineClass = computed(() => {
  const base = 'rounded-full border'
  if (userTier.value === 'premium') return `${base} border-[var(--moh-premium)]`
  if (userTier.value === 'verified') return `${base} border-[var(--moh-verified)]`
  return `${base} border-gray-300 dark:border-zinc-600`
})

const sendButtonClass = computed(() => {
  if (userTier.value === 'premium') return 'bg-[var(--moh-premium)] text-white hover:opacity-90'
  if (userTier.value === 'verified') return 'bg-[var(--moh-verified)] text-white hover:opacity-90'
  return 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100'
})

function resizeTextarea() {
  if (typeof document === 'undefined') return
  const el = textareaEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.max(el.scrollHeight, 44)}px`
}

function insertEmoji(emoji: string) {
  const e = (emoji ?? '').trim()
  if (!e) return
  const el = textareaEl.value
  const value = props.modelValue ?? ''
  if (el && typeof el.selectionStart === 'number' && typeof el.selectionEnd === 'number') {
    const start = el.selectionStart
    const end = el.selectionEnd
    const next = value.slice(0, start) + e + value.slice(end)
    emit('update:modelValue', next)
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
    emit('update:modelValue', next)
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

function onInput(e: Event) {
  const target = e.target as HTMLTextAreaElement
  const val = target.value
  emit('update:modelValue', val)
  nextTick(resizeTextarea)
  mention.recompute()
  hashtag.recompute()
}

function onKeydown(e: KeyboardEvent) {
  // Mention autocomplete binds keydown directly on the textarea.
  // If it already handled this key, don't also send the message.
  if (e.defaultPrevented) return
  if (e.key !== 'Enter') return
  if (e.shiftKey) return
  e.preventDefault()
  if (hasText.value) emit('send')
}

function emitSend() {
  if (!hasText.value || props.loading) return
  emit('send')
}

onMounted(() => {
  nextTick(resizeTextarea)
  if (props.autoFocus) {
    nextTick(() => focus())
  }
})

watch(
  () => props.modelValue,
  () => nextTick(resizeTextarea),
)

defineExpose({ focus })
</script>
