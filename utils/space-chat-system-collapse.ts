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

function systemUserId(msg: SpaceChatMessage): string {
  if (msg.kind !== 'system') return ''
  return String(msg.system?.userId ?? '').trim()
}

/** Most recent signal for this person in `prior`: chatting or last system verb. */
function lastKnownPresence(prior: SpaceChatMessage[], userId: string): 'in' | 'out' | 'unknown' {
  const id = String(userId ?? '').trim()
  if (!id) return 'unknown'
  for (let i = prior.length - 1; i >= 0; i -= 1) {
    const m = prior[i]
    if (!m) continue
    if (m.kind === 'user' && String(m.sender?.id ?? '').trim() === id) return 'in'
    if (m.kind === 'system' && systemUserId(m) === id) {
      return lastEventOf(m) === 'join' ? 'in' : 'out'
    }
  }
  return 'unknown'
}

function rewriteSystem(
  msg: SpaceChatMessage,
  firstEvent: SystemEvent,
  lastEvent: SystemEvent,
): SpaceChatMessage {
  if (msg.kind !== 'system') return msg
  return {
    ...msg,
    kind: 'system',
    system: {
      firstEvent,
      lastEvent,
      userId: msg.system.userId,
      username: msg.system.username,
    },
    body: spaceChatSystemBody(firstEvent, lastEvent, systemLabel(msg)),
    sender: null,
  }
}

/**
 * A reconnect often arrives as join-then-leave (new socket before old cleanup).
 * If they were already in the room, that pair is a leave — not a fresh bounce.
 */
function normalizeSoloSystem(
  msg: SpaceChatMessage,
  prior: SpaceChatMessage[],
): SpaceChatMessage | null {
  if (msg.kind !== 'system') return msg
  const first = firstEventOf(msg)
  const last = lastEventOf(msg)
  const presence = lastKnownPresence(prior, systemUserId(msg))

  if (first === 'join' && last === 'leave' && presence === 'in') {
    return rewriteSystem(msg, 'leave', 'leave')
  }
  if (first === 'join' && last === 'join' && presence === 'in') {
    return null
  }
  return msg
}

function mergeSystemRun(
  kept: SpaceChatMessage,
  incoming: SpaceChatMessage,
  priorBeforeKept: SpaceChatMessage[],
): SpaceChatMessage | null {
  if (kept.kind !== 'system' || incoming.kind !== 'system') return incoming
  const first = firstEventOf(kept)
  const last = lastEventOf(incoming)
  const presence = lastKnownPresence(priorBeforeKept, systemUserId(incoming))

  if (first === 'join' && last === 'leave' && presence === 'in') {
    return rewriteSystem(
      { ...incoming, createdAt: incoming.createdAt || kept.createdAt },
      'leave',
      'leave',
    )
  }
  if (first === 'join' && last === 'join' && presence === 'in') {
    return null
  }

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
 *
 * Reconnect flaps (join then leave while they were already chatting) become "left".
 */
export function collapseAdjacentSpaceChatSystemMessages(
  messages: SpaceChatMessage[],
): SpaceChatMessage[] {
  if (!Array.isArray(messages) || messages.length === 0) return messages
  const out: SpaceChatMessage[] = []
  for (const msg of messages) {
    if (msg.kind !== 'system') {
      out.push(msg)
      continue
    }
    const normalized = normalizeSoloSystem(msg, out)
    if (!normalized) continue

    const prev = out.at(-1)
    const prevKey = prev ? systemUserKey(prev) : null
    const nextKey = systemUserKey(normalized)
    if (prev && prevKey && nextKey && prevKey === nextKey) {
      const merged = mergeSystemRun(prev, normalized, out.slice(0, -1))
      if (!merged) {
        out.pop()
        continue
      }
      out[out.length - 1] = merged
      continue
    }
    out.push(normalized)
  }
  return out
}
