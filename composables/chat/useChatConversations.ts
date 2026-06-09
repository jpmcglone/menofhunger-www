import { computed, ref, shallowRef, triggerRef, type ComputedRef, type Ref } from 'vue'
import type { Message, MessageConversation } from '~/types/api'
import { userColorTier, type UserColorTier } from '~/utils/user-tier'
import type { AuthUser } from '~/composables/useAuth'

export type MessageTone = UserColorTier
export type MessageConversationWithTone = MessageConversation & { unreadTone?: MessageTone }

export interface UseChatConversationsOptions {
  me: Ref<AuthUser | null> | ComputedRef<AuthUser | null>
  marv: ReturnType<typeof useMarv>
  selectedConversationId: Ref<string | null>
  /** From useChatScroll — whether the open thread is pinned to the bottom. */
  atBottom: Ref<boolean>
}

/**
 * Conversation-list state for the chat page: both tab lists (primary /
 * requests), pagination, tab switching, in-place row patching, unread
 * bookkeeping, search, and the Marv pinned-row derivations.
 *
 * `conversations` is a `shallowRef` so deep-reactive proxying doesn't walk
 * every conversation / participant / lastMessage on first paint. Mutations
 * call `commitConversations()` (which delegates to `triggerRef`) — full-tab
 * replacements reassign `.value` to a fresh wrapper object so the shallowRef
 * triggers naturally.
 */
