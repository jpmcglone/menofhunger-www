<template>
  <AppPageContent class="flex min-h-0 flex-1 flex-col">
    <div v-if="!viewerIsVerified && !viewerIsPremium" class="flex min-h-0 flex-1 items-center justify-center px-4 py-12">
      <div class="w-full max-w-md">
        <div class="rounded-2xl border moh-border moh-bg p-5 shadow-sm">
          <div class="text-lg font-semibold moh-text">Verify to use chat</div>
          <div class="mt-1 text-sm moh-text-muted">
            Chat is only available for verified members.
          </div>
          <div class="mt-4 flex items-center justify-end">
            <Button as="NuxtLink" to="/tiers" label="View tiers" severity="secondary" />
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex min-h-0 flex-1 flex-col">
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
            :active-list="activeList"
            :list-loading="listLoading"
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
            :search-results="conversationSearchResults"
            :search-loading="conversationSearchLoading"
            @select="selectConversation"
            @select-to-message="(convId, msgId) => selectConversation(convId, { jumpToMessageId: msgId })"
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
                :conversation-id="marvConversationId"
                :unread-count="marvUnreadCount"
                :last-message-preview="marvLastMessagePreview"
                :typing-status="marvTypingStatus"
                @select="selectConversation"
              />
            </template>
          </ChatConversationList>

          <!-- Right column: chat for selected thread (edge-to-edge column, consistent content margins) -->
          <section v-if="showChatPane" class="h-full overflow-hidden">
            <div class="flex h-full min-h-0 flex-col">
              <ChatThreadHeader
                :conversation="selectedConversation"
                :is-draft-chat="isDraftChat"
                :draft-recipients="draftRecipients"
                :show-back="isTinyViewport && !!selectedChatKey"
                :is-marv-conversation="isSelectedConversationMarv"
                :get-conversation-title="getConversationTitle"
                @back="clearSelection({ replace: true })"
                @toggle-mute="toggleMuteConversation"
              />

              <ChatMarvChatStrip v-if="isSelectedConversationMarv && marv.isAvailable.value" />

              <ChatThreadPane
                v-if="selectedChatKey"
                ref="threadPaneRef"
                :rendered-chat-key="renderedChatKey"
                :pane-state="messagesPaneState"
                :fade-ms="MESSAGES_PANE_FADE_MS"
                :messages-ready="messagesReady"
                :messages-loading="messagesLoading"
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
                :should-show-incoming-avatar="shouldShowIncomingAvatar"
                :go-to-profile="goToProfile"
                :available-reactions="availableReactions"
                :participants="otherParticipants"
                :typing-users="typingUsersAll"
                :scroll-pill-needed="scrollPillNeeded"
                :scroll-pill-visible="scrollPillVisible"
                :scroll-pill-thumb-style="scrollPillThumbStyle"
                :show-scroll-to-bottom-button="showScrollToBottomButton"
                :pending-button-class="pendingButtonClass"
                :pending-new-label="pendingNewLabel"
                :scroll-to-bottom-button-style="scrollToBottomButtonStyle"
                @scroll="onMessagesScroll"
                @scroll-intent="markUserScrollIntent"
                @load-older="loadOlderMessages"
                @load-newer="loadNewerMessages"
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
                :auto-focus="!isTabBarMode"
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
            require-verified
            unselectable-hint="Only verified men can receive messages."
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
definePageMeta({
  layout: 'app',
  title: 'Chat',
  hideTopBar: true,
  ssr: false,
})

usePageSeo({
  title: 'Chat',
  description: 'Chat in Men of Hunger — keep conversations focused and intentional.',
  canonicalPath: '/chat',
  noindex: true,
})

