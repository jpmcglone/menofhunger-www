import type { ChatConversationMetadata } from '../chat/useChatConversationMetadata'
import type { Socket } from 'socket.io-client'
import type { WsNotificationsNewPayload } from '~/types/api'
import { isRecord } from '~/utils/primitives'
import { createSoundArrivalGate, notificationSoundFor, type CatalogSound } from '~/utils/sound-policy'

type SoundHandlerDependencies = {
  viewerID: () => string | null
  conversationPreferences: () => { viewerID: string | null; acceptedIDs: string[]; mutedIDs: string[] }
  viewingConversationID: () => string | null
  ensureConversation: (id: string) => Promise<ChatConversationMetadata | null>
  play: (cue: CatalogSound, options: { valid: () => boolean }) => unknown
}

/** One foreground cue per fresh arrival. Count changes and message bell echoes are silent. */
export function registerPresenceSoundHandlers(socket: Socket, d: SoundHandlerDependencies) {
  const arrivals = createSoundArrivalGate()
  socket.on('notifications:new', (data: WsNotificationsNewPayload) => {
    const notification = data?.notification
    const meID = d.viewerID()
    if (data?.silent || !notification || !meID || notification.actor?.id === meID) return
    const cue = notificationSoundFor(notification)
    if (!cue || !arrivals(`notification-${notification.id}`, notification.createdAt)) return
    d.play(cue, { valid: () => d.viewerID() === meID })
  })

  socket.on('messages:new', async (data: { conversationId?: string; message?: unknown }) => {
    const meID = d.viewerID()
    const message = data?.message
    if (!meID || !isRecord(message) || !isRecord(message.sender)
      || typeof message.sender.id !== 'string' || message.sender.id === meID
      || typeof message.id !== 'string' || typeof message.createdAt !== 'string') return
    const requestedAt = Date.now()
    const fresh = () => d.viewerID() === meID && Date.now() - requestedAt < 600
      && d.viewingConversationID() !== data.conversationId
    if (typeof data.conversationId !== 'string' || !fresh()
      || !arrivals(`message-${message.id}`, message.createdAt, requestedAt)) return
    try {
      const conversation = await d.ensureConversation(data.conversationId)
      if (!conversation || conversation.id !== data.conversationId
        || conversation.viewerStatus !== 'accepted' || conversation.isMuted
        || conversation.isBlockedWith || conversation.type === 'crew_wall') return
    } catch { return }
    const eligible = () => {
      const prefs = d.conversationPreferences()
      return fresh() && prefs.viewerID === meID
        && typeof data.conversationId === 'string' && prefs.acceptedIDs.includes(data.conversationId)
        && !prefs.mutedIDs.includes(data.conversationId) && d.viewingConversationID() !== data.conversationId
    }
    if (!eligible()) return
    d.play('message', { valid: eligible })
  })
}
