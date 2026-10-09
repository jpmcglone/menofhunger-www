import { conversationPreviewText, chatMessagePreview } from '~/utils/chat-message-preview'
import { userColorTier, type UserColorTier } from '~/utils/user-tier'
import type { AuthUser } from '~/composables/useAuth'
import type { Message, MessageConversation } from '~/types/api'

export type MessageTone = UserColorTier
export type MessageConversationWithTone = MessageConversation & { unreadTone?: MessageTone }

/** Row labels, preview text and tier-tinted classes for conversation rows. */
export function useChatConversationPresentation(me: Ref<AuthUser | null> | ComputedRef<AuthUser | null>) {
  const viewerCrew = useViewerCrew()

  function getMessageTier(message: Message): MessageTone {
    return userColorTier(message.sender as Parameters<typeof userColorTier>[0])
  }

  function getDirectUser(conversation: MessageConversation) {
    return conversation.participants.find((p) => p.user.id !== me.value?.id)?.user ?? null
  }

  function getConversationTitle(conversation: MessageConversation) {
    if (conversation.type === 'crew_wall') {
      const crewName = (conversation.crew?.name ?? '').trim()
      if (crewName) return crewName
      return viewerCrew.membership.value?.role === 'owner' ? 'Your Crew' : 'My Crew'
    }
    if (conversation.type === 'group') {
      return conversation.title || conversation.participants.map((p) => p.user.name || p.user.username || 'User').join(', ')
    }
    const other = getDirectUser(conversation)
    return other?.name || other?.username || 'Chat'
  }

  function getConversationPreview(conversation: MessageConversation) {
    return conversationPreviewText(conversation)
  }

  function getConversationLastMessageTier(conversation: MessageConversationWithTone): MessageTone {
    // If there are unread messages and we've tracked the last incoming tier, prefer it for unread indicators.
    const tracked = conversation.unreadTone
    if (conversation.unreadCount > 0 && tracked) return tracked
    const senderId = conversation.lastMessage?.senderId ?? null
    if (!senderId) return 'normal'
    const sender = conversation.participants.find((p) => p.user.id === senderId)?.user
    return userColorTier(sender as Parameters<typeof userColorTier>[0])
  }

  const ORG_CHAT_SILVER_DOT_CLASS = 'bg-[#313643] text-white'
  const ORG_CHAT_SILVER_UNREAD_CLASS = 'bg-[rgba(49,54,67,0.24)] dark:bg-[rgba(49,54,67,0.34)]'

  function conversationDotClass(conversation: MessageConversationWithTone): string {
    const tier = getConversationLastMessageTier(conversation)
    if (tier === 'organization') return ORG_CHAT_SILVER_DOT_CLASS
    if (tier === 'premium') return 'bg-[var(--moh-premium)] text-white'
    if (tier === 'verified') return 'bg-[var(--moh-verified)] text-white'
    return 'bg-gray-700 text-white dark:bg-white dark:text-black'
  }

  function conversationUnreadHighlightClass(conversation: MessageConversationWithTone): string {
    const tier = getConversationLastMessageTier(conversation)
    if (tier === 'organization') return ORG_CHAT_SILVER_UNREAD_CLASS
    if (tier === 'premium') return 'bg-[rgba(var(--moh-premium-rgb),0.06)] dark:bg-[rgba(var(--moh-premium-rgb),0.09)]'
    if (tier === 'verified') {
      return 'bg-[rgba(var(--moh-verified-rgb),0.06)] dark:bg-[rgba(var(--moh-verified-rgb),0.09)]'
    }
    return 'bg-gray-100/40 dark:bg-white/6'
  }

  /** Last non–deleted-for-all message in the open thread (for list preview after delete). */
  function lastVisibleMessageSnapshot(list: Message[]): NonNullable<MessageConversation['lastMessage']> | null {
    for (let i = list.length - 1; i >= 0; i--) {
      const m = list[i]!
      if (m.deletedForAll) continue
      return {
        id: m.id,
        body: chatMessagePreview(m),
        createdAt: m.createdAt,
        senderId: m.sender.id,
      }
    }
    return null
  }

  return {
    getMessageTier,
    getDirectUser,
    getConversationTitle,
    getConversationPreview,
    getConversationLastMessageTier,
    conversationDotClass,
    conversationUnreadHighlightClass,
    lastVisibleMessageSnapshot,
  }
}
