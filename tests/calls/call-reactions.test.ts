import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  CALL_REACTION_EMOJIS,
  CALL_REACTION_TTL_MS,
  encodeCallReaction,
  parseCallReactionPayload,
  pruneCallReactions,
  reduceCallReactions,
} from '~/composables/calls/callReactions'

const root = resolve(import.meta.dirname, '../..')
const read = (p: string) => readFileSync(resolve(root, p), 'utf8')

describe('call reaction reducer', () => {
  const now = 1_710_000_000_000

  it('appends newest last and drops stale entries', () => {
    const stale = { id: 'old', userId: 'u1', emoji: '👍', at: now - CALL_REACTION_TTL_MS - 1 }
    const keep = { id: 'keep', userId: 'u1', emoji: '❤️', at: now - 100 }
    const next = { id: 'new', userId: 'u2', emoji: '🔥', at: now }
    expect(reduceCallReactions([stale, keep], next, now).map((r) => r.id)).toEqual(['keep', 'new'])
  })

  it('dedupes by id so a local echo is a no-op', () => {
    const incoming = { id: 'u1-1-🔥', userId: 'u1', emoji: '🔥', at: now }
    const once = reduceCallReactions([], incoming, now)
    expect(reduceCallReactions(once, incoming, now)).toEqual(once)
  })

  it('orders by at then id', () => {
    const a = { id: 'b', userId: 'u1', emoji: '👍', at: now }
    const b = { id: 'a', userId: 'u2', emoji: '❤️', at: now }
    expect(reduceCallReactions([a], b, now).map((r) => r.id)).toEqual(['a', 'b'])
  })

  it('rejects unknown emoji and non-reaction payloads', () => {
    expect(parseCallReactionPayload({ t: 'reaction', emoji: '💩', at: now })).toBeNull()
    expect(parseCallReactionPayload({ t: 'ping' })).toBeNull()
    expect(parseCallReactionPayload(encodeCallReaction('🔥', now))).toEqual({ t: 'reaction', emoji: '🔥', at: now })
    expect(CALL_REACTION_EMOJIS).toHaveLength(6)
  })

  it('pruneCallReactions drops only expired rows', () => {
    const list = [
      { id: 'old', userId: 'u1', emoji: '👍', at: now - CALL_REACTION_TTL_MS - 10 },
      { id: 'live', userId: 'u1', emoji: '👏', at: now - 10 },
    ]
    expect(pruneCallReactions(list, now).map((r) => r.id)).toEqual(['live'])
  })
})

describe('call reaction chrome', () => {
  it('wires a picker of the six emojis and a floating overlay', () => {
    const controls = read('components/app/calls/CallControls.vue')
    expect(controls).toContain('call-reaction-picker')
    expect(controls).toContain('CALL_REACTION_EMOJIS')
    const overlay = read('components/app/calls/CallOverlay.vue')
    expect(overlay).toContain('moh-call-reaction')
    expect(overlay).toContain('sendReaction')
  })
})
