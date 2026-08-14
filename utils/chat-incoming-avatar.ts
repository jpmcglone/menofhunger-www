import type { ChatListItem } from '~/composables/chat/useChatTimeFormatting'

/**
 * X-style group chat avatars: show the sender's face on the last incoming
 * message in a same-sender run. Day dividers start a new run.
 */
export function shouldShowGroupIncomingAvatar(
  items: ChatListItem[],
  listIndex: number,
  opts: { isGroupChat: boolean; meId: string | null },
): boolean {
  if (!opts.isGroupChat) return false
  const item = items[listIndex]
  if (!item || item.type !== 'message') return false
  if (item.message.sender.id === opts.meId) return false

  for (let i = listIndex + 1; i < items.length; i++) {
    const next = items[i]!
    if (next.type === 'divider') return true
    return next.message.sender.id !== item.message.sender.id
  }
  return true
}
