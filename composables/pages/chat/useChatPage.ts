import type { CallSession, CallType, FollowListUser } from '~/types/api'
import { useChatTyping } from '~/composables/chat/useChatTyping'
import { useChatScroll } from '~/composables/chat/useChatScroll'
import { useChatConversations } from '~/composables/chat/useChatConversations'
import { useChatThread } from '~/composables/chat/useChatThread'
import { useChatScreenPresence } from '~/composables/chat/useChatScreenPresence'
import { useChatRouteSync } from '~/composables/chat/useChatRouteSync'
import type ChatThreadPane from '~/components/app/chat/ChatThreadPane.vue'
import { useCallSession } from '~/composables/calls/useCallSession'
import { provideChatActiveCall } from '~/composables/chat/useChatActiveCall'
import type ChatComposerBar from '~/components/app/chat/ChatComposerBar.vue'
import { useChatPageView, useChatPageLifecycle } from './useChatPageView'

/**
 * Script state for `/chat`.
 */
export function useChatPage() {
  const state = useChatPageState()
  const view = useChatPageView(state)
  const lifecycle = useChatPageLifecycle({ ...state, ...view })
  return { ...state, ...view, ...lifecycle }
}

/**
 * Chat access, boot fade, realtime interest, conversations, calls, the open thread,
 * typing, and route sync.
 */
