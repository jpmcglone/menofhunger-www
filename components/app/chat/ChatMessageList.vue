<template>
  <div v-show="messagesReady" class="w-full px-4">
    <div v-if="messagesLoading" class="text-sm text-gray-500 dark:text-gray-400">Loading chat…</div>
    <div v-else-if="messagesNextCursor" class="pb-2">
      <Button label="Load older" text size="small" severity="secondary" :loading="loadingOlder" @click="emit('load-older')" />
    </div>
    <div v-else-if="isDraftChat && messagesCount === 0" class="py-6 text-sm text-gray-500 dark:text-gray-400">
      Send your first chat to start the conversation.
    </div>

    <div
      v-if="stickyDividerLabel"
      class="sticky -top-4 z-10 flex items-center py-1.5 sm:py-2 pointer-events-none -mx-4 px-4 backdrop-blur-sm"
      style="position: sticky;"
    >
      <div class="flex-1 border-t border-gray-200 dark:border-zinc-800" />
      <div
        class="mx-3 shrink-0 rounded-full px-2 text-[11px] font-semibold text-gray-500 shadow-sm dark:text-gray-400"
        style="background: color-mix(in srgb, var(--moh-surface-2) 72%, transparent); border: 1px solid var(--moh-border-subtle);"
      >
        {{ stickyDividerLabel }}
      </div>
      <div class="flex-1 border-t border-gray-200 dark:border-zinc-800" />
    </div>

    <!-- Plain normal-flow list — no virtualizer, no CSS containment. -->
    <div
      v-for="(item, index) in messagesWithDividers"
      :key="item.key"
      class="moh-chat-row"
    >
      <ChatMessageListRow
        :item="item"
        :animate-rows="animateRows"
        :recent-animated-message-ids="recentAnimatedMessageIds"
        :sending-message-ids="sendingMessageIds"
        :latest-my-message-id="latestMyMessageId"
        :is-latest-my-message-read="isLatestMyMessageRead"
        :last-read-my-message-id="lastReadMyMessageId"
        :is-group-chat="isGroupChat"
        :me-id="meId"
        :hovered-id="hoveredId"
        :chat-hide-thumbs="chatHideThumbs"
        :loaded-media-ids="loadedMediaIds"
        :jump-target-message-id="jumpTargetMessageId"
        :read-indicators="getReadIndicatorsFor(item)"
        :should-show-message-meta="shouldShowMessageMeta(item, index)"
        :format-message-time="formatMessageTime"
        :format-message-time-full="formatMessageTimeFull"
        :bubble-shape-class="bubbleShapeClass"
        :bubble-class="bubbleClass"
        :register-divider-el="registerDividerEl"
        :show-incoming-avatar="shouldShowIncomingAvatar(index)"
        :go-to-profile="goToProfile"
        :sender-overlay="senderOverlay"
        @mouseenter="(id: string) => (hoveredId = id)"
        @mouseleave="onRowLeave"
        @reply-snippet-click="(id: string) => emit('scroll-to-reply', id)"
        @open-media="openMessageMedia"
        @open-reaction-picker="openReactionPicker"
        @open-menu="openMenu"
        @react="(message: Message, reactionId: string) => emit('react', message, reactionId)"
        @restore="(message: Message) => emit('restore', message)"
      />
    </div>

    <!-- Shared popovers (one instance, repositioned on open) -->
    <AppChatReactionPicker
      ref="reactionPickerRef"
      :reactions="availableReactions"
      :active-reaction-ids="activeReactionIds"
      @select="onReactionSelect"
    />

    <AppChatMessageMenu
      ref="messageMenuRef"
      :message="menuMessage"
      :viewer-user-id="props.meId"
      @reply="emit('reply', $event)"
      @copy="onCopy"
      @info="emit('info', $event)"
      @edit="emit('edit', $event)"
      @delete="emit('delete-for-me', $event)"
      @delete-for-all="emit('delete-for-all', $event)"
      @restore="emit('restore', $event)"
    />

    <!-- Load newer button (shown when viewing historical messages) -->
    <div v-if="messagesNewerCursor" class="pt-2 pb-1">
      <Button label="Load newer" text size="small" severity="secondary" :loading="loadingNewer" @click="emit('load-newer')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import type { Message, MessageMedia, MessageUser, MessageReaction, MessageParticipant } from '~/types/api'
import type { ChatListItem } from '~/composables/chat/useChatTimeFormatting'
import { shouldShowGroupIncomingAvatar } from '~/utils/chat-incoming-avatar'
import { assignGroupReadIndicators } from '~/utils/chat-read-indicators'
import { useUsersStore } from '~/composables/useUsersStore'
import ChatMessageListRow from './ChatMessageListRow.vue'

const toast = useAppToast()
const colorMode = useColorMode()
const viewer = useImageLightbox()
const chatHideThumbs = computed(() => viewer.kind.value === 'media' && viewer.hideOrigin.value)

