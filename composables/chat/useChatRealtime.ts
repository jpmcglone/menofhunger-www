import type { Ref, ComputedRef } from 'vue'
import type { CallSession, Message } from '~/types/api'
import type { CallsCallback, MessagesCallback } from '~/composables/usePresence'

export interface ChatRealtimeHandlers {
  /** `calls:updated` for any conversation; `call` is null once the session has ended. */
  onCallUpdated?: (conversationId: string, call: CallSession | null) => void
  /**
   * Called when a new message arrives from the socket. Includes both
   * messages for the selected conversation and others (for updating the list).
   */
  onNewMessage: (msg: Message, isSelected: boolean, isAtBottom: boolean) => void
  onReaction: (msg: Message, isSelected: boolean) => void
  onMessageEdited: (msg: Message, isSelected: boolean) => void
  onMessageDeletedForAll: (conversationId: string, messageId: string, isSelected: boolean) => void
  onTyping: (convoId: string, userId: string, typing: boolean, status?: string) => void
  onRead: (convoId: string, userId: string | undefined, lastReadAt: string | undefined) => void
}

export interface UseChatRealtimeOptions {
  selectedConversationId: Ref<string | null>
  meId: ComputedRef<string | null> | Ref<string | null>
  atBottom: Ref<boolean>
  handlers: ChatRealtimeHandlers
  addMessagesCallback: (cb: MessagesCallback) => void
  removeMessagesCallback: (cb: MessagesCallback) => void
  addCallsCallback?: (cb: CallsCallback) => void
  removeCallsCallback?: (cb: CallsCallback) => void
}

/**
 * Encapsulates all socket event → handler routing for the chat screen.
 * Register with `addMessagesCallback` and clean up with `teardown`.
 */
export function useChatRealtime(opts: UseChatRealtimeOptions) {
  const { selectedConversationId, meId, atBottom, handlers, addMessagesCallback, removeMessagesCallback, addCallsCallback, removeCallsCallback } = opts

  const callsCallback: CallsCallback = {
    onUpdated(payload) {
      const convoId = String(payload?.conversationId ?? '').trim()
      if (!convoId) return
      const call = payload.call && payload.call.status !== 'ended' ? payload.call : null
      handlers.onCallUpdated?.(convoId, call)
    },
  }

  const callback: MessagesCallback = {
    onMessage(payload) {
      const msg = payload?.message as Message | undefined
      if (!msg?.conversationId) return
      const isSelected = selectedConversationId.value === msg.conversationId
      handlers.onNewMessage(msg, isSelected, atBottom.value)
    },

    onReaction(payload) {
      const msg = payload?.message as Message | undefined
      if (!msg?.id) return
      const isSelected = selectedConversationId.value === msg.conversationId
      handlers.onReaction(msg, isSelected)
    },

    onMessageEdited(payload) {
      const msg = payload?.message as Message | undefined
      if (!msg?.id || !msg.conversationId) return
      const isSelected = selectedConversationId.value === msg.conversationId
      handlers.onMessageEdited(msg, isSelected)
    },

    onMessageDeletedForAll(payload) {
      const messageId = String(payload?.messageId ?? '').trim()
      const convoId = String(payload?.conversationId ?? '').trim()
      if (!messageId || !convoId) return
      const isSelected = selectedConversationId.value === convoId
      handlers.onMessageDeletedForAll(convoId, messageId, isSelected)
    },

    onTyping(payload) {
      const convoId = payload?.conversationId ?? null
      const userId = payload?.userId ?? null
      if (!convoId || !userId) return
      if (userId === meId.value) return
      handlers.onTyping(convoId, userId, payload?.typing ?? true, payload?.status)
    },

    onRead(payload) {
      const convoId = String(payload?.conversationId ?? '').trim()
      if (!convoId) return
      handlers.onRead(convoId, payload?.userId, payload?.lastReadAt)
    },
  }

  function register() {
    addMessagesCallback(callback)
    addCallsCallback?.(callsCallback)
  }

  function teardown() {
    removeMessagesCallback(callback)
    removeCallsCallback?.(callsCallback)
  }

  return { register, teardown, callback, callsCallback }
}
