import { nextTick, type ComputedRef, type Ref } from 'vue'
import type {
  CreateMessageConversationResponse,
  FollowListUser,
  Message,
  MessageReaction,
  MessageUser,
  SendMessageResponse,
} from '~/types/api'
import { redactDeletedChatMessage } from '~/utils/chat-message-deletion'
import { getApiErrorMessage } from '~/utils/api-error'
import type { ComposerMediaItem, CreateMediaPayload } from '~/composables/composer/types'
import type { useDestinationComposerDraft } from '~/composables/composer/useDestinationComposerDraft'
import type { AuthUser } from '~/composables/useAuth'
import type { useApiClient } from '~/composables/useApiClient'
import type { MessageConversationWithTone } from '~/composables/chat/useChatConversations'
import type { ChatMessage } from '~/composables/chat/useChatThread'

type DraftSnapshot = { text: string; media: ComposerMediaItem[]; reply: Message | null }

export type ChatThreadActionsCtx = {
  me: Ref<AuthUser | null> | ComputedRef<AuthUser | null>
  selectedConversationId: Ref<string | null>
  isDraftChat: ComputedRef<boolean>
  draftRecipients: Ref<FollowListUser[]>
  viewerCanStartChats: ComputedRef<boolean>
  showCantStartChat: () => Promise<void>
  messagesScroller: Ref<HTMLElement | null> | ComputedRef<HTMLElement | null>
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
  }
  conversationsApi: {
    conversations: Ref<{ primary: MessageConversationWithTone[]; requests: MessageConversationWithTone[] }>
    activeTab: Ref<'primary' | 'requests'>
    selectedConversation: ComputedRef<MessageConversationWithTone | null>
    updateConversationForMessage: (message: Message) => void
    refreshAllConversationTabs: () => Promise<void>
  }
  emitMessagesTyping: (conversationId: string, typing: boolean) => void
  selectConversation: (id: string, opts?: { replace?: boolean }) => Promise<void>
  scrollToMessage?: (id: string) => Promise<boolean>
  apiFetch: ReturnType<typeof useApiClient>['apiFetch']
  apiFetchData: ReturnType<typeof useApiClient>['apiFetchData']
  messages: { value: ChatMessage[] }
  mutateMessageAt: (idx: number, next: ChatMessage) => boolean
  markMessageAnimated: (id: string) => void
  clearSendingId: (localId: string) => void
  mergeServerMessageIntoOptimistic: (localId: string, serverMsg: Message) => boolean
  sendingMessageIds: Ref<Set<string>>
  sending: Ref<boolean>
  composerText: Ref<string>
  sendError: Ref<string | null>
  replyToMessage: Ref<Message | null>
  editingMessage: Ref<Message | null>
  infoMessage: Ref<Message | null>
  infoModalVisible: Ref<boolean>
  availableReactions: Ref<MessageReaction[]>
  draftKey: ComputedRef<string | null>
  drafts: ReturnType<typeof useDestinationComposerDraft>
  beforeEdit: { current: DraftSnapshot | null }
  draftSnapshot: () => DraftSnapshot
  restoreComposer: (value: DraftSnapshot | null) => void
  jumpTargetMessageId: Ref<string | null>
  loadThread: (id: string, loadOpts?: { jumpToMessageId?: string | null }) => Promise<void>
  scrollToJumpTarget: () => Promise<void>
}

export function createChatThreadActions(ctx: ChatThreadActionsCtx) {
  const {
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
  } = ctx
  const scrollToMessage = ctx.scrollToMessage

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
  restoreComposer(beforeEdit.current)
  beforeEdit.current = null
}

