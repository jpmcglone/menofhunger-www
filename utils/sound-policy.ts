import type { ChannelMessage, GroupChannel } from '~/types/api'

/**
 * Every in-app cue in one catalog. iOS mirrors these ids, files, volumes, and cooldowns in
 * `SoundCatalog.swift`; keep them in step.
 */
export const SOUND_CATALOG = {
  notification: { url: '/sounds/notification.mp3', volume: 0.9, cooldownMs: 3000 },
  'group-activity': { url: '/sounds/group-activity.wav', volume: 0.7, cooldownMs: 3000 },
  'board-activity': { url: '/sounds/board-activity.wav', volume: 0.7, cooldownMs: 3000 },
  'chat-open': { url: '/sounds/chat-open.wav', volume: 0.16, cooldownMs: 220 },
  'chat-minimize': { url: '/sounds/chat-minimize.wav', volume: 0.12, cooldownMs: 220 },
  'chat-close': { url: '/sounds/chat-close.wav', volume: 0.12, cooldownMs: 220 },
  'presence-join': { url: '/sounds/presence-join.wav', volume: 0.32, cooldownMs: 1500 },
  'presence-online': { url: '/sounds/presence-online.wav', volume: 0.26, cooldownMs: 1500 },
  'presence-offline': { url: '/sounds/presence-offline.wav', volume: 0.18, cooldownMs: 1500 },
  'presence-follow': { url: '/sounds/presence-follow.wav', volume: 0.24, cooldownMs: 1500 },
  message: { url: '/sounds/new-message.mp3', volume: 0.5, cooldownMs: 1800 },
  'channel-message': { url: '/sounds/action-channel-message.wav', volume: 0.7, cooldownMs: 2500 },
  'channel-mention': { url: '/sounds/action-channel-mention.wav', volume: 0.8, cooldownMs: 1500 },
  'message-sent': { url: '/sounds/action-message-sent.wav', volume: 0.7, cooldownMs: 250 },
  reaction: { url: '/sounds/action-reaction.wav', volume: 0.7, cooldownMs: 1500 },
} as const

export type CatalogSound = keyof typeof SOUND_CATALOG

let suppressedUntilMs = 0
const lastPlayedAt = new Map<CatalogSound, number>()

/** Mute cues while the backlog replays after a (re)connect. */
export function suppressSoundsFor(ms: number, now = Date.now()) {
  suppressedUntilMs = Math.max(suppressedUntilMs, now + Math.max(0, ms))
}

export function isSoundBacklogSuppressed(now = Date.now()): boolean { return now < suppressedUntilMs }

/** Reserves a cue slot. Returns false while suppressed or inside the cue's cooldown. */
export function claimSoundSlot(id: CatalogSound, now = Date.now()): boolean {
  if (now < suppressedUntilMs) return false
  if (now - (lastPlayedAt.get(id) ?? 0) < SOUND_CATALOG[id].cooldownMs) return false
  lastPlayedAt.set(id, now)
  return true
}

export function resetSoundPolicyForTests() {
  suppressedUntilMs = 0
  lastPlayedAt.clear()
}

export type ChannelSoundInput = {
  message: Pick<ChannelMessage, 'id' | 'createdAt' | 'threadRootId'> & { sender: { id: string } }
  channel: Pick<GroupChannel, 'id' | 'preference' | 'personalCount'> & { mutedUntil?: string | null }
  /** `personalCount` before this snapshot, when known. */
  priorPersonalCount: number | null
  isKnownMessage: boolean
  meId: string | null
  viewingChannelId: string | null
  now?: number
}

/** Discord rules: own and viewed-channel messages are silent; muted channels never play. */
export function channelSoundFor(input: ChannelSoundInput): 'channel-mention' | 'channel-message' | null {
  const { message, channel, meId } = input
  if (input.isKnownMessage || !meId || message.sender.id === meId) return null
  const age = (input.now ?? Date.now()) - Date.parse(message.createdAt)
  if (!Number.isFinite(age) || age > 15_000) return null
  if (channel.preference === 'off') return null
  if (input.viewingChannelId === channel.id) return null
  const personal = input.priorPersonalCount === null
    ? channel.personalCount > 0
    : channel.personalCount > input.priorPersonalCount
  if (personal) return 'channel-mention'
  if (channel.mutedUntil && Date.parse(channel.mutedUntil) > (input.now ?? Date.now())) return null
  return channel.preference === 'all' ? 'channel-message' : null
}

/** Reactions from other people on a message you sent. */
export function othersReactionCount(reactions: Array<{ count: number; reactedByMe: boolean }>): number {
  return reactions.reduce((sum, item) => sum + Math.max(0, item.count - (item.reactedByMe ? 1 : 0)), 0)
}

/** Notification context determines the family; a DM arrival has its own message event. */
export function notificationSoundFor(notification: {
  kind: string
  boardThreadId?: string | null
  subjectGroupId?: string | null
  post?: { communityGroupId?: string | null } | null
}): 'notification' | 'group-activity' | 'board-activity' | null {
  if (notification.kind === 'message') return null
  if (notification.boardThreadId) return 'board-activity'
  if (notification.subjectGroupId || notification.post?.communityGroupId
    || notification.kind === 'community_group_post'
    || notification.kind.startsWith('community_group_')
    || notification.kind === 'group_join_request'
    || notification.kind === 'marv_not_in_group') return 'group-activity'
  return 'notification'
}

/** Bounded event deduplication; only fresh, actual arrivals can reserve a cue. */
export function createSoundArrivalGate() {
  const seen = new Set<string>()
  return (id: string, createdAt: string, now = Date.now()): boolean => {
    const age = now - Date.parse(createdAt)
    if (!id || !Number.isFinite(age) || age > 15_000 || age < -5_000 || seen.has(id)) return false
    seen.add(id)
    const oldest = seen.values().next().value
    if (seen.size > 1000 && oldest !== undefined) seen.delete(oldest)
    return true
  }
}