const loadedMediaIds = reactive(new Set<string>())

const props = defineProps({
  messagesReady: { type: Boolean, required: true },
  messagesLoading: { type: Boolean, required: true },
  messagesNextCursor: { type: [String, null] as PropType<string | null>, required: true, default: null },
  loadingOlder: { type: Boolean, required: true },
  isDraftChat: { type: Boolean, required: true },
  messagesCount: { type: Number, required: true },
  messagesWithDividers: { type: Array as PropType<ChatListItem[]>, required: true },
  stickyDividerLabel: { type: [String, null] as PropType<string | null>, required: true, default: null },
  recentAnimatedMessageIds: { type: Object as PropType<Set<string>>, required: true },
  sendingMessageIds: { type: Object as PropType<Set<string>>, required: true },
  latestMyMessageId: { type: [String, null] as PropType<string | null>, required: true, default: null },
  animateRows: { type: Boolean, required: false, default: true },
  isGroupChat: { type: Boolean, required: true },
  meId: { type: String as PropType<string | null>, required: true },
  formatMessageTime: { type: Function as PropType<(iso: string) => string>, required: true },
  formatMessageTimeFull: { type: Function as PropType<(iso: string) => string>, required: true },
  bubbleShapeClass: { type: Function as PropType<(message: Message) => string>, required: true },
  bubbleClass: { type: Function as PropType<(m: Message) => string>, required: true },
  registerDividerEl: { type: Function as PropType<(dayKey: string, label: string, el: unknown) => void>, required: true },
  goToProfile: { type: Function as PropType<(u: MessageUser | null | undefined) => void>, required: true },
  availableReactions: { type: Array as PropType<MessageReaction[]>, required: false, default: () => [] },
  participants: { type: Array as PropType<MessageParticipant[]>, required: false, default: () => [] },
  jumpTargetMessageId: { type: [String, null] as PropType<string | null>, required: false, default: null },
  messagesNewerCursor: { type: [String, null] as PropType<string | null>, required: false, default: null },
  loadingNewer: { type: Boolean, required: false, default: false },
})

const CLUSTER_GAP_MS = 5 * 60 * 1000
const usersStore = useUsersStore()

const hoveredId = ref<string | null>(null)
const reactionPickerRef = ref<{ toggle: (e: Event) => void; hide: () => void } | null>(null)
const messageMenuRef = ref<{ toggle: (e: Event) => void; hide: () => void } | null>(null)
const pickerMessage = ref<Message | null>(null)
const menuMessage = ref<Message | null>(null)

const activeReactionIds = computed<Set<string>>(() => {
  if (!pickerMessage.value?.reactions) return new Set()
  return new Set(pickerMessage.value.reactions.filter((r) => r.reactedByMe).map((r) => r.reactionId))
})

const lastMessageIsMine = computed(() => {
  for (let i = props.messagesWithDividers.length - 1; i >= 0; i--) {
    const item = props.messagesWithDividers[i]!
    if (item.type !== 'message') continue
    return item.message.sender.id === props.meId
  }
  return false
})

const readIndicatorsByMessageId = computed(() => {
  if (!props.isGroupChat) return new Map<string, MessageParticipant[]>()
  return assignGroupReadIndicators(props.messagesWithDividers, props.participants, {
    meId: props.meId,
    hideViewer: lastMessageIsMine.value,
  })
})

const isLatestMyMessageRead = computed(() => {
  if (!props.latestMyMessageId || !props.participants.length) return false
  const latestMsgItem = props.messagesWithDividers.find(
    (i): i is Extract<ChatListItem, { type: 'message' }> =>
      i.type === 'message' && i.message.id === props.latestMyMessageId,
  )
  if (!latestMsgItem) return false
  const latestMsgMs = latestMsgItem.createdAtMs
  return props.participants.some((p) => !!p.lastReadAt && Date.parse(p.lastReadAt) >= latestMsgMs)
})

// For 1:1 chats: the most recent message *I* sent that the other person has actually read.
// This may be an older message if my newest one hasn't been read yet.
const lastReadMyMessageId = computed<string | null>(() => {
  if (props.isGroupChat || !props.participants.length || !props.meId) return null
  const lastReadMs = props.participants.reduce((best, p) => {
    const ms = p.lastReadAt ? Date.parse(p.lastReadAt) : -Infinity
    return Number.isFinite(ms) ? Math.max(best, ms) : best
  }, -Infinity)
  if (!Number.isFinite(lastReadMs) || lastReadMs === -Infinity) return null
  for (let i = props.messagesWithDividers.length - 1; i >= 0; i--) {
    const item = props.messagesWithDividers[i]!
    if (item.type !== 'message') continue
    if (item.message.sender.id !== props.meId) continue
    if (item.createdAtMs <= lastReadMs) return item.message.id
  }
  return null
})

