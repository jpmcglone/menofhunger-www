<template>
  <div class="shrink-0 border-t border-gray-200 px-4 py-2 sm:py-2.5 dark:border-zinc-800" :style="composerBarStyle">
    <div v-if="conversation?.viewerStatus === 'pending'" class="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
      This is a chat request. Replying accepts it and moves it to your inbox.
      <div class="mt-2 flex items-center gap-2">
        <Button label="Accept" size="small" severity="secondary" @click="emit('accept')" />
        <Button label="Delete" size="small" text severity="secondary" @click="emit('deleteConversation')" />
      </div>
    </div>
    <div
      v-if="conversation?.isBlockedWith"
      class="mb-3 flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-300 dark:border-zinc-700 dark:bg-zinc-900"
    >
      <Icon name="tabler:ban" class="shrink-0 text-zinc-400" aria-hidden="true" />
      <span v-if="directUser && blockState.isBlockedByMe(directUser.id)">
        You've blocked <strong class="font-semibold text-white">@{{ directUser.username }}</strong>. You can read past messages but can't send new ones.
        <NuxtLink to="/settings/blocked" class="ml-1 underline text-zinc-300">Manage in Settings.</NuxtLink>
      </span>
      <span v-else>
        <strong class="font-semibold text-white">@{{ directUser?.username }}</strong> has blocked you. You can read past messages but can't send new ones.
      </span>
    </div>
    <AppInlineAlert v-if="sendError" class="mb-2" severity="danger">{{ sendError }}</AppInlineAlert>
    <!-- Edit mode banner -->
    <div v-if="editingMessage" class="mb-2 flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
      <div class="flex items-center gap-1.5">
        <Icon name="tabler:pencil" class="shrink-0" aria-hidden="true" />
        <span>Editing message</span>
      </div>
      <button type="button" class="underline hover:no-underline shrink-0" @click="emit('cancelEdit')">Cancel</button>
    </div>
    <AppDmComposer
      v-if="!conversation?.isBlockedWith"
      ref="dmComposerRef"
      v-model="composerText"
      :user="composerUser"
      :placeholder="editingMessage ? 'Edit message…' : 'Type a chat…'"
      :loading="sending"
      :auto-focus="autoFocus"
      :reply-to="!editingMessage && replyToMessage ? { id: replyToMessage.id, senderUsername: replyToMessage.sender.username, bodyPreview: replyToMessage.body.slice(0, 200), mediaThumbnailUrl: replyToMessage.media?.[0]?.thumbnailUrl ?? replyToMessage.media?.[0]?.url ?? null } : null"
      @send="emit('send')"
      @cancel-reply="emit('cancelReply')"
    />
  </div>
</template>

<script setup lang="ts">
import type { Message, MessageConversation, MessageUser } from '~/types/api'
import type { CreateMediaPayload } from '~/composables/composer/types'
import { useKeyboardHeight } from '~/composables/useKeyboardHeight'

defineProps<{
  conversation: MessageConversation | null
  directUser: MessageUser | null
  sendError: string | null
  editingMessage: Message | null
  replyToMessage: Message | null
  sending: boolean
  autoFocus: boolean
}>()

const composerText = defineModel<string>({ required: true })

const emit = defineEmits<{
  send: []
  cancelEdit: []
  cancelReply: []
  accept: []
  deleteConversation: []
}>()

const { user: me } = useAuth()
const blockState = useBlockState()
const { keyboardHeight } = useKeyboardHeight()

const composerUser = computed(() =>
  me.value
    ? {
        premium: Boolean(me.value.premium),
        verifiedStatus: me.value.verifiedStatus ?? 'none',
      }
    : null,
)

// When the keyboard is open, offset the composer bar up by the keyboard height so it
// sits directly above the keyboard. When closed, use the normal safe-area bottom inset.
const composerBarStyle = computed<Record<string, string>>(() => {
  if (keyboardHeight.value > 0) {
    return { paddingBottom: `${keyboardHeight.value}px` }
  }
  return { paddingBottom: 'calc(var(--moh-safe-bottom, 0px) - 4px)' }
})

const dmComposerRef = ref<{ focus?: () => void; getMedia?: () => CreateMediaPayload[]; clearMedia?: () => void } | null>(null)

defineExpose({
  focus: () => dmComposerRef.value?.focus?.(),
  getMedia: () => dmComposerRef.value?.getMedia?.() ?? [],
  clearMedia: () => dmComposerRef.value?.clearMedia?.(),
})
</script>
