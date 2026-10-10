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
    failed: () => Boolean(thread.loadError.value),
    context: () => `${selectedChatKey.value}:${jumpTargetMessageId.value}`,
    source: () => messages.value.length ? 'network' : 'empty',
  })

  let disposed = false
  const initialIdentity = ctx.me.value?.id
  function stillCurrent() { return !disposed && (!initialIdentity || initialIdentity === ctx.me.value?.id) }

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
      if (!stillCurrent()) return

      // Marv: load the viewer's Marv state (preferences, credits, marv user id) and
      // subscribe to `marv:credits-updated` so the credits chip in the chat strip /
      // pinned row stays live without polling. Safe to call regardless of premium —
      // the API gates non-premium responses, and the pinned row component renders a
      // CTA in that case.
      try { await marv.ensureLoaded() } catch { /* ignore */ }
      if (!stillCurrent()) return
      if (!ctx.surfaceOptions.embedded || ctx.surfaceOptions.listOnly || (ctx.surfaceOptions.visible?.value ?? true)) marv.startRealtime()

      if (!viewerCanUseChat.value) return

      if (!ctx.surfaceOptions.embedded || ctx.surfaceOptions.listOnly || (ctx.surfaceOptions.visible?.value ?? true)) registerRealtime()
      emitMessagesScreen(ctx.isViewingSurface.value && ctx.isLatestWindow.value && ctx.atBottom.value, selectedConversationId.value)

      // Pre-fetch allowed reactions (used by the reaction picker)
      thread.loadAvailableReactions()

      if (!ctx.surfaceOptions.embedded || ctx.surfaceOptions.listOnly) await fetchConversations('primary', { forceRefresh: true }).catch(() => { /* ignore */ })
      if (!stillCurrent()) return

      if (!ctx.surfaceOptions.embedded) await routeSync.handleInitialQueryParams()
      else if (ctx.surfaceOptions.openMarv) await routeSync.openMarvChat()
      else if (!selectedConversationId.value && ctx.surfaceOptions.initialRecipients?.length) await routeSync.openDraftChatWithRecipients(ctx.surfaceOptions.initialRecipients)

      if (selectedConversationId.value) {
        try { await selectConversation(selectedConversationId.value, { replace: true, jumpToMessageId: ctx.surfaceOptions.jumpMessageId?.value ?? undefined }) } catch { /* ignore */ }
      } else if (!ctx.surfaceOptions.embedded && !isTinyViewport.value && !isDraftChat.value) {
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
      if (!stillCurrent()) return
      revealChatScreenAfterFade()

      // Presence subscriptions are driven by ChatConversationList's
      // IntersectionObserver — rows in the viewport call addInterest, rows that
      // scroll out call removeInterest. There's no eager bulk seed here.
      // (See `onConversationRowPresenceVisible`.)

      // Fetch requests tab after revealing so the screen appears quickly.
      if (!ctx.surfaceOptions.embedded || ctx.surfaceOptions.listOnly) await fetchConversations('requests', { forceRefresh: true }).catch(() => { /* ignore */ })
      if (!stillCurrent()) return

      if (selectedConversationId.value) {
        const inPrimary = conversations.value.primary.some((c) => c.id === selectedConversationId.value)
        const inRequests = conversations.value.requests.some((c) => c.id === selectedConversationId.value)
        if (inRequests && !inPrimary) activeTab.value = 'requests'
      } else if (conversations.value.primary.length === 0 && conversations.value.requests.length > 0) {
        activeTab.value = 'requests'
      }

      // Ensure screen reveals even if everything above failed.
      if (!stillCurrent()) return
      revealChatScreenAfterFade()
    })()
  })

  onBeforeUnmount(() => {
    disposed = true
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
    if (!stillCurrent() || !viewerCanUseChat.value) return
    if (ctx.surfaceOptions.embedded && !ctx.surfaceOptions.listOnly && !(ctx.surfaceOptions.visible?.value ?? true)) return
    if (connected && (route.path === '/chat' || ctx.surfaceOptions.embedded)) {
      if (!ctx.surfaceOptions.embedded || ctx.surfaceOptions.listOnly) void conversationsApi.refreshAllConversationTabs().catch(() => undefined)
      if (selectedConversationId.value && (!ctx.surfaceOptions.embedded || (ctx.surfaceOptions.visible?.value ?? true))) void thread.loadThread(selectedConversationId.value, { refresh: true }).catch(() => undefined)
      emitMessagesScreen(ctx.isViewingSurface.value && ctx.isLatestWindow.value && ctx.atBottom.value, selectedConversationId.value)
    }
  })

  watch(
    () => selectedChatKey.value,
    () => {
      if (!import.meta.client) return
      if (!viewerCanUseChat.value) return
      // Keep focus on non-mobile layouts; when the tab bar is visible, avoid opening the keyboard.
      if (isTabBarMode.value || ctx.surfaceOptions.embedded) return
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

  if (ctx.surfaceOptions.embedded && !ctx.surfaceOptions.listOnly && ctx.surfaceOptions.visible) {
    watch(ctx.surfaceOptions.visible, visible => {
      if (!stillCurrent() || !viewerCanUseChat.value) return
      if (!visible) { teardownRealtime(); marv.stopRealtime(); return }
      registerRealtime()
      marv.startRealtime()
      if (!ctx.surfaceOptions.embedded || ctx.surfaceOptions.listOnly) void conversationsApi.refreshAllConversationTabs().catch(() => undefined)
      if (selectedConversationId.value) void thread.loadThread(selectedConversationId.value, { refresh: true }).catch(() => undefined)
    })
  }
  function catchUpOnActivation() {
    if (!stillCurrent() || !viewerCanUseChat.value || document.visibilityState !== 'visible' || !document.hasFocus()) return
    if (ctx.surfaceOptions.embedded && !(ctx.surfaceOptions.visible?.value ?? true)) return
    if (!ctx.surfaceOptions.embedded || ctx.surfaceOptions.listOnly) void conversationsApi.refreshAllConversationTabs().catch(() => undefined)
    if (selectedConversationId.value) {
      void thread.loadThread(selectedConversationId.value, { refresh: true }).catch(() => undefined)
      if (ctx.isViewingSurface.value && ctx.atBottom.value) conversationsApi.markConversationReadIfVisible(selectedConversationId.value)
    }
  }
  onMounted(() => {
    window.addEventListener('focus', catchUpOnActivation)
    document.addEventListener('visibilitychange', catchUpOnActivation)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('focus', catchUpOnActivation)
    document.removeEventListener('visibilitychange', catchUpOnActivation)
  })

  watch([ctx.isViewingSurface, ctx.isLatestWindow, ctx.atBottom], ([viewing, latest, bottom]) => {
    emitMessagesScreen(viewing && latest && bottom, selectedConversationId.value)
    if (viewing && selectedConversationId.value && ctx.atBottom.value) {
      conversationsApi.markConversationReadIfVisible(selectedConversationId.value)
    }
  }, { flush: 'sync' })

  return {}
}
