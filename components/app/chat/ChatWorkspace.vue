<template>
  <AppPageContent class="flex h-full min-h-0 flex-1 flex-col">
    <div class="flex min-h-0 flex-1 flex-col">
      <!-- Data-first: don't mount the chat screen until initial data is ready.
           When ready, fade OUT the loading screen, then mount the chat screen (no chat animation). -->
      <div
        v-if="chatBootState !== 'ready'"
        class="flex min-h-0 flex-1 items-center justify-center px-4 py-12 transition-opacity ease-out"
        :class="chatBootState === 'fading' ? 'opacity-0' : 'opacity-100'"
        :style="{ transitionDuration: `${CHAT_BOOT_FADE_MS}ms` }"
      >
        <AppLogoLoader />
      </div>

      <div
        v-else
        class="grid min-h-0 flex-1"
        :class="isTinyViewport ? 'grid-cols-1' : ''"
        :style="gridStyle"
      >
          <!-- Left column: thread list -->
          <ChatConversationList
            v-if="showListPane"
            :is-tiny-viewport="isTinyViewport"
            :can-start-new="viewerCanStartChats"
            :active-tab="activeTab"
            :active-list="props.listOnly && !props.fullPage ? activeList.filter(conversation => conversation.type !== 'crew_wall') : activeList"
            :list-loading="listLoading"
            :list-refreshing="listRefreshing"
            :show-requests-badge="showRequestsBadge"
            :requests-badge-text="requestsBadgeText"
            :badge-tone-class="badgeToneClass"
            :selected-conversation-id="selectedConversationId"
            :next-cursor="nextCursor"
            :loading-more="loadingMore"
            :typing-users-by-conversation-id="typingUsersByConversationId"
            :format-list-time="formatListTime"
            :get-conversation-title="getConversationTitle"
            :get-conversation-preview="getConversationPreview"
            :get-direct-user="getDirectUser"
            :conversation-unread-highlight-class="conversationUnreadHighlightClass"
            :conversation-dot-class="conversationDotClass"
            :search-results="props.listOnly && !props.fullPage ? conversationSearchResults?.filter(conversation => conversation.type !== 'crew_wall') ?? null : conversationSearchResults"
            :search-loading="conversationSearchLoading"
            @select="chooseConversation"
            @select-to-message="chooseConversation"
            @set-tab="setTab"
            @open-new="openNewDialog"
            @open-blocks="navigateTo('/settings/blocked')"
            @load-more="loadMoreConversations"
            @search-query="handleConversationSearchQuery"
            @presence-visible="onConversationRowPresenceVisible"
          >
            <template #pinned>
              <ChatMarvPinnedRow
                :is-selected="isSelectedConversationMarv"
                :select-new="props.listOnly"
                :conversation-id="marvConversationId"
                :unread-count="marvUnreadCount"
                :last-message-preview="marvLastMessagePreview"
                :typing-status="marvTypingStatus"
                @select="chooseConversation"
              />
            </template>
          </ChatConversationList>

          <!-- Right column: chat for selected thread (edge-to-edge column, consistent content margins) -->
          <section v-if="showChatPane" class="h-full overflow-hidden">
            <div class="flex h-full min-h-0 flex-col">
              <ChatThreadHeader
                :compact="props.embedded && !props.fullPage"
                :conversation="selectedConversation"
                :is-draft-chat="isDraftChat"
                :draft-recipients="draftRecipients"
                :show-back="(props.fullPage ? isNarrowFullPage : !props.embedded && isTinyViewport) && !!selectedChatKey"
                :is-marv-conversation="isSelectedConversationMarv || props.openMarv"
                :get-conversation-title="getConversationTitle"
                @back="props.fullPage ? navigateTo('/chat') : clearSelection({ replace: true })"
                @toggle-mute="toggleMuteConversation"
                @start-call="onStartCall"
                @join-call="onJoinCall"
                @show-call="callSession.minimized.value = false"
              >
                <template v-if="props.embedded" #dock-controls><slot name="controls" /></template>
              </ChatThreadHeader>

              <ChatCallBanner
                v-if="selectedConversation && selectedConversation.type !== 'crew_wall'"
                :call="selectedConversation.activeCall ?? null"
                :conversation="selectedConversation"
                :me-id="me?.id ?? null"
                @join="onJoinCall"
                @show="callSession.minimized.value = false"
              />

              <ChatMarvChatStrip v-if="(isSelectedConversationMarv || props.openMarv) && marv.isAvailable.value" />

              <ChatThreadPane
                v-if="selectedChatKey"
                ref="threadPaneRef"
                :at-bottom="atBottom"
                :rendered-chat-key="renderedChatKey"
                :pane-state="messagesPaneState"
                :fade-ms="MESSAGES_PANE_FADE_MS"
                :messages-ready="messagesReady"
                :messages-loading="messagesLoading"
                :load-error="chat.thread.loadError.value"
                :messages-next-cursor="messagesNextCursor"
                :messages-newer-cursor="messagesNewerCursor"
                :loading-older="loadingOlder"
                :loading-newer="loadingNewer"
                :jump-target-message-id="jumpTargetMessageId"
                :is-draft-chat="isDraftChat"
                :messages-count="messages.length"
                :messages-with-dividers="messagesWithDividers"
                :sticky-divider-label="stickyDividerLabel"
                :recent-animated-message-ids="recentAnimatedMessageIds"
                :sending-message-ids="sendingMessageIds"
                :latest-my-message-id="latestMyMessageId"
                :animate-rows="animateMessageList"
                :is-group-chat="isGroupChat"
                :me-id="me?.id ?? null"
                :format-message-time="formatMessageTime"
                :format-message-time-full="formatMessageTimeFull"
                :bubble-shape-class="bubbleShapeClass"
                :bubble-class="bubbleClass"
                :register-divider-el="registerDividerEl"
                :go-to-profile="goToProfile"
                :available-reactions="availableReactions"
                :participants="otherParticipants"
                :typing-users="typingUsersAll"
                :show-scroll-to-bottom-button="showScrollToBottomButton"
                :pending-button-class="pendingButtonClass"
                :pending-new-label="pendingNewLabel"
                :scroll-to-bottom-button-style="scrollToBottomButtonStyle"
                @scroll="onMessagesScroll"
                @load-older="loadOlderMessages"
                @load-newer="loadNewerMessages"
                @retry="retryThreadLoad"
                @react="handleReact"
                @reply="handleReply"
                @info="handleInfo"
                @edit="handleEdit"
                @delete-for-me="handleDeleteForMe"
                @delete-for-all="handleDeleteForAll"
                @restore="handleRestore"
                @scroll-to-reply="handleScrollToReply"
                @pending-click="onPendingButtonClick"
              />
              <div v-else class="flex-1 flex items-center justify-center px-4 py-12">
                <div class="w-full max-w-lg">
                  <div class="rounded-2xl border moh-border moh-bg p-5 shadow-sm">
                    <div class="text-lg font-semibold moh-text">Select a conversation</div>
                    <div class="mt-1 text-sm moh-text-muted">
                      Pick a conversation from the left, or start a new one.
                    </div>
                  </div>
                </div>
              </div>

              <ChatComposerBar
                v-if="selectedChatKey"
                ref="composerBarRef"
                v-model="composerText"
                :conversation="selectedConversation"
                :direct-user="composerDirectUser"
                :send-error="sendError"
                :editing-message="editingMessage"
                :reply-to-message="replyToMessage"
                :sending="sending"
                :auto-focus="!props.embedded && !isTabBarMode"
                @send="sendCurrentMessage"
                @cancel-edit="cancelEdit"
                @cancel-reply="replyToMessage = null"
                @accept="acceptSelectedConversation"
                @delete-conversation="deleteSelectedConversation"
              />
            </div>
          </section>
    </div>

    <ChatMessageInfoModal
      v-model="infoModalVisible"
      :message="infoMessage"
      :participants="selectedConversation?.participants ?? []"
    />


    <Dialog
      v-model:visible="newDialogVisible"
      modal
      header="New chat"
      :style="{ width: '34rem', maxWidth: '92vw', minHeight: '22rem' }"
    >
      <div class="space-y-3">
        <AppFormField label="Recipients">
          <AppUserSearchPicker
            v-model="newDialogRecipients"
            multiple
            show="all"
            :require-verified="!viewerIsAdmin"
            :unselectable-hint="viewerIsAdmin ? '' : 'Only verified men can receive messages.'"
            placeholder="Search for a username or display name…"
            autofocus
          />
        </AppFormField>
        <AppInlineAlert v-if="newConversationError" severity="danger">{{ newConversationError }}</AppInlineAlert>
      </div>
      <template #footer>
        <Button label="Cancel" text severity="secondary" @click="newDialogVisible = false" />
        <Button
          label="Start chat"
          :disabled="!viewerCanStartChats || newDialogRecipients.length === 0"
          @click="createConversation"
        >
          <template #icon>
            <Icon name="tabler:arrow-right" aria-hidden="true" />
          </template>
        </Button>
      </template>
    </Dialog>

  </div>