import type {
  FollowListUser,
  LookupMessageConversationResponse,
  Message,
  MessageUser,
} from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { useChatBubbleShape } from '~/composables/chat/useChatBubbleShape'
import { useChatTimeFormatting } from '~/composables/chat/useChatTimeFormatting'
import { useChatTyping } from '~/composables/chat/useChatTyping'
import { useChatScroll } from '~/composables/chat/useChatScroll'
import { useChatRealtime } from '~/composables/chat/useChatRealtime'
import { useChatConversations, type MessageTone } from '~/composables/chat/useChatConversations'
import { useChatThread, MESSAGES_PANE_FADE_MS } from '~/composables/chat/useChatThread'
import { useChatRouteSync } from '~/composables/chat/useChatRouteSync'
import { useRefcountedInterest } from '~/composables/chat/useRefcountedInterest'
import ChatConversationList from '~/components/app/chat/ChatConversationList.vue'
import ChatThreadHeader from '~/components/app/chat/ChatThreadHeader.vue'
import ChatThreadPane from '~/components/app/chat/ChatThreadPane.vue'
import ChatComposerBar from '~/components/app/chat/ChatComposerBar.vue'
import ChatMessageInfoModal from '~/components/app/chat/ChatMessageInfoModal.vue'
import ChatMarvPinnedRow from '~/components/app/chat/ChatMarvPinnedRow.vue'
import ChatMarvChatStrip from '~/components/app/chat/ChatMarvChatStrip.vue'
import { userColorTier } from '~/utils/user-tier'

const { apiFetch, apiFetchData } = useApiClient()
const route = useRoute()
const { user: me, ensureLoaded } = useAuth()
const viewerIsVerified = computed(() => (me.value?.verifiedStatus ?? 'none') !== 'none')
const viewerIsPremium = computed(() => Boolean(me.value?.premium || me.value?.premiumPlus))
// Any verified or premium user can start new chats; non-premium can't start with premium recipients (API enforces).
const viewerCanStartChats = computed(() => viewerIsVerified.value || viewerIsPremium.value)
const viewerCanUseChat = computed(() => viewerIsVerified.value || viewerIsPremium.value)

const CHAT_BOOT_FADE_MS = 160
const prefersReducedMotion = ref(false)
const chatBootState = ref<'loading' | 'fading' | 'ready'>('loading')
let chatBootTimer: ReturnType<typeof setTimeout> | null = null

function clearChatBootTimer() {
  if (!chatBootTimer) return
  clearTimeout(chatBootTimer)
  chatBootTimer = null
}

function revealChatScreenAfterFade() {
  if (chatBootState.value === 'ready') return
  if (prefersReducedMotion.value) {
    chatBootState.value = 'ready'
    return
  }
  chatBootState.value = 'fading'
  clearChatBootTimer()
  chatBootTimer = setTimeout(() => {
    chatBootTimer = null
    chatBootState.value = 'ready'
  }, CHAT_BOOT_FADE_MS)
}

const scrollToBottomButtonStyle = computed<Record<string, string>>(() => ({
  bottom: 'calc(var(--moh-safe-bottom, 0px) + 1rem)',
}))

const {
  addInterest,
  removeInterest,
  addMessagesCallback,
  removeMessagesCallback,
  emitMessagesTyping,
  emitMessagesScreen,
  suppressMessageUnreadBumpsForMs,
  isSocketConnected,
} = usePresence()
const { toneClass } = useMessagesBadge()
const badgeToneClass = computed(() => toneClass.value)
const marv = useMarv()

// ─── Selection refs (shared across the chat composables) ─────────────────────

// Seed selection from URL so refresh doesn't "pop" the chat pane in after mount.
const selectedConversationId = ref<string | null>(typeof route.query.c === 'string' ? route.query.c : null)
// Two-pane layout key: either a real conversation id, 'draft' for a not-yet-created chat, or null.
const selectedChatKey = ref<string | null>(selectedConversationId.value)
const isDraftChat = computed(() => selectedChatKey.value === 'draft')
const draftRecipients = ref<FollowListUser[]>([])

// ─── Pane / composer instance refs ───────────────────────────────────────────

const threadPaneRef = ref<InstanceType<typeof ChatThreadPane> | null>(null)
const messagesScroller = computed<HTMLElement | null>(() => threadPaneRef.value?.scrollerEl ?? null)
const composerBarRef = ref<InstanceType<typeof ChatComposerBar> | null>(null)

