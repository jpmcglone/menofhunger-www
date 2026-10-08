import { usePresenceCallback } from '~/composables/presence/usePresenceCallback'
import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref, type InjectionKey } from 'vue'
import type { ChannelAttention, ChannelMessage, CommunityGroupShell, GroupChannel } from '~/types/api'
import type { ChannelCallback } from '~/composables/presence/usePresenceDomains'
import { channelPath, mergeChannel, mergeChannelMessages } from '~/utils/channels/reducer'
import { useChannelTyping } from '~/composables/channels/useChannelTyping'

type ChannelPagination = { nextCursor: number | null; latestSequence: number }
const CATCH_UP_LIMIT = 100
export function useGroupChannels(group: Ref<CommunityGroupShell | null>) {
  const { apiFetch, apiFetchData } = useApiClient()
  const { user } = useAuth()
  const presence = usePresence()
  const channels = ref<GroupChannel[]>([])
  const messages = ref<Record<string, ChannelMessage>>({})
  const windows = ref<Record<string, ChannelMessage[]>>({})
  const cursors = ref<Record<string, number | null>>({})
  const attention = ref<ChannelAttention[]>([])
  const threadFollows = new Map<string, boolean>()
  const historyRequests = new Map<string, symbol>()
  const accessEpoch = ref(0)
  const typing = useChannelTyping(computed(() => group.value?.channelsAvailable ? group.value.id : null))
  const loading = ref(false)
  const error = ref<string | null>(null)
  const windowKey = (channelId: string, root?: string | null) => `${channelId}:${root ?? ''}`
  function revoke() { typing.clear(); threadFollows.clear(); historyRequests.clear(); accessEpoch.value++; channels.value = []; messages.value = {}; windows.value = {}; cursors.value = {}; attention.value = [] }
  function patchChannel(channel: GroupChannel) {
    const index = channels.value.findIndex(item => item.id === channel.id)
    if (index < 0) return false
    channels.value[index] = mergeChannel(channels.value[index], channel)
    return true
  }
  async function load() {
    if (!group.value?.channelsAvailable) { revoke(); return }
    const epoch = accessEpoch.value
    const groupId = group.value.id
    loading.value = true
    try {
      const next = await apiFetchData<GroupChannel[]>(`/groups/${groupId}/channels`)
      if (epoch !== accessEpoch.value || group.value?.id !== groupId) return
      channels.value = next.map(item => mergeChannel(channels.value.find(old => old.id === item.id), item))
      const allowed = new Set(next.map(item => item.id))
      for (const [id, message] of Object.entries(messages.value)) if (!allowed.has(message.channelId)) delete messages.value[id]
      for (const key of Object.keys(windows.value)) if (!allowed.has(key.split(':')[0]!)) delete windows.value[key]
      error.value = null
    } finally { if (epoch === accessEpoch.value) loading.value = false }
  }
  async function history(channelId: string, root?: string | null, older = false, target?: string) {
    const groupId = group.value?.id
    if (!groupId) return
    const epoch = accessEpoch.value
    const key = windowKey(channelId, root)
    const request = Symbol(key)
    historyRequests.set(key, request)
    const known = new Set((windows.value[key] ?? []).map(item => item.id))
    const path = channelPath(groupId, channelId)
    if (target && !older) {
      const context = await apiFetchData<{ messages: ChannelMessage[]; threadRootId: string | null }>(`${path}/messages/${target}/context`)
      if (epoch !== accessEpoch.value || historyRequests.get(key) !== request) return
      context.messages.forEach(mergeMessage)
      windows.value[windowKey(channelId, context.threadRootId)] = context.messages.map(item => messages.value[item.id] ?? item)
      return
    }
    const response = await apiFetch<ChannelMessage[], ChannelPagination>(`${path}/messages`, { query: { root: root ?? undefined, before: older ? cursors.value[key] : undefined } })
    if (epoch !== accessEpoch.value || historyRequests.get(key) !== request) return
    // Keep newer revisions already received while HTTP was in flight.
    response.data.forEach(mergeMessage)
    const snapshots = mergeChannelMessages(windows.value[key] ?? [], response.data.map(item => messages.value[item.id]!))
    const ids = new Set(response.data.map(item => item.id))
    windows.value[key] = older ? snapshots : snapshots.filter(item => !known.has(item.id) || ids.has(item.id) || item.sequence > (response.pagination?.latestSequence ?? 0))
    cursors.value[key] = response.pagination?.nextCursor ?? null
  }
  /** Fetches changes after each open window's newest revision; a large gap reloads the latest page instead. */
  async function catchUp() {
    const groupId = group.value?.id
    if (!groupId) return
    const epoch = accessEpoch.value
    await Promise.all(Object.entries(windows.value).map(async ([key, rows]) => {
      const [channelId = '', root = ''] = key.split(':')
      if (!channels.value.some(channel => channel.id === channelId)) return
      if (!rows.length) return await history(channelId, root || null)
      const changedSince = Math.max(...rows.map(message => messages.value[message.id]?.revision ?? message.revision))
      const newest = Math.max(...rows.map(message => message.sequence))
      const response = await apiFetch<ChannelMessage[], ChannelPagination>(`${channelPath(groupId, channelId)}/messages`, { query: { root: root || undefined, changedSince, limit: CATCH_UP_LIMIT } })
      if (epoch !== accessEpoch.value) return
      if (response.pagination?.nextCursor) return await history(channelId, root || null)
      const loaded = new Set(rows.map(message => message.id))
      // Changes to messages older than the loaded range update the cache without opening a gap.
      for (const message of response.data) {
        if (loaded.has(message.id) || message.sequence > newest) append(message)
        else mergeMessage(message)
      }
    }))
  }
  const resync = () => load().catch(() => revoke()).then(() => catchUp()).catch(() => {})
  function mergeMessage(message: ChannelMessage) {
    if (!messages.value[message.id] || messages.value[message.id]!.revision <= message.revision) messages.value[message.id] = { ...message, following: threadFollows.get(`${message.channelId}:${message.threadRootId ?? message.id}`) ?? message.following }
  }
  function append(message: ChannelMessage) {
    mergeMessage(message)
    message = messages.value[message.id]!
    const key = windowKey(message.channelId, message.threadRootId)
    if (windows.value[key]) windows.value[key] = mergeChannelMessages(windows.value[key], [message])
    // Root updates may arrive while only a thread is open.
    for (const [window, rows] of Object.entries(windows.value)) {
      if (rows.some(item => item.id === message.id)) windows.value[window] = mergeChannelMessages(rows, [message])
    }
  }
  const callback: ChannelCallback = event => {
    if (event.payload.groupId !== group.value?.id) return
    if (event.type === 'typing') return
    if (event.type === 'changed') {
      if (event.payload.reason === 'access') revoke()
      void load().catch(() => revoke())
    } else {
      const prior = channels.value.find(item => item.id === event.payload.channel.id)
      if (event.type === 'viewer' && prior?.viewerUpdatedAt && (!event.payload.channel.viewerUpdatedAt || prior.viewerUpdatedAt > event.payload.channel.viewerUpdatedAt)) return
      if (!patchChannel(event.payload.channel)) { void load().catch(() => revoke()); return }
      if (event.type === 'messages') for (const message of event.payload.messages) append(message)
      if (event.type === 'viewer') {
        const read = new Set(event.payload.readMessageIds ?? [])
        attention.value = attention.value.filter(item => !read.has(item.messageId))
        const { threadRootId, following } = event.payload
        if (threadRootId && following !== undefined) {
          threadFollows.set(`${event.payload.channel.id}:${threadRootId}`, following)
          for (const message of Object.values(messages.value)) {
            if (message.id === threadRootId || message.threadRootId === threadRootId) message.following = following
          }
          for (const rows of Object.values(windows.value)) for (const message of rows) {
            if (message.id === threadRootId || message.threadRootId === threadRootId) message.following = following
          }
        }
      }
    }
  }
  async function loadAttention() {
    if (!group.value) return
    const epoch = accessEpoch.value
    const next = await apiFetchData<ChannelAttention[]>(`/groups/${group.value.id}/channels/for-you`)
    if (epoch === accessEpoch.value) attention.value = next
  }
  watch(() => user.value?.id, revoke)
  watch(() => group.value?.id, () => { revoke(); void load().catch(() => revoke()) })
  watch(presence.isSocketConnected, connected => { if (connected) void resync() })
  const onVisible = () => { if (document.visibilityState === 'visible') void resync() }
  usePresenceCallback('Channel', callback)
  onMounted(() => { document.addEventListener('visibilitychange', onVisible) })
  onBeforeUnmount(() => { document.removeEventListener('visibilitychange', onVisible); revoke() })
  return { typingUsers: typing.typingUsers, typingByChannel: typing.typingByChannel, channels, messages, mergeMessage, windows, cursors, attention, accessEpoch, loading, error, load, history, append, loadAttention, windowKey, patchChannel, revoke,
    personalCount: computed(() => channels.value.reduce((sum, channel) => sum + channel.personalCount, 0)) }
}
export type GroupChannelsState = ReturnType<typeof useGroupChannels>
export const groupChannelsKey: InjectionKey<GroupChannelsState> = Symbol('group-channels')
