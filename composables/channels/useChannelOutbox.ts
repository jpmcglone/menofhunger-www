import type { ChannelMessage } from '~/types/api'
import { clearChannelDraft } from '~/utils/channels/drafts'
import { channelPath } from '~/utils/channels/reducer'
import { getSafeUserErrorMessage } from '~/utils/api-error'
export type ChannelSend = { body: string; clientRequestId: string; threadRootId?: string; attachments?: Array<{ uploadId: string }>; giphy?: { url: string; mp4Url?: string; width?: number; height?: number } }
export type ChannelOutboxEntry = { id: string; identity: string; groupId: string; channelId: string; rootId?: string; input: ChannelSend; files?: File[]; uploaded?: Record<number, string>; status: 'uploading' | 'sending' | 'failed' | 'sent'; error?: string; draftKey: string; draftRevision: string; queuedAt?: string; message?: ChannelMessage }
export function useChannelOutbox() {
  const { apiFetchData } = useApiClient()
  const { user } = useAuth()
  const analytics = usePostHog()
  const sounds = useSoundPolicy()
  const entries = useState<ChannelOutboxEntry[]>('channel-outbox', () => [])
  const working = useState<Set<string>>('channel-outbox-working', () => new Set())
  const queues = useState<Map<string, Promise<void>>>('channel-outbox-queues', () => new Map())
  function current(entry: ChannelOutboxEntry) { return user.value?.id === entry.identity && entries.value.includes(entry) }
  async function uploadOne(entry: ChannelOutboxEntry, file: File) {
    const path = channelPath(entry.groupId, entry.channelId)
    const ticket = await apiFetchData<{ uploadId: string; uploadUrl: string; headers: Record<string, string> }>(`${path}/uploads`, { method: 'POST', body: { bytes: file.size, contentType: file.type } })
    if (!current(entry)) return null
    const response = await fetch(ticket.uploadUrl, { method: 'PUT', headers: ticket.headers, body: file, credentials: 'omit' })
    if (!response.ok) throw new Error('Couldn’t upload the attachment.')
    if (!current(entry)) return null
    const metadata = await mediaMetadata(file)
    const committed = await apiFetchData<{ uploadId: string }>(`${path}/uploads/${ticket.uploadId}/commit`, { method: 'POST', body: metadata })
    return committed.uploadId
  }
  /** Uploads in parallel; a retry resumes with only the files that did not finish. */
  async function upload(entry: ChannelOutboxEntry) {
    const files = entry.files ?? []
    if (!files.length) return
    entry.uploaded ??= {}
    await Promise.all(files.map(async (file, index) => {
      if (entry.uploaded![index]) return
      const id = await uploadOne(entry, file)
      if (id && current(entry)) entry.uploaded![index] = id
    }))
    if (!current(entry)) return
    entry.input.attachments = files.map((_, index) => ({ uploadId: entry.uploaded![index]! }))
  }
  function retry(entry: ChannelOutboxEntry) {
    if (working.value.has(entry.id) || !current(entry)) return
    working.value.add(entry.id)
    const queueKey = `${entry.identity}:${entry.channelId}:${entry.rootId ?? ''}`
    const previous = queues.value.get(queueKey)
    const task = (async () => {
      try {
        entry.status = entry.files?.length && !entry.input.attachments ? 'uploading' : 'sending'
        entry.error = undefined
        await upload(entry)
        await previous
        if (!current(entry)) return
        entry.status = 'sending'
        const message = await apiFetchData<ChannelMessage>(`${channelPath(entry.groupId, entry.channelId)}/messages`, { method: 'POST', body: entry.input })
        if (!current(entry)) return
        entry.message = message
        entry.status = 'sent'
        sounds.play('message-sent')
        entry.files = undefined
        await clearChannelDraft(entry.draftKey, entry.draftRevision).catch(() => {
          // Delivery succeeded. A storage failure must never turn it into a failed send.
          entry.error = "Sent. The local draft couldn’t be cleared."
        })
      } catch (error) { if (current(entry)) { analytics.capture('channel_send_failed', { attachment: !!entry.files?.length, is_reply: !!entry.rootId }); entry.status = 'failed'; entry.error = getSafeUserErrorMessage(error, 'Couldn’t send. Try again.') } }
      finally { working.value.delete(entry.id) }
    })()
    queues.value.set(queueKey, task)
  }
  function enqueue(input: ChannelOutboxEntry) {
    entries.value = entries.value.filter(entry => entry.status !== 'sent').concat(input)
    const entry = entries.value.find(item => item.id === input.id)!
    retry(entry)
  }
  function discard(id: string) { if (!working.value.has(id)) entries.value = entries.value.filter(entry => entry.id !== id) }
  watch(() => user.value?.id, () => { entries.value = []; working.value = new Set(); queues.value = new Map() })
  return { entries, enqueue, retry, discard }
}
async function mediaMetadata(file: File): Promise<{ durationSeconds?: number; width?: number; height?: number }> {
  if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) return {}
  const element = document.createElement(file.type.startsWith('audio/') ? 'audio' : 'video')
  const url = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Couldn’t read this attachment.')), 10_000)
      element.onloadedmetadata = () => { clearTimeout(timeout); resolve({ durationSeconds: Math.ceil(element.duration), ...(element instanceof HTMLVideoElement ? { width: element.videoWidth, height: element.videoHeight } : {}) }) }
      element.onerror = () => { clearTimeout(timeout); reject(new Error('Unsupported media.')) }
      element.src = url
    })
  } finally { element.removeAttribute('src'); element.load(); URL.revokeObjectURL(url) }
}
