import { nextTick, ref, type ComputedRef, type Ref } from 'vue'
import type { Message, MessageConversation } from '~/types/api'
import type { useApiClient } from '~/composables/useApiClient'
import type { ChatMessage } from '~/composables/chat/useChatThread'

export type ChatThreadLoadCtx = {
  selectedConversationId: Ref<string | null>
  selectedChatKey: Ref<string | null>
  messagesScroller: Ref<HTMLElement | null> | ComputedRef<HTMLElement | null>
  scroll: {
    setAtBottomState: (next: boolean) => void
    refreshAtBottomFromScroller: () => boolean
    isAtBottom: () => boolean
  }
  conversationsApi: {
    mergeConversation?: (conversation: MessageConversation) => void
    selectedConversation?: Readonly<Ref<MessageConversation | null>>
  }
  scrollToMessage?: (id: string) => Promise<boolean>
  apiFetch: ReturnType<typeof useApiClient>['apiFetch']
  messages: { value: ChatMessage[] }
  messagesNextCursor: Ref<string | null>
  messagesNewerCursor: Ref<string | null>
  messagesLoading: Ref<boolean>
  loadingOlder: Ref<boolean>
  loadingNewer: Ref<boolean>
  jumpTargetMessageId: Ref<string | null>
  jumpHighlightTimer: { current: ReturnType<typeof setTimeout> | null }
  messagesReady: Ref<boolean>
  animateMessageList: Ref<boolean>
  renderedChatKey: Ref<string | null>
  messagesPaneState: Ref<'loading' | 'fading' | 'ready'>
  sendingMessageIds: Ref<Set<string>>
  replyToMessage: Ref<Message | null>
  resetTyping: () => void
  clearMessagesPaneTimer: () => void
  dividerEls: { clear: () => void }
  revealMessagesPaneAfterFade: (key: string) => void
  updateStickyDivider: () => void
}

