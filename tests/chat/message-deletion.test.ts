import { describe, expect, it } from 'vitest'
import type { Message } from '~/types/api'
import { redactDeletedChatMessage } from '~/utils/chat-message-deletion'

const original = { id: 'original', body: 'secret', media: [{ url: 'private-image' }], replyTo: null } as Message

describe('chat deletion updates', () => {
  it('clears cached content and quoted previews when a deletion arrives', () => {
    const reply = { ...original, id: 'reply', replyTo: { id: 'original', senderUsername: 'sender', bodyPreview: 'secret', mediaThumbnailUrl: 'private-image' } }
    const result = [original, reply].map((m) => redactDeletedChatMessage(m, 'original'))
    expect(result[0]).toMatchObject({ deletedForAll: true, body: '', media: [], replyTo: null })
    expect(result[1]!.replyTo).toMatchObject({ bodyPreview: 'Message deleted', mediaThumbnailUrl: null })
    expect(original.body).toBe('secret')
    expect(reply.replyTo.bodyPreview).toBe('secret')
  })
  it('preserves unrelated messages', () => {
    expect(redactDeletedChatMessage(original, 'other')).toBe(original)
  })
})