// ─── Scroll management (via useChatScroll) ───────────────────────────────────

const scrollApi = useChatScroll({
  messagesScroller,
  selectedChatKey,
  selectedConversationId,
  prefersReducedMotion,
  me,
  onUpdateStickyDivider: () => thread.updateStickyDivider(),
  onReachedBottom: (convoId, _hadPending) => conversationsApi.markConversationReadIfVisible(convoId),
  onScrollerMountedReady: () => {
    thread.animateMessageList.value = true
    thread.scrollToJumpTarget()
  },
})

const {
  atBottom,
  scrollPillVisible,
  scrollPillNeeded,
  scrollPillThumbStyle,
  showScrollToBottomButton,
  stickToBottom,
  setAtBottomState,
  refreshAtBottomFromScroller,
  markUserScrollIntent,
  updateScrollPill,
  observeScrollerForBottomAnchoring,
  onMessagesScrollerMounted,
  onMessagesScroll: scrollEventHandler,
} = scrollApi

// ─── Conversation lists (via useChatConversations) ───────────────────────────

const conversationsApi = useChatConversations({
  me,
  marv,
  selectedConversationId,
  atBottom,
})

const {
  activeTab,
  conversations,
  selectedConversation,
  activeList,
  nextCursor,
  listLoading,
  loadingMore,
  showRequestsBadge,
  requestsBadgeText,
  fetchConversations,
  loadMoreConversations,
  refreshAllConversationTabs,
  setTab,
  patchConversation,
  removeConversationFromList,
  updateConversationParticipantRead,
  updateConversationUnread,
  updateConversationForMessage,
  markConversationReadIfVisible,
  getMessageTier,
  getDirectUser,
  getConversationTitle,
  getConversationPreview,
  getConversationLastMessageTier,
  conversationDotClass,
  conversationUnreadHighlightClass,
  lastVisibleMessageSnapshot,
  conversationSearchResults,
  conversationSearchLoading,
  handleConversationSearchQuery,
  marvConversationId,
  marvUnreadCount,
  marvLastMessagePreview,
  isSelectedConversationMarv,
  toggleMuteConversation,
} = conversationsApi

const isGroupChat = computed(() => {
  if (selectedConversation.value?.type === 'group') {
    return (selectedConversation.value.participants?.length ?? 0) >= 3
  }
  if (isDraftChat.value) {
    return draftRecipients.value.length + 1 >= 3
  }
  return false
})

const { confirm } = useAppConfirm()

async function showCantStartChat() {
  await confirm({
    header: "Can't start this chat",
    message: 'You need a verified account to send messages.',
    confirmLabel: 'Got it',
    confirmSeverity: 'primary',
    showCancel: false,
  })
}

// ─── Open thread (via useChatThread) ─────────────────────────────────────────

const thread = useChatThread({
  me,
  selectedConversationId,
  selectedChatKey,
  isDraftChat,
  isGroupChat,
  draftRecipients,
  viewerCanStartChats,
  showCantStartChat,
  prefersReducedMotion,
  messagesScroller,
  scrollToMessageInList: (id, opts) => threadPaneRef.value?.scrollToMessageId(id, opts) ?? false,
  composer: {
    focus: () => { composerBarRef.value?.focus() },
    getMedia: () => composerBarRef.value?.getMedia() ?? [],
    clearMedia: () => { composerBarRef.value?.clearMedia() },
  },
  scroll: {
    stickToBottom,
    setAtBottomState,
    refreshAtBottomFromScroller,
    isAtBottom: scrollApi.isAtBottom,
    updateScrollPill,
  },
  conversationsApi: {
    conversations,
    activeTab,
    selectedConversation,
    updateConversationForMessage,
    updateConversationIsBlockedWith: conversationsApi.updateConversationIsBlockedWith,
    refreshAllConversationTabs,
  },
  resetTyping: () => typingApi.resetTyping(),
  emitMessagesTyping,
  selectConversation: (id, opts) => routeSync.selectConversation(id, opts),
})

