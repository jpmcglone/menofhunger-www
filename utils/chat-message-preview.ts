type PreviewMedia = { kind: string }

/** Inbox / quoted-reply preview. Caption wins; media-only messages get a short label. */
export function chatMessagePreview(message: {
  body?: string | null
  deletedForAll?: boolean
  media?: PreviewMedia[] | null
}): string {
  if (message.deletedForAll) return 'Message deleted'
  const body = (message.body ?? '').trim()
  if (body) return body
  const kinds = message.media ?? []
  if (kinds.some((m) => m.kind === 'audio')) return 'Voice message'
  if (kinds.some((m) => m.kind === 'video')) return 'Video'
  if (kinds.some((m) => m.kind === 'gif')) return 'GIF'
  if (kinds.length > 0) return 'Photo'
  return ''
}

export function conversationPreviewText(conversation: {
  lastMessage?: { body: string } | null
}): string {
  if (!conversation.lastMessage) return 'No chats yet.'
  return conversation.lastMessage.body.trim()
}
