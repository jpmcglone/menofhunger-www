import { usePresenceCallback } from '~/composables/presence/usePresenceCallback'
import type { ChannelMessagesEvent } from '~/types/api'
import { channelSoundFor, othersReactionCount } from '~/utils/sound-policy'

/**
 * App-wide cues for group channels and reactions. Mounted once in the app layout so a
 * channel you are not looking at can still tick or ping.
 */
export function useChannelSounds() {
  if (!import.meta.client) return
  const route = useRoute()
  const { user } = useAuth()
  const sounds = useSoundPolicy()
  const seenMessages = new Set<string>()
  const personalByChannel = new Map<string, number>()
  const reactionsByMessage = new Map<string, number>()

  const channelCallback = (event: { type: string; payload: unknown }) => {
    if (event.type !== 'messages') return
    const { channel, messages } = event.payload as ChannelMessagesEvent
    const meId = user.value?.id ?? null
    const viewing = route.path.includes('/channels/') ? String(route.params.channelId ?? '') || null : null
    const visible = document.visibilityState === 'visible'
    const prior = personalByChannel.get(channel.id) ?? null
    personalByChannel.set(channel.id, channel.personalCount)
    let best: 'channel-mention' | 'channel-message' | null = null
    for (const message of messages) {
      const known = seenMessages.has(message.id)
      seenMessages.add(message.id)
      if (message.sender.id === meId) {
        const others = othersReactionCount(message.reactions ?? [])
        const before = reactionsByMessage.get(message.id)
        reactionsByMessage.set(message.id, others)
        if (before !== undefined && others > before) sounds.play('reaction')
        continue
      }
      const sound = channelSoundFor({ message, channel, priorPersonalCount: prior, isKnownMessage: known, meId, viewingChannelId: visible ? viewing : null })
      if (sound === 'channel-mention' || (sound && !best)) best = sound
    }
    if (best) sounds.play(best)
    if (seenMessages.size > 2000) seenMessages.clear()
  }

  const messagesCallback = {
    onReaction: (data: { message?: unknown }) => {
      const message = data?.message as { id?: string; sender?: { id?: string }; reactions?: Array<{ count: number; reactedByMe: boolean }> } | undefined
      if (!message?.id || message.sender?.id !== user.value?.id) return
      const others = othersReactionCount(message.reactions ?? [])
      const before = reactionsByMessage.get(message.id)
      reactionsByMessage.set(message.id, others)
      if (others > (before ?? 0)) sounds.play('reaction')
    },
  }

  usePresenceCallback('Channel', channelCallback)
  usePresenceCallback('Messages', messagesCallback)
}


