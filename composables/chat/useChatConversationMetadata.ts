import { watch, type Ref } from 'vue'
import type { AuthUser } from '~/composables/useAuth'
import type { MessageConversation } from '~/types/api'

export type ChatConversationMetadata = Pick<MessageConversation, 'id' | 'type' | 'viewerStatus' | 'isMuted' | 'isBlockedWith'>
type Entry = { value: ChatConversationMetadata | null; expires: number; pending?: Promise<ChatConversationMetadata | null> }
type Runtime = { identity: string | null; generation: number; entries: Map<string, Entry> }
const runtimes = new WeakMap<object, Runtime>()
const MAX_ENTRIES = 256

/** Canonical notification eligibility, shared by inbox mutations and off-chat arrivals. */
export function useChatConversationMetadata(viewer?: Ref<AuthUser | null>) {
  const me = viewer ?? useAuth().user
  const app = useNuxtApp()
  let runtime = runtimes.get(app)
  if (!runtime) {
    runtime = { identity: null, generation: 0, entries: new Map() }
    runtimes.set(app, runtime)
  }
  const cache = runtime
  const { apiFetch } = useApiClient()
  const mutedConversationIds = useState<string[]>('chat-muted-conversation-ids', () => [])
  const acceptedConversationIds = useState<string[]>('chat-accepted-conversation-ids', () => [])
  const soundIdentity = useState<string | null>('chat-conversation-sound-viewer-id', () => null)

  watch(() => me.value?.id ?? null, identity => {
    if (cache.identity !== identity || soundIdentity.value !== identity) {
      cache.identity = identity
      cache.generation++
      cache.entries.clear()
      soundIdentity.value = identity
      mutedConversationIds.value = []
      acceptedConversationIds.value = []
    }
  }, { immediate: true, flush: 'sync' })

  function membership(ids: Ref<string[]>, id: string, included: boolean) {
    if (ids.value.includes(id) !== included) ids.value = included ? [...ids.value, id] : ids.value.filter(value => value !== id)
  }
  function remove(id: string) {
    cache.entries.delete(id)
    membership(mutedConversationIds, id, false)
    membership(acceptedConversationIds, id, false)
  }
  function trim() {
    while (cache.entries.size > MAX_ENTRIES) remove(cache.entries.keys().next().value!)
  }
  function sync(conversation: ChatConversationMetadata) {
    if (!me.value?.id || cache.identity !== me.value.id) return
    const value = { id: conversation.id, type: conversation.type, viewerStatus: conversation.viewerStatus, isMuted: conversation.isMuted, isBlockedWith: conversation.isBlockedWith }
    cache.entries.delete(value.id)
    cache.entries.set(value.id, { value, expires: Date.now() + 15_000 })
    membership(mutedConversationIds, value.id, value.isMuted)
    membership(acceptedConversationIds, value.id, value.viewerStatus === 'accepted' && value.type !== 'crew_wall' && !value.isBlockedWith)
    trim()
  }
  async function ensureConversation(id: string): Promise<ChatConversationMetadata | null> {
    const identity = me.value?.id
    if (!identity || cache.identity !== identity || !id) return null
    const existing = cache.entries.get(id)
    if (existing?.pending) return existing.pending
    if (existing && existing.expires > Date.now()) return existing.value
    // Expired metadata cannot authorize audio while a fresh lookup fails or is pending.
    membership(acceptedConversationIds, id, false)
    membership(mutedConversationIds, id, false)
    // Burst arrivals share requests; keep unknown/background work bounded.
    if ([...cache.entries.values()].filter(entry => entry.pending).length >= 8) return null
    const generation = cache.generation
    const entry: Entry = { value: null, expires: Date.now() + 10_000 }
    const pending = (async () => {
      await Promise.resolve() // Publish the coalesced entry before even a synchronous client failure.
      try {
        const response = await apiFetch<{ conversation: MessageConversation }>(`/messages/conversations/${encodeURIComponent(id)}`)
        if (generation !== cache.generation || identity !== me.value?.id) return null
        const conversation = response.data?.conversation
        if (!conversation || conversation.id !== id) return null
        // A local mute/accept mutation that completed during this request wins.
        if (cache.entries.get(id) !== entry) return cache.entries.get(id)?.value ?? null
        sync(conversation)
        return cache.entries.get(id)?.value ?? null
      } catch { return null } finally {
        if (cache.entries.get(id) === entry) delete entry.pending
      }
    })()
    entry.pending = pending
    cache.entries.set(id, entry)
    trim()
    return pending
  }
  return { mutedConversationIds, acceptedConversationIds, soundIdentity, sync, remove, ensureConversation }
}
