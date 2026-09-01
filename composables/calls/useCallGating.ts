import type { CallSession, MessageConversation } from '~/types/api'

export type CallStartDenial =
  | 'not_premium_verified'
  | 'callee_unverified'
  | 'conversation_not_accepted'
  | 'bot'
  | 'blocked'

/**
 * Mirrors `CallsService` gating so the header can disable/explain up front. The
 * server is still authoritative; a mismatch just surfaces as an ack error.
 */
export function useCallGating() {
  const { user, isPremium, isVerified } = useAuth()
  const isAdmin = computed(() => Boolean(user.value?.siteAdmin))

  function startDenial(conversation: MessageConversation | null | undefined): CallStartDenial | null {
    if (!conversation) return 'conversation_not_accepted'
    if (conversation.viewerStatus !== 'accepted') return 'conversation_not_accepted'
    if (conversation.isBlockedWith) return 'blocked'
    const others = conversation.participants.filter((p) => p.user.id !== user.value?.id)
    if (others.some((p) => p.user.isBot)) return 'bot'
    if (!isAdmin.value && !(isPremium.value && isVerified.value)) return 'not_premium_verified'
    if (conversation.type === 'direct' && !isAdmin.value) {
      const callee = others[0]?.user
      if (callee && callee.verifiedStatus === 'none') return 'callee_unverified'
    }
    return null
  }

  function startDenialMessage(denial: CallStartDenial): string {
    switch (denial) {
      case 'not_premium_verified':
        return 'Calling is for verified premium members.'
      case 'callee_unverified':
        return 'You can only call verified members.'
      case 'conversation_not_accepted':
        return 'Accept this conversation to call.'
      case 'bot':
        return 'You can’t call Marv.'
      case 'blocked':
        return 'You can’t call this member.'
    }
  }

  /** Can this viewer be in `call`? Unverified members may only join admin-started calls. */
  function canJoin(call: Pick<CallSession, 'startedByAdmin'>): boolean {
    return isAdmin.value || isVerified.value || call.startedByAdmin
  }

  return { isAdmin, startDenial, startDenialMessage, canJoin }
}
