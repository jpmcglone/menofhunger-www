<template>
  <Popover ref="popoverRef" :pt="{ root: { class: 'shadow-xl border moh-border moh-popover rounded-2xl p-1 min-w-[11rem]' } }">
    <div class="flex flex-col">
      <button
        type="button"
        class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-zinc-700 text-left"
        @click="onAction('reply')"
      >
        <Icon name="tabler:message-reply" class="shrink-0 text-base" aria-hidden="true" />
        <span>Reply</span>
      </button>

      <button
        type="button"
        class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-zinc-700 text-left"
        @click="onAction('copy')"
      >
        <Icon name="tabler:copy" class="shrink-0 text-base" aria-hidden="true" />
        <span>Copy message text</span>
      </button>

      <button
        type="button"
        class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-zinc-700 text-left"
        @click="onAction('info')"
      >
        <Icon name="tabler:info-circle" class="shrink-0 text-base" aria-hidden="true" />
        <span>Info</span>
      </button>

      <!-- Edit and delete-for-all: only for my own messages that haven't been deleted for all -->
      <template v-if="isMyMessage && !message?.deletedForAll && !message?.deletedForMe">
        <button
          v-if="canEdit"
          type="button"
          class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-zinc-700 text-left"
          @click="onAction('edit')"
        >
          <Icon name="tabler:pencil" class="shrink-0 text-base" aria-hidden="true" />
          <span>Edit</span>
        </button>

        <div class="my-1 border-t border-gray-100 dark:border-zinc-700" />

        <button
          type="button"
          class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 text-left"
          @click="onAction('delete-for-all')"
        >
          <Icon name="tabler:trash-x" class="shrink-0 text-base" aria-hidden="true" />
          <span>Delete for everyone</span>
        </button>
      </template>

      <div class="my-1 border-t border-gray-100 dark:border-zinc-700" />

      <button
        v-if="!message?.deletedForMe && !message?.deletedForAll"
        type="button"
        class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 text-left"
        @click="onAction('delete')"
      >
        <Icon name="tabler:trash" class="shrink-0 text-base" aria-hidden="true" />
        <span>Delete for me</span>
      </button>

      <button
        v-else-if="message?.deletedForMe && !message?.deletedForAll"
        type="button"
        class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-zinc-700 text-left"
        @click="onAction('restore')"
      >
        <Icon name="tabler:restore" class="shrink-0 text-base" aria-hidden="true" />
        <span>Restore message</span>
      </button>
    </div>
  </Popover>
</template>

<script setup lang="ts">
import type { Message } from '~/types/api'

const MESSAGE_EDIT_WINDOW_MS = 15 * 60 * 1000

const props = defineProps<{
  message: Message | null
  viewerUserId?: string | null
}>()

const emit = defineEmits<{
  reply: [message: Message]
  copy: [message: Message]
  info: [message: Message]
  edit: [message: Message]
  delete: [message: Message]
  restore: [message: Message]
  'delete-for-all': [message: Message]
}>()

const isMyMessage = computed(() => Boolean(props.viewerUserId && props.message?.sender?.id === props.viewerUserId))

const canEdit = computed(() => {
  if (!props.message) return false
  const age = Date.now() - new Date(props.message.createdAt).getTime()
  return age < MESSAGE_EDIT_WINDOW_MS
})

const popoverRef = ref<any>(null)

function toggle(event: Event) {
  popoverRef.value?.toggle(event)
}

function hide() {
  popoverRef.value?.hide()
}

function onAction(action: 'reply' | 'copy' | 'info' | 'edit' | 'delete' | 'restore' | 'delete-for-all') {
  hide()
  if (!props.message) return
  const msg = props.message
  if (action === 'reply') emit('reply', msg)
  else if (action === 'copy') emit('copy', msg)
  else if (action === 'info') emit('info', msg)
  else if (action === 'edit') emit('edit', msg)
  else if (action === 'delete') emit('delete', msg)
  else if (action === 'restore') emit('restore', msg)
  else if (action === 'delete-for-all') emit('delete-for-all', msg)
}

defineExpose({ toggle, hide })
</script>