export function useChatPageState() {
  usePageSeo({
    title: 'Chat',
    description: 'Chat in Men of Hunger — keep conversations focused and intentional.',
    canonicalPath: '/chat',
    noindex: true,
  })

  const { apiFetch, apiFetchData } = useApiClient()
  const route = useRoute()
  const { user: me, ensureLoaded } = useAuth()
  const viewerIsVerified = computed(() => (me.value?.verifiedStatus ?? 'none') !== 'none')
  const viewerIsPremium = computed(() => Boolean(me.value?.premium || me.value?.premiumPlus))
  const viewerIsAdmin = computed(() => Boolean(me.value?.siteAdmin))
  // Verified users can start new chats with mutuals; Premium can DM any verified member. API enforces the mutual rule.
  const viewerCanStartChats = computed(() => viewerIsVerified.value || viewerIsPremium.value || viewerIsAdmin.value)
  // Any authenticated user can use chat — unverified users can read/reply in admin-initiated threads.
  const viewerCanUseChat = computed(() => Boolean(me.value?.id))

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
    addCallsCallback,
    removeCallsCallback,
    emitMessagesTyping,
    emitMessagesScreen: emitRawMessagesScreen,
    suppressMessageUnreadBumpsForMs,
    isSocketConnected,
  } = usePresence()
  const emitMessagesScreen = useChatScreenPresence(emitRawMessagesScreen)
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
    onUpdateStickyDivider: () => thread.updateStickyDivider(),
    onReachedBottom: (convoId) => conversationsApi.markConversationReadIfVisible(convoId),
    onScrollerMountedReady: () => {
      thread.animateMessageList.value = true
      thread.scrollToJumpTarget()
    },
  })

  const {
    atBottom,
    showScrollToBottomButton,
    stickToBottom,
    setAtBottomState,
    refreshAtBottomFromScroller,
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
    listFailed,
    listRefreshing,
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

  // ─── Calling ─────────────────────────────────────────────────────────────────

  const callSession = useCallSession()
  provideChatActiveCall(computed(() => selectedConversation.value?.activeCall ?? null))

  function onStartCall(type: CallType) {
    const c = selectedConversation.value
    if (!c) return
    const participants = c.participants.map((p) => p.user)
    const callee = c.type === 'direct' ? participants.find((u) => u.id !== me.value?.id) : null
    void callSession.startCall(c.id, type, { participants, calleeId: callee?.id ?? null })
  }

  function onJoinCall(call: Pick<CallSession, 'id' | 'type'>) {
    const participants = selectedConversation.value?.participants.map((p) => p.user) ?? []
    void callSession.joinCall(call, { participants })
  }

  const isGroupChat = computed(() => {
    const type = selectedConversation.value?.type
    if (type === 'group' || type === 'crew_wall') return true
    if (isDraftChat.value) return draftRecipients.value.length + 1 >= 3
    return false
  })

  const { confirm } = useAppConfirm()

  async function showCantStartChat() {
    await confirm({
      header: "Can't start this chat",
      message: 'You need a verified account to send messages. Verified members can message people who follow them back; Premium members can message anyone.',
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
    scrollToMessage: (id) => threadPaneRef.value?.scrollToMessage(id) ?? Promise.resolve(false),
    composer: {
      focus: () => { composerBarRef.value?.focus() },
      getMedia: () => composerBarRef.value?.getMedia() ?? [],
      clearMedia: () => { composerBarRef.value?.clearMedia() },
      getDraftMedia: () => composerBarRef.value?.getDraftMedia() ?? [],
      restoreDraftMedia: items => { composerBarRef.value?.restoreDraftMedia(items) },
    },
    scroll: {
      stickToBottom,
      setAtBottomState,
      refreshAtBottomFromScroller,
      isAtBottom: scrollApi.isAtBottom,
    },
    conversationsApi: {
      conversations,
      activeTab,
      selectedConversation,
      updateConversationForMessage,
      updateConversationIsBlockedWith: conversationsApi.updateConversationIsBlockedWith,
      mergeConversation: conversationsApi.mergeConversation,
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

  const marvTypingStatus = computed<'typing' | null>(() => {
    const cid = marvConversationId.value
    if (!cid) return null
    const typingUsers = typingUsersByConversationId.value[cid] ?? []
    const marvEntry = typingUsers.find((u) => u.userId === marv.marvUserId.value)
    return marvEntry ? 'typing' : null
  })

  watch(
    () => typingUsersTotalCount.value,
    () => {
      if (!import.meta.client) return
      if (!selectedChatKey.value) return
      if (!atBottom.value) return
      stickToBottom({ behavior: 'auto', ifNearBottom: true, reason: 'typing-indicator-change' })
    },
    { flush: 'post' },
  )

  // ─── URL ↔ selection sync (via useChatRouteSync) ─────────────────────────────

  const routeSync = useChatRouteSync({
    selectedConversationId,
    selectedChatKey,
    draftRecipients,
    viewerCanUseChat,
    viewerIsAdmin,
    marv,
    ensureAuthLoaded: ensureLoaded,
    emitMessagesScreen,
    conversationsApi: { refreshAllConversationTabs },
    thread: {
      jumpTargetMessageId,
      beginThreadSwitch: thread.beginThreadSwitch,
      loadThread: thread.loadThread,
      resetThread: thread.resetThread,
      showDraftPane: thread.showDraftPane,
    },
  })

  return {
    apiFetch,
    apiFetchData,
    route,
    me,
    ensureLoaded,
    viewerIsAdmin,
    viewerCanStartChats,
    viewerCanUseChat,
    CHAT_BOOT_FADE_MS,
    prefersReducedMotion,
    chatBootState,
    clearChatBootTimer,
    revealChatScreenAfterFade,
    scrollToBottomButtonStyle,
    addInterest,
    removeInterest,
    addMessagesCallback,
    removeMessagesCallback,
    addCallsCallback,
    removeCallsCallback,
    suppressMessageUnreadBumpsForMs,
    isSocketConnected,
    emitMessagesScreen,
    badgeToneClass,
    marv,
    selectedConversationId,
    selectedChatKey,
    isDraftChat,
    draftRecipients,
    threadPaneRef,
    messagesScroller,
    composerBarRef,
    scrollApi,
    atBottom,
    showScrollToBottomButton,
    stickToBottom,
    setAtBottomState,
    onMessagesScrollerMounted,
    scrollEventHandler,
    conversationsApi,
    activeTab,
    conversations,
    selectedConversation,
    activeList,
    nextCursor,
    listLoading,
    listFailed,
    listRefreshing,
    loadingMore,
    showRequestsBadge,
    requestsBadgeText,
    fetchConversations,
    loadMoreConversations,
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
    callSession,
    onStartCall,
    onJoinCall,
    isGroupChat,
    showCantStartChat,
    thread,
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
    setRemoteTyping,
    typingUsersByConversationId,
    typingUsersAll,
    marvTypingStatus,
    routeSync,
  }
}

export type ChatPageContext = ReturnType<typeof useChatPage>
