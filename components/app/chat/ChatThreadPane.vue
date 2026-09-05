<template>
  <div class="relative flex-1 min-h-0 flex flex-col">
    <div
      v-if="renderedChatKey"
      :key="renderedChatKey"
      ref="scrollerEl"
      data-chat-scroller="1"
      class="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain py-4 moh-chat-scroll-hide"
      @scroll="emit('scroll')"
    >
      <ChatMessageList
        ref="chatMessageListRef"
        :scroller-element="scrollerEl"
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
        :format-message-time="formatMessageTime"
        :format-message-time-full="formatMessageTimeFull"
        :bubble-shape-class="bubbleShapeClass"
        :bubble-class="bubbleClass"
        :register-divider-el="registerDividerEl"
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
    </div>

    <!-- Typing indicator: lives outside the scroll container so it never
         shifts messages. Floats over the bottom-left of the chat area. -->
    <Transition name="moh-fade">
      <div
        v-if="renderedChatKey && typingUsers.length > 0"
        class="pointer-events-none absolute bottom-0 left-0 z-[5] px-5 pb-2 translate-y-[3px]"
        aria-live="polite"
      >
        <AppTypingIndicator :users="typingUsers" verb="typing" :hover-preview="false" size="compact" />
      </div>
    </Transition>

    <div
      v-if="!renderedChatKey"
      key="loading"
      class="h-full flex items-center justify-center transition-opacity ease-out"
      :class="paneState === 'fading' ? 'opacity-0' : 'opacity-100'"
      :style="{ transitionDuration: `${fadeMs}ms` }"
    >
      <AppLogoLoader />
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
  goToProfile: (u: MessageUser | null | undefined) => void
  availableReactions: MessageReaction[]
  participants: MessageParticipant[]
  typingUsers: TypingUserDisplay[]
  showScrollToBottomButton: boolean
  pendingButtonClass: string
  pendingNewLabel: string
  scrollToBottomButtonStyle: Record<string, string>
}>()

const emit = defineEmits<{
  scroll: []
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

const chatMessageListRef = ref<InstanceType<typeof ChatMessageList> | null>(null)
async function scrollToMessage(id: string) {
  return await chatMessageListRef.value?.scrollToMessage(id) ?? false
}
defineExpose({ scrollerEl, scrollToMessage })
</script>

<style scoped>
.moh-chat-scroll-hide {
  scrollbar-width: thin;
  scrollbar-color: rgba(128, 128, 128, 0.35) transparent;
  /*
   * Disable Chrome's scroll-anchor heuristic on this element.
   *
   * Without this, when images/content load above the current viewport, Chrome
   * adjusts scrollTop upward (with a fractional value) to keep its chosen
   * "anchor element" stable. That adjustment fires a scroll event; our rAF
   * handler then sees scrollTop != scrollHeight - clientHeight and sets
   * atBottom = false — which blocks the ResizeObserver from re-pinning to
   * the true bottom. Our ResizeObserver + atBottom flag give us precise
   * bottom-anchoring, so we don't need the browser's auto-anchoring at all.
   */
  overflow-anchor: none;
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
