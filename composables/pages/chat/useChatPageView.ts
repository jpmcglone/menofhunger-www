import type { FollowListUser, LookupMessageConversationResponse, Message, MessageUser } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { useChatBubbleShape } from '~/composables/chat/useChatBubbleShape'
import { useChatTimeFormatting } from '~/composables/chat/useChatTimeFormatting'
import { useChatRealtime } from '~/composables/chat/useChatRealtime'
import type { MessageTone } from '~/composables/chat/useChatConversations'
import { useRefcountedInterest } from '~/composables/chat/useRefcountedInterest'
import { userColorTier } from '~/utils/user-tier'
import type { useChatPageState } from './useChatPage'

/**
 * Selection, pending-message button, responsive panes, bubble styling, conversation
 * actions, the new-chat dialog, and presence interest.
 */
export function useChatPageView(ctx: ReturnType<typeof useChatPageState>) {
  const { apiFetch, apiFetchData, route, me, viewerCanStartChats, addInterest, removeInterest, suppressMessageUnreadBumpsForMs, marv, selectedConversationId, selectedChatKey, atBottom, stickToBottom, setAtBottomState, scrollEventHandler, conversationsApi, selectedConversation, patchConversation, removeConversationFromList, updateConversationParticipantRead, updateConversationUnread, updateConversationForMessage, markConversationReadIfVisible, getMessageTier, getDirectUser, getConversationLastMessageTier, lastVisibleMessageSnapshot, showCantStartChat, thread, messages, infoMessage, sendingMessageIds, setRemoteTyping, routeSync } = ctx

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
    stickToBottom({ behavior: 'smooth', userInitiated: true, reason: 'pending-button-click' })
    const convoId = selectedConversationId.value
    if (convoId) {
      void nextTick().then(() => {
        requestAnimationFrame(() => markConversationReadIfVisible(convoId))
      })
    }
  }

  function onMessagesScroll() {
    scrollEventHandler()
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

  const ORG_CHAT_SILVER_OUTLINE_BUBBLE_CLASS = 'bg-transparent border border-[rgba(49,54,67,0.96)] text-gray-900 dark:text-gray-100'

  function bubbleClass(m: Message) {
    const isMe = Boolean(m.sender.id && m.sender.id === me.value?.id)

    // Outgoing: no border and no fill class. The whole treatment is the tier wash from
    // `ownMessageTintStyle`, applied as an inline style in ChatMessageListRow because the
    // color is a computed `color-mix` that Tailwind cannot see as a literal class.
    if (isMe) return 'text-gray-900 dark:text-gray-100'

    // Incoming: outlined bubble, tinted to the sender's tier.
    const tier = userColorTier(m.sender as Parameters<typeof userColorTier>[0])
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
  useOverlayDismiss(newDialogVisible, () => (newDialogVisible.value = false))
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
    handlers: {
      onCallUpdated(convoId, call) {
        patchConversation(convoId, (c) => ({ ...c, activeCall: call }))
      },

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
            stickToBottom({ behavior: 'auto', ifNearBottom: true, reason: 'new-message-realtime' })
          })
        }
        const isIncoming = msg.sender.id !== me.value?.id
        if (typeof document !== 'undefined' && document.visibilityState === 'visible' && document.hasFocus() && shouldStick) {
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
          thread.mutateMessageAt(idx, { ...messages.value[idx]!, body: msg.body, editedAt: msg.editedAt ?? null, kind: msg.kind ?? 'text', call: msg.call ?? null })
        }
        if (infoMessage.value?.id === msg.id) {
          infoMessage.value = { ...infoMessage.value, body: msg.body, editedAt: msg.editedAt ?? null, kind: msg.kind ?? 'text', call: msg.call ?? null }
        }
      },

      onMessageDeletedForAll(convoId, messageId, isSelected) {
        if (isSelected) {
          thread.applyDeletedForAll(messageId)
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

  return {
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
    registerRealtime,
    teardownRealtime,
  }
}

/**
 * Realtime registration, watchers, and mount/unmount lifecycle.
 */
export function useChatPageLifecycle(ctx: ReturnType<typeof useChatPageState> & ReturnType<typeof useChatPageView>) {
  const { route, ensureLoaded, viewerCanUseChat, prefersReducedMotion, chatBootState, clearChatBootTimer, revealChatScreenAfterFade, isSocketConnected, emitMessagesScreen, marv, selectedConversationId, selectedChatKey, isDraftChat, messagesScroller, composerBarRef, scrollApi, onMessagesScrollerMounted, conversationsApi, activeTab, conversations, activeList, listLoading, listFailed, fetchConversations, thread, messages, messagesLoading, jumpTargetMessageId, renderedChatKey, messagesPaneState, routeSync, selectConversation, isTabBarMode, isTinyViewport, registerRealtime, teardownRealtime } = ctx

  useJourneyReady('inbox_ready', () => chatBootState.value === 'ready' && !listLoading.value, {
    failed: () => listFailed.value,
    source: () => activeList.value.length ? 'network' : 'empty',
  })
  useJourneyReady('thread_ready', () => chatBootState.value === 'ready' && messagesPaneState.value === 'ready' && !messagesLoading.value, {
    context: () => `${selectedChatKey.value}:${jumpTargetMessageId.value}`,
    source: () => messages.value.length ? 'network' : 'empty',
  })

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
      } else if (!isTinyViewport.value && !isDraftChat.value) {
        // Desktop two-pane mode: auto-select the first non-Marv conversation so the
        // right pane is never blank. Skip when `?to=` opened a draft chat (no history
        // yet) — otherwise we'd clobber the compose-to-user pane with the most recent thread.
        // On mobile we leave nothing selected so the user sees the list first (tap to open).
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
        if (el) onMessagesScrollerMounted(el, key, { hasJumpTarget: Boolean(jumpTargetMessageId.value) })
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
        if (el) {
          onMessagesScrollerMounted(el, renderedChatKey.value, {
            hasJumpTarget: Boolean(jumpTargetMessageId.value),
          })
        }
      })
    },
    { flush: 'post' },
  )

  return {

  }
}
