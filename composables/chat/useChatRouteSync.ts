import { ref, watch, type ComputedRef, type Ref } from 'vue'
import type { FollowListUser, LookupMessageConversationResponse, UserPreview } from '~/types/api'
import { userColorTier } from '~/utils/user-tier'

export interface UseChatRouteSyncOptions {
  selectedConversationId: Ref<string | null>
  selectedChatKey: Ref<string | null>
  draftRecipients: Ref<FollowListUser[]>
  /** Whether the viewer is allowed to use chat at all (verified or premium). */
  viewerCanUseChat: ComputedRef<boolean>
  marv: ReturnType<typeof useMarv>
  ensureAuthLoaded: () => Promise<unknown>
  emitMessagesScreen: (visible: boolean, conversationId?: string | null) => void
  cacheCurrentChatScrollPosition: () => void
  conversationsApi: {
    refreshAllConversationTabs: () => Promise<void>
  }
  thread: {
    jumpTargetMessageId: Ref<string | null>
    beginThreadSwitch: (opts?: { jumpToMessageId?: string | null }) => void
    loadThread: (id: string, opts?: { jumpToMessageId?: string | null }) => Promise<void>
    resetThread: () => void
    showDraftPane: () => void
  }
}

/**
 * URL ↔ selection sync for the chat page.
 *
 * Owns every query-param read/write: `?c=<conversationId>` (selection),
 * `?m=<messageId>` (jump target), `?to=<username>` (compose to user), and
 * `?marv=1` (open the Marv DM). Selection changes funnel through
 * `selectConversation` / `clearSelection`, which delegate the thread state
 * resets and fetches to `useChatThread`.
 */