export function useChatConversations(opts: UseChatConversationsOptions) {
  const { me, marv, selectedConversationId, atBottom } = opts
  const { apiFetch, apiFetchData } = useApiClient()
  const viewerCrew = useViewerCrew()

  const activeTab = ref<'primary' | 'requests'>('primary')

  const conversations = shallowRef<{ primary: MessageConversationWithTone[]; requests: MessageConversationWithTone[] }>({
    primary: [],
    requests: [],
  })

  function commitConversations() {
    triggerRef(conversations)
  }

  const nextCursorByTab = ref<{ primary: string | null; requests: string | null }>({ primary: null, requests: null })
  const listLoadingByTab = ref<{ primary: boolean; requests: boolean }>({ primary: false, requests: false })
  const loadingMore = ref(false)

  const selectedConversation = computed(() =>
    [...conversations.value.primary, ...conversations.value.requests].find((c) => c.id === selectedConversationId.value) ?? null,
  )

  const activeList = computed(() => {
    const list = conversations.value[activeTab.value]
    // On the primary tab, the Marv pinned row already surfaces the Marv DM. Hide
    // the regular conversation row so Marv never appears twice in the list.
    const marvId = marv.marvUserId.value
    if (activeTab.value === 'primary' && marv.enabled.value && marvId) {
      return list.filter(
        (c) => !(c.type === 'direct' && c.participants.some((p) => p.user.id === marvId)),
      )
    }
    return list
  })
  const nextCursor = computed(() => nextCursorByTab.value[activeTab.value])
  const listLoading = computed(() => listLoadingByTab.value[activeTab.value])

  // Drive the requests tab badge from local state so it clears immediately when a request
  // is accessed (unreadCount → 0) or deleted (removed from the list). The global nav badge
  // still uses the server-pushed count from useMessagesBadge.
  const requestsBadgeCount = computed(() => conversations.value.requests.filter((c) => c.unreadCount > 0).length)
  const showRequestsBadge = computed(() => requestsBadgeCount.value > 0)
  const requestsBadgeText = computed(() => (requestsBadgeCount.value >= 99 ? '99+' : String(requestsBadgeCount.value)))

  // ─── Fetching ────────────────────────────────────────────────────────────────

  async function fetchConversations(tab: 'primary' | 'requests', fetchOpts?: { cursor?: string | null; forceRefresh?: boolean }) {
    const cursor = fetchOpts?.cursor ?? null
    const forceRefresh = fetchOpts?.forceRefresh ?? false
    if (!forceRefresh && !cursor && conversations.value[tab].length > 0) return
    listLoadingByTab.value = { ...listLoadingByTab.value, [tab]: true }
    try {
      const res = await apiFetch<MessageConversationWithTone[]>('/messages/conversations', {
        query: { tab, cursor: cursor || undefined },
      })
      const list = res.data ?? []
      // shallowRef won't trigger on `.value.primary = ...` — reassign the whole
      // wrapper to a fresh object instead, which IS a `.value` write.
      conversations.value = {
        ...conversations.value,
        [tab]: cursor ? [...conversations.value[tab], ...list] : list,
      }
      nextCursorByTab.value = { ...nextCursorByTab.value, [tab]: res.pagination?.nextCursor ?? null }
    } finally {
      listLoadingByTab.value = { ...listLoadingByTab.value, [tab]: false }
    }
  }

  async function loadMoreConversations() {
    if (!nextCursor.value || loadingMore.value) return
    loadingMore.value = true
    try {
      await fetchConversations(activeTab.value, { cursor: nextCursor.value })
    } finally {
      loadingMore.value = false
    }
  }

  async function refreshAllConversationTabs() {
    await Promise.all([
      fetchConversations('primary', { forceRefresh: true }),
      fetchConversations('requests', { forceRefresh: true }),
    ])
    // If the user is on the primary tab with nothing in it but requests has conversations,
    // auto-switch so inbound chat requests don't silently pile up out of view.
    if (activeTab.value === 'primary' && conversations.value.primary.length === 0 && conversations.value.requests.length > 0) {
      activeTab.value = 'requests'
    }
  }

  function setTab(tab: 'primary' | 'requests') {
    activeTab.value = tab
    void fetchConversations(tab, { forceRefresh: true })
  }

  // ─── In-place row patching ───────────────────────────────────────────────────

  /**
   * Update a conversation row in both tab lists.
   * Returns true if the conversation was found in at least one tab.
   *
   * In-place when possible:
   *   - When the row stays in the same position, write to `arr[idx]` directly.
   *   - When `moveToTop: true` AND idx !== 0, splice in place rather than
   *     allocating a fresh full-length array.
   *
   * Avoiding the full-array re-allocation removes the per-incoming-message
   * O(n) write amplification that used to invalidate every conversation-list
   * derived computed (requestsBadgeCount, displayList) on every socket event.
   */
  function patchConversation(
    conversationId: string,
    updater: (c: MessageConversationWithTone) => MessageConversationWithTone,
    patchOpts?: { moveToTop?: boolean },
  ): boolean {
    let found = false
    for (const tab of ['primary', 'requests'] as const) {
      const arr = conversations.value[tab]
      const idx = arr.findIndex((c) => c.id === conversationId)
      if (idx === -1) continue
      const updated = updater(arr[idx]!)
      if (patchOpts?.moveToTop && idx !== 0) {
        arr.splice(idx, 1)
        arr.unshift(updated)
      } else {
        arr[idx] = updated
      }
      found = true
    }
    // shallowRef won't see in-place array mutations; trigger explicitly.
    if (found) commitConversations()
    return found
  }

  function removeConversationFromList(conversationId: string) {
    let removed = false
    for (const tab of ['primary', 'requests'] as const) {
      const idx = conversations.value[tab].findIndex((c) => c.id === conversationId)
      if (idx !== -1) {
        conversations.value[tab].splice(idx, 1)
        removed = true
      }
    }
    if (removed) commitConversations()
  }

  function updateConversationParticipantRead(conversationId: string, userId: string, lastReadAt: string) {
    patchConversation(conversationId, (c) => ({
      ...c,
      participants: c.participants.map((p) =>
        p.user.id === userId ? { ...p, lastReadAt } : p,
      ),
    }))
  }

  function updateConversationIsBlockedWith(conversationId: string, isBlockedWith: boolean) {
    patchConversation(conversationId, (c) => ({ ...c, isBlockedWith }))
  }

  function updateConversationUnread(conversationId: string, unreadCount: number) {
    patchConversation(conversationId, (c) => ({
      ...c,
      unreadCount,
      // Clear the unread tone when the conversation is marked read.
      ...(unreadCount <= 0 ? { unreadTone: undefined } : {}),
    }))
  }

  function getMessageTier(message: Message): MessageTone {
    return userColorTier(message.sender as Parameters<typeof userColorTier>[0])
  }

  function updateConversationForMessage(message: Message): void {
    const unreadInc = message.sender.id === me.value?.id ? 0 : 1
    const incomingTier = getMessageTier(message)
    const found = patchConversation(message.conversationId, (existing) => {
      const isSelectedConversation = selectedConversationId.value === message.conversationId
      const isUnreadIncoming = unreadInc === 1 && (!isSelectedConversation || !atBottom.value)
      let nextUnreadCount = existing.unreadCount
      if (isSelectedConversation) {
        if (atBottom.value) nextUnreadCount = 0
        else if (unreadInc === 1) nextUnreadCount = existing.unreadCount + unreadInc
        else nextUnreadCount = existing.unreadCount
      } else if (unreadInc === 1) {
        nextUnreadCount = existing.unreadCount + unreadInc
      }
      const updated: MessageConversationWithTone = {
        ...existing,
        lastMessageAt: message.createdAt,
        updatedAt: message.createdAt,
        lastMessage: { id: message.id, body: message.body, createdAt: message.createdAt, senderId: message.sender.id },
        unreadCount: nextUnreadCount,
      }
      if (isUnreadIncoming) updated.unreadTone = incomingTier
      else if (nextUnreadCount <= 0) updated.unreadTone = undefined
      return updated
    }, { moveToTop: true })
    if (!found) void refreshAllConversationTabs()
  }

  // ─── Mark-read ───────────────────────────────────────────────────────────────

  // Throttle viewer-side mark-read so a burst of incoming messages while the
  // chat is open doesn't fire one POST per arrival (each of which fans out a
  // `messages:read` broadcast to every participant + a `messages:updated`
  // emit back to the viewer). The optimistic `updateConversationUnread(id, 0)`
  // keeps the UI correct between the throttled HTTP calls.
  const MARK_READ_THROTTLE_MS = 250
  const lastMarkReadAtByConvoId = new Map<string, number>()

  function markConversationReadIfVisible(conversationId: string) {
    const id = (conversationId ?? '').trim()
    if (!id) return
    if (typeof document === 'undefined' || document.visibilityState !== 'visible') return

    // Always patch the local count to zero — cheap and keeps the badge in sync.
    updateConversationUnread(id, 0)

    const now = Date.now()
    const lastAt = lastMarkReadAtByConvoId.get(id) ?? 0
    if (now - lastAt < MARK_READ_THROTTLE_MS) return
    lastMarkReadAtByConvoId.set(id, now)

    void apiFetch(`/messages/conversations/${id}/mark-read`, { method: 'POST' }).catch(() => {
      // Non-fatal: badge will eventually sync from server.
    })
  }

  // ─── Row presentation helpers ────────────────────────────────────────────────

  function getDirectUser(conversation: MessageConversation) {
    return conversation.participants.find((p) => p.user.id !== me.value?.id)?.user ?? null
  }

  function getConversationTitle(conversation: MessageConversation) {
    if (conversation.type === 'crew_wall') {
      const crewName = (conversation.crew?.name ?? '').trim()
      if (crewName) return crewName
      return viewerCrew.membership.value?.role === 'owner' ? 'Your Crew' : 'My Crew'
    }
    if (conversation.type === 'group') {
      return conversation.title || conversation.participants.map((p) => p.user.name || p.user.username || 'User').join(', ')
    }
    const other = getDirectUser(conversation)
    return other?.name || other?.username || 'Chat'
  }

  function getConversationPreview(conversation: MessageConversation) {
    return conversation.lastMessage?.body || 'No chats yet.'
  }

  function getConversationLastMessageTier(conversation: MessageConversationWithTone): MessageTone {
    // If there are unread messages and we've tracked the last incoming tier, prefer it for unread indicators.
    const tracked = conversation.unreadTone
    if (conversation.unreadCount > 0 && tracked) return tracked
    const senderId = conversation.lastMessage?.senderId ?? null
    if (!senderId) return 'normal'
    const sender = conversation.participants.find((p) => p.user.id === senderId)?.user
    return userColorTier(sender as Parameters<typeof userColorTier>[0])
  }

  const ORG_CHAT_SILVER_DOT_CLASS = 'bg-[#313643] text-white'
  const ORG_CHAT_SILVER_UNREAD_CLASS = 'bg-[rgba(49,54,67,0.24)] dark:bg-[rgba(49,54,67,0.34)]'

  function conversationDotClass(conversation: MessageConversationWithTone): string {
    const tier = getConversationLastMessageTier(conversation)
    if (tier === 'organization') return ORG_CHAT_SILVER_DOT_CLASS
    if (tier === 'premium') return 'bg-[var(--moh-premium)] text-white'
    if (tier === 'verified') return 'bg-[var(--moh-verified)] text-white'
    return 'bg-gray-700 text-white dark:bg-white dark:text-black'
  }

  function conversationUnreadHighlightClass(conversation: MessageConversationWithTone): string {
    const tier = getConversationLastMessageTier(conversation)
    if (tier === 'organization') return ORG_CHAT_SILVER_UNREAD_CLASS
    if (tier === 'premium') return 'bg-[rgba(var(--moh-premium-rgb),0.06)] dark:bg-[rgba(var(--moh-premium-rgb),0.09)]'
    if (tier === 'verified') {
      return 'bg-[rgba(var(--moh-verified-rgb),0.06)] dark:bg-[rgba(var(--moh-verified-rgb),0.09)]'
    }
    return 'bg-gray-100/40 dark:bg-white/6'
  }

  /** Last non–deleted-for-all message in the open thread (for list preview after delete). */
  function lastVisibleMessageSnapshot(list: Message[]): NonNullable<MessageConversation['lastMessage']> | null {
    for (let i = list.length - 1; i >= 0; i--) {
      const m = list[i]!
      if (m.deletedForAll) continue
      return {
        id: m.id,
        body: m.body,
        createdAt: m.createdAt,
        senderId: m.sender.id,
      }
    }
    return null
  }

  // ─── Search ──────────────────────────────────────────────────────────────────

  const conversationSearchResults = ref<MessageConversation[] | null>(null)
  const conversationSearchLoading = ref(false)
  let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

  function handleConversationSearchQuery(q: string) {
    if (searchDebounceTimer) { clearTimeout(searchDebounceTimer); searchDebounceTimer = null }
    const trimmed = q.trim()
    if (!trimmed) {
      conversationSearchResults.value = null
      conversationSearchLoading.value = false
      return
    }
    conversationSearchLoading.value = true
    conversationSearchResults.value = null
    searchDebounceTimer = setTimeout(async () => {
      searchDebounceTimer = null
      try {
        const result = await apiFetchData<MessageConversation[]>(
          `/messages/conversations/search?q=${encodeURIComponent(trimmed)}`,
        )
        conversationSearchResults.value = Array.isArray(result) ? result : []
      } catch {
        conversationSearchResults.value = []
      } finally {
        conversationSearchLoading.value = false
      }
    }, 300)
  }

  // ─── Marv pinned-row derivations ─────────────────────────────────────────────

  /**
   * Marv lives as a regular `direct` conversation in the user's list. We surface
   * a pinned row above the conversation list (premium-styled), and when the
   * selected chat IS Marv we render the mode picker / credits chip.
   *
   * `marvConversation` walks the existing primary list — we don't need to fetch
   * separately because the conversation list already contains the marv DM if
   * one exists. When it doesn't yet, the pinned row routes to `?marv=1` which
   * is resolved on demand when the user clicks it.
   */
  const marvConversation = computed<MessageConversation | null>(() => {
    const marvId = marv.marvUserId.value
    if (!marvId) return null
    for (const c of conversations.value.primary) {
      if (c.type !== 'direct') continue
      if (c.participants.some((p) => p.user.id === marvId)) return c
    }
    for (const c of conversations.value.requests) {
      if (c.type !== 'direct') continue
      if (c.participants.some((p) => p.user.id === marvId)) return c
    }
    return null
  })

  const marvConversationId = computed(() => marvConversation.value?.id ?? null)
  const marvUnreadCount = computed(() => marvConversation.value?.unreadCount ?? 0)
  const marvLastMessagePreview = computed<string | null>(() => {
    const body = marvConversation.value?.lastMessage?.body ?? null
    return body ? body.trim() || null : null
  })
  const isSelectedConversationMarv = computed(() => {
    const marvId = marv.marvUserId.value
    if (!marvId) return false
    if (selectedConversation.value?.type !== 'direct') return false
    return selectedConversation.value.participants.some((p) => p.user.id === marvId)
  })

  // ─── Actions on the selected conversation ────────────────────────────────────

  async function acceptConversation(conversationId: string) {
    await apiFetch(`/messages/conversations/${conversationId}/accept`, { method: 'POST' })
    await refreshAllConversationTabs()
  }

  async function toggleMuteConversation() {
    const convo = selectedConversation.value
    if (!convo) return
    const newMuted = !convo.isMuted
    // Optimistic update
    patchConversation(convo.id, (c) => ({ ...c, isMuted: newMuted }))
    try {
      await apiFetch(`/messages/conversations/${convo.id}/mute`, {
        method: newMuted ? 'POST' : 'DELETE',
      })
    } catch {
      // Revert on failure
      patchConversation(convo.id, (c) => ({ ...c, isMuted: !newMuted }))
    }
  }

  function teardown() {
    if (searchDebounceTimer) { clearTimeout(searchDebounceTimer); searchDebounceTimer = null }
  }

  return {
    // State
    activeTab,
    conversations,
    commitConversations,
    loadingMore,
    selectedConversation,
    activeList,
    nextCursor,
    listLoading,
    requestsBadgeCount,
    showRequestsBadge,
    requestsBadgeText,
    // Fetching
    fetchConversations,
    loadMoreConversations,
    refreshAllConversationTabs,
    setTab,
    // Patching
    patchConversation,
    removeConversationFromList,
    updateConversationParticipantRead,
    updateConversationIsBlockedWith,
    updateConversationUnread,
    updateConversationForMessage,
    markConversationReadIfVisible,
    // Presentation helpers
    getMessageTier,
    getDirectUser,
    getConversationTitle,
    getConversationPreview,
    getConversationLastMessageTier,
    conversationDotClass,
    conversationUnreadHighlightClass,
    lastVisibleMessageSnapshot,
    // Search
    conversationSearchResults,
    conversationSearchLoading,
    handleConversationSearchQuery,
    // Marv
    marvConversation,
    marvConversationId,
    marvUnreadCount,
    marvLastMessagePreview,
    isSelectedConversationMarv,
    // Actions
    acceptConversation,
    toggleMuteConversation,
    teardown,
  }
}
