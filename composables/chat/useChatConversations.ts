import { computed, ref, shallowRef, triggerRef, type ComputedRef, type Ref } from 'vue'
import type { Message, MessageConversation } from '~/types/api'
import { chatMessagePreview } from '~/utils/chat-message-preview'
import type { AuthUser } from '~/composables/useAuth'
import { useChatConversationPresentation, type MessageConversationWithTone, type MessageTone } from './useChatConversationPresentation'
import { useChatConversationSearch } from './useChatConversationSearch'
import { useChatMarvRows } from './useChatMarvRows'
import { useChatConversationMetadata } from './useChatConversationMetadata'

export type { MessageTone, MessageConversationWithTone }

export interface UseChatConversationsOptions {
  me: Ref<AuthUser | null> | ComputedRef<AuthUser | null>
  marv: ReturnType<typeof useMarv>
  selectedConversationId: Ref<string | null>
  /** From useChatScroll — whether the open thread is pinned to the bottom. */
  atBottom: Ref<boolean>
  isViewing?: Ref<boolean>
  /** False when viewing historical messages with a newer page still missing. */
  isLatestWindow?: Ref<boolean>
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
  const { apiFetch } = useApiClient()
  const presentation = useChatConversationPresentation(me)
  const { getMessageTier } = presentation
  const search = useChatConversationSearch()
  let disposed = false

  const metadata = useChatConversationMetadata(me)
  function syncConversationPreferences(conversation: MessageConversation) {
    if (!disposed) metadata.sync(conversation)
  }

  const seenMessageIds = new Set<string>()
  let refreshPromise: Promise<void> | null = null
  let refreshAgain = false

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
  const loadedByTab = ref({ primary: false, requests: false })
  const failedByTab = ref({ primary: false, requests: false })
  const listFailed = computed(() => failedByTab.value[activeTab.value])
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
  const listLoading = computed(() => !loadedByTab.value[activeTab.value] && activeList.value.length === 0)
  const listRefreshing = computed(() => listLoadingByTab.value[activeTab.value] && !listLoading.value)

  // Drive the requests tab badge from local state so it clears immediately when a request
  // is accessed (unreadCount → 0) or deleted (removed from the list). The global nav badge
  // still uses the server-pushed count from useMessagesBadge.
  const requestsBadgeCount = computed(() => conversations.value.requests.filter((c) => c.unreadCount > 0).length)
  const showRequestsBadge = computed(() => requestsBadgeCount.value > 0)
  const requestsBadgeText = computed(() => (requestsBadgeCount.value >= 99 ? '99+' : String(requestsBadgeCount.value)))

  // ─── Fetching ────────────────────────────────────────────────────────────────