/** Draft path: creates the conversation and sends the first message. */
async function sendFirstMessage() {
  if (!viewerCanStartChats.value) {
    void showCantStartChat()
    return
  }
  const identity = me.value?.id
  const key = draftKey.value
  const body = composerText.value
  const mediaPayload = composer.getMedia()
  const recipients = draftRecipients.value.map(user => user.id)
  await drafts.persist()
  const submitted = drafts.capture()
  if (me.value?.id !== identity || draftKey.value !== key) return
  try {
    const res = await apiFetchData<CreateMessageConversationResponse['data']>('/messages/conversations', {
      method: 'POST',
      body: {
        user_ids: recipients,
        title: undefined,
        body,
        ...(mediaPayload.length > 0 ? { media: mediaPayload } : {}),
      },
    })
    await drafts.submitted(submitted)
    if (me.value?.id !== identity || draftKey.value !== key) return
    if (drafts.unchanged(submitted)) { composerText.value = ''; composer.clearMedia() }
    await conversationsApi.refreshAllConversationTabs()
    if (me.value?.id !== identity || draftKey.value !== key) return
    const conversationId = res?.conversationId
    if (conversationId) {
      const inPrimary = conversationsApi.conversations.value.primary.some((c) => c.id === conversationId)
      const inRequests = conversationsApi.conversations.value.requests.some((c) => c.id === conversationId)
      conversationsApi.activeTab.value = inRequests && !inPrimary ? 'requests' : 'primary'
      await selectConversation(conversationId, { replace: true })
    }
  } catch (e) {
    if (me.value?.id === identity && draftKey.value === key) sendError.value = getApiErrorMessage(e) || 'Failed to send message.'
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
  const snapshot = draftSnapshot()
  await drafts.persist()
  const submitted = drafts.capture()
  if (me.value?.id !== my.id || selectedConversationId.value !== conversationId) return
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
      verifiedStatus: (my.verifiedStatus ?? 'none') as 'none' | 'identity' | 'manual',
      avatarUrl: my.avatarUrl ?? null, avatarVideo: my.avatarVideo ?? null,
    }
    const replySnippet = replyToMessage.value
      ? { id: replyToMessage.value.id, senderUsername: replyToMessage.value.sender.username, bodyPreview: replyToMessage.value.body.slice(0, 200) }
      : null
    const capturedReplyToId = replyToMessage.value?.id ?? null
    messages.value = [
      ...messages.value,
      { id: localId, createdAt: new Date().toISOString(), body, conversationId, sender: optimisticSender, kind: 'text', call: null, reactions: [], deletedForMe: false, deletedForAll: false, editedAt: null, replyTo: replySnippet, media: [], __clientKey: localId } as ChatMessage,
    ]
    markMessageAnimated(localId)
    sendingMessageIds.value = new Set([...sendingMessageIds.value, localId])
    // Text typed while the draft was persisting was not sent and must stay in the composer.
    if (composerText.value === body) { composerText.value = ''; composer.clearMedia() }
    replyToMessage.value = null
    await nextTick()
    scroll.stickToBottom({ behavior: 'smooth', reason: 'send-message-optimistic' })

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

    if (res?.message) await drafts.submitted(submitted)
    // Guard: user switched conversations while this was in flight — remove the stale optimistic row.
    if (me.value?.id !== my.id || selectedConversationId.value !== conversationId) {
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
      scroll.stickToBottom({ behavior: 'smooth', reason: 'send-message-reconciled' })
    } else {
      // API returned no message — remove the optimistic row and restore the composer.
      messages.value = messages.value.filter((m) => m.id !== localId)
      clearSendingId(localId)
      if (!composerText.value && !composer.getMedia().length) restoreComposer(snapshot)
    }

    if (conversationsApi.selectedConversation.value?.viewerStatus === 'pending') {
      await conversationsApi.refreshAllConversationTabs()
    }
  } catch (e) {
    if (localId) {
      messages.value = messages.value.filter((m) => m.id !== localId)
      clearSendingId(localId)
    }
    if (me.value?.id !== my.id || selectedConversationId.value !== conversationId) return
    if (!composerText.value && !composer.getMedia().length) restoreComposer(snapshot)
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
          ? { ...r, count: r.count + 1, reactedByMe: true, reactors: [...r.reactors, { id: me.value?.id ?? '', username: me.value?.username ?? null, avatarUrl: me.value?.avatarUrl ?? null, avatarVideo: me.value?.avatarVideo ?? null }] }
          : r,
        )
      } else {
        const reaction = availableReactions.value.find((r) => r.id === reactionId)
        if (reaction) {
          reactions = [...reactions, { reactionId, emoji: reaction.emoji, count: 1, reactedByMe: true, reactors: [{ id: me.value?.id ?? '', username: me.value?.username ?? null, avatarUrl: me.value?.avatarUrl ?? null, avatarVideo: me.value?.avatarVideo ?? null }] }]
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
  void drafts.persist()
  beforeEdit.current = draftSnapshot()
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
  const identity = me.value?.id

  // Optimistic update
  const idx = messages.value.findIndex((m) => m.id === msg.id)
  const originalBody = msg.body
  if (idx !== -1) {
    mutateMessageAt(idx, { ...messages.value[idx]!, body, editedAt: new Date().toISOString() })
  }
  cancelEdit()

  try {
    await apiFetch(`/messages/conversations/${conversationId}/messages/${msg.id}`, {
      method: 'PATCH',
      body: { body },
    })
  } catch {
    if (me.value?.id !== identity || selectedConversationId.value !== conversationId) return
    if (idx !== -1) {
      const current = messages.value[idx]
      if (current) {
        mutateMessageAt(idx, { ...current, body: originalBody, editedAt: msg.editedAt })
      }
    }
    beforeEdit.current = draftSnapshot()
    editingMessage.value = msg
    composerText.value = body
  }
}

function applyDeletedForAll(messageId: string) {
  messages.value.forEach((message, index) => {
    const next = redactDeletedChatMessage(message, messageId)
    if (next !== message) mutateMessageAt(index, next)
  })
  if (infoMessage.value) infoMessage.value = redactDeletedChatMessage(infoMessage.value, messageId)
  if (replyToMessage.value?.id === messageId) replyToMessage.value = null
  if (editingMessage.value?.id === messageId) cancelEdit()
}

async function handleDeleteForAll(message: Message) {
  const conversationId = message.conversationId
  const idx = messages.value.findIndex((m) => m.id === message.id)
  if (idx !== -1) {
    mutateMessageAt(idx, { ...messages.value[idx]!, deletedForAll: true, body: '' })
  }
  try {
    await apiFetch(`/messages/conversations/${conversationId}/messages/${message.id}/all`, { method: 'DELETE' })
    applyDeletedForAll(message.id)
  } catch {
    if (idx !== -1) {
      const msg = messages.value[idx]
      if (msg) mutateMessageAt(idx, { ...msg, deletedForAll: false, body: message.body })
    }
  }
}

async function handleScrollToReply(messageId: string) {
  scroll.setAtBottomState(false)
  if (!messages.value.some((message) => message.id === messageId)) {
    if (!selectedConversationId.value) return
    jumpTargetMessageId.value = messageId
    await loadThread(selectedConversationId.value, { jumpToMessageId: messageId })
    await scrollToJumpTarget()
    return
  }
  await scrollToMessage?.(messageId)
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

  return {
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
  }
}