const {
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
  shouldShowIncomingAvatar,
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
} = thread

// ─── Typing indicators (via useChatTyping) ───────────────────────────────────

const typingApi = useChatTyping({
  me,
  conversations,
  selectedConversation,
  selectedConversationId,
  composerText,
  emitMessagesTyping,
})

const {
  setRemoteTyping,
  typingUsersByConversationId,
  typingUsersAll,
  typingUsersTotalCount,
} = typingApi

const marvTypingStatus = computed<'thinking' | 'typing' | null>(() => {
  const cid = marvConversationId.value
  if (!cid) return null
  const typingUsers = typingUsersByConversationId.value[cid] ?? []
  const marvEntry = typingUsers.find((u) => u.userId === marv.marvUserId.value)
  if (!marvEntry) return null
  return marvEntry.status === 'thinking' || marvEntry.status === 'typing' ? marvEntry.status : 'typing'
})

watch(
  () => typingUsersTotalCount.value,
  () => {
    if (!import.meta.client) return
    if (!selectedChatKey.value) return
    if (!atBottom.value) return
    stickToBottom({ behavior: 'auto', ifNearBottom: true })
  },
  { flush: 'post' },
)

// ─── URL ↔ selection sync (via useChatRouteSync) ─────────────────────────────

const routeSync = useChatRouteSync({
  selectedConversationId,
  selectedChatKey,
  draftRecipients,
  viewerCanUseChat,
  marv,
  ensureAuthLoaded: ensureLoaded,
  emitMessagesScreen,
  cacheCurrentChatScrollPosition: scrollApi.cacheCurrentChatScrollPosition,
  conversationsApi: { refreshAllConversationTabs },
  thread: {
    jumpTargetMessageId,
    beginThreadSwitch: thread.beginThreadSwitch,
    loadThread: thread.loadThread,
    resetThread: thread.resetThread,
    showDraftPane: thread.showDraftPane,
  },
})

const { selectConversation, clearSelection, openDraftChatWithRecipients } = routeSync

// ─── Pending-new button (derived from unreadCount + atBottom) ────────────────

const pendingNewCount = computed(() => {
  if (atBottom.value) return 0
  const conversation = selectedConversation.value
  if (!conversation) return 0
  return Math.max(0, Math.floor(Number(conversation.unreadCount) || 0))
})

const pendingNewTier = computed((): MessageTone => {
  const count = pendingNewCount.value
  if (count <= 0) return 'normal'
  const conversation = selectedConversation.value
  if (!conversation) return 'normal'
  if (conversation.unreadTone) return conversation.unreadTone
  const myId = me.value?.id ?? null
  for (let i = messages.value.length - 1; i >= 0; i--) {
    const msg = messages.value[i]
    if (!msg) continue
    if (msg.sender.id !== myId) return getMessageTier(msg)
  }
  return getConversationLastMessageTier(conversation)
})

const pendingButtonClass = computed(() => {
  // When there are unread/new messages below, keep the tier color treatment.
  if (pendingNewCount.value > 0) {
    if (pendingNewTier.value === 'organization') return 'bg-[var(--moh-org)] text-white'
    if (pendingNewTier.value === 'premium') return 'bg-[var(--moh-premium)] text-white'
    if (pendingNewTier.value === 'verified') return 'bg-[var(--moh-verified)] text-white'
    return 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
  }
  // Otherwise, offer a neutral "scroll to bottom" affordance.
  return 'bg-gray-100 text-gray-700 border border-gray-200 dark:bg-zinc-900 dark:text-gray-200 dark:border-zinc-700'
})

const pendingNewLabel = computed(() => {
  const n = Math.max(0, Math.floor(Number(pendingNewCount.value) || 0))
  if (n > 0) return `${n} New ${n === 1 ? 'Message' : 'Messages'}`
  return 'Scroll to bottom'
})

