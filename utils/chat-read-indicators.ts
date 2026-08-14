import type { MessageParticipant } from '~/types/api'
import type { ChatListItem } from '~/composables/chat/useChatTimeFormatting'

/**
 * Place each group-chat participant on the last message they have actually
 * read. Day dividers are ignored — only message rows matter.
 *
 * If their last-read timestamp lands on a message they sent, walk back to the
 * previous row so they don't vanish (the old attach-and-skip hid them).
 */
export function assignGroupReadIndicators(
  items: ChatListItem[],
  participants: MessageParticipant[],
  opts: { meId: string | null; hideViewer: boolean },
): Map<string, MessageParticipant[]> {
  const map = new Map<string, MessageParticipant[]>()
  const messages = items.filter((item): item is Extract<ChatListItem, { type: 'message' }> => item.type === 'message')
  if (!messages.length || !participants.length) return map

  for (const participant of participants) {
    if (opts.hideViewer && participant.user.id === opts.meId) continue
    if (!participant.lastReadAt) continue
    const readMs = Date.parse(participant.lastReadAt)
    if (!Number.isFinite(readMs)) continue

    let idx = -1
    for (let i = 0; i < messages.length; i++) {
      if (messages[i]!.createdAtMs <= readMs) idx = i
    }
    if (idx < 0) continue

    while (idx > 0 && messages[idx]!.message.sender.id === participant.user.id) {
      idx -= 1
    }

    const target = messages[idx]!
    if (target.message.sender.id === participant.user.id) continue

    const existing = map.get(target.message.id)
    if (existing) existing.push(participant)
    else map.set(target.message.id, [participant])
  }

  return map
}
