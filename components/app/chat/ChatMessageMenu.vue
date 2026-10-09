<template>
  <Popover ref="popoverRef" :pt="{ root: { class: 'shadow-xl border moh-border moh-popover rounded-2xl p-1 min-w-[11rem]' } }" @hide="restoreFocus">
    <AppInteractionsActionList :actions="actions" @select="hide" />
  </Popover>
</template>

<script setup lang="ts">
import type { OverlayPanelHandle } from '~/types/overlay-ref'
import type { Message } from '~/types/api'
import type { SurfaceAction } from '~/utils/surface-actions'

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

const popoverRef = ref<OverlayPanelHandle | null>(null)

let origin: HTMLElement | null = null
function restoreFocus() { origin?.focus(); origin = null }
const actions = computed<SurfaceAction[]>(() => {
  const message = props.message
  if (!message) return []
  const visible = !message.deletedForAll && !message.deletedForMe
  return [
    { id: 'reply', label: 'Reply', icon: 'tabler:message-reply', section: 'message', available: visible, run: () => onAction('reply') },
    { id: 'copy', label: 'Copy message text', icon: 'tabler:copy', section: 'message', available: visible, run: () => onAction('copy') },
    { id: 'info', label: 'Info', icon: 'tabler:info-circle', section: 'message', run: () => onAction('info') },
    { id: 'edit', label: 'Edit', icon: 'tabler:pencil', section: 'message', available: visible && isMyMessage.value && canEdit.value, run: () => onAction('edit') },
    { id: 'delete-for-all', label: 'Delete for everyone', icon: 'tabler:trash-x', section: 'delete', destructive: true, available: visible && isMyMessage.value, run: () => onAction('delete-for-all') },
    { id: 'delete', label: 'Delete for me', icon: 'tabler:trash', section: 'delete', destructive: true, available: visible, run: () => onAction('delete') },
    { id: 'restore', label: 'Restore message', icon: 'tabler:restore', section: 'restore', available: !!message.deletedForMe && !message.deletedForAll, run: () => onAction('restore') },
  ]
})
function toggle(event: Event) {
  origin = event.currentTarget instanceof HTMLElement ? event.currentTarget : null
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
