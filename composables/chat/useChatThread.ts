import { computed, nextTick, ref, shallowRef, triggerRef, type ComputedRef, type Ref } from 'vue'
import type {
  FollowListUser,
  Message,
  MessageConversation,
  MessageReaction,
} from '~/types/api'
import { useChatTimeFormatting } from '~/composables/chat/useChatTimeFormatting'
import type { ComposerMediaItem, CreateMediaPayload } from '~/composables/composer/types'
import type { AuthUser } from '~/composables/useAuth'
import type { MessageConversationWithTone } from '~/composables/chat/useChatConversations'

import { useApiClient } from '~/composables/useApiClient'
import { useDestinationComposerDraft } from '~/composables/composer/useDestinationComposerDraft'
import { createChatThreadActions } from '~/composables/chat/useChatThreadActions'
import { createChatThreadLoad } from '~/composables/chat/useChatThreadLoad'
import { destinationDraftKey } from '~/utils/channels/drafts'

export type ChatMessage = Message & { __clientKey?: string }

export const MESSAGES_PANE_FADE_MS = 160

export interface UseChatThreadOptions {
  me: Ref<AuthUser | null> | ComputedRef<AuthUser | null>
  selectedConversationId: Ref<string | null>
  selectedChatKey: Ref<string | null>
  isDraftChat: ComputedRef<boolean>
  isGroupChat: ComputedRef<boolean>
  draftRecipients: Ref<FollowListUser[]>
  viewerCanStartChats: ComputedRef<boolean>
  showCantStartChat: () => Promise<void>
  prefersReducedMotion: Ref<boolean>
  messagesScroller: Ref<HTMLElement | null> | ComputedRef<HTMLElement | null>
  scrollToMessage?: (id: string) => Promise<boolean>
  composer: {
    focus: () => void
    getMedia: () => CreateMediaPayload[]
    clearMedia: () => void
    getDraftMedia?: () => ComposerMediaItem[]
    restoreDraftMedia?: (items: ComposerMediaItem[]) => void
  }
  scroll: {
    stickToBottom: (opts?: { behavior?: ScrollBehavior; ifNearBottom?: boolean; userInitiated?: boolean; reason?: string }) => boolean | void
    setAtBottomState: (next: boolean) => void
    refreshAtBottomFromScroller: () => boolean
    isAtBottom: () => boolean
  }
  conversationsApi: {
    conversations: Ref<{ primary: MessageConversationWithTone[]; requests: MessageConversationWithTone[] }>
    activeTab: Ref<'primary' | 'requests'>
    selectedConversation: ComputedRef<MessageConversationWithTone | null>
    updateConversationForMessage: (message: Message) => void
    updateConversationIsBlockedWith: (conversationId: string, isBlockedWith: boolean) => void
    mergeConversation?: (conversation: MessageConversation) => void
    refreshAllConversationTabs: () => Promise<void>
  }
  resetTyping: () => void
  emitMessagesTyping: (conversationId: string, typing: boolean) => void
  /** Select-and-route to a conversation (owned by useChatRouteSync). */
  selectConversation: (id: string, opts?: { replace?: boolean }) => Promise<void>
}

/**
 * Open-thread state for the chat page: the message list (shallowRef +
 * `triggerRef` contract), pagination in both directions, optimistic send
 * reconciliation, message actions (react / edit / delete / restore / reply),
 * jump-to-message, the sticky date divider, and the messages-pane fade.
 */
