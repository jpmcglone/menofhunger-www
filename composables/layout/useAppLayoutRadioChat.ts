import type { ComputedRef } from 'vue'

/** Keeps the space live chat subscribed, owns the mobile sheet, and counts unread messages while the panel is hidden. */
export function useAppLayoutRadioChat(options: { radioHasStation: ComputedRef<boolean>; showRadioChat: ComputedRef<boolean> }) {
  const { radioHasStation, showRadioChat } = options
  const { user } = useAuth()
  // Keep space chat subscription alive while a space is selected (even when not on /spaces).
  useSpaceLiveChat()

  // Mobile bottom-sheet chat
  const radioChatSheetOpen = useState<boolean>('space-chat-sheet-open', () => false)
  const radioChat = useSpaceLiveChat({ passive: true })
  watch(
    () => radioHasStation.value,
    (has) => {
      if (!has) radioChatSheetOpen.value = false
    },
    { immediate: true },
  )
  watch(
    () => showRadioChat.value,
    (show) => {
      // If the right-rail live chat is visible again (e.g., resized back up),
      // ensure the overlay is dismissed and doesn't auto-show next time.
      if (show) radioChatSheetOpen.value = false
    },
    { immediate: true },
  )

  // ── Live-chat unread badge ────────────────────────────────────────────────────
  // Count non-system, non-self messages that arrive while the chat panel is either
  // not mounted (mobile modal closed) or not scrolled to the bottom.
  // When the panel IS visible and at the bottom it handles its own clear; we
  // only increment here for the "panel not showing" case to avoid double-counting.
  const { chatPanelVisible, chatAtBottom, clearUnread: clearChatUnread, incrementUnread: incrementChatUnread } = useSpaceChatUnread()

  let lastKnownChatMsgCount = 0
  watch(
    () => radioChat.messages.value,
    (msgs, prevMsgs) => {
      if (!import.meta.client) return
      const len = msgs.length
      const prevLen = prevMsgs?.length ?? lastKnownChatMsgCount
      lastKnownChatMsgCount = len
      if (len <= prevLen) return
      const newMsgs = msgs.slice(prevLen)
      // Only count when the panel isn't already showing the messages at the bottom.
      if (chatPanelVisible.value && chatAtBottom.value) return
      const countable = newMsgs.filter(
        (m) => m.kind === 'user' && m.sender?.id !== user.value?.id,
      ).length
      if (countable > 0) incrementChatUnread(countable)
    },
  )

  // Reset the count whenever the selected space changes.
  watch(
    () => radioChat.spaceId.value,
    (_next, prev) => {
      if (prev !== undefined) clearChatUnread()
    },
  )
  // ─────────────────────────────────────────────────────────────────────────────

}
