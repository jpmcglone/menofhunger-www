import type { useChatPageState } from './useChatPage'
import type { useChatPageView } from './useChatPageView'

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
