<template>
  <div class="relative flex-1 min-h-0 flex flex-col">
    <div
      v-if="renderedChatKey"
      :key="renderedChatKey"
      ref="scrollerEl"
      data-chat-scroller="1"
      class="min-h-0 flex-1 overflow-y-auto py-4 moh-chat-scroll-hide"
      @scroll="emit('scroll')"
      @wheel.passive="emit('scrollIntent')"
      @touchstart.passive="emit('scrollIntent')"
      @touchmove.passive="emit('scrollIntent')"
    >
      <ChatMessageList
        ref="chatMessageListRef"
        :messages-ready="messagesReady"
        :messages-loading="messagesLoading"
        :messages-next-cursor="messagesNextCursor"
        :messages-newer-cursor="messagesNewerCursor"
        :loading-older="loadingOlder"
        :loading-newer="loadingNewer"
        :jump-target-message-id="jumpTargetMessageId"
        :is-draft-chat="isDraftChat"
        :messages-count="messagesCount"
        :messages-with-dividers="messagesWithDividers"
        :sticky-divider-label="stickyDividerLabel"
        :recent-animated-message-ids="recentAnimatedMessageIds"
        :sending-message-ids="sendingMessageIds"
        :latest-my-message-id="latestMyMessageId"
        :animate-rows="animateRows"
        :is-group-chat="isGroupChat"
        :me-id="meId"
        :scroller-el="scrollerEl"
        :format-message-time="formatMessageTime"
        :format-message-time-full="formatMessageTimeFull"
        :bubble-shape-class="bubbleShapeClass"
        :bubble-class="bubbleClass"
        :register-divider-el="registerDividerEl"
        :should-show-incoming-avatar="shouldShowIncomingAvatar"
        :go-to-profile="goToProfile"
        :available-reactions="availableReactions"
        :participants="participants"
        @load-older="emit('loadOlder')"
        @load-newer="emit('loadNewer')"
        @react="(message, reactionId) => emit('react', message, reactionId)"
        @reply="emit('reply', $event)"
        @info="emit('info', $event)"
        @edit="emit('edit', $event)"
        @delete-for-me="emit('deleteForMe', $event)"
        @delete-for-all="emit('deleteForAll', $event)"
        @restore="emit('restore', $event)"
        @scroll-to-reply="emit('scrollToReply', $event)"
      />

      <div class="w-full px-4">
        <AppTypingIndicator :users="typingUsers" verb="typing" />
      </div>
    </div>
    <div
      v-else
      key="loading"
      class="h-full flex items-center justify-center transition-opacity ease-out"
      :class="paneState === 'fading' ? 'opacity-0' : 'opacity-100'"
      :style="{ transitionDuration: `${fadeMs}ms` }"
    >
      <AppLogoLoader />
    </div>
    <!-- Custom thin pill scrollbar (native scrollbar hidden) -->
    <div
      v-if="renderedChatKey && scrollPillNeeded"
      class="pointer-events-none absolute right-1 top-2 bottom-2 z-10 w-[4px] transition-opacity duration-200 ease-out"
      :class="scrollPillVisible ? 'opacity-90' : 'opacity-0'"
      aria-hidden="true"
    >
      <div
        class="w-full rounded-full transition-[height,transform] duration-150 ease-out will-change-transform"
        :style="scrollPillThumbStyle"
      />
    </div>
    <Transition name="moh-fade">
      <button
        v-if="showScrollToBottomButton"
        type="button"
        class="absolute left-1/2 bottom-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-lg cursor-pointer"
        :class="pendingButtonClass"
        :style="scrollToBottomButtonStyle"
        @click="emit('pendingClick')"
      >
        <Icon name="tabler:arrow-down" class="text-xs" aria-hidden="true" />
        <span class="tabular-nums">{{ pendingNewLabel }}</span>
      </button>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { Message, MessageParticipant, MessageReaction, MessageUser } from '~/types/api'
import type { ChatListItem } from '~/composables/chat/useChatTimeFormatting'
import type { TypingUserDisplay } from '~/composables/chat/useChatTyping'
// Sibling file — explicit import because Nuxt registers `~/components/app/chat/*`
// as `App*` prefixed names (`AppChatMessageList`), which does not satisfy the
// `<ChatMessageList>` tag Vue looks up at runtime.
import ChatMessageList from './ChatMessageList.vue'

defineProps<{
  renderedChatKey: string | null
  paneState: 'loading' | 'fading' | 'ready'
  fadeMs: number
  messagesReady: boolean
  messagesLoading: boolean
  messagesNextCursor: string | null
  messagesNewerCursor: string | null
  loadingOlder: boolean
  loadingNewer: boolean
  jumpTargetMessageId: string | null
  isDraftChat: boolean
  messagesCount: number
  messagesWithDividers: ChatListItem[]
  stickyDividerLabel: string | null
  recentAnimatedMessageIds: Set<string>
  sendingMessageIds: Set<string>
  latestMyMessageId: string | null
  animateRows: boolean
  isGroupChat: boolean
  meId: string | null
  formatMessageTime: (iso: string) => string
  formatMessageTimeFull: (iso: string) => string
  bubbleShapeClass: (message: Message) => string
  bubbleClass: (m: Message) => string
  registerDividerEl: (dayKey: string, label: string, el: unknown) => void
  shouldShowIncomingAvatar: (m: Message, index: number) => boolean
  goToProfile: (u: MessageUser | null | undefined) => void
  availableReactions: MessageReaction[]
  participants: MessageParticipant[]
  typingUsers: TypingUserDisplay[]
  scrollPillNeeded: boolean
  scrollPillVisible: boolean
  scrollPillThumbStyle: Record<string, string>
  showScrollToBottomButton: boolean
  pendingButtonClass: string
  pendingNewLabel: string
  scrollToBottomButtonStyle: Record<string, string>
}>()

const emit = defineEmits<{
  scroll: []
  scrollIntent: []
  loadOlder: []
  loadNewer: []
  react: [message: Message, reactionId: string]
  reply: [message: Message]
  info: [message: Message]
  edit: [message: Message]
  deleteForMe: [message: Message]
  deleteForAll: [message: Message]
  restore: [message: Message]
  scrollToReply: [messageId: string]
  pendingClick: []
}>()

/** The scroll container — exposed so the page's useChatScroll can drive it. */
const scrollerEl = ref<HTMLElement | null>(null)
const chatMessageListRef = ref<{ scrollToMessageId: (id: string, opts?: { align?: 'start' | 'center' | 'end' | 'auto' }) => boolean } | null>(null)

defineExpose({
  scrollerEl,
  scrollToMessageId: (id: string, opts?: { align?: 'start' | 'center' | 'end' | 'auto' }) =>
    chatMessageListRef.value?.scrollToMessageId(id, opts) ?? false,
})
</script>

<style scoped>
.moh-chat-scroll-hide {
  scrollbar-width: thin;
  scrollbar-color: rgba(128, 128, 128, 0.35) transparent;
}

.moh-chat-scroll-hide::-webkit-scrollbar {
  width: 6px;
}

.moh-chat-scroll-hide::-webkit-scrollbar-track {
  background: transparent;
}

.moh-chat-scroll-hide::-webkit-scrollbar-thumb {
  background-color: rgba(128, 128, 128, 0.35);
  border-radius: 3px;
}

.moh-chat-scroll-hide::-webkit-scrollbar-thumb:hover {
  background-color: rgba(128, 128, 128, 0.6);
}
</style>