export function useChatThread(opts: UseChatThreadOptions) {
  const {
    me,
    selectedConversationId,
    selectedChatKey,
    isDraftChat,
    draftRecipients,
    viewerCanStartChats,
    showCantStartChat,
    prefersReducedMotion,
    messagesScroller,
    composer,
    scroll,
    conversationsApi,
    resetTyping,
    emitMessagesTyping,
    selectConversation,
  } = opts

  const { apiFetch, apiFetchData } = useApiClient()
  const { buildMessagesWithDividers } = useChatTimeFormatting()

  // ─── Message list state ──────────────────────────────────────────────────────

  // `shallowRef` so deep-reactive tracking doesn't walk every message body /
  // reaction / reactor on first paint. Mutations to individual rows go through
  // `mutateMessageAt` (or full-array reassignment) which calls `triggerRef` so
  // downstream computeds (`messagesWithDividers`, `latestMyMessageId`, …) stay
  // in sync.
  const messages = shallowRef<ChatMessage[]>([])

  /**
   * Replace the message at `idx` with a new object and notify dependents.
   * Returns true when the index was in-bounds. Used by reaction toggles, edits,
   * deletes — anywhere we mutate exactly one row.
   */
  function mutateMessageAt(idx: number, next: ChatMessage): boolean {
    const arr = messages.value
    if (idx < 0 || idx >= arr.length) return false
    arr[idx] = next
    triggerRef(messages)
    return true
  }

  const messagesWithDividers = computed(() => buildMessagesWithDividers(messages.value))
  const messagesNextCursor = ref<string | null>(null)
  const messagesNewerCursor = ref<string | null>(null)
  const messagesLoading = ref(false)
  const loadingOlder = ref(false)
  const loadingNewer = ref(false)
  /** The message ID the user jumped to from search. Highlighted until cleared. */
  const jumpTargetMessageId = ref<string | null>(null)
  const jumpHighlightTimer = { current: null as ReturnType<typeof setTimeout> | null }

  const sending = ref(false)
  const composerText = ref('')
  const sendError = ref<string | null>(null)

  // Message actions
  const replyToMessage = ref<Message | null>(null)
  const editingMessage = ref<Message | null>(null)
  const infoMessage = ref<Message | null>(null)
  const infoModalVisible = ref(false)
  const availableReactions = ref<MessageReaction[]>([])
  const draftKey = computed(() => {
    const identity = me.value?.id
    const destination = selectedConversationId.value ?? (isDraftChat.value && draftRecipients.value.length
      ? `recipients:${draftRecipients.value.map(user => user.id).sort().join(',')}` : null)
    return identity && destination ? destinationDraftKey({ identity, surface: 'chat', destination }) : null
  })
  function draftSnapshot() {
    return { text: composerText.value, media: composer.getDraftMedia?.() ?? [],
      reply: replyToMessage.value ? JSON.parse(JSON.stringify(replyToMessage.value)) as Message : null }
  }
  function restoreComposer(value: ReturnType<typeof draftSnapshot> | null) {
    editingMessage.value = null
    composerText.value = value?.text ?? ''
    replyToMessage.value = value?.reply ?? null
    composer.restoreDraftMedia?.(value?.media ?? [])
  }
  const drafts = useDestinationComposerDraft({ key: draftKey, snapshot: draftSnapshot,
    restore: restoreComposer, hasContent: () => !!composerText.value || !!composer.getDraftMedia?.().length,
    preserveInitial: () => false, suspended: () => !!editingMessage.value })
  const beforeEdit = { current: null as ReturnType<typeof draftSnapshot> | null }


  const messagesReady = ref(false)
  const animateMessageList = ref(true)
  const renderedChatKey = ref<string | null>(null)
  const messagesPaneState = ref<'loading' | 'fading' | 'ready'>('loading')
  let messagesPaneTimer: ReturnType<typeof setTimeout> | null = null

  function clearMessagesPaneTimer() {
    if (!messagesPaneTimer) return
    clearTimeout(messagesPaneTimer)
    messagesPaneTimer = null
  }

  function revealMessagesPaneAfterFade(key: string) {
    // Mount the messages scroller only after the loader has faded out.
    if (prefersReducedMotion.value) {
      messagesPaneState.value = 'ready'
      renderedChatKey.value = key
      return
    }
    messagesPaneState.value = 'fading'
    clearMessagesPaneTimer()
    messagesPaneTimer = setTimeout(() => {
      messagesPaneTimer = null
      messagesPaneState.value = 'ready'
      renderedChatKey.value = key
    }, MESSAGES_PANE_FADE_MS)
  }

  // ─── Animated / sending row tracking ─────────────────────────────────────────

  // Track recently-added messages so we can animate them reliably (even if
  // scroll-to-bottom happens same frame). `shallowRef` + `triggerRef` so a
  // burst of N incoming messages collapses into ONE reactive write per tick
  // instead of N Set clones + N ref reassignments.
  const recentAnimatedMessageIds = shallowRef<Set<string>>(new Set())
  const recentAnimatedTimers = new Map<string, ReturnType<typeof setTimeout>>()
  let animatedFlushScheduled = false
  function flushAnimatedSet() {
    if (animatedFlushScheduled) return
    animatedFlushScheduled = true
    void nextTick(() => {
      animatedFlushScheduled = false
      triggerRef(recentAnimatedMessageIds)
    })
  }

  function markMessageAnimated(id: string) {
    const mid = (id ?? '').trim()
    if (!mid) return
    recentAnimatedMessageIds.value.add(mid)
    flushAnimatedSet()
    const existing = recentAnimatedTimers.get(mid)
    if (existing) clearTimeout(existing)
    recentAnimatedTimers.set(mid, setTimeout(() => {
      recentAnimatedMessageIds.value.delete(mid)
      recentAnimatedTimers.delete(mid)
      flushAnimatedSet()
    }, 420))
  }

  const sendingMessageIds = ref<Set<string>>(new Set())

  function clearSendingId(localId: string) {
    const next = new Set(sendingMessageIds.value)
    next.delete(localId)
    sendingMessageIds.value = next
  }

  const latestMyMessageId = computed<string | null>(() => {
    const myId = me.value?.id ?? null
    if (!myId) return null
    for (let i = messages.value.length - 1; i >= 0; i--) {
      const m = messages.value[i]!
      if (m.sender.id === myId) return m.id
    }
    return null
  })

  // ─── Optimistic message reconciliation ───────────────────────────────────────

  /** Swap an optimistic row in-place and deduplicate any server-message that already landed elsewhere. */
  function replaceOptimisticAtIndex(list: ChatMessage[], idx: number, serverMsg: Message, localId: string): ChatMessage[] {
    const next = [...list]
    next[idx] = { ...serverMsg, __clientKey: localId } as ChatMessage
    return next.filter((m, j) => j === idx || m.id !== serverMsg.id)
  }

  function reconcileOptimisticSend(serverMsg: Message): boolean {
    const myId = me.value?.id ?? null
    if (!myId || serverMsg.sender.id !== myId || !serverMsg.conversationId) return false
    const sendingIds = sendingMessageIds.value
    if (!sendingIds.size) return false

    const list = messages.value
    for (let i = list.length - 1; i >= 0; i--) {
      const m = list[i]!
      if (!sendingIds.has(m.id) || !m.id.startsWith('local-')) continue
      if (m.conversationId !== serverMsg.conversationId) continue
      if (m.body.trim() !== serverMsg.body.trim()) continue

      messages.value = replaceOptimisticAtIndex(list, i, serverMsg, m.id)
      clearSendingId(m.id)
      return true
    }
    return false
  }

  function mergeServerMessageIntoOptimistic(localId: string, serverMsg: Message): boolean {
    const list = messages.value
    const idx = list.findIndex((m) => m.id === localId)
    if (idx === -1) return false
    messages.value = replaceOptimisticAtIndex(list, idx, serverMsg, localId)
    return true
  }

  // ─── Sticky date divider ─────────────────────────────────────────────────────

  const stickyDividerLabel = ref<string | null>(null)
  const dividerEls = new Map<string, { label: string; el: HTMLElement }>()

  function registerDividerEl(dayKey: string, label: string, el: unknown) {
    if (!dayKey) return
    if (!el || !(el instanceof HTMLElement)) {
      dividerEls.delete(dayKey)
      return
    }
    dividerEls.set(dayKey, { label, el })
  }

  // Coalesce all updateStickyDivider triggers into a single rAF read so we
  // don't force a fresh layout on every scroll / mutation / observer fire.
  let stickyRafHandle: number | null = null
  function performStickyDividerRead() {
    stickyRafHandle = null
    if (!import.meta.client) return
    const scroller = messagesScroller.value
    if (!scroller) return
    const target = scroller.scrollTop + 1
    let active: { label: string; top: number } | null = null
    for (const { label, el } of dividerEls.values()) {
      const top = el.offsetTop
      if (top <= target && (!active || top > active.top)) {
        active = { label, top }
      }
    }
    stickyDividerLabel.value = active?.label ?? null
  }

  function updateStickyDivider() {
    if (!import.meta.client) return
    if (stickyRafHandle !== null) return
    stickyRafHandle = requestAnimationFrame(performStickyDividerRead)
  }

  // ─── Thread switching / loading ──────────────────────────────────────────────

  const {
    readReady,
    loadError,
    invalidateThreadLoads,
    beginThreadSwitch,
    loadThread,
    resetThread,
    showDraftPane,
    loadOlderMessages,
    loadNewerMessages,
    scrollToJumpTarget,
  } = createChatThreadLoad({
    selectedConversationId,
    selectedChatKey,
    messagesScroller,
    scroll,
    conversationsApi,
    scrollToMessage: opts.scrollToMessage,
    apiFetch,
    messages,
    messagesNextCursor,
    messagesNewerCursor,
    messagesLoading,
    loadingOlder,
    loadingNewer,
    jumpTargetMessageId,
    jumpHighlightTimer,
    messagesReady,
    animateMessageList,
    renderedChatKey,
    messagesPaneState,
    sendingMessageIds,
    replyToMessage,
    resetTyping,
    clearMessagesPaneTimer,
    dividerEls,
    revealMessagesPaneAfterFade,
    updateStickyDivider,
  })

  // ─── Sending / message actions ─────────────────────────────────────────────

  const {
    sendCurrentMessage,
    cancelEdit,
    handleReply,
    handleInfo,
    handleReact,
    handleDeleteForMe,
    handleDeleteForAll,
    applyDeletedForAll,
    handleRestore,
    handleEdit,
    handleScrollToReply,
  } = createChatThreadActions({
    me,
    selectedConversationId,
    isDraftChat,
    draftRecipients,
    viewerCanStartChats,
    showCantStartChat,
    messagesScroller,
    composer,
    scroll,
    conversationsApi,
    emitMessagesTyping,
    selectConversation,
    scrollToMessage: opts.scrollToMessage,
    apiFetch,
    apiFetchData,
    messages,
    mutateMessageAt,
    markMessageAnimated,
    clearSendingId,
    mergeServerMessageIntoOptimistic,
    sendingMessageIds,
    sending,
    composerText,
    sendError,
    replyToMessage,
    editingMessage,
    infoMessage,
    infoModalVisible,
    availableReactions,
    draftKey,
    drafts,
    beforeEdit,
    draftSnapshot,
    restoreComposer,
    jumpTargetMessageId,
    loadThread,
    scrollToJumpTarget,
  })

  // ─── Misc ────────────────────────────────────────────────────────────────────

  /** Pre-fetch allowed reactions (used by the reaction picker). */
  function loadAvailableReactions() {
    apiFetchData<MessageReaction[]>('/messages/reactions').then((reactions) => {
      availableReactions.value = reactions ?? []
    }).catch(() => { /* ignore */ })
  }

  function teardown() {
    resetThread()
    clearMessagesPaneTimer()
    if (jumpHighlightTimer.current) { clearTimeout(jumpHighlightTimer.current); jumpHighlightTimer.current = null }
    if (stickyRafHandle !== null) {
      cancelAnimationFrame(stickyRafHandle)
      stickyRafHandle = null
    }
    for (const t of recentAnimatedTimers.values()) clearTimeout(t)
    recentAnimatedTimers.clear()
  }

  return {
    // Message list state
    messages,
    mutateMessageAt,
    messagesWithDividers,
    messagesNextCursor,
    messagesNewerCursor,
    messagesLoading,
    readReady,
    loadError,
    loadingOlder,
    loadingNewer,
    jumpTargetMessageId,
    latestMyMessageId,
    // Pane state
    messagesReady,
    animateMessageList,
    renderedChatKey,
    messagesPaneState,
    revealMessagesPaneAfterFade,
    // Composer / actions state
    sending,
    composerText,
    sendError,
    replyToMessage,
    editingMessage,
    infoMessage,
    infoModalVisible,
    availableReactions,
    // Animated / sending tracking
    recentAnimatedMessageIds,
    sendingMessageIds,
    markMessageAnimated,
    clearSendingId,
    reconcileOptimisticSend,
    // Sticky divider
    stickyDividerLabel,
    registerDividerEl,
    updateStickyDivider,
    // Thread switching / loading
    beginThreadSwitch,
    loadThread,
    resetThread,
    showDraftPane,
    invalidateThreadLoads,
    loadOlderMessages,
    loadNewerMessages,
    scrollToJumpTarget,
    // Sending
    sendCurrentMessage,
    cancelEdit,
    // Message action handlers
    handleReply,
    handleInfo,
    handleReact,
    handleDeleteForMe,
    handleDeleteForAll,
    applyDeletedForAll,
    handleRestore,
    handleEdit,
    handleScrollToReply,
    // Misc
    loadAvailableReactions,
    teardown,
  }
}
