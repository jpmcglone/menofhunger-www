import type { RadioCallback } from '~/composables/usePresence'
import type { RadioChatMessage } from '~/types/api'

const MAX_MESSAGES_PER_STATION = 220

function clampMessageList(list: RadioChatMessage[]): RadioChatMessage[] {
  if (!Array.isArray(list)) return []
  if (list.length <= MAX_MESSAGES_PER_STATION) return list
  return list.slice(-MAX_MESSAGES_PER_STATION)
}

function upsertMessages(existing: RadioChatMessage[], incoming: RadioChatMessage[]): RadioChatMessage[] {
  if (!incoming.length) return existing
  const byId = new Map(existing.map((m) => [m.id, m]))
  for (const m of incoming) {
    if (!m?.id) continue
    byId.set(m.id, m)
  }
  // Preserve chronological order best-effort: sort by createdAt then by id.
  const merged = Array.from(byId.values()).sort((a, b) => {
    const ta = Date.parse(a.createdAt || '') || 0
    const tb = Date.parse(b.createdAt || '') || 0
    if (ta !== tb) return ta - tb
    return String(a.id).localeCompare(String(b.id))
  })
  return clampMessageList(merged)
}

export function useRadioLiveChat(options: { passive?: boolean } = {}) {
  const { user } = useAuth()
  const presence = usePresence()
  const radio = useRadioPlayer()
  const passive = options.passive === true

  const messagesByStation = useState<Record<string, RadioChatMessage[]>>('radio-live-chat-messages', () => ({}))
  const subscribedStationId = useState<string | null>('radio-live-chat-subscribed-station', () => null)
  const callbackRef = useState<RadioCallback | null>('radio-live-chat-callback', () => null)
  const callbackRefs = useState<number>('radio-live-chat-callback-refs', () => 0)

  const stationId = computed(() => (radio.stationId.value ?? '').trim() || null)

  const messages = computed<RadioChatMessage[]>(() => {
    const sid = stationId.value
    if (!sid) return []
    return messagesByStation.value[sid] ?? []
  })

  function setMessagesForStation(sid: string, next: RadioChatMessage[]) {
    const id = String(sid ?? '').trim()
    if (!id) return
    messagesByStation.value = {
      ...messagesByStation.value,
      [id]: clampMessageList(next),
    }
  }

  function appendMessageForStation(sid: string, msg: RadioChatMessage) {
    const id = String(sid ?? '').trim()
    if (!id || !msg?.id) return
    const current = messagesByStation.value[id] ?? []
    if (current.some((m) => m.id === msg.id)) return
    const next = clampMessageList([...current, msg])
    messagesByStation.value = { ...messagesByStation.value, [id]: next }
  }

  function ensureCallbackRegistered() {
    if (!import.meta.client) return
    callbackRefs.value += 1
    if (callbackRef.value) return
    const cb: RadioCallback = {
      onChatSnapshot: (payload) => {
        const sid = String(payload?.stationId ?? '').trim()
        if (!sid) return
        const incoming = Array.isArray(payload?.messages) ? payload.messages : []
        const merged = upsertMessages(messagesByStation.value[sid] ?? [], incoming)
        messagesByStation.value = { ...messagesByStation.value, [sid]: merged }
      },
      onChatMessage: (payload) => {
        const sid = String(payload?.stationId ?? '').trim()
        const msg = payload?.message as RadioChatMessage | undefined
        if (!sid || !msg?.id) return
        appendMessageForStation(sid, msg)
      },
    }
    callbackRef.value = cb
    presence.addRadioCallback(cb)
  }

  function maybeCallbackUnregister() {
    if (!import.meta.client) return
    callbackRefs.value = Math.max(0, Math.floor(Number(callbackRefs.value) || 0) - 1)
    if (callbackRefs.value > 0) return
    const cb = callbackRef.value
    if (cb) presence.removeRadioCallback(cb)
    callbackRef.value = null
  }

  onMounted(() => {
    if (!passive) ensureCallbackRegistered()
  })
  onBeforeUnmount(() => {
    if (!passive) maybeCallbackUnregister()
  })

  async function subscribeToStation(sid: string) {
    const id = String(sid ?? '').trim()
    if (!import.meta.client) return
    if (!id) return
    if (!user.value?.id) return

    presence.connect()
    await presence.whenSocketConnected(10_000)
    presence.emitRadioChatSubscribe(id)
    subscribedStationId.value = id
  }

  function unsubscribe() {
    if (!import.meta.client) return
    if (!subscribedStationId.value) return
    presence.emitRadioChatUnsubscribe()
    subscribedStationId.value = null
  }

  if (!passive) {
    watch(
      stationId,
      async (next, prev) => {
        if (!import.meta.client) return
        const prevId = (prev ?? '').trim()
        const nextId = (next ?? '').trim()
        if (prevId && prevId !== nextId) {
          // Best-effort: stop receiving messages for prior station.
          unsubscribe()
        }
        if (nextId) {
          await subscribeToStation(nextId)
        } else {
          unsubscribe()
        }
      },
      { immediate: true },
    )
  }

  function sendMessage(body: string) {
    const sid = stationId.value
    if (!import.meta.client) return
    if (!sid) return
    if (!user.value?.id) return
    const text = String(body ?? '').trim()
    if (!text) return
    presence.emitRadioChatSend(sid, text)
  }

  return {
    stationId,
    messages,
    subscribedStationId: readonly(subscribedStationId),
    sendMessage,
    setMessagesForStation,
  }
}

