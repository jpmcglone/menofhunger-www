import type { SpacesCallback } from '~/composables/usePresence'
import type { SpaceChatMessage, SpaceChatSender } from '~/types/api'
import { userColorTier, userTierColorVar } from '~/utils/user-tier'

const MAX_MESSAGES_PER_SPACE = 220
const TYPING_TTL_MS = 3500

function clampMessageList(list: SpaceChatMessage[]): SpaceChatMessage[] {
  if (!Array.isArray(list)) return []
  if (list.length <= MAX_MESSAGES_PER_SPACE) return list
  return list.slice(-MAX_MESSAGES_PER_SPACE)
}

function upsertMessages(existing: SpaceChatMessage[], incoming: SpaceChatMessage[]): SpaceChatMessage[] {
  if (!incoming.length) return existing
  const byId = new Map(existing.map((m) => [m.id, m]))
  for (const m of incoming) {
    if (!m?.id) continue
    byId.set(m.id, m)
  }
  const merged = Array.from(byId.values()).sort((a, b) => {
    const ta = Date.parse(a.createdAt || '') || 0
    const tb = Date.parse(b.createdAt || '') || 0
    if (ta !== tb) return ta - tb
    return String(a.id).localeCompare(String(b.id))
  })
  return clampMessageList(merged)
}


function playMentionSound() {
  if (!import.meta.client) return
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    osc.type = 'sine'
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.5)
    osc.onended = () => { try { ctx.close() } catch { /* ignore */ } }
  } catch {
    // AudioContext may be unavailable until user has interacted with the page.
  }
}

function extractMentionedUsernames(body: string): string[] {
  return [...body.matchAll(/@([a-zA-Z0-9_]+)/g)].map((m) => m[1]!.toLowerCase())
}

