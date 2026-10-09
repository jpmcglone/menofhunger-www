import { defineComponent, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useGroupChannels } from '~/composables/channels/useGroupChannels'
import type { ChannelCallback } from '~/composables/presence/usePresenceDomains'
import type { ChannelAttention, ChannelMessage, CommunityGroupShell, GroupChannel } from '~/types/api'

const api = vi.hoisted(() => ({ fetch: vi.fn(), data: vi.fn(), callback: null as ChannelCallback | null }))
mockNuxtImport('useApiClient', () => () => ({ apiFetch: api.fetch, apiFetchData: api.data }))
mockNuxtImport('useAuth', () => () => ({ user: ref({ id: 'me' }) }))
mockNuxtImport('usePresence', () => () => ({ isSocketConnected: ref(false) }))
vi.mock('~/composables/presence/usePresenceCallback', () => ({
  usePresenceCallback: (_domain: string, callback: ChannelCallback) => { api.callback = callback },
}))
vi.mock('~/composables/channels/useChannelTyping', () => ({
  useChannelTyping: () => ({ clear: vi.fn(), typingUsers: () => [], typingByChannel: { value: {} } }),
}))

let unmount: (() => void) | undefined
beforeEach(() => { api.fetch.mockReset(); api.data.mockReset(); api.callback = null })
afterEach(() => { unmount?.(); unmount = undefined })

function channel(id: string, privacy: 'normal' | 'private' = 'normal'): GroupChannel {
  return {
    id, groupId: 'group', name: id, displayName: null, privacy, topic: '', icon: null,
    defaultPurpose: null, archivedAt: null, revision: 1, viewerUpdatedAt: null,
    readThrough: 0, hasUnread: false, personalCount: 0, preference: 'mentions', mutedUntil: null,
    hidden: false, capabilities: {} as GroupChannel['capabilities'],
  }
}
function message(id: string, channelId: string, sequence = 1): ChannelMessage {
  return { id, channelId, body: 'See <#secret>', sequence, revision: 1, threadRootId: null,
    deletedForAll: false, replyCount: 0, sender: { id: 'someone' } } as ChannelMessage
}
function attention(message: ChannelMessage): ChannelAttention {
  return { channelId: message.channelId, messageId: message.id, threadRootId: null,
    mentioned: true, followedReply: false, createdAt: '2026-10-09T00:00:00Z', message }
}
function setup() {
  let channels!: ReturnType<typeof useGroupChannels>
  const view = mount(defineComponent({ setup() {
    channels = useGroupChannels(ref({ id: 'group', channelsAvailable: true } as CommunityGroupShell))
    return () => null
  } }))
  unmount = () => view.unmount()
  return channels
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

it.each(['history', 'context'] as const)('removes revoked source data and rejects a late %s response', async kind => {
  const publicChannel = channel('general')
  let list = [publicChannel, channel('secret', 'private')]
  const oldPrivate = message('private-old', 'secret')
  const publicMessage = message('public', 'general')
  const latePrivate = message('private-late', 'secret', 2)
  const late = deferred<{ data: ChannelMessage[]; pagination: { nextCursor: null; latestSequence: number } }>()
  const context = deferred<{ messages: ChannelMessage[]; threadRootId: null }>()
  api.data.mockImplementation((path: string) => path.endsWith('/context') ? context.promise
    : Promise.resolve(path.endsWith('/for-you') ? [attention(oldPrivate), attention(publicMessage)] : list))
  api.fetch.mockReturnValue(late.promise)
  const state = setup()
  await state.load()
  state.mergeMessage(oldPrivate)
  state.mergeMessage(publicMessage)
  state.windows.value['secret:'] = [oldPrivate]
  state.windows.value['general:'] = [publicMessage]
  await state.loadAttention()

  const pending = kind === 'history' ? state.history('secret') : state.history('secret', null, false, 'private-late')
  list = [publicChannel]
  await state.load()
  expect(Object.keys(state.messages.value)).toEqual(['public'])
  expect(Object.keys(state.windows.value)).toEqual(['general:'])
  expect(state.attention.value.map(item => item.messageId)).toEqual(['public'])
  expect(state.messages.value.public?.channelReferences?.[0]?.accessible).toBe(false)

  late.resolve({ data: [latePrivate], pagination: { nextCursor: null, latestSequence: 2 } })
  context.resolve({ messages: [latePrivate], threadRootId: null })
  await pending
  // A stale realtime snapshot and a late attention response must obey the same current source list.
  state.mergeMessage(latePrivate)
  state.append(latePrivate)
  await state.loadAttention()
  expect(Object.keys(state.messages.value)).toEqual(['public'])
  expect(Object.keys(state.windows.value)).toEqual(['general:'])
  expect(state.attention.value.map(item => item.messageId)).toEqual(['public'])
})

it('refreshes renamed reference labels without replacing older history windows or cursors', async () => {
  const general = channel('general')
  let list = [general, channel('secret', 'private')]
  api.data.mockImplementation((path: string) => Promise.resolve(path.endsWith('/for-you') ? [] : list))
  const state = setup()
  await state.load()
  const older = message('older', 'general', 1)
  const newest = message('newest', 'general', 100)
  state.mergeMessage(older)
  state.mergeMessage(newest)
  state.windows.value['general:'] = [state.messages.value.older!, state.messages.value.newest!]
  state.cursors.value['general:'] = 1

  list = [general, { ...channel('secret', 'private'), revision: 2, displayName: 'Renamed planning' }]
  api.callback!({ type: 'changed', payload: { groupId: 'group', channelId: 'secret', reason: 'channel' } })
  await flushPromises()
  expect(state.windows.value['general:']?.map(item => item.id)).toEqual(['older', 'newest'])
  expect(state.cursors.value['general:']).toBe(1)
  expect(state.windows.value['general:']?.map(item => item.channelReferences?.[0]?.displayName))
    .toEqual(['Renamed planning', 'Renamed planning'])
  expect(api.fetch).not.toHaveBeenCalled()
})
