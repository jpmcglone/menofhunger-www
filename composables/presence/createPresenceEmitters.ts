import type { Ref } from 'vue'
import type { Socket } from 'socket.io-client'
import type { CallsAck, CallType, RtcIceCandidate, RtcSessionDescription } from '~/types/api'

const CALLS_ACK_TIMEOUT_MS = 10_000

const OFFLINE_ACK: CallsAck = {
  call: null,
  error: { code: 'invalid_payload', message: "You're offline. Check your connection and try again." },
}

async function emitCallsWithAck(socket: Socket | null, event: string, payload: Record<string, unknown>): Promise<CallsAck> {
  if (!socket?.connected) return OFFLINE_ACK
  try {
    const ack = (await socket.timeout(CALLS_ACK_TIMEOUT_MS).emitWithAck(event, payload)) as CallsAck | undefined
    if (!ack || typeof ack !== 'object') return { call: null, error: { code: 'invalid_payload', message: 'Unexpected response.' } }
    return ack
  } catch {
    return { call: null, error: { code: 'invalid_payload', message: 'The call server did not respond. Try again.' } }
  }
}

/** Sticky room flags written by subscribe/leave emits and replayed on reconnect. */
export const STICKY_ROOM_KEYS = {
  spacesLobbies: 'spaces-lobbies-subscribed',
  radioLobbies: 'radio-lobbies-subscribed',
  messagesActive: 'messages-screen-active',
  messagesConversationId: 'messages-screen-conversation-id',
} as const

/**
 * Fire-and-forget socket emits (radio, spaces, messaging, typing, activity).
 * Lobby / messages-screen membership is remembered in Nuxt state so reconnect
 * can re-join those rooms without each page watching the socket flag.
 */
