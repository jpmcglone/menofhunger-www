import type { SpaceChatMessage } from '~/types/api'

type SystemEvent = 'join' | 'leave'

function systemUserKey(msg: SpaceChatMessage): string | null {
  if (msg.kind !== 'system') return null
  const id = String(msg.system?.userId ?? '').trim()
  if (id) return `id:${id}`
  const username = String(msg.system?.username ?? '').trim().toLowerCase()
  if (username) return `name:${username}`
  return null
}

function parseEvent(raw: unknown): SystemEvent | null {
  return raw === 'join' || raw === 'leave' ? raw : null
}

function inferEventFromBody(body: string, which: 'first' | 'last'): SystemEvent {
  const text = String(body ?? '')
  if (/left and joined/i.test(text)) return which === 'first' ? 'leave' : 'join'
  if (/joined and left/i.test(text)) return which === 'first' ? 'join' : 'leave'
  if (/\bleft\b/i.test(text)) return 'leave'
  return 'join'
}

function firstEventOf(msg: SpaceChatMessage): SystemEvent {
  if (msg.kind !== 'system') return 'join'
  return parseEvent(msg.system?.firstEvent) ?? inferEventFromBody(msg.body, 'first')
}

function lastEventOf(msg: SpaceChatMessage): SystemEvent {
  if (msg.kind !== 'system') return 'join'
  return parseEvent(msg.system?.lastEvent) ?? inferEventFromBody(msg.body, 'last')
}

function systemLabel(msg: SpaceChatMessage): string {
  if (msg.kind !== 'system') return 'Someone'
  const username = String(msg.system?.username ?? '').trim()
  return username ? `@${username}` : 'Someone'
}

export function spaceChatSystemBody(first: SystemEvent, last: SystemEvent, label: string): string {
  const firstWord = first === 'join' ? 'joined' : 'left'
  const lastWord = last === 'join' ? 'joined' : 'left'
  const combined = firstWord === lastWord ? lastWord : `${firstWord} and ${lastWord}`
  return `${label} has ${combined} the chat`
}

function mergeSystemRun(kept: SpaceChatMessage, incoming: SpaceChatMessage): SpaceChatMessage {
  if (kept.kind !== 'system' || incoming.kind !== 'system') return incoming
  const first = firstEventOf(kept)
  const last = lastEventOf(incoming)
  const firstEvent = first === last ? last : first
  const lastEvent = last
  return {
    ...kept,
    createdAt: incoming.createdAt || kept.createdAt,
    system: {
      firstEvent,
      lastEvent,
      userId: incoming.system.userId || kept.system.userId,
      username: incoming.system.username ?? kept.system.username,
    },
    body: spaceChatSystemBody(firstEvent, lastEvent, systemLabel(incoming)),
    sender: null,
  }
}

/**
 * Collapse a run of consecutive system lines for the same person into one row:
 * first event + last event. If those match, keep only the last ("joined" / "left").
 */
export function collapseAdjacentSpaceChatSystemMessages(
  messages: SpaceChatMessage[],
): SpaceChatMessage[] {
  if (!Array.isArray(messages) || messages.length < 2) return messages
  const out: SpaceChatMessage[] = []
  for (const msg of messages) {
    const prev = out.at(-1)
    const prevKey = prev ? systemUserKey(prev) : null
    const nextKey = systemUserKey(msg)
    if (prev && prevKey && nextKey && prevKey === nextKey) {
      out[out.length - 1] = mergeSystemRun(prev, msg)
      continue
    }
    out.push(msg)
  }
  return out
}
