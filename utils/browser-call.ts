import type { CallSession, MessageConversation } from '~/types/api'

export type BrowserCallState = 'waiting' | 'ready' | 'ended' | 'unavailable'

/** The verification landing page never starts calls or bypasses conversation access. */
export function browserCallState(conversation: MessageConversation, call: CallSession | null, viewerId: string): BrowserCallState {
  if (conversation.type !== 'direct' || conversation.viewerStatus !== 'accepted' || conversation.isBlockedWith
    || !conversation.participants.some(participant => participant.user.id === viewerId)) return 'unavailable'
  if (!call) return 'waiting'
  if (call.conversationId !== conversation.id || !call.startedByAdmin || call.type !== 'video') return 'unavailable'
  if (call.status === 'ended' || call.endedAt) return 'ended'
  return call.status === 'active' || call.status === 'ringing' ? 'ready' : 'waiting'
}