</AppPageContent>
</template>

<script setup lang="ts">
import { MESSAGES_PANE_FADE_MS } from '~/composables/chat/useChatThread'
import ChatConversationList from '~/components/app/chat/ChatConversationList.vue'
import ChatThreadHeader from '~/components/app/chat/ChatThreadHeader.vue'
import ChatThreadPane from '~/components/app/chat/ChatThreadPane.vue'
import ChatCallBanner from '~/components/app/chat/ChatCallBanner.vue'
import ChatComposerBar from '~/components/app/chat/ChatComposerBar.vue'
import ChatMessageInfoModal from '~/components/app/chat/ChatMessageInfoModal.vue'
import ChatMarvPinnedRow from '~/components/app/chat/ChatMarvPinnedRow.vue'
import ChatMarvChatStrip from '~/components/app/chat/ChatMarvChatStrip.vue'
import { useChatPage } from '~/composables/pages/chat/useChatPage'
import type { FollowListUser } from '~/types/api'

const props = withDefaults(defineProps<{ embedded?: boolean; fullPage?: boolean; conversationId?: string | null; jumpMessageId?: string | null; initialRecipients?: FollowListUser[]; openMarv?: boolean; listOnly?: boolean; visible?: boolean; focused?: boolean }>(), { visible: true, focused: true, conversationId: null, jumpMessageId: null, initialRecipients: () => [] })
const emit = defineEmits<{ select: [id: string, jumpMessageId?: string]; draft: [recipients: FollowListUser[]]; state: [state: { conversationId: string | null; atBottom: boolean; title: string; dockable: boolean; marv: boolean }] }>()