function onPendingButtonClick() {
  // Eagerly mark at-bottom so the pending button disappears before the smooth scroll completes.
  setAtBottomState(true)
  stickToBottom({ behavior: 'smooth', userInitiated: true })
  const convoId = selectedConversationId.value
  if (convoId) {
    void nextTick().then(() => {
      requestAnimationFrame(() => markConversationReadIfVisible(convoId))
    })
  }
}

function onMessagesScroll() {
  // Capture pending count BEFORE the composable updates atBottom (which zeroes the computed).
  const hadPending = pendingNewCount.value > 0
  scrollEventHandler({ hadPending })
}

// ─── Layout ──────────────────────────────────────────────────────────────────

const isTabBarMode = useHydratedMediaQuery('(max-width: 639px)')

const { isTinyViewport, showListPane, showDetailPane: showChatPane, gridStyle } = useTwoPaneLayout(selectedChatKey, {
  // Cap left at 22rem but never more than 45% so the chat panel is always at least as wide.
  leftCols: 'min(22rem, 45%)',
  rightCols: '1fr',
  minWidth: 1024,
  // Messages should not collapse panes due to short viewport height.
  // Only collapse when the viewport is actually narrow.
  minHeight: 0,
})

// ─── Header / bubble presentation ────────────────────────────────────────────

const { formatListTime, formatMessageTime, formatMessageTimeFull } = useChatTimeFormatting()
const { bubbleShapeClass } = useChatBubbleShape()

const composerDirectUser = computed(() => {
  if (selectedConversation.value?.type === 'direct') {
    return getDirectUser(selectedConversation.value)
  }
  return null
})

const lastMessage = computed(() => messages.value[messages.value.length - 1] ?? null)
const lastMessageIsMine = computed(() => !!lastMessage.value && lastMessage.value.sender.id === me.value?.id)

// Exclude self from read receipts only when the final message is ours — there's no point
// showing "I've read my own message". When the final message belongs to someone else, include
// self so others can see we've read theirs.
const otherParticipants = computed(() => {
  const all = selectedConversation.value?.participants ?? []
  if (lastMessageIsMine.value) {
    return all.filter((p) => p.user.id !== me.value?.id)
  }
  return all
})

const ORG_CHAT_SILVER_FILLED_BUBBLE_CLASS = 'bg-[rgba(49,54,67,0.65)] backdrop-blur-sm text-white'
const ORG_CHAT_SILVER_OUTLINE_BUBBLE_CLASS = 'bg-transparent border border-[rgba(49,54,67,0.96)] text-gray-900 dark:text-gray-100'

function bubbleClass(m: Message) {
  const isMe = Boolean(m.sender.id && m.sender.id === me.value?.id)

  // Tier color always corresponds to the sender's tier.
  const tier = userColorTier(m.sender as Parameters<typeof userColorTier>[0])

  if (isMe) {
    // Outgoing: frosted glass — semi-transparent tier color + backdrop blur.
    if (tier === 'organization') return ORG_CHAT_SILVER_FILLED_BUBBLE_CLASS
    if (tier === 'premium') return 'bg-[rgba(var(--moh-premium-rgb),0.72)] backdrop-blur-sm text-white'
    if (tier === 'verified') return 'bg-[rgba(var(--moh-verified-rgb),0.72)] backdrop-blur-sm text-white'
    return 'bg-gray-500/60 backdrop-blur-sm text-white dark:bg-zinc-600/60'
  }

  // Incoming: outlined bubble.
  if (tier === 'organization') return ORG_CHAT_SILVER_OUTLINE_BUBBLE_CLASS
  if (tier === 'premium') return 'bg-transparent border border-[rgba(var(--moh-premium-rgb),0.55)] text-gray-900 dark:text-gray-100'
  if (tier === 'verified') return 'bg-transparent border border-[rgba(var(--moh-verified-rgb),0.55)] text-gray-900 dark:text-gray-100'
  return 'bg-transparent border border-gray-200 text-gray-900 dark:border-zinc-600 dark:text-gray-100'
}

function goToProfile(user: MessageUser | null | undefined) {
  const username = (user?.username ?? '').trim()
  if (!username) return
  void navigateTo(`/u/${username}`)
}

