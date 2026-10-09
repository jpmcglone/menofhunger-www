import type { MessageConversation } from '~/types/api'
import type { MessageConversationWithTone } from './useChatConversationPresentation'

/** Marv pinned-row derivations over the conversation lists. */
export function useChatMarvRows(
  marv: ReturnType<typeof useMarv>,
  conversations: Ref<{ primary: MessageConversationWithTone[]; requests: MessageConversationWithTone[] }>,
  selectedConversation: ComputedRef<MessageConversation | null | undefined>,
) {
  /**
   * Marv lives as a regular `direct` conversation in the user's list. We surface
   * a pinned row above the conversation list (premium-styled), and when the
   * selected chat IS Marv we render the mode picker / credits chip.
   *
   * `marvConversation` walks the existing primary list — we don't need to fetch
   * separately because the conversation list already contains the marv DM if
   * one exists. When it doesn't yet, the pinned row routes to `?marv=1` which
   * is resolved on demand when the user clicks it.
   */
  const marvConversation = computed<MessageConversation | null>(() => {
    const marvId = marv.marvUserId.value
    if (!marvId) return null
    for (const c of conversations.value.primary) {
      if (c.type !== 'direct') continue
      if (c.participants.some((p) => p.user.id === marvId)) return c
    }
    for (const c of conversations.value.requests) {
      if (c.type !== 'direct') continue
      if (c.participants.some((p) => p.user.id === marvId)) return c
    }
    return null
  })

  const marvConversationId = computed(() => marvConversation.value?.id ?? null)
  const marvUnreadCount = computed(() => marvConversation.value?.unreadCount ?? 0)
  const marvLastMessagePreview = computed<string | null>(() => {
    const body = marvConversation.value?.lastMessage?.body?.trim() ?? ''
    return body || null
  })
  const isSelectedConversationMarv = computed(() => {
    const marvId = marv.marvUserId.value
    if (!marvId) return false
    if (selectedConversation.value?.type !== 'direct') return false
    return selectedConversation.value.participants.some((p) => p.user.id === marvId)
  })

  return { marvConversation, marvConversationId, marvUnreadCount, marvLastMessagePreview, isSelectedConversationMarv }
}
