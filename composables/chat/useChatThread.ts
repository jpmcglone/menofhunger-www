import { computed, nextTick, ref, shallowRef, triggerRef, type ComputedRef, type Ref } from 'vue'
import type {
  CreateMessageConversationResponse,
  FollowListUser,
  Message,
  MessageConversation,
  MessageReaction,
  MessageUser,
  SendMessageResponse,
} from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { useChatTimeFormatting } from '~/composables/chat/useChatTimeFormatting'
import type { CreateMediaPayload } from '~/composables/composer/types'
import type { AuthUser } from '~/composables/useAuth'
import type { MessageConversationWithTone } from '~/composables/chat/useChatConversations'

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
  /** Delegates to the virtualized list's scrollToIndex (via ChatThreadPane). */
  scrollToMessageInList: (id: string, opts?: { align?: 'start' | 'center' | 'end' | 'auto' }) => boolean
  composer: {
    focus: () => void
    getMedia: () => CreateMediaPayload[]
    clearMedia: () => void
  }
  scroll: {
    stickToBottom: (opts?: { behavior?: ScrollBehavior; ifNearBottom?: boolean; includeExtraFrame?: boolean; userInitiated?: boolean }) => boolean | void
    setAtBottomState: (next: boolean) => void
    refreshAtBottomFromScroller: () => boolean
    isAtBottom: () => boolean
    updateScrollPill: () => void
  }
  conversationsApi: {
    conversations: Ref<{ primary: MessageConversationWithTone[]; requests: MessageConversationWithTone[] }>
    activeTab: Ref<'primary' | 'requests'>
    selectedConversation: ComputedRef<MessageConversationWithTone | null>
    updateConversationForMessage: (message: Message) => void
    updateConversationIsBlockedWith: (conversationId: string, isBlockedWith: boolean) => void
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
    isGroupChat,
    draftRecipients,
    viewerCanStartChats,
    showCantStartChat,
    prefersReducedMotion,
    messagesScroller,
    scrollToMessageInList,
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
  let jumpHighlightTimer: ReturnType<typeof setTimeout> | null = null

  const sending = ref(false)
  const composerText = ref('')
  const sendError = ref<string | null>(null)

  // Message actions
  const replyToMessage = ref<Message | null>(null)
  const editingMessage = ref<Message | null>(null)
  const infoMessage = ref<Message | null>(null)
  const infoModalVisible = ref(false)
  const availableReactions = ref<MessageReaction[]>([])

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

  function shouldShowIncomingAvatar(message: Message, index: number) {
    if (!isGroupChat.value) return false
    if (message.sender.id === me.value?.id) return false
    const next = messages.value[index + 1]
    if (!next) return true
    return next.sender.id !== message.sender.id
  }

  // ─── Thread switching / loading ──────────────────────────────────────────────

  let threadLoadSeq = 0
  let loadOlderReqSeq = 0
  let loadNewerReqSeq = 0

  /** Invalidate any in-flight thread loads (used when selection changes/clears). */
  function invalidateThreadLoads() {
    threadLoadSeq++
  }

  /**
   * Reset per-thread UI state ahead of loading a different conversation.
   * Selection refs and URL writes are owned by `useChatRouteSync`.
   */
  function beginThreadSwitch(switchOpts?: { jumpToMessageId?: string | null }) {
    invalidateThreadLoads()
    clearMessagesPaneTimer()
    dividerEls.clear()
    messagesReady.value = false
    animateMessageList.value = false
    renderedChatKey.value = null
    messagesPaneState.value = 'loading'
    scroll.setAtBottomState(true)
    loadingOlder.value = false
    loadingNewer.value = false
    messagesNewerCursor.value = null
    if (jumpHighlightTimer) { clearTimeout(jumpHighlightTimer); jumpHighlightTimer = null }
    jumpTargetMessageId.value = switchOpts?.jumpToMessageId ?? null
    resetTyping()
    sendingMessageIds.value = new Set()
  }

  /** Fetch the thread for `id` — either the latest window or one centered on a target message. */
  async function loadThread(id: string, loadOpts?: { jumpToMessageId?: string | null }) {
    const reqSeq = ++threadLoadSeq
    const targetMsgId = loadOpts?.jumpToMessageId ?? null
    messagesLoading.value = true
    try {
      if (targetMsgId) {
        // Jump to a specific message — fetch a window centered on it.
        const res = await apiFetch<{
          messages: Message[]
          olderCursor: string | null
          newerCursor: string | null
          targetMessageId: string
        }>(`/messages/conversations/${id}/messages/around/${targetMsgId}`)
        if (reqSeq !== threadLoadSeq || selectedConversationId.value !== id) return
        messages.value = res.data?.messages ?? []
        messagesNextCursor.value = res.data?.olderCursor ?? null
        messagesNewerCursor.value = res.data?.newerCursor ?? null
        // atBottom false so the pending button isn't shown (we're in mid-history)
        scroll.setAtBottomState(!messagesNewerCursor.value)
      } else {
        // Normal latest-messages fetch.
        const res = await apiFetch<{ conversation: MessageConversation; messages: Message[] }>(
          `/messages/conversations/${id}`,
          { query: { limit: 50 } },
        )
        if (reqSeq !== threadLoadSeq || selectedConversationId.value !== id) return
        const list = res.data?.messages ?? []
        messages.value = [...list].reverse()
        messagesNextCursor.value = res.pagination?.nextCursor ?? null
        messagesNewerCursor.value = null
        if (typeof res.data?.conversation?.isBlockedWith === 'boolean') {
          conversationsApi.updateConversationIsBlockedWith(id, res.data.conversation.isBlockedWith)
        }
      }
      messagesReady.value = true
      messagesLoading.value = false
      if (selectedChatKey.value === id) {
        revealMessagesPaneAfterFade(id)
      }
    } finally {
      if (reqSeq === threadLoadSeq) {
        messagesLoading.value = false
        if (!messagesReady.value) messagesReady.value = true
      }
    }
  }

  /** Full thread reset, used when the selection is cleared. */
  function resetThread() {
    invalidateThreadLoads()
    loadingOlder.value = false
    loadingNewer.value = false
    if (jumpHighlightTimer) { clearTimeout(jumpHighlightTimer); jumpHighlightTimer = null }
    jumpTargetMessageId.value = null
    clearMessagesPaneTimer()
    dividerEls.clear()
    messages.value = []
    messagesNextCursor.value = null
    messagesNewerCursor.value = null
    messagesReady.value = false
    animateMessageList.value = false
    renderedChatKey.value = null
    messagesPaneState.value = 'loading'
    scroll.setAtBottomState(true)
    resetTyping()
    sendingMessageIds.value = new Set()
    replyToMessage.value = null
    messagesLoading.value = false
  }

  /** Show the (empty) draft pane for a not-yet-created conversation. */
  function showDraftPane() {
    messagesReady.value = true
    animateMessageList.value = false
    messagesPaneState.value = 'ready'
    renderedChatKey.value = 'draft'
  }

  async function loadOlderMessages() {
    if (!selectedConversationId.value || !messagesNextCursor.value || loadingOlder.value) return
    const reqSeq = ++loadOlderReqSeq
    const conversationId = selectedConversationId.value
    const cursor = messagesNextCursor.value
    const scroller = messagesScroller.value
    const previousScrollHeight = scroller?.scrollHeight ?? 0
    const previousScrollTop = scroller?.scrollTop ?? 0
    loadingOlder.value = true
    try {
      const res = await apiFetch<Message[]>(`/messages/conversations/${conversationId}/messages`, {
        query: { cursor, limit: 50 },
      })
      // If the user switched threads (or another newer older-messages request ran), ignore this response.
      if (reqSeq !== loadOlderReqSeq || selectedConversationId.value !== conversationId) return
      const list = res.data ?? []
      const ordered = [...list].reverse()
      messages.value = [...ordered, ...messages.value]
      messagesNextCursor.value = res.pagination?.nextCursor ?? null
      await nextTick()
      if (!scroller || messagesScroller.value !== scroller) return
      const grewBy = scroller.scrollHeight - previousScrollHeight
      if (grewBy > 0) {
        scroller.scrollTop = previousScrollTop + grewBy
        scroll.refreshAtBottomFromScroller()
        updateStickyDivider()
        scroll.updateScrollPill()
      }
    } finally {
      if (reqSeq === loadOlderReqSeq) loadingOlder.value = false
    }
  }

  async function loadNewerMessages() {
    if (!selectedConversationId.value || !messagesNewerCursor.value || loadingNewer.value) return
    const reqSeq = ++loadNewerReqSeq
    const conversationId = selectedConversationId.value
    const cursor = messagesNewerCursor.value
    loadingNewer.value = true
    try {
      const res = await apiFetch<Message[]>(`/messages/conversations/${conversationId}/messages/newer`, {
        query: { cursor, limit: 50 },
      })
      if (reqSeq !== loadNewerReqSeq || selectedConversationId.value !== conversationId) return
      const list = res.data ?? []
      messages.value = [...messages.value, ...list]
      const newerCursor = (res as { pagination?: { newerCursor?: string | null } }).pagination?.newerCursor ?? null
      messagesNewerCursor.value = newerCursor
      if (!newerCursor) {
        // We've caught up to the present — the chat is now live at the bottom.
        await nextTick()
        scroll.setAtBottomState(scroll.isAtBottom())
      }
    } finally {
      if (reqSeq === loadNewerReqSeq) loadingNewer.value = false
    }
  }

  /**
   * Scroll the scroller to the jump-target message row and briefly highlight it.
   *
   * With the virtualized message list, the off-screen target row may not exist
   * in the DOM yet, so we delegate to the virtualizer's `scrollToIndex` (via
   * `scrollToMessageInList`). The virtualizer will mount the target row, after
   * which the parent's scroll-position helpers stay accurate.
   *
   * Falls back to a direct DOM lookup when the ref isn't ready (defensive — the
   * old non-virtualized rendering still worked that way).
   */
  function scrollToJumpTarget() {
    const targetId = jumpTargetMessageId.value
    if (!targetId || !messagesScroller.value) return

    const used = scrollToMessageInList(targetId, { align: 'center' })
    if (!used) {
      const el = messagesScroller.value.querySelector<HTMLElement>(`[data-message-id="${targetId}"]`)
      if (!el) return
      const scrollerRect = messagesScroller.value.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      const offset = elRect.top - scrollerRect.top - scrollerRect.height / 2 + elRect.height / 2
      messagesScroller.value.scrollTop += offset
    }

    // The virtualizer scrolls asynchronously (it may need a frame to mount the
    // target row). Wait one frame before refreshing scroll-anchor state so the
    // `atBottom` signal stays accurate.
    void nextTick().then(() => {
      scroll.refreshAtBottomFromScroller()
      scroll.updateScrollPill()
    })
    // Clear the highlight after 2.5s so the flash is visible but not permanent.
    if (jumpHighlightTimer) clearTimeout(jumpHighlightTimer)
    jumpHighlightTimer = setTimeout(() => {
      jumpHighlightTimer = null
      jumpTargetMessageId.value = null
    }, 2500)
  }

  // ─── Sending ─────────────────────────────────────────────────────────────────

  async function sendCurrentMessage() {
    // If in edit mode, submit the edit instead of sending a new message.
    if (editingMessage.value) {
      await handleEditSubmit()
      return
    }
    const hasText = composerText.value.trim().length > 0
    const hasMedia = composer.getMedia().length > 0
    if ((!hasText && !hasMedia) || sending.value) return
    sendError.value = null
    sending.value = true
    try {
      if (!selectedConversationId.value && isDraftChat.value) {
        await sendFirstMessage()
      } else {
        await sendMessage()
      }
    } finally {
      sending.value = false
    }
  }

  function cancelEdit() {
    composerText.value = ''
    editingMessage.value = null
  }

  /** Draft path: creates the conversation and sends the first message. */
  async function sendFirstMessage() {
    if (!viewerCanStartChats.value) {
      void showCantStartChat()
      return
    }
    const body = composerText.value
    const mediaPayload = composer.getMedia()
    try {
      const res = await apiFetchData<CreateMessageConversationResponse['data']>('/messages/conversations', {
        method: 'POST',
        body: {
          user_ids: draftRecipients.value.map((u) => u.id),
          title: undefined,
          body,
          ...(mediaPayload.length > 0 ? { media: mediaPayload } : {}),
        },
      })
      composerText.value = ''
      composer.clearMedia()
      await conversationsApi.refreshAllConversationTabs()
      const conversationId = res?.conversationId
      if (conversationId) {
        const inPrimary = conversationsApi.conversations.value.primary.some((c) => c.id === conversationId)
        const inRequests = conversationsApi.conversations.value.requests.some((c) => c.id === conversationId)
        conversationsApi.activeTab.value = inRequests && !inPrimary ? 'requests' : 'primary'
        await selectConversation(conversationId, { replace: true })
      }
    } catch (e) {
      sendError.value = getApiErrorMessage(e) || 'Failed to send message.'
    }
  }

  /** Normal send path: optimistically adds the message and reconciles with the server response. */
  async function sendMessage() {
    // Snapshot the conversation ID now — the user could switch threads while the request is in flight.
    const conversationId = selectedConversationId.value
    if (!conversationId) return
    const my = me.value
    if (!my) return

    const body = composerText.value
    const mediaPayload = composer.getMedia()
    let localId: string | null = null
    try {
      try { emitMessagesTyping(conversationId, false) } catch { /* ignore */ }

      // Add the optimistic row.
      localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const optimisticSender: MessageUser = {
        id: my.id,
        username: my.username ?? null,
        name: my.name ?? null,
        premium: Boolean(my.premium),
        premiumPlus: Boolean(my.premiumPlus),
        isOrganization: Boolean((my as { isOrganization?: boolean }).isOrganization),
        stewardBadgeEnabled: my.stewardBadgeEnabled ?? true,
        verifiedStatus: (my.verifiedStatus ?? 'none') as 'none' | 'identity' | 'manual',
        avatarUrl: my.avatarUrl ?? null,
      }
      const replySnippet = replyToMessage.value
        ? { id: replyToMessage.value.id, senderUsername: replyToMessage.value.sender.username, bodyPreview: replyToMessage.value.body.slice(0, 200) }
        : null
      const capturedReplyToId = replyToMessage.value?.id ?? null
      messages.value = [
        ...messages.value,
        { id: localId, createdAt: new Date().toISOString(), body, conversationId, sender: optimisticSender, reactions: [], deletedForMe: false, deletedForAll: false, editedAt: null, replyTo: replySnippet, media: [], __clientKey: localId } as ChatMessage,
      ]
      sendingMessageIds.value = new Set([...sendingMessageIds.value, localId])
      composerText.value = ''
      composer.clearMedia()
      replyToMessage.value = null
      await nextTick()
      scroll.stickToBottom({ behavior: 'smooth' })

      const res = await apiFetchData<SendMessageResponse['data']>(
        `/messages/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          body: {
            body,
            ...(capturedReplyToId ? { replyToId: capturedReplyToId } : {}),
            ...(mediaPayload.length > 0 ? { media: mediaPayload } : {}),
          },
        },
      )

      // Guard: user switched conversations while this was in flight — remove the stale optimistic row.
      if (selectedConversationId.value !== conversationId) {
        messages.value = messages.value.filter((m) => m.id !== localId)
        clearSendingId(localId)
        return
      }

      const msg = res?.message
      if (msg) {
        // Replace the optimistic row in-place (stable key), or append if it was already reconciled away.
        if (!mergeServerMessageIntoOptimistic(localId, msg)) {
          if (!messages.value.some((m) => m.id === msg.id)) {
            messages.value = [...messages.value, msg]
            markMessageAnimated(msg.id)
          }
        }
        clearSendingId(localId)
        conversationsApi.updateConversationForMessage(msg)
        await nextTick()
        scroll.stickToBottom({ behavior: 'smooth' })
      } else {
        // API returned no message — remove the optimistic row and restore the composer.
        messages.value = messages.value.filter((m) => m.id !== localId)
        clearSendingId(localId)
        composerText.value = body
      }

      if (conversationsApi.selectedConversation.value?.viewerStatus === 'pending') {
        await conversationsApi.refreshAllConversationTabs()
      }
    } catch (e) {
      if (localId) {
        messages.value = messages.value.filter((m) => m.id !== localId)
        clearSendingId(localId)
      }
      if (body && !composerText.value.trim()) composerText.value = body
      sendError.value = getApiErrorMessage(e) || 'Failed to send message.'
    }
  }

  // ─── Message action handlers ─────────────────────────────────────────────────

  function handleReply(message: Message) {
    replyToMessage.value = message
    void nextTick(() => composer.focus())
  }

  function handleInfo(message: Message) {
    infoMessage.value = message
    infoModalVisible.value = true
  }

  async function handleReact(message: Message, reactionId: string) {
    const conversationId = message.conversationId
    const existingGroup = message.reactions?.find((r) => r.reactionId === reactionId)
    const isToggleOff = existingGroup?.reactedByMe

    // Optimistic update
    const idx = messages.value.findIndex((m) => m.id === message.id)
    if (idx !== -1) {
      const msg = messages.value[idx]!
      let reactions = [...(msg.reactions ?? [])]
      if (isToggleOff) {
        reactions = reactions
          .map((r) => r.reactionId === reactionId
            ? { ...r, count: r.count - 1, reactedByMe: false, reactors: r.reactors.filter((reactor) => reactor.id !== me.value?.id) }
            : r,
          )
          .filter((r) => r.count > 0)
      } else {
        const existing = reactions.find((r) => r.reactionId === reactionId)
        if (existing) {
          reactions = reactions.map((r) => r.reactionId === reactionId
            ? { ...r, count: r.count + 1, reactedByMe: true, reactors: [...r.reactors, { id: me.value?.id ?? '', username: me.value?.username ?? null, avatarUrl: me.value?.avatarUrl ?? null }] }
            : r,
          )
        } else {
          const reaction = availableReactions.value.find((r) => r.id === reactionId)
          if (reaction) {
            reactions = [...reactions, { reactionId, emoji: reaction.emoji, count: 1, reactedByMe: true, reactors: [{ id: me.value?.id ?? '', username: me.value?.username ?? null, avatarUrl: me.value?.avatarUrl ?? null }] }]
          }
        }
      }
      mutateMessageAt(idx, { ...msg, reactions })
    }

    try {
      if (isToggleOff) {
        await apiFetch(`/messages/conversations/${conversationId}/messages/${message.id}/reactions/${reactionId}`, { method: 'DELETE' })
      } else {
        await apiFetch(`/messages/conversations/${conversationId}/messages/${message.id}/reactions`, { method: 'POST', body: { reactionId } })
      }
    } catch {
      // Revert optimistic update on failure by re-fetching is too complex; the socket event will re-sync.
    }
  }

  async function handleDeleteForMe(message: Message) {
    const conversationId = message.conversationId
    const idx = messages.value.findIndex((m) => m.id === message.id)
    if (idx !== -1) {
      mutateMessageAt(idx, { ...messages.value[idx]!, deletedForMe: true })
    }
    try {
      await apiFetch(`/messages/conversations/${conversationId}/messages/${message.id}`, { method: 'DELETE' })
    } catch {
      if (idx !== -1) {
        const msg = messages.value[idx]
        if (msg) mutateMessageAt(idx, { ...msg, deletedForMe: false })
      }
    }
  }

  async function handleRestore(message: Message) {
    const conversationId = message.conversationId
    const idx = messages.value.findIndex((m) => m.id === message.id)
    if (idx !== -1) {
      mutateMessageAt(idx, { ...messages.value[idx]!, deletedForMe: false })
    }
    try {
      await apiFetch(`/messages/conversations/${conversationId}/messages/${message.id}/restore`, { method: 'POST' })
    } catch {
      if (idx !== -1) {
        const msg = messages.value[idx]
        if (msg) mutateMessageAt(idx, { ...msg, deletedForMe: true })
      }
    }
  }

  function handleEdit(message: Message) {
    editingMessage.value = message
    composerText.value = message.body
    void nextTick(() => composer.focus())
  }

  async function handleEditSubmit() {
    const msg = editingMessage.value
    if (!msg || !composerText.value.trim()) {
      editingMessage.value = null
      return
    }
    const body = composerText.value.trim()
    const conversationId = msg.conversationId

    // Optimistic update
    const idx = messages.value.findIndex((m) => m.id === msg.id)
    const originalBody = msg.body
    if (idx !== -1) {
      mutateMessageAt(idx, { ...messages.value[idx]!, body, editedAt: new Date().toISOString() })
    }
    composerText.value = ''
    editingMessage.value = null

    try {
      await apiFetch(`/messages/conversations/${conversationId}/messages/${msg.id}`, {
        method: 'PATCH',
        body: { body },
      })
    } catch {
      if (idx !== -1) {
        const current = messages.value[idx]
        if (current) {
          mutateMessageAt(idx, { ...current, body: originalBody, editedAt: msg.editedAt })
        }
      }
      composerText.value = body
      editingMessage.value = msg
    }
  }

  async function handleDeleteForAll(message: Message) {
    const conversationId = message.conversationId
    const idx = messages.value.findIndex((m) => m.id === message.id)
    if (idx !== -1) {
      mutateMessageAt(idx, { ...messages.value[idx]!, deletedForAll: true, body: '' })
    }
    try {
      await apiFetch(`/messages/conversations/${conversationId}/messages/${message.id}/all`, { method: 'DELETE' })
    } catch {
      if (idx !== -1) {
        const msg = messages.value[idx]
        if (msg) mutateMessageAt(idx, { ...msg, deletedForAll: false, body: message.body })
      }
    }
  }

  function handleScrollToReply(messageId: string) {
    const scroller = messagesScroller.value
    const el = scroller?.querySelector(`[data-message-id="${messageId}"]`) as HTMLElement | null
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })

    // Overlay that bleeds 16px beyond the row on each side (compensates for the px-4
    // padding on the ChatMessageList container) so the highlight goes edge to edge.
    const overlay = document.createElement('div')
    overlay.style.cssText = [
      'position: absolute',
      'inset: 0',
      'left: -1rem',
      'right: -1rem',
      'pointer-events: none',
      'z-index: 0',
    ].join('; ')
    el.appendChild(overlay)

    overlay.animate(
      [
        { backgroundColor: 'transparent', offset: 0 },
        { backgroundColor: 'color-mix(in srgb, var(--p-primary-color) 14%, transparent)', offset: 0.25 },
        { backgroundColor: 'color-mix(in srgb, var(--p-primary-color) 14%, transparent)', offset: 0.65 },
        { backgroundColor: 'transparent', offset: 1 },
      ],
      { duration: 1800, easing: 'ease-in-out', fill: 'none' },
    ).finished.then(() => overlay.remove())
  }

  // ─── Misc ────────────────────────────────────────────────────────────────────

  /** Pre-fetch allowed reactions (used by the reaction picker). */
  function loadAvailableReactions() {
    apiFetchData<MessageReaction[]>('/messages/reactions').then((reactions) => {
      availableReactions.value = reactions ?? []
    }).catch(() => { /* ignore */ })
  }

  function teardown() {
    clearMessagesPaneTimer()
    if (jumpHighlightTimer) { clearTimeout(jumpHighlightTimer); jumpHighlightTimer = null }
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
    shouldShowIncomingAvatar,
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
    handleRestore,
    handleEdit,
    handleScrollToReply,
    // Misc
    loadAvailableReactions,
    teardown,
  }
}