// ─── Selected-conversation actions ───────────────────────────────────────────

async function acceptSelectedConversation() {
  if (!selectedConversationId.value) return
  await conversationsApi.acceptConversation(selectedConversationId.value)
}

async function deleteSelectedConversation() {
  const id = selectedConversationId.value
  if (!id) return
  removeConversationFromList(id)
  await clearSelection({ replace: true })
  await apiFetch(`/messages/conversations/${id}`, { method: 'DELETE' }).catch(() => {
    // Non-fatal: list state is already correct locally; server will eventually sync.
  })
}

// ─── New-chat dialog ─────────────────────────────────────────────────────────

const newDialogVisible = ref(false)
const newConversationError = ref<string | null>(null)
const newDialogRecipients = ref<FollowListUser[]>([])

function openNewDialog() {
  if (!viewerCanStartChats.value) {
    void showCantStartChat()
    return
  }
  newDialogVisible.value = true
  newDialogRecipients.value = []
  newConversationError.value = null
}

watch(newDialogVisible, (open) => {
  if (!open) newDialogRecipients.value = []
})

async function createConversation() {
  // Start a draft chat or jump to an existing conversation.
  if (newDialogRecipients.value.length === 0) return
  if (!viewerCanStartChats.value) {
    void showCantStartChat()
    return
  }
  newConversationError.value = null

  // Marv can only be in a 1:1 DM, never a group chat.
  const marvId = marv.marvUserId.value
  if (marvId && newDialogRecipients.value.some((u) => u.id === marvId) && newDialogRecipients.value.length > 1) {
    newConversationError.value = 'Marv can only be in a 1-on-1 conversation, not a group chat.'
    return
  }
  try {
    const recipients = [...newDialogRecipients.value]
    newDialogVisible.value = false
    const res = await apiFetchData<LookupMessageConversationResponse['data']>('/messages/lookup', {
      method: 'POST',
      body: { user_ids: recipients.map((u) => u.id) },
    })
    const conversationId = res?.conversationId ?? null
    if (conversationId) {
      await selectConversation(conversationId, { replace: true })
      return
    }

    await openDraftChatWithRecipients(recipients)
  } catch (e) {
    newConversationError.value = getApiErrorMessage(e) || 'Failed to send message.'
  }
}

// ─── Viewport-gated presence subscription ────────────────────────────────────
//
// `ChatConversationList` emits `presence-visible(userId, visible)` from its
// `useViewportIdsObserver`, and we feed those events into a refcount +
// per-frame coalesced flush via `useRefcountedInterest`. The composable
// owns: dedupe (same userId across multiple convos), 0↔1 edge detection,
// per-frame batching of add/remove, and final teardown on unmount.
const presenceInterest = useRefcountedInterest({
  add: (ids) => addInterest(ids),
  remove: (ids) => removeInterest(ids),
})

function onConversationRowPresenceVisible(userId: string, visible: boolean) {
  presenceInterest.setVisible(userId, visible)
}

// ─── Realtime wiring ─────────────────────────────────────────────────────────

const meId = computed(() => me.value?.id ?? null)