const isNarrowFullPage = useHydratedMediaQuery('(max-width: 1023px)')
const chat = useChatPage({ embedded: props.embedded, conversationId: props.conversationId, openMarv: props.openMarv, initialRecipients: props.initialRecipients, listOnly: props.listOnly, jumpMessageId: toRef(props, 'jumpMessageId'), visible: toRef(props, 'visible'), focused: toRef(props, 'focused'), pickConversation: id => emit('select', id), pickDraft: recipients => emit('draft', recipients) })
const {
  me,
  viewerIsAdmin,
  viewerCanStartChats,
  CHAT_BOOT_FADE_MS,
  chatBootState,
  scrollToBottomButtonStyle,
  badgeToneClass,
  marv,
  selectedConversationId,
  selectedChatKey,
  isDraftChat,
  draftRecipients,
  threadPaneRef,
  composerBarRef,
  atBottom,
  showScrollToBottomButton,
  activeTab,
  selectedConversation,
  activeList,
  nextCursor,
  listLoading,
  listRefreshing,
  loadingMore,
  showRequestsBadge,
  requestsBadgeText,
  loadMoreConversations,
  setTab,
  getDirectUser,
  getConversationTitle,
  getConversationPreview,
  conversationDotClass,
  conversationUnreadHighlightClass,
  conversationSearchResults,
  conversationSearchLoading,
  handleConversationSearchQuery,
  marvConversationId,
  marvUnreadCount,
  marvLastMessagePreview,
  isSelectedConversationMarv,
  toggleMuteConversation,
  callSession,
  onStartCall,
  onJoinCall,
  isGroupChat,
  messages,
  messagesWithDividers,
  messagesNextCursor,
  messagesNewerCursor,
  messagesLoading,
  loadingOlder,
  loadingNewer,
  jumpTargetMessageId,
  latestMyMessageId,
  messagesReady,
  animateMessageList,
  renderedChatKey,
  messagesPaneState,
  sending,
  composerText,
  sendError,
  replyToMessage,
  editingMessage,
  infoMessage,
  infoModalVisible,
  availableReactions,
  recentAnimatedMessageIds,
  sendingMessageIds,
  stickyDividerLabel,
  registerDividerEl,
  loadOlderMessages,
  loadNewerMessages,
  sendCurrentMessage,
  cancelEdit,
  handleReply,
  handleInfo,
  handleReact,
  handleDeleteForMe,
  handleDeleteForAll,
  handleRestore,
  handleEdit,
  handleScrollToReply,
  typingUsersByConversationId,
  typingUsersAll,
  marvTypingStatus,
  selectConversation,
  clearSelection,
  pendingButtonClass,
  pendingNewLabel,
  onPendingButtonClick,
  onMessagesScroll,
  isTabBarMode,
  isTinyViewport,
  showListPane,
  showChatPane,
  gridStyle,
  formatListTime,
  formatMessageTime,
  formatMessageTimeFull,
  bubbleShapeClass,
  composerDirectUser,
  otherParticipants,
  bubbleClass,
  goToProfile,
  acceptSelectedConversation,
  deleteSelectedConversation,
  newDialogVisible,
  newConversationError,
  newDialogRecipients,
  openNewDialog,
  createConversation,
  onConversationRowPresenceVisible,
} = chat
defineExpose({ chat })

