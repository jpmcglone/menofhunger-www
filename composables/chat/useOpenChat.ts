import type { FollowListUser, LookupMessageConversationResponse, UserPreview } from '~/types/api'
import { useDesktopChatDock } from '~/composables/chat/useDesktopChatDock'
import { userColorTier } from '~/utils/user-tier'

/** Message actions share one destination policy across profiles, previews and admin tools. */
export function useOpenChat() {
  const route = useRoute()
  const dock = useDesktopChatDock()
  const { user, isPageAccount } = useAuth()
  const { apiFetchData } = useApiClient()
  const toast = useAppToast()
  const canUseDock = () => dock.desktop.value && route.path !== '/chat' && !isPageAccount.value

  async function openChat(username: string, knownConversationId?: string | null) {
    const name = username.trim()
    if (!name) return
    const destination = () => navigateTo({ path: '/chat', query: knownConversationId ? { c: knownConversationId } : { to: name } })
    if (!canUseDock()) return destination()
    const viewerId = user.value?.id
    if (!viewerId || (!user.value?.siteAdmin && (user.value?.verifiedStatus ?? 'none') === 'none')) return destination()
    if (knownConversationId) {
      dock.open(knownConversationId)
      return
    }
    try {
      const preview = await apiFetchData<UserPreview>(`/users/${encodeURIComponent(name)}/preview`, { method: 'GET' })
      if (!preview?.id || preview.id === viewerId || user.value?.id !== viewerId) return
      const lookup = await apiFetchData<LookupMessageConversationResponse['data']>('/messages/lookup', {
        method: 'POST', body: { user_ids: [preview.id] },
      })
      if (user.value?.id !== viewerId) return
      knownConversationId = lookup?.conversationId ?? null
      if (!canUseDock()) return destination()
      if (knownConversationId) {
        dock.open(knownConversationId)
        return
      }
      if (!user.value?.siteAdmin && userColorTier(preview) === 'normal') return
      const recipient: FollowListUser = {
        id: preview.id, username: preview.username, name: preview.name,
        premium: Boolean(preview.premium), premiumPlus: Boolean(preview.premiumPlus),
        isOrganization: Boolean(preview.isOrganization), verifiedStatus: preview.verifiedStatus ?? 'none',
        avatarUrl: preview.avatarUrl ?? null, avatarVideo: preview.avatarVideo ?? null,
        relationship: preview.relationship,
      }
      dock.openDraft([recipient])
    } catch (error) {
      toast.pushError(error, 'Could not open this chat. Please try again.')
    }
  }

  /** Keep modified clicks and non-desktop navigation native. */
  function onMessageLinkClick(event: MouseEvent, username: string) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !canUseDock()) return
    event.preventDefault()
    void openChat(username)
  }

  return { openChat, onMessageLinkClick }
}