const { register: registerRealtime, teardown: teardownRealtime } = useChatRealtime({
  selectedConversationId,
  meId,
  atBottom,
  addMessagesCallback,
  removeMessagesCallback,
  handlers: {
    onNewMessage(msg, isSelected, wasAtBottom) {
      updateConversationForMessage(msg)
      if (!isSelected) return
      const shouldStick = wasAtBottom
      setAtBottomState(shouldStick)
      const reconciled = thread.reconcileOptimisticSend(msg)
      const exists = messages.value.some((m) => m.id === msg.id)
      if (!exists) {
        messages.value = [...messages.value, msg]
        const myOwnUnreconciled = !reconciled && msg.sender.id === me.value?.id && sendingMessageIds.value.size > 0
        if (!myOwnUnreconciled) thread.markMessageAnimated(msg.id)
      }
      if (shouldStick) {
        void nextTick().then(() => {
          stickToBottom({ behavior: 'auto', ifNearBottom: true, includeExtraFrame: true })
        })
      }
      const isIncoming = msg.sender.id !== me.value?.id
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && shouldStick) {
        if (isIncoming) suppressMessageUnreadBumpsForMs(900)
        // Routes through the throttled helper: bursts of incoming messages
        // collapse to one POST per 250ms per conversation; the optimistic
        // local zeroing keeps the badge accurate in between.
        markConversationReadIfVisible(msg.conversationId)
      }
    },

    onReaction(msg, isSelected) {
      if (!isSelected) return
      const idx = messages.value.findIndex((m) => m.id === msg.id)
      if (idx !== -1) {
        const existing = messages.value[idx]!
        thread.mutateMessageAt(idx, { ...existing, reactions: msg.reactions ?? [] })
      }
      if (infoMessage.value?.id === msg.id) {
        infoMessage.value = { ...infoMessage.value, reactions: msg.reactions ?? [] }
      }
    },

    onMessageEdited(msg, isSelected) {
      if (!isSelected) return
      const idx = messages.value.findIndex((m) => m.id === msg.id)
      if (idx !== -1) {
        thread.mutateMessageAt(idx, { ...messages.value[idx]!, body: msg.body, editedAt: msg.editedAt ?? null })
      }
      if (infoMessage.value?.id === msg.id) {
        infoMessage.value = { ...infoMessage.value, body: msg.body, editedAt: msg.editedAt ?? null }
      }
    },

    onMessageDeletedForAll(convoId, messageId, isSelected) {
      if (isSelected) {
        const idx = messages.value.findIndex((m) => m.id === messageId)
        if (idx !== -1) {
          thread.mutateMessageAt(idx, { ...messages.value[idx]!, deletedForAll: true, body: '' })
        }
      }

      patchConversation(convoId, (c) => {
        if (c.lastMessage?.id !== messageId) return c
        if (isSelected) {
          const snap = lastVisibleMessageSnapshot(messages.value)
          if (snap) {
            return { ...c, lastMessage: snap, lastMessageAt: snap.createdAt }
          }
          return { ...c, lastMessage: null, lastMessageAt: null }
        }
        return {
          ...c,
          lastMessage: c.lastMessage
            ? { ...c.lastMessage, body: 'Message deleted' }
            : null,
        }
      })
    },

    onTyping(convoId, userId, typing, status) {
      if (route.path !== '/chat') return
      setRemoteTyping(convoId, userId, typing, status)
    },

    onRead(convoId, userId, lastReadAt) {
      if (userId && userId !== me.value?.id) {
        if (lastReadAt) updateConversationParticipantRead(convoId, userId, lastReadAt)
        return
      }
      updateConversationUnread(convoId, 0)
    },
  },
})

// ─── Scroller observers ──────────────────────────────────────────────────────

// Scroll pill resize observer — tracks scroller resizes to update the pill position.
let scrollPillRo: ResizeObserver | null = null
watch(
  messagesScroller,
  (el, prev) => {
    if (!import.meta.client) return
    if (!scrollPillRo) scrollPillRo = new ResizeObserver(() => updateScrollPill())
    if (prev) scrollPillRo.unobserve(prev)
    if (el) {
      scrollPillRo.observe(el)
      observeScrollerForBottomAnchoring(el)
      requestAnimationFrame(() => { updateScrollPill() })
    }
  },
  { flush: 'post' },
)

// ─── Lifecycle ───────────────────────────────────────────────────────────────

