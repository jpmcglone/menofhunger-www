import { describe, expect, it } from 'vitest'
import { chatMessagePreview, conversationPreviewText } from '../../utils/chat-message-preview'

describe('chatMessagePreview', () => {
  it('keeps captions and labels empty-body media', () => {
    expect(chatMessagePreview({ body: 'hello', media: [{ kind: 'audio' }] })).toBe('hello')
    expect(chatMessagePreview({ body: '  ', media: [{ kind: 'audio' }] })).toBe('Voice message')
    expect(chatMessagePreview({ body: '', media: [{ kind: 'video' }] })).toBe('Video')
    expect(chatMessagePreview({ body: '', media: [{ kind: 'gif' }] })).toBe('GIF')
    expect(chatMessagePreview({ body: '', media: [{ kind: 'image' }] })).toBe('Photo')
    expect(chatMessagePreview({ body: '', deletedForAll: true, media: [{ kind: 'audio' }] })).toBe('Message deleted')
    expect(chatMessagePreview({ body: '' })).toBe('')
  })
})

describe('conversationPreviewText', () => {
  it('uses No chats yet only when there is no last message', () => {
    expect(conversationPreviewText({ lastMessage: null })).toBe('No chats yet.')
    expect(conversationPreviewText({ lastMessage: { body: 'Voice message' } })).toBe('Voice message')
    expect(conversationPreviewText({ lastMessage: { body: '  ' } })).toBe('')
  })
})
