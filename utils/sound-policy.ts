import type { ChannelMessage, GroupChannel } from '~/types/api'

/**
 * Every in-app cue in one catalog. iOS mirrors these ids, files, volumes, and cooldowns in
 * `SoundCatalog.swift`; keep them in step.
 */
export const SOUND_CATALOG = {
  notification: { url: '/sounds/notification.mp3', volume: 0.9, cooldownMs: 3000 },
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
  channel: Pick<GroupChannel, 'id' | 'preference' | 'personalCount'>
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
  return channel.preference === 'all' ? 'channel-message' : null
}

/** Reactions from other people on a message you sent. */
export function othersReactionCount(reactions: Array<{ count: number; reactedByMe: boolean }>): number {
  return reactions.reduce((sum, item) => sum + Math.max(0, item.count - (item.reactedByMe ? 1 : 0)), 0)
}