export function createChatThreadLoad(ctx: ChatThreadLoadCtx) {
  const {
    selectedConversationId,
    selectedChatKey,
    messagesScroller,
    scroll,
    conversationsApi,
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
  } = ctx
  const scrollToMessage = ctx.scrollToMessage
  const readReady = ref(false)
  const loadError = ref<string | null>(null)
  let failedJumpTarget: string | null = null

// ─── Thread switching / loading ──────────────────────────────────────────────

let threadLoadSeq = 0
let loadOlderReqSeq = 0
let loadNewerReqSeq = 0

/** Invalidate any in-flight thread loads (used when selection changes/clears). */
function invalidateThreadLoads() {
  readReady.value = false
  threadLoadSeq++
  loadOlderReqSeq++
  loadNewerReqSeq++
}

/**
 * Reset per-thread UI state ahead of loading a different conversation.
 * Selection refs and URL writes are owned by `useChatRouteSync`.
 */
function beginThreadSwitch(switchOpts?: { jumpToMessageId?: string | null }) {
  invalidateThreadLoads()
  loadError.value = null
  failedJumpTarget = null
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
  if (jumpHighlightTimer.current) { clearTimeout(jumpHighlightTimer.current); jumpHighlightTimer.current = null }
  jumpTargetMessageId.value = switchOpts?.jumpToMessageId ?? null
  resetTyping()
  sendingMessageIds.value = new Set()
}

/** Fetch the thread for `id` — either the latest window or one centered on a target message. */
async function loadThread(id: string, loadOpts?: { jumpToMessageId?: string | null; refresh?: boolean }) {
  const reqSeq = ++threadLoadSeq
  loadOlderReqSeq++
  loadNewerReqSeq++
  loadingOlder.value = false
  loadingNewer.value = false
  readReady.value = false
  const refreshAnchor = loadOpts?.refresh ? [...messages.value].reverse().find(message => !message.id.startsWith('local-')) : null
  const retryingFailedLoad = Boolean(loadError.value)
  const targetMsgId = loadOpts?.jumpToMessageId ?? failedJumpTarget
  loadError.value = null
  if (targetMsgId) {
    if (jumpHighlightTimer.current) { clearTimeout(jumpHighlightTimer.current); jumpHighlightTimer.current = null }
    jumpTargetMessageId.value = targetMsgId
  }
  if (!loadOpts?.refresh || retryingFailedLoad) messagesLoading.value = true
  try {
    if (targetMsgId) {
      // The around endpoint contains messages only. A fresh embedded workspace
      // needs authorized detail metadata for its header, participants and actions.
      if (conversationsApi.selectedConversation?.value?.id !== id) {
        const detail = await apiFetch<{ conversation: MessageConversation; messages: Message[] }>(`/messages/conversations/${id}`)
        if (reqSeq !== threadLoadSeq || selectedConversationId.value !== id) return
        const conversation = detail.data?.conversation
        if (!conversation || conversation.id !== id) throw new Error('Conversation details unavailable')
        conversationsApi.mergeConversation?.(conversation)
      }
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
      if (loadOpts?.refresh && messages.value.length) {
        const anchor = refreshAnchor
        let refreshedWindow = [...list].reverse()
        // A latest snapshot may have moved beyond the loaded range during a long disconnect.
        // Catch up from the existing anchor so history is always contiguous and gaps stay explicit.
        if (anchor && (messagesNewerCursor.value || !list.some(message => message.id === anchor.id))) {
          const around = await apiFetch<{ messages: Message[]; olderCursor: string | null; newerCursor: string | null; targetMessageId: string }>(`/messages/conversations/${id}/messages/around/${anchor.id}`)
          if (reqSeq !== threadLoadSeq || selectedConversationId.value !== id) return
          refreshedWindow = around.data?.messages ?? []
          messagesNewerCursor.value = around.data?.newerCursor ?? null
          if (messagesNewerCursor.value) scroll.setAtBottomState(false)
        }
        const updates = new Map(refreshedWindow.map(message => [message.id, message]))
        const existingIds = new Set(messages.value.map(message => message.id))
        const refreshed = messages.value.map(message => updates.has(message.id) ? { ...message, ...updates.get(message.id)! } : message)
        const anchorIndex = anchor ? refreshedWindow.findIndex(message => message.id === anchor.id) : -1
        const contiguousNewer = anchorIndex >= 0 ? refreshedWindow.slice(anchorIndex + 1) : anchor ? [] : refreshedWindow
        messages.value = [...refreshed, ...contiguousNewer.filter(message => !existingIds.has(message.id))].sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      } else {
        messages.value = [...list].reverse()
        messagesNextCursor.value = res.pagination?.nextCursor ?? null
        messagesNewerCursor.value = null
      }
      if (res.data?.conversation) {
        conversationsApi.mergeConversation?.(res.data.conversation)
      }
    }
    messagesReady.value = true
    messagesLoading.value = false
    if ((!loadOpts?.refresh || !renderedChatKey.value) && selectedChatKey.value === id) {
      revealMessagesPaneAfterFade(id)
    }
    // Resume read publication only after the fresh window is mounted. Failed or
    // superseded catch-up requests keep old visible history unread.
    await nextTick()
    if (reqSeq === threadLoadSeq && selectedConversationId.value === id && targetMsgId && renderedChatKey.value === id) await scrollToJumpTarget().catch(() => undefined)
    if (reqSeq === threadLoadSeq && selectedConversationId.value === id) {
      readReady.value = true
      failedJumpTarget = null
    }
  } catch (error) {
    if (reqSeq === threadLoadSeq && selectedConversationId.value === id) {
      loadError.value = 'Couldn’t load messages. Try again.'
      failedJumpTarget = targetMsgId
      // A rejected initial request must leave the spinner. Keep the mounted pane
      // and composer on refresh failures, and never expose another chat's history.
      if (!renderedChatKey.value && selectedChatKey.value === id) {
        messages.value = messages.value.filter(message => message.conversationId === id)
        clearMessagesPaneTimer()
        messagesPaneState.value = 'ready'
        renderedChatKey.value = id
      }
    }
    throw error
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
  loadError.value = null
  failedJumpTarget = null
  loadingOlder.value = false
  loadingNewer.value = false
  if (jumpHighlightTimer.current) { clearTimeout(jumpHighlightTimer.current); jumpHighlightTimer.current = null }
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
    readReady.value = false
    const merged = new Map(messages.value.map(message => [message.id, message]))
    for (const message of list) merged.set(message.id, { ...merged.get(message.id), ...message })
    messages.value = [...merged.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    const newerCursor = (res as { pagination?: { newerCursor?: string | null } }).pagination?.newerCursor ?? null
    messagesNewerCursor.value = newerCursor
    await nextTick()
    if (reqSeq !== loadNewerReqSeq || selectedConversationId.value !== conversationId) return
    readReady.value = true
    if (!newerCursor) {
      // We've caught up to the present — the chat is now live at the bottom.
      scroll.setAtBottomState(scroll.isAtBottom())
    }
  } finally {
    if (reqSeq === loadNewerReqSeq) loadingNewer.value = false
  }
}

/**
 * Scroll the scroller to the jump-target message row and briefly highlight it.
 * Ask the virtual list to mount off-screen targets before measuring the row.
 */
async function scrollToJumpTarget() {
  const targetId = jumpTargetMessageId.value
  if (!targetId || !messagesScroller.value) return

  scroll.setAtBottomState(false)
  await scrollToMessage?.(targetId)
  if (jumpTargetMessageId.value !== targetId || !messagesScroller.value) return
  const el = messagesScroller.value.querySelector<HTMLElement>(`[data-message-id="${targetId}"]`)
  if (el) {
    const scrollerRect = messagesScroller.value.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    const offset = elRect.top - scrollerRect.top - scrollerRect.height / 2 + elRect.height / 2
    messagesScroller.value.scrollTop += offset
  }

  void nextTick().then(() => {
    scroll.refreshAtBottomFromScroller()
  })
  if (jumpHighlightTimer.current) clearTimeout(jumpHighlightTimer.current)
  jumpHighlightTimer.current = setTimeout(() => {
    jumpHighlightTimer.current = null
    jumpTargetMessageId.value = null
  }, 2500)
}


  return {
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
  }
}
