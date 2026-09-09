import type { FeedPost, FollowListUser } from '~/types/api'
import type { CreateMediaPayload } from '~/composables/useComposerMedia'
import { siteConfig } from '~/config/site'
import { prepareUploadImage } from '~/utils/prepare-upload-image'

export type SendViaChatState = {
  open: boolean
  post: FeedPost | null
  body: string | null
  files: File[]
}

export function useSendViaChat() {
  const state = useState<SendViaChatState>('moh.send-via-chat', () => ({
    open: false,
    post: null,
    body: null,
    files: [],
  }))
  const { apiFetchData } = useApiClient()
  const toast = useAppToast()
  const { rememberChat } = useShareDestination()

  function open(post: FeedPost) {
    state.value = { open: true, post, body: null, files: [] }
  }

  function openShare(opts: { body?: string | null; files?: File[] }) {
    state.value = {
      open: true,
      post: null,
      body: (opts.body ?? '').trim() || null,
      files: Array.isArray(opts.files) ? opts.files : [],
    }
  }

  function close() {
    state.value = { open: false, post: null, body: null, files: [] }
  }

  const sending = ref(false)

  async function uploadShareFiles(files: File[]): Promise<CreateMediaPayload[]> {
    const payloads: CreateMediaPayload[] = []
    for (const file of files.slice(0, 4)) {
      const type = (file.type || '').toLowerCase()
      if (!type.startsWith('image/')) continue
      const prepared = type === 'image/gif' ? file : await prepareUploadImage(file)
      const init = await apiFetchData<{
        key: string
        uploadUrl?: string
        headers?: Record<string, string>
        skipUpload?: boolean
      }>('/uploads/post-media/init', {
        method: 'POST',
        body: { contentType: prepared.type || type || 'image/jpeg' },
      })
      if (!init.skipUpload && init.uploadUrl) {
        const headers = new Headers()
        for (const [key, value] of Object.entries(init.headers ?? {})) {
          headers.set(key, value)
        }
        const put = await fetch(init.uploadUrl, { method: 'PUT', headers, body: prepared })
        if (!put.ok) throw new Error('Failed to upload.')
      }
      const committed = await apiFetchData<{
        key: string
        kind?: string
        width?: number | null
        height?: number | null
      }>('/uploads/post-media/commit', {
        method: 'POST',
        body: { key: init.key },
      })
      payloads.push({
        source: 'upload',
        kind: committed.kind === 'gif' ? 'gif' : 'image',
        r2Key: committed.key,
        width: committed.width ?? null,
        height: committed.height ?? null,
        alt: null,
      })
    }
    return payloads
  }

  async function send(recipient: FollowListUser): Promise<boolean> {
    const current = state.value
    if (sending.value) return false
    if (!current.post && !current.body && current.files.length === 0) return false

    const shareUrl = current.post
      ? `${siteConfig.url}/p/${encodeURIComponent(current.post.id)}`
      : (current.body ?? '')
    sending.value = true
    try {
      const media = await uploadShareFiles(current.files)
      const lookup = await apiFetchData<{ conversationId: string | null }>('/messages/lookup', {
        method: 'POST',
        body: { user_ids: [recipient.id] },
      })

      let conversationId = lookup?.conversationId ?? null
      const payload: Record<string, unknown> = {}
      if (shareUrl) payload.body = shareUrl
      if (media.length) payload.media = media

      if (conversationId) {
        await apiFetchData(`/messages/conversations/${encodeURIComponent(conversationId)}/messages`, {
          method: 'POST',
          body: payload,
        })
      } else {
        const created = await apiFetchData<{ conversationId: string }>('/messages/conversations', {
          method: 'POST',
          body: { user_ids: [recipient.id], ...payload },
        })
        conversationId = created?.conversationId ?? null
      }

      rememberChat()
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
    body: computed(() => state.value.body),
    sending: readonly(sending),
    openDialog: open,
    openShare,
    close,
    send,
  }
}
