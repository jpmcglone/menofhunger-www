import type {
  ChannelChangedEvent,
  ChannelMessagesEvent,
  ChannelTypingEvent,
  ChannelViewerEvent,
  MarvCreditsUpdatedPayloadDto,
  RadioChatMessage,
  RadioListener,
  SpaceChatMessage,
  SpaceChatReactionEvent,
  SpaceChatSender,
  SpaceMember,
  SpaceModeChanged,
  SpaceReactionEvent,
  WatchPartyState,
  WsAccountsBadgeUpdatedPayload,
  WsNotificationsDeletedPayload,
  WsNotificationsNewPayload,
  WsNotificationsUpdatedPayload,
  WsSpacesUpdatedPayload,
} from '~/types/api'
import type { Socket } from 'socket.io-client'
import type { PresenceSocketHandlerDeps } from './registerPresenceSocketHandlers'

export function registerPresenceMediaHandlers(socket: Socket, d: PresenceSocketHandlerDeps) {
  socket.on('group-channels:changed', (payload: ChannelChangedEvent) => {
    for (const callback of d.channelCallbacks.value) callback({ type: 'changed', payload })
  })
  socket.on('group-channels:messages', (payload: ChannelMessagesEvent) => {
    for (const callback of d.channelCallbacks.value) callback({ type: 'messages', payload })
  })
  socket.on('group-channels:typing', (payload: ChannelTypingEvent) => {
    for (const callback of d.channelCallbacks.value) callback({ type: 'typing', payload })
  })
  socket.on('group-channels:viewer', (payload: ChannelViewerEvent) => {
    for (const callback of d.channelCallbacks.value) callback({ type: 'viewer', payload })
  })
  // ── Notifications / Marv ──────────────────────────────────────────
  socket.on('notifications:updated', (data: WsNotificationsUpdatedPayload) => {
    if (!d.notificationsCallbacks.value.size) return
    for (const cb of d.notificationsCallbacks.value) {
      cb.onUpdated?.(data)
    }
  })

  socket.on('notifications:new', (data: WsNotificationsNewPayload) => {
    if (!d.notificationsCallbacks.value.size) return
    for (const cb of d.notificationsCallbacks.value) {
      cb.onNew?.(data)
    }
  })

  socket.on('notifications:deleted', (data: WsNotificationsDeletedPayload) => {
    if (!d.notificationsCallbacks.value.size) return
    for (const cb of d.notificationsCallbacks.value) {
      cb.onDeleted?.(data)
    }
  })

  socket.on('accounts:badge-updated', (data: WsAccountsBadgeUpdatedPayload) => {
    if (!d.accountsCallbacks.value.size) return
    for (const cb of d.accountsCallbacks.value) {
      cb.onBadgeUpdated?.(data)
    }
  })

  socket.on('marv:actions-updated', () => {
    for (const cb of d.marvCallbacks.value) cb.onActionsUpdated?.()
  })

  socket.on('marv:credits-updated', (data: MarvCreditsUpdatedPayloadDto) => {
    if (!d.marvCallbacks.value.size) return
    for (const cb of d.marvCallbacks.value) {
      cb.onCreditsUpdated?.(data)
    }
  })

  // ── Messages ──────────────────────────────────────────────────────
  socket.on('messages:new', (data: { conversationId?: string; message?: unknown }) => {
    if (!d.messagesCallbacks.value.size) return
    for (const cb of d.messagesCallbacks.value) {
      cb.onMessage?.(data)
    }
  })

  socket.on('messages:reaction', (data: { conversationId?: string; message?: unknown }) => {
    if (!d.messagesCallbacks.value.size) return
    for (const cb of d.messagesCallbacks.value) {
      cb.onReaction?.(data)
    }
  })

  socket.on('messages:edited', (data: { conversationId?: string; message?: unknown }) => {
    if (!d.messagesCallbacks.value.size) return
    for (const cb of d.messagesCallbacks.value) {
      cb.onMessageEdited?.(data)
    }
  })

  socket.on('messages:deleted-for-all', (data: { conversationId?: string; messageId?: string }) => {
    if (!d.messagesCallbacks.value.size) return
    for (const cb of d.messagesCallbacks.value) {
      cb.onMessageDeletedForAll?.(data)
    }
  })

  socket.on('messages:typing', (data: { conversationId?: string; userId?: string; typing?: boolean; status?: string }) => {
    if (!d.messagesCallbacks.value.size) return
    for (const cb of d.messagesCallbacks.value) {
      cb.onTyping?.(data)
    }
  })

  socket.on('messages:read', (data: { conversationId?: string; userId?: string; lastReadAt?: string }) => {
    if (!d.messagesCallbacks.value.size) return
    for (const cb of d.messagesCallbacks.value) {
      cb.onRead?.(data)
    }
  })

  // ── Radio ─────────────────────────────────────────────────────────
  socket.on('radio:listeners', (data: { stationId?: string; listeners?: RadioListener[] }) => {
    if (!d.radioCallbacks.value.size) return
    const stationId = String(data?.stationId ?? '').trim()
    const listeners = Array.isArray(data?.listeners) ? data.listeners : []
    for (const cb of d.radioCallbacks.value) {
      cb.onListeners?.({ stationId, listeners })
    }
  })

  socket.on('radio:lobbyCounts', (data: { countsByStationId?: Record<string, number> }) => {
    if (!d.radioCallbacks.value.size) return
    const countsByStationId = (data?.countsByStationId ?? {}) as Record<string, number>
    for (const cb of d.radioCallbacks.value) {
      cb.onLobbyCounts?.({ countsByStationId })
    }
  })

  socket.on('radio:chatSnapshot', (data: { stationId?: string; messages?: RadioChatMessage[] }) => {
    if (!d.radioCallbacks.value.size) return
    const stationId = String(data?.stationId ?? '').trim()
    const messages = Array.isArray(data?.messages) ? data.messages : []
    for (const cb of d.radioCallbacks.value) {
      cb.onChatSnapshot?.({ stationId, messages })
    }
  })

  socket.on('radio:chatMessage', (data: { stationId?: string; message?: RadioChatMessage }) => {
    if (!d.radioCallbacks.value.size) return
    const stationId = String(data?.stationId ?? '').trim()
    const message = data?.message
    if (!stationId || !message?.id) return
    for (const cb of d.radioCallbacks.value) {
      cb.onChatMessage?.({ stationId, message })
    }
  })

  socket.on('radio:replaced', () => {
    for (const cb of d.radioCallbacks.value) {
      cb.onReplaced?.()
    }
  })

  // ── Spaces ────────────────────────────────────────────────────────
  socket.on('spaces:members', (data: { spaceId?: string; members?: SpaceMember[] }) => {
    if (!d.spacesCallbacks.value.size) return
    const spaceId = String(data?.spaceId ?? '').trim()
    const members = Array.isArray(data?.members) ? data.members : []
    for (const cb of d.spacesCallbacks.value) {
      cb.onMembers?.({ spaceId, members })
    }
  })

  socket.on('spaces:lobbyCounts', (data: { countsBySpaceId?: Record<string, number> }) => {
    if (!d.spacesCallbacks.value.size) return
    const countsBySpaceId = (data?.countsBySpaceId ?? {}) as Record<string, number>
    for (const cb of d.spacesCallbacks.value) {
      cb.onLobbyCounts?.({ countsBySpaceId })
    }
  })

  socket.on('spaces:chatSnapshot', (data: { spaceId?: string; messages?: SpaceChatMessage[] }) => {
    if (!d.spacesCallbacks.value.size) return
    const spaceId = String(data?.spaceId ?? '').trim()
    const messages = Array.isArray(data?.messages) ? data.messages : []
    for (const cb of d.spacesCallbacks.value) {
      cb.onChatSnapshot?.({ spaceId, messages })
    }
  })

  socket.on('spaces:chatMessage', (data: { spaceId?: string; message?: SpaceChatMessage }) => {
    if (!d.spacesCallbacks.value.size) return
    const spaceId = String(data?.spaceId ?? '').trim()
    const message = data?.message
    if (!spaceId || !message?.id) return
    for (const cb of d.spacesCallbacks.value) {
      cb.onChatMessage?.({ spaceId, message })
    }
  })

  socket.on('spaces:typing', (data: { spaceId?: string; sender?: SpaceChatSender; typing?: boolean }) => {
    if (!d.spacesCallbacks.value.size) return
    const spaceId = String(data?.spaceId ?? '').trim()
    const sender = data?.sender
    if (!spaceId || !sender?.id) return
    const typing = typeof data?.typing === 'boolean' ? data.typing : undefined
    for (const cb of d.spacesCallbacks.value) {
      cb.onTyping?.({ spaceId, sender, typing })
    }
  })

  socket.on('spaces:chatReaction', (data: SpaceChatReactionEvent) => {
    if (!d.spacesCallbacks.value.size) return
    const spaceId = String(data?.spaceId ?? '').trim()
    const messageId = String(data?.messageId ?? '').trim()
    const userId = String(data?.userId ?? '').trim()
    const reactionId = String(data?.reactionId ?? '').trim()
    const emoji = String(data?.emoji ?? '').trim()
    if (!spaceId || !messageId || !userId || !reactionId || !emoji) return
    const username = typeof data?.username === 'string' ? data.username : null
    for (const cb of d.spacesCallbacks.value) {
      cb.onChatReaction?.({ spaceId, messageId, userId, username, reactionId, emoji })
    }
  })

  socket.on('spaces:reaction', (data: SpaceReactionEvent) => {
    if (!d.spacesCallbacks.value.size) return
    const spaceId = String((data as any)?.spaceId ?? '').trim()
    const userId = String((data as any)?.userId ?? '').trim()
    const reactionId = String((data as any)?.reactionId ?? '').trim()
    const emoji = String((data as any)?.emoji ?? '').trim()
    if (!spaceId || !userId || !emoji) return
    for (const cb of d.spacesCallbacks.value) {
      cb.onReaction?.({ spaceId, userId, reactionId, emoji })
    }
  })

  socket.on('spaces:watchPartyState', (data: { spaceId?: string } & Partial<WatchPartyState>) => {
    if (!d.spacesCallbacks.value.size) return
    const spaceId = String(data?.spaceId ?? '').trim()
    if (!spaceId) return
    for (const cb of d.spacesCallbacks.value) {
      cb.onWatchPartyState?.({
        spaceId,
        videoUrl: String(data?.videoUrl ?? ''),
        isPlaying: Boolean(data?.isPlaying),
        currentTime: Number(data?.currentTime ?? 0),
        playbackRate: Number(data?.playbackRate ?? 1),
        updatedAt: Number(data?.updatedAt ?? Date.now()),
      })
    }
  })

  socket.on('spaces:modeChanged', (data: SpaceModeChanged) => {
    if (!d.spacesCallbacks.value.size) return
    const spaceId = String((data as any)?.spaceId ?? '').trim()
    if (!spaceId) return
    for (const cb of d.spacesCallbacks.value) {
      cb.onModeChanged?.(data)
    }
  })

  socket.on('spaces:updated', (data: WsSpacesUpdatedPayload) => {
    if (!d.spacesCallbacks.value.size) return
    const spaceId = String(data?.spaceId ?? '').trim()
    if (!spaceId || !data?.patch || typeof data.patch !== 'object') return
    const payload: WsSpacesUpdatedPayload = {
      spaceId,
      version: String(data.version ?? ''),
      reason: String(data.reason ?? ''),
      patch: data.patch,
    }
    for (const cb of d.spacesCallbacks.value) {
      cb.onUpdated?.(payload)
    }
  })

  socket.on('spaces:watchPartyOwnerReplaced', (data: { spaceId?: string }) => {
    if (!d.spacesCallbacks.value.size) return
    const spaceId = String(data?.spaceId ?? '').trim()
    if (!spaceId) return
    for (const cb of d.spacesCallbacks.value) {
      cb.onWatchPartyOwnerReplaced?.({ spaceId })
    }
  })

  socket.on('spaces:watchPartyOwnerPromoted', (data: { spaceId?: string }) => {
    if (!d.spacesCallbacks.value.size) return
    const spaceId = String(data?.spaceId ?? '').trim()
    if (!spaceId) return
    for (const cb of d.spacesCallbacks.value) {
      cb.onWatchPartyOwnerPromoted?.({ spaceId })
    }
  })

}