export function createPresenceEmitters(socketRef: Ref<Socket | null>) {
  return {
    emitRadioJoin(stationId: string) {
      const socket = socketRef.value
      const id = (stationId ?? '').trim()
      if (!socket?.connected || !id) return
      socket.emit('radio:join', { stationId: id })
    },
    emitRadioWatch(stationId: string) {
      const socket = socketRef.value
      const id = (stationId ?? '').trim()
      if (!socket?.connected || !id) return
      socket.emit('radio:watch', { stationId: id })
    },
    emitRadioPause() {
      const socket = socketRef.value
      if (!socket?.connected) return
      socket.emit('radio:pause', {})
    },
    emitRadioLeave() {
      const socket = socketRef.value
      if (!socket?.connected) return
      socket.emit('radio:leave', {})
    },
    emitRadioMute(muted: boolean) {
      const socket = socketRef.value
      if (!socket?.connected) return
      socket.emit('radio:mute', { muted: Boolean(muted) })
    },
    emitRadioLobbiesSubscribe() {
      useState<boolean>(STICKY_ROOM_KEYS.radioLobbies, () => false).value = true
      const socket = socketRef.value
      if (!socket?.connected) return
      socket.emit('radio:lobbies:subscribe', {})
    },
    emitRadioLobbiesUnsubscribe() {
      useState<boolean>(STICKY_ROOM_KEYS.radioLobbies, () => false).value = false
      const socket = socketRef.value
      if (!socket?.connected) return
      socket.emit('radio:lobbies:unsubscribe', {})
    },
    emitRadioChatSubscribe(stationId: string) {
      const socket = socketRef.value
      const id = String(stationId ?? '').trim()
      if (!socket?.connected || !id) return
      socket.emit('radio:chatSubscribe', { stationId: id })
    },
    emitRadioChatUnsubscribe() {
      const socket = socketRef.value
      if (!socket?.connected) return
      socket.emit('radio:chatUnsubscribe', {})
    },
    emitRadioChatSend(stationId: string, body: string) {
      const socket = socketRef.value
      const id = String(stationId ?? '').trim()
      const text = String(body ?? '')
      if (!socket?.connected || !id) return
      socket.emit('radio:chatSend', { stationId: id, body: text })
    },
    emitSpacesJoin(spaceId: string) {
      const socket = socketRef.value
      const id = String(spaceId ?? '').trim()
      if (!socket?.connected || !id) return
      socket.emit('spaces:join', { spaceId: id })
    },
    emitSpacesPause() {
      const socket = socketRef.value
      if (!socket?.connected) return
      socket.emit('spaces:pause', {})
    },
    emitSpacesLeave() {
      const socket = socketRef.value
      if (!socket?.connected) return
      socket.emit('spaces:leave', {})
    },
    emitSpacesMute(muted: boolean) {
      const socket = socketRef.value
      if (!socket?.connected) return
      socket.emit('spaces:mute', { muted: Boolean(muted) })
    },
    emitSpacesLobbiesSubscribe() {
      useState<boolean>(STICKY_ROOM_KEYS.spacesLobbies, () => false).value = true
      const socket = socketRef.value
      if (!socket?.connected) return
      socket.emit('spaces:lobbies:subscribe', {})
    },
    emitSpacesLobbiesUnsubscribe() {
      useState<boolean>(STICKY_ROOM_KEYS.spacesLobbies, () => false).value = false
      const socket = socketRef.value
      if (!socket?.connected) return
      socket.emit('spaces:lobbies:unsubscribe', {})
    },
    emitSpacesChatSubscribe(spaceId: string) {
      const socket = socketRef.value
      const id = String(spaceId ?? '').trim()
      if (!socket?.connected || !id) return
      socket.emit('spaces:chatSubscribe', { spaceId: id })
    },
    emitSpacesChatUnsubscribe() {
      const socket = socketRef.value
      if (!socket?.connected) return
      socket.emit('spaces:chatUnsubscribe', {})
    },
    emitSpacesChatSend(
      spaceId: string,
      body: string,
      media?: Array<{ url: string; width: number | null; height: number | null; alt: string | null }>,
      replyToId?: string | null,
    ) {
      const socket = socketRef.value
      const id = String(spaceId ?? '').trim()
      const text = String(body ?? '')
      if (!socket?.connected || !id) return
      const payload: Record<string, unknown> = { spaceId: id, body: text }
      if (media && media.length > 0) payload.media = media
      const parentId = String(replyToId ?? '').trim()
      if (parentId) payload.replyToId = parentId
      socket.emit('spaces:chatSend', payload)
    },
    emitSpacesChatReact(spaceId: string, messageId: string, reactionId: string) {
      const socket = socketRef.value
      const sid = String(spaceId ?? '').trim()
      const mid = String(messageId ?? '').trim()
      const rid = String(reactionId ?? '').trim()
      if (!socket?.connected || !sid || !mid || !rid) return
      socket.emit('spaces:chatReact', { spaceId: sid, messageId: mid, reactionId: rid })
    },
    emitSpacesTyping(spaceId: string, typing: boolean) {
      const socket = socketRef.value
      const id = String(spaceId ?? '').trim()
      if (!socket?.connected || !id) return
      socket.emit('spaces:typing', { spaceId: id, typing: Boolean(typing) })
    },
    emitSpacesReaction(spaceId: string, reactionId: string) {
      const socket = socketRef.value
      const sid = String(spaceId ?? '').trim()
      const rid = String(reactionId ?? '').trim()
      if (!socket?.connected || !sid || !rid) return
      socket.emit('spaces:reaction', { spaceId: sid, reactionId: rid })
    },
    emitSpacesWatchPartyControl(spaceId: string, state: { videoUrl: string; isPlaying: boolean; currentTime: number; playbackRate: number }) {
      const socket = socketRef.value
      const id = String(spaceId ?? '').trim()
      if (!socket?.connected || !id) return
      socket.emit('spaces:watchPartyControl', { spaceId: id, ...state })
    },
    emitSpacesRequestWatchPartyState(spaceId: string) {
      const socket = socketRef.value
      const id = String(spaceId ?? '').trim()
      if (!socket?.connected || !id) return
      socket.emit('spaces:requestWatchPartyState', { spaceId: id })
    },
    /** Owner calls this after a successful REST setMode so all viewers get a real-time modeChanged broadcast. */
    emitSpacesAnnounceMode(spaceId: string, data: { mode: string; watchPartyUrl?: string | null; radioStreamUrl?: string | null }) {
      const socket = socketRef.value
      const id = String(spaceId ?? '').trim()
      if (!socket?.connected || !id) return
      socket.emit('spaces:announceMode', { spaceId: id, ...data })
    },
    emitMessagesScreen(active: boolean, conversationId?: string | null) {
      const on = Boolean(active)
      useState<boolean>(STICKY_ROOM_KEYS.messagesActive, () => false).value = on
      useState<string | null>(STICKY_ROOM_KEYS.messagesConversationId, () => null).value =
        on && conversationId ? String(conversationId) : null
      const socket = socketRef.value
      if (!socket?.connected) return
      socket.emit('messages:screen', {
        active: on,
        ...(on && conversationId ? { conversationId } : {}),
      })
    },
    emitPostsTyping(postId: string, typing: boolean) {
      const socket = socketRef.value
      const id = (postId ?? '').trim()
      if (!socket?.connected || !id) return
      socket.emit('posts:typing', { postId: id, typing: Boolean(typing) })
    },
    emitMessagesTyping(conversationId: string, typing: boolean) {
      const socket = socketRef.value
      const id = (conversationId ?? '').trim()
      if (!socket?.connected || !id) return
      socket.emit('messages:typing', { conversationId: id, typing: Boolean(typing) })
    },
    /** Force an immediate presence:active ping (e.g. right after onboarding completes). */
    emitActivity() {
      const socket = socketRef.value
      if (!socket?.connected) return
      socket.emit('presence:active')
    },

    // ── DM calling (acked) ────────────────────────────────────────────
    emitCallsStart(conversationId: string, type: CallType): Promise<CallsAck> {
      return emitCallsWithAck(socketRef.value, 'calls:start', { conversationId: String(conversationId ?? '').trim(), type })
    },
    emitCallsJoin(callId: string): Promise<CallsAck> {
      return emitCallsWithAck(socketRef.value, 'calls:join', { callId: String(callId ?? '').trim() })
    },
    emitCallsLeave(callId: string): Promise<CallsAck> {
      return emitCallsWithAck(socketRef.value, 'calls:leave', { callId: String(callId ?? '').trim() })
    },
    emitCallsDecline(callId: string): Promise<CallsAck> {
      return emitCallsWithAck(socketRef.value, 'calls:decline', { callId: String(callId ?? '').trim() })
    },
    emitCallsState(callId: string, state: { micEnabled?: boolean; cameraEnabled?: boolean }) {
      const socket = socketRef.value
      const id = String(callId ?? '').trim()
      if (!socket?.connected || !id) return
      socket.emit('calls:state', { callId: id, ...state })
    },
    emitRtcSignal(
      callId: string,
      toUserId: string,
      signal: { description?: RtcSessionDescription; candidate?: RtcIceCandidate },
    ) {
      const socket = socketRef.value
      const id = String(callId ?? '').trim()
      const to = String(toUserId ?? '').trim()
      if (!socket?.connected || !id || !to) return
      socket.emit('rtc:signal', { callId: id, toUserId: to, ...signal })
    },
  }
}