export function useSpaceLiveChat(options: { passive?: boolean } = {}) {
  const { ensureLoaded, user } = useAuth()
  const presence = usePresence()
  const lobby = useSpaceLobby()
  const { addFloatingEmojisFromText, addFloating } = useSpaceReactions()
  const passive = options.passive === true

  const messagesBySpace = useState<Record<string, SpaceChatMessage[]>>('space-live-chat-messages', () => ({}))
  const subscribedSpaceId = useState<string | null>('space-live-chat-subscribed-space', () => null)
  const callbackRef = useState<SpacesCallback | null>('space-live-chat-callback', () => null)
  const callbackRefs = useState<number>('space-live-chat-callback-refs', () => 0)
  const typingBySpaceId = useState<Map<string, Map<string, { sender: SpaceChatSender; exp: number }>>>(
    'space-live-chat-typing',
    () => new Map(),
  )
  const typingSweepTimer = useState<ReturnType<typeof setInterval> | null>('space-live-chat-typing-sweep', () => null)

  const spaceId = computed(() => (lobby.selectedSpaceId.value ?? '').trim() || null)

  const messages = computed<SpaceChatMessage[]>(() => {
    const sid = spaceId.value
    if (!sid) return []
    return messagesBySpace.value[sid] ?? []
  })

  function setMessagesForSpace(sid: string, next: SpaceChatMessage[]) {
    const id = String(sid ?? '').trim()
    if (!id) return
    messagesBySpace.value = {
      ...messagesBySpace.value,
      [id]: clampMessageList(next),
    }
  }

  function appendMessageForSpace(sid: string, msg: SpaceChatMessage) {
    const id = String(sid ?? '').trim()
    if (!id || !msg?.id) return
    const current = messagesBySpace.value[id] ?? []
    const idx = current.findIndex((m) => m.id === msg.id)
    const next =
      idx >= 0
        ? clampMessageList([...current.slice(0, idx), msg, ...current.slice(idx + 1)])
        : clampMessageList([...current, msg])
    messagesBySpace.value = { ...messagesBySpace.value, [id]: next }
  }

  function sweepTypingTtl() {
    const now = Date.now()
    const m = typingBySpaceId.value
    if (!m.size) return
    let changed = false
    const next = new Map<string, Map<string, { sender: SpaceChatSender; exp: number }>>()
    for (const [sid, inner] of m.entries()) {
      const innerNext = new Map(inner)
      let innerChanged = false
      for (const [uid, entry] of innerNext.entries()) {
        if (!entry || now > entry.exp) {
          innerNext.delete(uid)
          innerChanged = true
        }
      }
      if (innerNext.size > 0) {
        next.set(sid, innerNext)
        if (innerChanged) changed = true
      } else if (inner.size > 0) {
        changed = true
      }
    }
    if (changed) typingBySpaceId.value = next
  }

  function setRemoteTyping(sid: string, sender: SpaceChatSender, typing?: boolean) {
    const space = String(sid ?? '').trim()
    const userId = String(sender?.id ?? '').trim()
    if (!space || !userId) return
    const now = Date.now()

    const next = new Map(typingBySpaceId.value)
    const inner = new Map(next.get(space) ?? [])
    if (typing === false) {
      inner.delete(userId)
    } else {
      inner.set(userId, { sender, exp: now + TYPING_TTL_MS })
    }
    if (inner.size > 0) next.set(space, inner)
    else next.delete(space)
    typingBySpaceId.value = next
  }

  type TypingUserDisplay = {
    userId: string
    username: string
    tier: 'organization' | 'premium' | 'verified' | 'normal'
  }

  const typingUsersAll = computed<TypingUserDisplay[]>(() => {
    const sid = spaceId.value
    if (!sid) return []
    const inner = typingBySpaceId.value.get(sid)
    if (!inner?.size) return []
    const result: TypingUserDisplay[] = []
    for (const [uid, entry] of inner.entries()) {
      if (!uid || uid === user.value?.id) continue
      const username = String(entry?.sender?.username ?? '').trim()
      if (!username) continue
      const tier: TypingUserDisplay['tier'] = userColorTier(entry.sender as any)
      result.push({ userId: uid, username, tier })
    }
    // stable-ish ordering by username for deterministic display
    return result.sort((a, b) => a.username.localeCompare(b.username))
  })
  const typingUsersTotalCount = computed(() => typingUsersAll.value.length)
  const typingUsersForDisplay = computed(() => typingUsersAll.value.slice(0, 2))

  function typingNameClass(u: TypingUserDisplay): string {
    if (u.tier === 'organization') return 'text-[var(--moh-org)]'
    if (u.tier === 'premium') return 'text-[var(--moh-premium)]'
    if (u.tier === 'verified') return 'text-[var(--moh-verified)]'
    return 'text-gray-700 dark:text-gray-200'
  }

  function ensureCallbackRegistered() {
    if (!import.meta.client) return
    callbackRefs.value += 1
    if (callbackRef.value) return
    const cb: SpacesCallback = {
      onChatSnapshot: (payload) => {
        const sid = String(payload?.spaceId ?? '').trim()
        if (!sid) return
        const incoming = Array.isArray(payload?.messages) ? payload.messages : []
        const merged = upsertMessages(messagesBySpace.value[sid] ?? [], incoming)
        messagesBySpace.value = { ...messagesBySpace.value, [sid]: merged }
      },
      onChatMessage: (payload) => {
        const sid = String(payload?.spaceId ?? '').trim()
        const msg = payload?.message as SpaceChatMessage | undefined
        if (!sid || !msg?.id) return
        appendMessageForSpace(sid, msg)
        if (msg.kind === 'user' && msg.sender?.id && msg.body) {
          addFloatingEmojisFromText(msg.sender.id, msg.body)

          // Float "@" from the sender for every mentioned user, in the SENDER's tier color.
          const senderId = msg.sender.id
          const senderColor = userTierColorVar(userColorTier(msg.sender)) ?? undefined
          const myUsername = (user.value?.username ?? '').trim().toLowerCase()
          const mentioned = extractMentionedUsernames(msg.body)
          for (const un of mentioned) {
            addFloating(senderId, '@', undefined, senderColor)
            // Sound only when someone else mentions the current user.
            if (myUsername && un === myUsername && senderId !== user.value?.id) {
              playMentionSound()
            }
          }
        }
      },
      onTyping: (payload) => {
        const sid = String(payload?.spaceId ?? '').trim()
        const sender = payload?.sender as SpaceChatSender | undefined
        if (!sid || !sender?.id) return
        setRemoteTyping(sid, sender, payload?.typing)
      },
    }
    callbackRef.value = cb
    presence.addSpacesCallback(cb)

    if (!typingSweepTimer.value) {
      typingSweepTimer.value = setInterval(sweepTypingTtl, 500)
    }
  }

  function maybeCallbackUnregister() {
    if (!import.meta.client) return
    callbackRefs.value = Math.max(0, Math.floor(Number(callbackRefs.value) || 0) - 1)
    if (callbackRefs.value > 0) return
    const cb = callbackRef.value
    if (cb) presence.removeSpacesCallback(cb)
    callbackRef.value = null

    if (typingSweepTimer.value) {
      clearInterval(typingSweepTimer.value)
      typingSweepTimer.value = null
    }
  }

  onMounted(() => {
    if (!passive) ensureCallbackRegistered()
  })
  onBeforeUnmount(() => {
    if (!passive) maybeCallbackUnregister()
  })

  async function subscribeToSpace(sid: string) {
    const id = String(sid ?? '').trim()
    if (!import.meta.client) return
    if (!id) return
    await ensureLoaded()
    if (!user.value?.id) return

    presence.connect()
    await presence.whenSocketConnected(10_000)
    presence.emitSpacesChatSubscribe(id)
    subscribedSpaceId.value = id
  }

  function unsubscribe() {
    if (!import.meta.client) return
    if (!subscribedSpaceId.value) return
    presence.emitSpacesChatUnsubscribe()
    subscribedSpaceId.value = null
  }

  if (!passive) {
    watch(
      spaceId,
      async (next, prev) => {
        if (!import.meta.client) return
        const prevId = (prev ?? '').trim()
        const nextId = (next ?? '').trim()
        if (prevId && prevId !== nextId) unsubscribe()
        if (nextId) await subscribeToSpace(nextId)
        else unsubscribe()
      },
      { immediate: true },
    )
  }

  function sendMessage(body: string) {
    const sid = spaceId.value
    if (!import.meta.client) return
    if (!sid) return
    if (!user.value?.id) return
    const text = String(body ?? '').trim()
    if (!text) return
    presence.emitSpacesChatSend(sid, text)
  }

  return {
    spaceId,
    messages,
    typingNameClass,
    typingUsersForDisplay,
    typingUsersTotalCount,
    subscribedSpaceId: readonly(subscribedSpaceId),
    sendMessage,
    setMessagesForSpace,
  }
}

