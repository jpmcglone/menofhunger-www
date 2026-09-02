/** Fixed in-call reaction set. Same on web and iOS — keep in sync. */
export const CALL_REACTION_EMOJIS = ['👍', '❤️', '😂', '🔥', '🙏', '👏'] as const
export type CallReactionEmoji = (typeof CALL_REACTION_EMOJIS)[number]

export const CALL_REACTION_TTL_MS = 2_500
export const CALL_DATA_CHANNEL_LABEL = 'moh'

export type CallReaction = {
  id: string
  userId: string
  emoji: string
  at: number
}

export type CallReactionWire = {
  t: 'reaction'
  emoji: string
  at: number
}

export function isCallReactionEmoji(value: string): value is CallReactionEmoji {
  return (CALL_REACTION_EMOJIS as readonly string[]).includes(value)
}

export function parseCallReactionPayload(raw: unknown): CallReactionWire | null {
  if (!raw || typeof raw !== 'object') return null
  const rec = raw as Record<string, unknown>
  if (rec.t !== 'reaction') return null
  const emoji = typeof rec.emoji === 'string' ? rec.emoji : ''
  if (!isCallReactionEmoji(emoji)) return null
  const at = typeof rec.at === 'number' && Number.isFinite(rec.at) ? rec.at : Date.now()
  return { t: 'reaction', emoji, at }
}

export function encodeCallReaction(emoji: string, at = Date.now()): CallReactionWire {
  return { t: 'reaction', emoji, at }
}

/**
 * Append a reaction and drop anything older than the TTL. Same `id` is a no-op
 * (socket/data-channel echo). Newest last so the overlay can stack.
 */
export function reduceCallReactions(list: CallReaction[], incoming: CallReaction, now: number): CallReaction[] {
  const cutoff = now - CALL_REACTION_TTL_MS
  const kept = list.filter((r) => r.at >= cutoff && r.id !== incoming.id)
  if (incoming.at < cutoff) return kept
  return [...kept, incoming].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id))
}

export function pruneCallReactions(list: CallReaction[], now: number): CallReaction[] {
  const cutoff = now - CALL_REACTION_TTL_MS
  return list.filter((r) => r.at >= cutoff)
}
