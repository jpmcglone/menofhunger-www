import { describe, expect, it } from 'vitest'
import type { SpaceChatMessage } from '~/types/api'
import {
  applySpaceChatReaction,
  attachSpaceChatReply,
  resolveSpaceChatReplies,
  spaceChatReplySnippetFromParent,
} from '../../utils/space-chat-social'

function userMsg(id: string, body: string, extra: Partial<Extract<SpaceChatMessage, { kind: 'user' }>> = {}): SpaceChatMessage {
  return {
    id,
    spaceId: 's1',
    kind: 'user',
    body,
    createdAt: '2026-08-14T12:00:00.000Z',
    sender: {
      id: 'u1',
      username: 'john',
      premium: false,
      premiumPlus: false,
      isOrganization: false,
      verifiedStatus: 'none',
    },
    ...extra,
  }
}

describe('space chat reply resolve', () => {
  it('builds a snippet when the parent is present and leaves it obfuscated when not', () => {
    const parent = userMsg('p1', 'hello there')
    const reply = userMsg('r1', 'later', { replyToId: 'p1' })
    const orphan = userMsg('r2', 'ghost', { replyToId: 'missing' })

    expect(spaceChatReplySnippetFromParent(parent)?.bodyPreview).toBe('hello there')
    const attached = attachSpaceChatReply(reply, new Map([[parent.id, parent]]))
    expect(attached.kind === 'user' && attached.replyTo?.id).toBe('p1')
    const unresolved = attachSpaceChatReply(orphan, new Map())
    expect(unresolved.kind === 'user' && unresolved.replyTo).toBeUndefined()

    const resolved = resolveSpaceChatReplies([parent, reply, orphan])
    const got = resolved.find((m) => m.id === 'r1')
    const missed = resolved.find((m) => m.id === 'r2')
    expect(got?.kind === 'user' && got.replyTo?.senderUsername).toBe('john')
    expect(missed?.kind === 'user' && missed.replyTo).toBeUndefined()
    expect(missed?.kind === 'user' && missed.replyToId).toBe('missing')
  })
})

describe('space chat reactions', () => {
  it('toggles a reaction on a known message and returns null for system lines', () => {
    const msg = userMsg('m1', 'hi')
    const added = applySpaceChatReaction(msg, { userId: 'u2', username: 'sam', reactionId: 'strong', emoji: '💪' }, 'u2')
    expect(added?.kind === 'user' && added.reactions?.[0]).toMatchObject({
      reactionId: 'strong',
      count: 1,
      reactedByMe: true,
    })
    const removed = applySpaceChatReaction(added!, { userId: 'u2', username: 'sam', reactionId: 'strong', emoji: '💪' }, 'u2')
    expect(removed?.kind === 'user' && (removed.reactions?.length ?? 0)).toBe(0)
    expect(applySpaceChatReaction({ ...msg, kind: 'system', sender: null, system: { firstEvent: 'join', lastEvent: 'join', userId: 'u1', username: 'john' } }, { userId: 'u2', reactionId: 'strong', emoji: '💪' }, 'u2')).toBeNull()
  })
})
