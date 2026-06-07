import type { FeedPost, FollowListUser } from '~/types/api'
import { siteConfig } from '~/config/site'

export type SendViaChatState = {
  open: boolean
  post: FeedPost | null
}

export function useSendViaChat() {
  const state = useState<SendViaChatState>('moh.send-via-chat', () => ({ open: false, post: null }))
  const { apiFetchData } = useApiClient()
  const toast = useAppToast()

  function open(post: FeedPost) {
    state.value = { open: true, post }
  }

  function close() {
    state.value = { open: false, post: null }
  }

  const sending = ref(false)

  async function send(recipient: FollowListUser): Promise<boolean> {
    const post = state.value.post
    if (!post || sending.value) return false

    const shareUrl = `${siteConfig.url}/p/${encodeURIComponent(post.id)}`
    sending.value = true
    try {
      // Try to reuse an existing direct thread; fall back to creating one.
      const lookup = await apiFetchData<{ conversationId: string | null }>('/messages/lookup', {
        method: 'POST',
        body: { user_ids: [recipient.id] },
      })

      let conversationId = lookup?.conversationId ?? null

      if (conversationId) {
        await apiFetchData(`/messages/conversations/${encodeURIComponent(conversationId)}/messages`, {
          method: 'POST',
          body: { body: shareUrl },
        })
      } else {
        const created = await apiFetchData<{ conversationId: string }>('/messages/conversations', {
          method: 'POST',
          body: { user_ids: [recipient.id], body: shareUrl },
        })
        conversationId = created?.conversationId ?? null
      }

      close()
      toast.push({
        title: 'Sent',
        message: recipient.name || recipient.username ? `To @${recipient.username}` : undefined,
        tone: 'success',
        to: conversationId ? `/chat?c=${encodeURIComponent(conversationId)}` : '/chat',
        durationMs: 3000,
      })
      return true
    } catch (e: unknown) {
      toast.pushError(e, 'Failed to send message.')
      return false
    } finally {
      sending.value = false
    }
  }

  return {
    open: computed(() => state.value.open),
    post: computed(() => state.value.post),
    sending: readonly(sending),
    openDialog: open,
    close,
    send,
  }
}
