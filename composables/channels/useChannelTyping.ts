import type { Ref } from 'vue'
import type { ChannelCallback } from '~/composables/presence/usePresenceDomains'
import type { TypingUserDisplay } from '~/composables/chat/useChatTyping'
import { userColorTier } from '~/utils/user-tier'

const TYPING_TTL_MS = 6000
type Entry = { channelId: string; threadRootId: string | null; exp: number; display: TypingUserDisplay }

/** Groups this tab watches. The socket joins a group's channel rooms once, however many surfaces ask. */
const watchers = new Map<string, number>()
let sweep: ReturnType<typeof setInterval> | null = null

/**
 * Who is typing in a group's channels, shared by every surface that shows channel rows.
 * Typing arrives as room events for subscribed channels only; entries expire on their own
 * if the "stopped" event is lost, so a dropped connection never leaves someone typing forever.
 */
export function useChannelTyping(groupId: Ref<string | null | undefined>) {
  const presence = usePresence()
  const { user } = useAuth()
  const entries = useState<Map<string, Entry>>('channel-typing', () => new Map())
  let watching: string | null = null

  function sweepExpired() {
    const now = Date.now()
    const next = new Map([...entries.value].filter(([, entry]) => entry.exp > now))
    if (next.size !== entries.value.size) entries.value = next
    if (!next.size && sweep) { clearInterval(sweep); sweep = null }
  }

  const callback: ChannelCallback = event => {
    if (event.type === 'changed' && event.payload.groupId === watching && event.payload.reason === 'access') { presence.subscribeChannels(watching); return }
    if (event.type !== 'typing' || event.payload.groupId !== watching) return
    const { channelId, threadRootId, user: who, typing } = event.payload
    if (!who?.id || who.id === user.value?.id) return
    const key = `${channelId}:${threadRootId ?? ''}:${who.id}`
    const next = new Map(entries.value)
    if (!typing) next.delete(key)
    else next.set(key, { channelId, threadRootId, exp: Date.now() + TYPING_TTL_MS, display: { userId: who.id, username: who.username ?? who.id, tier: userColorTier(who) } })
    entries.value = next
    if (next.size && !sweep) sweep = setInterval(sweepExpired, 1000)
  }

  function unwatch() {
    if (!watching) return
    const count = (watchers.get(watching) ?? 1) - 1
    if (count <= 0) { watchers.delete(watching); presence.unsubscribeChannels(watching) } else watchers.set(watching, count)
    watching = null
  }
  function watch_() {
    unwatch()
    const id = groupId.value
    if (!id) return
    watching = id
    const count = watchers.get(id) ?? 0
    watchers.set(id, count + 1)
    if (!count) presence.subscribeChannels(id)
  }

  watch(groupId, watch_)
  watch(presence.isSocketConnected, connected => { if (connected && watching) presence.subscribeChannels(watching) })
  onMounted(() => { presence.addChannelCallback(callback); watch_() })
  onBeforeUnmount(() => { presence.removeChannelCallback(callback); unwatch() })

  /** `root` narrows to one thread (`null` = top level); omit for anywhere in the channel. */
  function typingUsers(channelId: string, root?: string | null): TypingUserDisplay[] {
    const seen = new Set<string>()
    const out: TypingUserDisplay[] = []
    for (const entry of entries.value.values()) {
      if (entry.channelId !== channelId || (root !== undefined && entry.threadRootId !== root) || seen.has(entry.display.userId)) continue
      seen.add(entry.display.userId)
      out.push(entry.display)
    }
    return out
  }
  const typingByChannel = computed(() => {
    const out: Record<string, TypingUserDisplay[]> = {}
    for (const entry of entries.value.values()) {
      const list = (out[entry.channelId] ??= [])
      if (!list.some(item => item.userId === entry.display.userId)) list.push(entry.display)
    }
    return out
  })
  return { typingUsers, typingByChannel, clear: () => { entries.value = new Map() } }
}