onMounted(() => { if (!props.embedded && useRoute().query.new === '1') openNewDialog() })
watch(() => props.jumpMessageId, messageId => {
  if (messageId && selectedConversationId.value && chatBootState.value === 'ready') void selectConversation(selectedConversationId.value, { jumpToMessageId: messageId }).catch(() => undefined)
})

function retryThreadLoad() {
  if (selectedConversationId.value) void chat.thread.loadThread(selectedConversationId.value, { refresh: true }).catch(() => undefined)
}

function chooseConversation(id: string, jumpMessageId?: string) {
  if (props.listOnly) emit('select', id, jumpMessageId)
  else void selectConversation(id, { jumpToMessageId: jumpMessageId }).catch(() => undefined)
}
watch([selectedConversationId, atBottom, chat.isLatestWindow, selectedConversation, isSelectedConversationMarv], () => emit('state', { conversationId: selectedConversationId.value, atBottom: atBottom.value && chat.isLatestWindow.value, title: selectedConversation.value ? getConversationTitle(selectedConversation.value) : props.openMarv ? 'MARV' : props.initialRecipients?.map(recipient => recipient.name || recipient.username || 'User').join(', ') || 'Chat', dockable: selectedConversation.value?.type !== 'crew_wall', marv: Boolean(props.openMarv || isSelectedConversationMarv.value) }), { immediate: true, flush: 'sync' })
</script>

<style scoped>
:deep(.moh-chat-dock-header) { min-height: 64px; }
</style>