export type PresenceEmitters = ReturnType<typeof createPresenceEmitters>

/**
 * Re-join process-local rooms after a new socket. Content rooms (posts /
 * articles / groups) and presence interest are handled separately.
 */
export function syncStickyRooms(emitters: PresenceEmitters): void {
  const selectedSpaceId = (useState<string | null>('selected-space-id').value ?? '').trim()
  if (selectedSpaceId) {
    emitters.emitSpacesJoin(selectedSpaceId)
    emitters.emitSpacesRequestWatchPartyState(selectedSpaceId)
    const spaceVolume = Number(useState<number>('space-audio-volume').value ?? 0.5)
    if (spaceVolume <= 0.001) emitters.emitSpacesMute(true)
    const audioSpaceId = (useState<string | null>('space-audio-space-id').value ?? '').trim()
    const audioPlaying = Boolean(useState<boolean>('space-audio-is-playing').value)
    if (audioSpaceId && audioSpaceId === selectedSpaceId && !audioPlaying) {
      emitters.emitSpacesPause()
    }
  }

  const spaceChatId = (useState<string | null>('space-live-chat-subscribed-space').value ?? '').trim()
  if (spaceChatId) emitters.emitSpacesChatSubscribe(spaceChatId)

  if (useState<boolean>(STICKY_ROOM_KEYS.spacesLobbies, () => false).value) {
    emitters.emitSpacesLobbiesSubscribe()
  }

  const radioStationId = (useState<string | null>('radio-station-id').value ?? '').trim()
  if (radioStationId) {
    emitters.emitRadioJoin(radioStationId)
    if (!useState<boolean>('radio-is-playing').value) emitters.emitRadioPause()
    const radioVolume = Number(useState<number>('radio-volume').value ?? 0.5)
    if (radioVolume <= 0.001) emitters.emitRadioMute(true)
  }

  const radioChatId = (useState<string | null>('radio-live-chat-subscribed-station').value ?? '').trim()
  if (radioChatId) emitters.emitRadioChatSubscribe(radioChatId)

  if (useState<boolean>(STICKY_ROOM_KEYS.radioLobbies, () => false).value) {
    emitters.emitRadioLobbiesSubscribe()
  }

  if (useState<boolean>(STICKY_ROOM_KEYS.messagesActive, () => false).value) {
    emitters.emitMessagesScreen(
      true,
      useState<string | null>(STICKY_ROOM_KEYS.messagesConversationId, () => null).value,
    )
  }
}