onMounted(() => {
  try {
    prefersReducedMotion.value = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)
  } catch {
    // ignore
  }
  ;(async () => {
    // Ensure auth is loaded before checking verified status — avoids missing the early-return
    // when the auth composable hasn't resolved yet at mount time.
    try { await ensureLoaded() } catch { /* ignore */ }

    // Marv: load the viewer's Marv state (preferences, credits, marv user id) and
    // subscribe to `marv:credits-updated` so the credits chip in the chat strip /
    // pinned row stays live without polling. Safe to call regardless of premium —
    // the API gates non-premium responses, and the pinned row component renders a
    // CTA in that case.
    try { await marv.ensureLoaded() } catch { /* ignore */ }
    marv.startRealtime()

    if (!viewerCanUseChat.value) return

    registerRealtime()
    emitMessagesScreen(true, selectedConversationId.value)

    // Pre-fetch allowed reactions (used by the reaction picker)
    thread.loadAvailableReactions()

    await fetchConversations('primary', { forceRefresh: true }).catch(() => { /* ignore */ })

    await routeSync.handleInitialQueryParams()

    if (selectedConversationId.value) {
      try { await selectConversation(selectedConversationId.value, { replace: true }) } catch { /* ignore */ }
    } else if (!isTinyViewport.value) {
      // Desktop two-pane mode: auto-select the first non-Marv conversation so the
      // right pane is never blank. On mobile we leave nothing selected so the user
      // sees the list first (tap to open a chat).
      const marvId = marv.marvUserId.value
      const first = conversations.value.primary.find((c) => {
        if (!marvId) return true
        return !c.participants.some((p) => p.user.id === marvId)
      }) ?? null
      if (first) {
        try { await selectConversation(first.id, { replace: true }) } catch { /* ignore */ }
      }
    }
    revealChatScreenAfterFade()

    // Presence subscriptions are driven by ChatConversationList's
    // IntersectionObserver — rows in the viewport call addInterest, rows that
    // scroll out call removeInterest. There's no eager bulk seed here.
    // (See `onConversationRowPresenceVisible`.)

    // Fetch requests tab after revealing so the screen appears quickly.
    await fetchConversations('requests', { forceRefresh: true }).catch(() => { /* ignore */ })

    if (selectedConversationId.value) {
      const inPrimary = conversations.value.primary.some((c) => c.id === selectedConversationId.value)
      const inRequests = conversations.value.requests.some((c) => c.id === selectedConversationId.value)
      if (inRequests && !inPrimary) activeTab.value = 'requests'
    } else if (conversations.value.primary.length === 0 && conversations.value.requests.length > 0) {
      activeTab.value = 'requests'
    }

    // Ensure screen reveals even if everything above failed.
    revealChatScreenAfterFade()
  })()
})

onBeforeUnmount(() => {
  clearChatBootTimer()
  conversationsApi.teardown()
  thread.teardown()
  scrollApi.teardown()
  if (scrollPillRo) {
    scrollPillRo.disconnect()
    scrollPillRo = null
  }
  teardownRealtime()
  marv.stopRealtime()
  // `presenceInterest` cleans itself up via its own `onBeforeUnmount` hook
  // (see `useRefcountedInterest`).
  emitMessagesScreen(false)
})

watch(isSocketConnected, (connected) => {
  if (!viewerCanUseChat.value) return
  if (connected && route.path === '/chat') emitMessagesScreen(true, selectedConversationId.value)
})

watch(
  () => selectedChatKey.value,
  () => {
    if (!import.meta.client) return
    if (!viewerCanUseChat.value) return
    // Keep focus on non-mobile layouts; when the tab bar is visible, avoid opening the keyboard.
    if (isTabBarMode.value) return
    void nextTick(() => composerBarRef.value?.focus())
  },
  { flush: 'post' },
)

watch(
  renderedChatKey,
  (key) => {
    if (!import.meta.client) return
    if (!key) return
    void nextTick().then(() => {
      const el = messagesScroller.value
      if (el) onMessagesScrollerMounted(el, key)
    })
  },
  { flush: 'post' },
)

watch(
  () => chatBootState.value,
  (state) => {
    if (!import.meta.client) return
    if (state !== 'ready') return
    if (!renderedChatKey.value) return
    // Deep-link/refresh path can set renderedChatKey before the chat shell mounts.
    // Re-apply initial scroller snap when the shell becomes ready.
    void nextTick().then(() => {
      const el = messagesScroller.value
      if (el) onMessagesScrollerMounted(el, renderedChatKey.value)
    })
  },
  { flush: 'post' },
)
</script>