function getReadIndicatorsFor(item: ChatListItem): MessageParticipant[] | null {
  if (item.type !== 'message') return null
  return readIndicatorsByMessageId.value.get(item.message.id) ?? null
}

function onRowLeave(id: string) {
  if (hoveredId.value === id) hoveredId.value = null
}

function openMessageMedia(e: MouseEvent, mediaList: MessageMedia[], clicked: MessageMedia) {
  const items = mediaList.map((m) => ({
    url: m.url ?? '',
    kind: m.kind === 'video' ? ('video' as const) : ('image' as const),
    posterUrl: m.thumbnailUrl ?? null,
    durationSeconds: m.durationSeconds ?? null,
    width: m.width ?? null,
    height: m.height ?? null,
  }))
  const idx = Math.max(0, mediaList.indexOf(clicked))
  void viewer.openGalleryFromMediaItems(e, items, idx, 'Media', { mediaStartMode: 'fitAnchored' })
}

function openReactionPicker(event: Event, message: Message) {
  messageMenuRef.value?.hide()
  pickerMessage.value = message
  reactionPickerRef.value?.toggle(event)
}

function openMenu(event: Event, message: Message) {
  reactionPickerRef.value?.hide()
  menuMessage.value = message
  messageMenuRef.value?.toggle(event)
}

function onReactionSelect(reactionId: string) {
  if (!pickerMessage.value) return
  emit('react', pickerMessage.value, reactionId)
}

async function onCopy(message: Message) {
  try {
    await navigator.clipboard.writeText(message.body)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = message.body
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
  const isDark = colorMode.value === 'dark'
  toast.push({
    title: 'Copied',
    color: isDark ? '#F3F4F6' : '#111827',
    durationMs: 1400,
  })
}

function senderOverlay(u: MessageUser | null | undefined): MessageUser | null {
  if (!u?.id) return u ?? null
  return usersStore.overlay(u as any) as any
}

function getPrevMessageItem(list: ChatListItem[], listIndex: number): ChatListItem | null {
  for (let i = listIndex - 1; i >= 0; i--) {
    const it = list[i]!
    if (it.type === 'divider') return null
    return it
  }
  return null
}

function getNextMessageItem(list: ChatListItem[], listIndex: number): ChatListItem | null {
  for (let i = listIndex + 1; i < list.length; i++) {
    const it = list[i]!
    if (it.type === 'divider') return null
    return it
  }
  return null
}

function shouldShowIncomingAvatar(listIndex: number): boolean {
  return shouldShowGroupIncomingAvatar(props.messagesWithDividers, listIndex, {
    isGroupChat: props.isGroupChat,
    meId: props.meId,
  })
}

function shouldShowMessageMeta(item: ChatListItem, listIndex: number): boolean {
  if (item.type !== 'message') return false

  const list = props.messagesWithDividers
  const cur = item.message
  const prevItem = getPrevMessageItem(list, listIndex)
  const nextItem = getNextMessageItem(list, listIndex)

  const curMs = item.createdAtMs
  const prevSameSender =
    prevItem?.type === 'message' && prevItem.message.sender.id === cur.sender.id

  if (prevSameSender && prevItem.type === 'message') {
    const prevMs = prevItem.createdAtMs
    if (curMs > prevMs && curMs - prevMs > CLUSTER_GAP_MS) return true
  }

  if (!nextItem || nextItem.type !== 'message') return true
  if (nextItem.message.sender.id !== cur.sender.id) return true

  const nextMs = nextItem.createdAtMs
  if (nextMs > curMs && nextMs - curMs > CLUSTER_GAP_MS) return true

  return false
}

const emit = defineEmits<{
  (e: 'load-older'): void
  (e: 'load-newer'): void
  (e: 'react', message: Message, reactionId: string): void
  (e: 'reply', message: Message): void
  (e: 'info', message: Message): void
  (e: 'edit', message: Message): void
  (e: 'delete-for-me', message: Message): void
  (e: 'delete-for-all', message: Message): void
  (e: 'restore', message: Message): void
  (e: 'scroll-to-reply', messageId: string): void
}>()
</script>

<style scoped>
/*
 * Vertical padding between chat rows.
 *
 * NOTE: CSS containment (content-visibility with the "auto" value) was tried
 * here for browser-native windowing but caused a critical scroll bug: the
 * 72px intrinsic-size estimate wildly underestimates media rows (actual
 * 280-320px), making scrollHeight wrong on first open and landing users in
 * the middle of a media-heavy chat. Image wrappers carry aspect-ratio so
 * heights are predetermined; the ResizeObserver in useChatScroll handles
 * any remaining layout changes. Do NOT restore CSS containment here without
 * first solving the intrinsic-size estimate problem.
 */
.moh-chat-row {
  padding-block: 6px;
}
</style>
