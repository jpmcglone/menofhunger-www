import type { Ref } from 'vue'
import type { Socket } from 'socket.io-client'

/**
 * Fire-and-forget socket emits (radio, spaces, messaging, typing, activity).
 * Pure factory over the shared socket ref — no state of its own.
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
      const socket = socketRef.value
      if (!socket?.connected) return
      socket.emit('radio:lobbies:subscribe', {})
    },
    emitRadioLobbiesUnsubscribe() {
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
      const socket = socketRef.value
      if (!socket?.connected) return
      socket.emit('spaces:lobbies:subscribe', {})
    },
    emitSpacesLobbiesUnsubscribe() {
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
    emitSpacesChatSend(spaceId: string, body: string, media?: Array<{ url: string; width: number | null; height: number | null; alt: string | null }>) {
      const socket = socketRef.value
      const id = String(spaceId ?? '').trim()
      const text = String(body ?? '')
      if (!socket?.connected || !id) return
      const payload: Record<string, unknown> = { spaceId: id, body: text }
      if (media && media.length > 0) payload.media = media
      socket.emit('spaces:chatSend', payload)
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
      const socket = socketRef.value
      if (!socket?.connected) return
      socket.emit('messages:screen', {
        active: Boolean(active),
        ...(active && conversationId ? { conversationId } : {}),
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
  }
}
