import type { Message } from '~/types/api'

/** Redact a deleted message and any cached reply preview that points at it. */
export function redactDeletedChatMessage<T extends Message>(message: T, deletedId: string): T {
  if (message.id === deletedId) {
    return { ...message, deletedForAll: true, body: '', media: [], reactions: [], call: null, replyTo: null }
  }
  if (message.replyTo?.id === deletedId) {
    return { ...message, replyTo: { ...message.replyTo, bodyPreview: 'Message deleted', mediaThumbnailUrl: null } }
  }
  return message
}
