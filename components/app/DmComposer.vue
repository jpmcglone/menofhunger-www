<template>
  <div class="flex w-full flex-col gap-1.5">
    <!-- Reply-to snippet -->
    <Transition name="moh-fade">
      <div
        v-if="replyTo"
        class="flex items-start gap-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/60 px-3 py-2 text-xs"
      >
        <Icon name="tabler:corner-up-right" size="13" class="mt-0.5 shrink-0 text-gray-400 dark:text-zinc-500" aria-hidden="true" />
        <div class="min-w-0 flex-1">
          <span class="font-semibold text-gray-600 dark:text-gray-300 mr-1">
            {{ replyTo.senderUsername ? `@${replyTo.senderUsername}` : 'Reply' }}
          </span>
          <span class="text-gray-500 dark:text-gray-400 line-clamp-1">{{ replyTo.bodyPreview }}</span>
        </div>
        <button
          type="button"
          aria-label="Cancel reply"
          class="shrink-0 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
          @click="emit('cancel-reply')"
        >
          <Icon name="tabler:x" size="13" aria-hidden="true" />
        </button>
      </div>
    </Transition>

    <!-- Text pill -->
    <div class="relative flex w-full items-stretch overflow-hidden" :class="outlineClass">
      <!-- Emoji button: inside the pill, left side -->
      <div class="dm-composer-emoji absolute left-2 bottom-2 z-10">
        <AppEmojiPickerButton
          ref="emojiPickerEl"
          tooltip="Emoji"
          aria-label="Insert emoji"
          persistent
          :disabled="disabled"
          @select="insertEmoji"
        />
      </div>

      <AppStyledTextarea
        ref="styledTextareaEl"
        :model-value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :auto-focus="autoFocus"
        :priority-users="priorityUsers"
        :priority-section-title="prioritySectionTitle"
        :hashtag-color="userHashtagColor"
        @update:model-value="onTextChange"
        @send="onSend"
      />

      <Transition name="moh-fade">
        <button
          v-if="hasText"
          type="button"
          aria-label="Send"
          :disabled="loading"
          class="absolute right-2 bottom-2 flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-50"
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
import type { FollowListUser, MessageReplySnippet } from '~/types/api'
import { userColorTier, userTierColorVar } from '~/utils/user-tier'

const props = withDefaults(
  defineProps<{
    modelValue: string
    user?: Partial<Pick<FollowListUser, 'isOrganization' | 'premium' | 'premiumPlus' | 'verifiedStatus'>> | null
    placeholder?: string
    loading?: boolean
    disabled?: boolean
    autoFocus?: boolean
    priorityUsers?: FollowListUser[] | null
    prioritySectionTitle?: string
    replyTo?: MessageReplySnippet | null
  }>(),
  {
    placeholder: 'Type a chat…',
    loading: false,
    disabled: false,
    user: null,
    autoFocus: false,
    priorityUsers: null,
    prioritySectionTitle: undefined,
    replyTo: null,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  send: []
  'cancel-reply': []
}>()

const styledTextareaEl = ref<InstanceType<typeof import('./StyledTextarea.vue').default> | null>(null)
const emojiPickerEl = ref<{ close: () => void } | null>(null)
const isMultiline = ref(false)
const hasText = computed(() => (props.modelValue ?? '').trim().length > 0)

const userTier = computed(() => userColorTier(props.user))
const userHashtagColor = computed(() => userTierColorVar(userTier.value) ?? 'var(--p-primary-color)')
const ORG_CHAT_SILVER = '#313643'

const outlineClass = computed(() => {
  const radius = isMultiline.value ? 'rounded-2xl' : 'rounded-full'
  const base = `${radius} border`
  if (userTier.value === 'organization') return `${base} border-[${ORG_CHAT_SILVER}]`
  if (userTier.value === 'premium') return `${base} border-[var(--moh-premium)]`
  if (userTier.value === 'verified') return `${base} border-[var(--moh-verified)]`
  return `${base} border-gray-300 dark:border-zinc-600`
})

const sendButtonClass = computed(() => {
  if (userTier.value === 'organization') return `bg-[${ORG_CHAT_SILVER}] text-white hover:opacity-90`
  if (userTier.value === 'premium') return 'bg-[var(--moh-premium)] text-white hover:opacity-90'
  if (userTier.value === 'verified') return 'bg-[var(--moh-verified)] text-white hover:opacity-90'
  return 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100'
})

function onTextChange(text: string) {
  emit('update:modelValue', text)
  checkMultiline()
}

function onSend() {
  if (hasText.value) {
    emojiPickerEl.value?.close()
    emit('send')
  }
}

function emitSend() {
  if (!hasText.value || props.loading) return
  emojiPickerEl.value?.close()
  emit('send')
}

function insertEmoji(emoji: string) {
  styledTextareaEl.value?.insertAtCursor(emoji + ' ')
}

function focus() {
  styledTextareaEl.value?.focus()
}

function checkMultiline() {
  nextTick(() => {
    const editorEl = styledTextareaEl.value?.$el?.querySelector('.moh-styled-textarea-editor') as HTMLElement | null
    if (!editorEl) return
    const style = window.getComputedStyle(editorEl)
    const lh = parseFloat(style.lineHeight) || 20
    const pt = parseFloat(style.paddingTop) || 0
    const pb = parseFloat(style.paddingBottom) || 0
    const contentH = Math.max(0, editorEl.scrollHeight - pt - pb)
    isMultiline.value = lh > 0 ? Math.round(contentH / lh) >= 2 : false
  })
}

watch(() => props.modelValue, checkMultiline)

defineExpose({ focus })
</script>

<style scoped>
.dm-composer-emoji :deep(.p-button) {
  height: 32px;
  width: 32px;
  padding: 0;
}
</style>