  async function fetchConversations(tab: 'primary' | 'requests', fetchOpts?: { cursor?: string | null; forceRefresh?: boolean }) {
    const identity = me.value?.id
    const cursor = fetchOpts?.cursor ?? null
    const forceRefresh = fetchOpts?.forceRefresh ?? false
    if (!forceRefresh && !cursor && conversations.value[tab].length > 0) return
    listLoadingByTab.value = { ...listLoadingByTab.value, [tab]: true }
    failedByTab.value = { ...failedByTab.value, [tab]: false }
    try {
      const res = await apiFetch<MessageConversationWithTone[]>('/messages/conversations', {
        query: { tab, cursor: cursor || undefined },
      })
      if (disposed || identity !== me.value?.id) return
      const list = res.data ?? []
      for (const conversation of list) syncConversationPreferences(conversation)
      // shallowRef won't trigger on `.value.primary = ...` — reassign the whole
      // wrapper to a fresh object instead, which IS a `.value` write.
      conversations.value = {
        ...conversations.value,
        [tab]: cursor ? [...conversations.value[tab], ...list] : list,
      }
      nextCursorByTab.value = { ...nextCursorByTab.value, [tab]: res.pagination?.nextCursor ?? null }
    } catch (error) {
      failedByTab.value = { ...failedByTab.value, [tab]: true }
      throw error
    } finally {
      loadedByTab.value = { ...loadedByTab.value, [tab]: true }
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
    if (refreshPromise) { refreshAgain = true; return refreshPromise }
    refreshPromise = (async () => {
      do {
        refreshAgain = false
        await Promise.all([
          fetchConversations('primary', { forceRefresh: true }),
          fetchConversations('requests', { forceRefresh: true }),
        ])
      } while (refreshAgain && !disposed)
      // If the user is on the primary tab with nothing in it but requests has conversations,
      // auto-switch so inbound chat requests don't silently pile up out of view.
      if (!disposed && activeTab.value === 'primary' && conversations.value.primary.length === 0 && conversations.value.requests.length > 0) {
        activeTab.value = 'requests'
      }
    })()
    try { await refreshPromise } finally { refreshPromise = null }
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
    let changed = false
    for (const tab of ['primary', 'requests'] as const) {
      const arr = conversations.value[tab]
      const idx = arr.findIndex((c) => c.id === conversationId)
      if (idx === -1) continue
      found = true
      const updated = updater(arr[idx]!)
      syncConversationPreferences(updated)
      if (patchOpts?.moveToTop && idx !== 0) {
        arr.splice(idx, 1)
        arr.unshift(updated)
        changed = true
      } else if (updated !== arr[idx]) {
        arr[idx] = updated
        changed = true
      }
    }
    // shallowRef won't see in-place array mutations; trigger explicitly.
    if (changed) commitConversations()
    return found
  }

  function removeConversationFromList(conversationId: string) {
    metadata.remove(conversationId)
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
    patchConversation(conversationId, (c) => c.participants.some(p => p.user.id === userId && p.lastReadAt !== lastReadAt) ? ({
      ...c,
      participants: c.participants.map((p) =>
        p.user.id === userId ? { ...p, lastReadAt } : p,
      ),
    }) : c)
  }

  function updateConversationIsBlockedWith(conversationId: string, isBlockedWith: boolean) {
    patchConversation(conversationId, (c) => ({ ...c, isBlockedWith }))
  }

  /** Merge a freshly fetched conversation (participants + lastReadAt) into the list. */
  function mergeConversation(conversation: MessageConversation) {
    syncConversationPreferences(conversation)
    const found = patchConversation(conversation.id, (c) => ({
      ...c,
      ...conversation,
      unreadTone: c.unreadTone,
    }))
    if (found) return
    conversations.value = {
      ...conversations.value,
      primary: [{ ...conversation }, ...conversations.value.primary],
    }
  }

  function updateConversationUnread(conversationId: string, unreadCount: number) {
    patchConversation(conversationId, (c) => c.unreadCount === unreadCount && (unreadCount > 0 || c.unreadTone === undefined) ? c : ({
      ...c,
      unreadCount,
      // Clear the unread tone when the conversation is marked read.
      ...(unreadCount <= 0 ? { unreadTone: undefined } : {}),
    }))
  }

  function updateConversationForMessage(message: Message): void {
    if (seenMessageIds.has(message.id)) return
    seenMessageIds.add(message.id)
    if (seenMessageIds.size > 256) seenMessageIds.delete(seenMessageIds.values().next().value!)
    const unreadInc = message.sender.id === me.value?.id ? 0 : 1
    const incomingTier = getMessageTier(message)
    const found = patchConversation(message.conversationId, (existing) => {
      const isSelectedConversation = selectedConversationId.value === message.conversationId && (opts.isViewing?.value ?? true) && (opts.isLatestWindow?.value ?? true) && (typeof document === 'undefined' || (document.visibilityState === 'visible' && document.hasFocus()))
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
        lastMessage: {
          id: message.id,
          body: chatMessagePreview(message),
          createdAt: message.createdAt,
          senderId: message.sender.id,
        },
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
    if (disposed || !id || !atBottom.value || !(opts.isViewing?.value ?? true) || !(opts.isLatestWindow?.value ?? true)) return
    if (typeof document === 'undefined' || document.visibilityState !== 'visible' || !document.hasFocus()) return

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

  const marvRows = useChatMarvRows(marv, conversations, selectedConversation)

  // ─── Actions on the selected conversation ────────────────────────────────────

  async function acceptConversation(conversationId: string) {
    await apiFetch(`/messages/conversations/${conversationId}/accept`, { method: 'POST' })
    await refreshAllConversationTabs()
  }

  async function toggleMuteConversation() {
    const identity = me.value?.id
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
      if (disposed || identity !== me.value?.id) return
      // Revert on failure
      patchConversation(convo.id, (c) => ({ ...c, isMuted: !newMuted }))
    }
  }

  function teardown() {
    disposed = true
    search.teardown()
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
    listFailed,
    listRefreshing,
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
    mergeConversation,
    updateConversationUnread,
    updateConversationForMessage,
    markConversationReadIfVisible,
    ...presentation,
    ...search,
    ...marvRows,
    // Actions
    acceptConversation,
    toggleMuteConversation,
    teardown,
  }
}
