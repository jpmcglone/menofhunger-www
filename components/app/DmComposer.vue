<template>
  <div
    class="relative flex w-full items-center overflow-hidden"
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
        <i v-if="loading" class="pi pi-spinner pi-spin text-sm" aria-hidden="true" />
        <i v-else class="pi pi-arrow-up text-sm" aria-hidden="true" />
      </button>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { FollowListUser } from '~/types/api'

const props = withDefaults(
  defineProps<{
    modelValue: string
    user?: Pick<FollowListUser, 'premium' | 'verifiedStatus'> | null
    placeholder?: string
    loading?: boolean
    disabled?: boolean
  }>(),
  {
    placeholder: 'Type a chat…',
    loading: false,
    disabled: false,
    user: null,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  send: []
}>()

const textareaEl = ref<HTMLTextAreaElement | null>(null)

const hasText = computed(() => props.modelValue.trim().length > 0)

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

function onInput(e: Event) {
  const target = e.target as HTMLTextAreaElement
  const val = target.value
  emit('update:modelValue', val)
  nextTick(resizeTextarea)
}

function onKeydown(e: KeyboardEvent) {
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
})

watch(
  () => props.modelValue,
  () => nextTick(resizeTextarea),
)
</script>
