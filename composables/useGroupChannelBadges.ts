import { usePresenceCallback } from '~/composables/presence/usePresenceCallback'
import type { CommunityGroupShell, GroupChannel } from '~/types/api'
import type { ChannelCallback } from '~/composables/presence/usePresenceDomains'

export type GroupChannelBadge = { personalCount: number; hasUnread: boolean }

type BadgeSource = Pick<CommunityGroupShell, 'id' | 'channelsAvailable' | 'channelPersonalCount' | 'channelHasUnread'>

/**
 * Per-group Channels badge: a count for mentions and followed replies, otherwise a dot for any
 * unmuted unread channel. Posts keep their own count (`groupsUnread`); neither feeds the bell.
 */
export function useGroupChannelBadges() {
  const badges = useState<Record<string, GroupChannelBadge>>('group-channel-badges', () => ({}))

  function seed(groups: readonly BadgeSource[]) {
    const next = { ...badges.value }
    for (const group of groups) {
      if (!group.channelsAvailable) { delete next[group.id]; continue }
      next[group.id] = { personalCount: group.channelPersonalCount ?? 0, hasUnread: group.channelHasUnread === true }
    }
    badges.value = next
  }

  function set(groupId: string, channels: GroupChannel[]) {
    badges.value = {
      ...badges.value,
      [groupId]: {
        personalCount: channels.reduce((sum, channel) => sum + channel.personalCount, 0),
        hasUnread: channels.some(channel => channel.hasUnread),
      },
    }
  }

  function badgeFor(groupId: string): GroupChannelBadge {
    return badges.value[groupId] ?? { personalCount: 0, hasUnread: false }
  }

  return { badges, seed, set, badgeFor }
}

/** Installed once by the app layout: keeps every tracked group's Channels badge live. */
export function useGroupChannelBadgeSync() {
  const { badges, seed, set } = useGroupChannelBadges()
  const { groups } = useMyGroups()
  const { apiFetchData } = useApiClient()
  const { user } = useAuth()
  const presence = usePresence()
  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  let alive = true

  async function refresh(groupId: string) {
    try {
      const channels = await apiFetchData<GroupChannel[]>(`/groups/${encodeURIComponent(groupId)}/channels`)
      if (alive && user.value?.id) set(groupId, channels)
    } catch { /* Not a member or channels unavailable: keep the seeded value. */ }
  }
  function schedule(groupId: string) {
    clearTimeout(timers.get(groupId))
    timers.set(groupId, setTimeout(() => { timers.delete(groupId); void refresh(groupId) }, 350))
  }
  const onChannel: ChannelCallback = event => {
    const groupId = event.payload.groupId
    if (groupId in badges.value) schedule(groupId)
  }

  watch(groups, next => seed(next), { immediate: true })
  watch(() => user.value?.id, () => { badges.value = {}; seed(groups.value) })
  watch(presence.isSocketConnected, connected => {
    if (connected) for (const groupId of Object.keys(badges.value)) schedule(groupId)
  })
  usePresenceCallback('Channel', onChannel)
  onBeforeUnmount(() => {
    alive = false
    for (const timer of timers.values()) clearTimeout(timer)
  })
}
