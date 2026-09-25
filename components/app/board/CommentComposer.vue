<template>
  <form class="flex items-start gap-2.5" @submit.prevent="submit">
    <AppUserAvatar v-if="showAvatar && user" :user="user" size-class="h-7 w-7" :enable-preview="false" :show-status="false" />
    <div class="min-w-0 flex-1">
      <textarea
        ref="inputEl"
        v-model="body"
        rows="1"
        :placeholder="placeholder"
        :maxlength="maxLength"
        class="block w-full resize-none rounded-xl border moh-border bg-transparent px-3 py-2 text-sm moh-text outline-none placeholder:text-[var(--moh-text-soft)] focus:border-[var(--moh-text-muted)]"
        :aria-label="placeholder"
        @focus="onFocus"
        @input="autosize"
        @keydown.meta.enter.prevent="submit"
        @keydown.ctrl.enter.prevent="submit"
      />
      <p v-if="error" class="mt-1 text-xs text-red-500">{{ error }}</p>
      <div v-if="body.trim() || autofocus" class="mt-2 flex items-center justify-end gap-2">
        <button v-if="cancellable" type="button" class="moh-tap px-3 text-sm moh-text-muted hover:text-[var(--moh-text)]" @click="emit('cancel')">Cancel</button>
        <AppActionButton :label="submitLabel" kind="brand" :loading="submitting" :disabled="!body.trim()" type="submit" />
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import type { BoardComment } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

const props = withDefaults(defineProps<{
  threadId: string
  parentId?: string | null
  placeholder?: string
  submitLabel?: string
  showAvatar?: boolean
  autofocus?: boolean
  cancellable?: boolean
}>(), { parentId: null, placeholder: 'Add a comment…', submitLabel: 'Comment', showAvatar: true, autofocus: false, cancellable: false })

const emit = defineEmits<{ created: [comment: BoardComment]; cancel: [] }>()

const { user, isPremium } = useAuth()
const { requireMember } = useBoardAccess()
const api = useBoardApi()
const body = ref('')
const submitting = ref(false)
const error = ref<string | null>(null)
const inputEl = ref<HTMLTextAreaElement | null>(null)
const maxLength = computed(() => (isPremium.value ? 1000 : 500))

function autosize() {
  const el = inputEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 240)}px`
}

function onFocus() {
  if (!requireMember('comment')) inputEl.value?.blur()
}

async function submit() {
  const text = body.value.trim()
  if (!text || submitting.value) return
  if (!requireMember('comment')) return
  submitting.value = true
  error.value = null
  try {
    const created = await api.createComment(props.threadId, text, props.parentId)
    body.value = ''
    nextTick(autosize)
    emit('created', created)
  } catch (e) {
    error.value = getApiErrorMessage(e) || 'Couldn’t post your comment.'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  if (props.autofocus) inputEl.value?.focus()
})
</script>
