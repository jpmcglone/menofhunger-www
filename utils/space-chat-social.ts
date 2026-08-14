import type { MessageReplySnippet, SpaceChatMessage, SpaceChatReactionSummary } from '~/types/api'

export function spaceChatReplySnippetFromParent(parent: SpaceChatMessage): MessageReplySnippet | null {
  if (parent.kind !== 'user') return null
  const thumb = parent.media?.[0]?.url ?? null
  const body = String(parent.body ?? '').trim()
  return {
    id: parent.id,
    senderUsername: parent.sender?.username ?? null,
    bodyPreview: body.slice(0, 200) || (thumb ? '📷 Photo' : ''),
    mediaThumbnailUrl: thumb,
  }
}

export function attachSpaceChatReply(
  message: SpaceChatMessage,
  byId: Map<string, SpaceChatMessage>,
): SpaceChatMessage {
  if (message.kind !== 'user') return message
  const replyToId = String(message.replyToId ?? '').trim()
  if (!replyToId) return message
  if (message.replyTo) return message
  const parent = byId.get(replyToId)
  if (!parent) return message
  const replyTo = spaceChatReplySnippetFromParent(parent)
  if (!replyTo) return message
  return { ...message, replyTo }
}

export function resolveSpaceChatReplies(messages: SpaceChatMessage[]): SpaceChatMessage[] {
  const byId = new Map(messages.map((m) => [m.id, m]))
  return messages.map((m) => attachSpaceChatReply(m, byId))
}

export function applySpaceChatReaction(
  message: SpaceChatMessage,
  event: { userId: string; username?: string | null; reactionId: string; emoji: string },
  viewerId: string | null,
): SpaceChatMessage | null {
  if (message.kind !== 'user') return null
  const userId = String(event.userId ?? '').trim()
  const reactionId = String(event.reactionId ?? '').trim()
  const emoji = String(event.emoji ?? '').trim()
  if (!userId || !reactionId || !emoji) return null

  const groups = [...(message.reactions ?? [])]
  const idx = groups.findIndex((g) => g.reactionId === reactionId)
  const existing = idx >= 0 ? groups[idx]! : null
  const already = Boolean(existing?.reactors.some((r) => r.id === userId))
  const username = event.username ?? existing?.reactors.find((r) => r.id === userId)?.username ?? null

  let next: SpaceChatReactionSummary[]
  if (already && existing) {
    const reactors = existing.reactors.filter((r) => r.id !== userId)
    if (reactors.length === 0) {
      next = groups.filter((g) => g.reactionId !== reactionId)
    } else {
      const group: SpaceChatReactionSummary = {
        ...existing,
        count: reactors.length,
        reactedByMe: Boolean(viewerId && reactors.some((r) => r.id === viewerId)),
        reactors,
      }
      next = groups.map((g) => (g.reactionId === reactionId ? group : g))
    }
  } else {
    const reactor = { id: userId, username }
    if (existing) {
      const reactors = [...existing.reactors, reactor]
      const group: SpaceChatReactionSummary = {
        ...existing,
        emoji,
        count: reactors.length,
        reactedByMe: Boolean(viewerId && reactors.some((r) => r.id === viewerId)),
        reactors,
      }
      next = groups.map((g) => (g.reactionId === reactionId ? group : g))
    } else {
      next = [
        ...groups,
        {
          reactionId,
          emoji,
          count: 1,
          reactedByMe: Boolean(viewerId && viewerId === userId),
          reactors: [reactor],
        },
      ]
    }
  }
  return { ...message, reactions: next }
}
