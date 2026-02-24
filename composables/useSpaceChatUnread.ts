/**
 * Shared state for the live-chat unread-message count.
 *
 * Sources of truth:
 *   - `unreadCount`      – global badge shown on the radio-bar chat button
 *   - `chatPanelVisible` – set by RadioLiveChatPanel on mount/unmount
 *   - `chatAtBottom`     – set by RadioLiveChatPanel when its scroller reaches bottom
 *   - `scrollTrigger`    – incremented by the radio bar to tell the panel to jump to bottom
 *
 * Counting rule:
 *   Increment on every incoming non-system, non-self message when
 *   the panel is NOT visible OR is NOT at the bottom.
 */

const UNREAD_KEY = 'space-chat-unread'
const PANEL_VISIBLE_KEY = 'space-chat-panel-visible'
const AT_BOTTOM_KEY = 'space-chat-at-bottom'
const SCROLL_TRIGGER_KEY = 'space-chat-scroll-trigger'

export function useSpaceChatUnread() {
  const unreadCount = useState<number>(UNREAD_KEY, () => 0)
  const chatPanelVisible = useState<boolean>(PANEL_VISIBLE_KEY, () => false)
  const chatAtBottom = useState<boolean>(AT_BOTTOM_KEY, () => true)
  const scrollTrigger = useState<number>(SCROLL_TRIGGER_KEY, () => 0)

  function clearUnread() {
    unreadCount.value = 0
  }

  function incrementUnread(n = 1) {
    unreadCount.value = Math.max(0, unreadCount.value) + n
  }

  function triggerScrollToBottom() {
    scrollTrigger.value += 1
  }

  return {
    unreadCount: readonly(unreadCount),
    chatPanelVisible,
    chatAtBottom,
    scrollTrigger: readonly(scrollTrigger),
    clearUnread,
    incrementUnread,
    triggerScrollToBottom,
  }
}