export function useChatRouteSync(opts: UseChatRouteSyncOptions) {
  const {
    selectedConversationId,
    selectedChatKey,
    draftRecipients,
    viewerCanUseChat,
    marv,
    ensureAuthLoaded,
    emitMessagesScreen,
    cacheCurrentChatScrollPosition,
    conversationsApi,
    thread,
  } = opts

  const route = useRoute()
  const router = useRouter()
  const { apiFetchData } = useApiClient()

  // ─── Selection ───────────────────────────────────────────────────────────────

  async function selectConversation(id: string, selectOpts?: { replace?: boolean; jumpToMessageId?: string }) {
    cacheCurrentChatScrollPosition()
    const targetMsgId = selectOpts?.jumpToMessageId ?? null
    thread.beginThreadSwitch({ jumpToMessageId: targetMsgId })
    selectedConversationId.value = id
    selectedChatKey.value = id
    emitMessagesScreen(true, id)
    draftRecipients.value = []

    const replace = selectOpts?.replace ?? false
    const currentC = typeof route.query.c === 'string' ? route.query.c : null
    const currentM = typeof route.query.m === 'string' ? route.query.m : null
    if (currentC !== id || currentM !== targetMsgId) {
      const nextQuery: Record<string, string> = { ...(route.query as Record<string, string>), c: id }
      if (targetMsgId) nextQuery.m = targetMsgId
      else delete nextQuery.m
      if (replace) await router.replace({ query: nextQuery })
      else await router.push({ query: nextQuery })
    }
    await thread.loadThread(id, { jumpToMessageId: targetMsgId })
  }

  async function clearSelection(clearOpts?: { replace?: boolean; preserveDraft?: boolean }) {
    cacheCurrentChatScrollPosition()
    thread.resetThread()
    selectedConversationId.value = null
    selectedChatKey.value = null
    emitMessagesScreen(true, null)
    if (!clearOpts?.preserveDraft) {
      draftRecipients.value = []
    }
    const replace = clearOpts?.replace ?? false
    const q = { ...route.query } as Record<string, unknown>
    delete q.c
    delete q.m
    if (replace) await router.replace({ query: q as Record<string, string> })
    else await router.push({ query: q as Record<string, string> })
  }

  function syncSelectedFromRoute() {
    const c = typeof route.query.c === 'string' ? route.query.c : null
    const m = typeof route.query.m === 'string' ? route.query.m : null
    if (c && (c !== selectedConversationId.value || m !== thread.jumpTargetMessageId.value)) {
      void selectConversation(c, { replace: true, jumpToMessageId: m ?? undefined })
      return
    }
    if (!c && selectedConversationId.value) {
      void clearSelection({ replace: true })
    }
  }

  // ─── Draft / deep-link flows ─────────────────────────────────────────────────

  function normalizeToUsernameParam(val: unknown): string | null {
    const u = typeof val === 'string' ? val.trim() : ''
    return u ? u : null
  }

  function mapPreviewToFollowListUser(preview: UserPreview): FollowListUser {
    return {
      id: preview.id,
      username: preview.username,
      name: preview.name,
      premium: Boolean(preview.premium),
      premiumPlus: Boolean(preview.premiumPlus),
      isOrganization: Boolean(preview.isOrganization),
      stewardBadgeEnabled: Boolean(preview.stewardBadgeEnabled ?? true),
      verifiedStatus: preview.verifiedStatus ?? 'none',
      avatarUrl: preview.avatarUrl ?? null,
      relationship: preview.relationship,
    }
  }

  async function openDraftChatWithRecipients(recipients: FollowListUser[]) {
    draftRecipients.value = recipients
    // Clear any selected existing chat and show draft pane.
    await clearSelection({ replace: true, preserveDraft: true })
    selectedChatKey.value = 'draft'
    thread.showDraftPane()
  }

  /**
   * Open (or create-on-first-message) the marv DM. Resolves the marv username
   * from `useMarv()` (it comes back from `GET /marvin/me`) and forwards to
   * `openChatToUsername`. Used by the pinned marv row when the conversation
   * doesn't yet exist (route lands as `?marv=1`).
   */
  async function openMarvChat() {
    await marv.ensureLoaded().catch(() => null)
    const username = marv.marvUsername.value
    if (!username) return
    await openChatToUsername(username)
  }

  async function openChatToUsername(username: string) {
    const u = (username ?? '').trim()
    if (!u) return

    await ensureAuthLoaded().catch(() => null)

    // If user can't use chat at all, bail (screen already shows verify gate).
    if (!viewerCanUseChat.value) {
      return
    }

    try {
      const preview = await apiFetchData<UserPreview>(`/users/${encodeURIComponent(u)}/preview`, { method: 'GET' })
      if (!preview?.id) {
        return
      }
      const recipient = mapPreviewToFollowListUser(preview)
      const targetIsVerified = userColorTier(preview) !== 'normal'

      const lookup = await apiFetchData<LookupMessageConversationResponse['data']>('/messages/lookup', {
        method: 'POST',
        body: { user_ids: [recipient.id] },
      })
      const conversationId = lookup?.conversationId ?? null
      if (conversationId) {
        // Ensure convo exists in lists (selectConversation doesn't upsert into lists).
        await conversationsApi.refreshAllConversationTabs()
        // Set `c` and remove `to` in a single URL update (avoid the extra jump).
        const nextQuery: Record<string, unknown> = { ...(route.query as Record<string, unknown>), c: conversationId }
        delete nextQuery['to']
        await router.replace({ query: nextQuery as Record<string, string> })
        await selectConversation(conversationId, { replace: true })
        return
      }

      // No existing chat: don't allow starting a chat with an unverified user.
      if (!targetIsVerified) return

      await openDraftChatWithRecipients([recipient])
    } catch {
      // Non-fatal: ignore
    }
  }

  /** Resolve and strip a `?marv=1` query param (deep link to the Marv DM). */
  async function handleMarvQueryParam() {
    try { await openMarvChat() } catch { /* ignore */ }
    const next: Record<string, string | string[]> = {}
    for (const [k, v] of Object.entries(route.query)) {
      if (k === 'marv') continue
      if (typeof v === 'string') next[k] = v
      else if (Array.isArray(v)) next[k] = v.filter((x): x is string => typeof x === 'string')
    }
    await router.replace({ query: next })
  }

  /** Handle `?to=` / `?marv=` params present when the page first mounts. */
  async function handleInitialQueryParams() {
    const toUsername = normalizeToUsernameParam(route.query.to)
    if (toUsername) {
      try { await openChatToUsername(toUsername) } catch { /* ignore */ }
    }
    if (route.query.marv === '1') {
      await handleMarvQueryParam()
    }
  }

  // ─── Route watchers ──────────────────────────────────────────────────────────

  watch(
    () => route.query.c,
    () => {
      syncSelectedFromRoute()
    },
  )

  // Handle `/chat?marv=1` changes while already on /chat.
  watch(
    () => route.query.marv === '1',
    (isMarv) => {
      if (!isMarv) return
      void handleMarvQueryParam()
    },
  )

  // Handle `/chat?to=<username>` changes while already on /chat.
  // (Without this, clicking “Send message” from within chat only updates the URL.)
  const lastHandledToUsername = ref<string | null>(null)
  watch(
    () => normalizeToUsernameParam(route.query.to),
    (toUsername) => {
      if (!toUsername) return
      if (toUsername === lastHandledToUsername.value) return
      lastHandledToUsername.value = toUsername
      void openChatToUsername(toUsername)
    },
  )

  return {
    selectConversation,
    clearSelection,
    syncSelectedFromRoute,
    openDraftChatWithRecipients,
    openMarvChat,
    openChatToUsername,
    handleInitialQueryParams,
  }
}
