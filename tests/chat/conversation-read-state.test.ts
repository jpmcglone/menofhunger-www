import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref, watch } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatConversations } from '~/composables/chat/useChatConversations'
import { useChatConversationMetadata } from '~/composables/chat/useChatConversationMetadata'
import type { AuthUser } from '~/composables/useAuth'
import type { MessageConversation } from '~/types/api'

const state = vi.hoisted(() => ({ api: vi.fn(), app: {}, refs: new Map<string, ReturnType<typeof ref>>() }))
mockNuxtImport('useApiClient', () => () => ({ apiFetch: state.api }))
mockNuxtImport('useNuxtApp', () => () => state.app)
mockNuxtImport('useState', () => (key: string, init: () => unknown) => {
  if (!state.refs.has(key)) state.refs.set(key, ref(init()))
  return state.refs.get(key)
})
mockNuxtImport('useViewerCrew', () => () => ({ membership: ref(null) }))

function fixture() {
  const isLatestWindow = ref(true)
  const me = ref({ id: 'me' } as AuthUser)
  const api = useChatConversations({
    me, selectedConversationId: ref('dm'), atBottom: ref(true), isViewing: ref(true), isLatestWindow,
    marv: { enabled: ref(false), marvUserId: ref(null) } as unknown as ReturnType<typeof useMarv>,
  })
  api.mergeConversation({ id: 'dm', type: 'direct', viewerStatus: 'accepted', isMuted: false, unreadCount: 3, participants: [{ user: { id: 'other' }, lastReadAt: null }] } as MessageConversation)
  return { api, isLatestWindow, me }
}
beforeEach(() => {
  state.refs.clear(); state.api.mockReset().mockResolvedValue({})
  vi.spyOn(document, 'hasFocus').mockReturnValue(true)
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
})
afterEach(() => vi.restoreAllMocks())

describe('conversation read state shared with the dock inbox', () => {
  it('clears its own unread count and treats repeated read echoes as no-ops', () => {
    const { api } = fixture()
    const updates = vi.fn()
    const stop = watch(api.conversations, updates, { flush: 'sync' })
    api.updateConversationUnread('dm', 0)
    expect(api.conversations.value.primary[0]!.unreadCount).toBe(0)
    api.updateConversationUnread('dm', 0)
    api.updateConversationParticipantRead('dm', 'other', '2026-10-09T00:00:00Z')
    api.updateConversationParticipantRead('dm', 'other', '2026-10-09T00:00:00Z')
    expect(updates).toHaveBeenCalledTimes(2)
    stop(); api.teardown()
  })
  it('does not mark a historical window read until all newer pages are loaded', () => {
    const { api, isLatestWindow } = fixture()
    isLatestWindow.value = false
    api.markConversationReadIfVisible('dm')
    expect(state.api).not.toHaveBeenCalled()
    expect(api.conversations.value.primary[0]!.unreadCount).toBe(3)
    isLatestWindow.value = true
    api.markConversationReadIfVisible('dm')
    expect(state.api).toHaveBeenCalledWith('/messages/conversations/dm/mark-read', { method: 'POST' })
    expect(api.conversations.value.primary[0]!.unreadCount).toBe(0)
    api.teardown()
  })
  it('publishes mute eligibility changes without rewriting sound state on read echoes', () => {
    const { api } = fixture()
    const accepted = state.refs.get('chat-accepted-conversation-ids')!.value
    const muted = state.refs.get('chat-muted-conversation-ids')!.value
    api.updateConversationUnread('dm', 0)
    expect(state.refs.get('chat-accepted-conversation-ids')!.value).toBe(accepted)
    expect(state.refs.get('chat-muted-conversation-ids')!.value).toBe(muted)
    api.patchConversation('dm', conversation => ({ ...conversation, isMuted: true }))
    expect(state.refs.get('chat-muted-conversation-ids')!.value).toEqual(['dm'])
    api.teardown()
  })
  it('rejects an old account mute failure after the sound identity has changed', async () => {
    const { api, me } = fixture()
    let reject!: (error: Error) => void
    state.api.mockImplementation(() => new Promise((_resolve, fail) => { reject = fail }))
    const muting = api.toggleMuteConversation()
    expect(state.refs.get('chat-muted-conversation-ids')!.value).toEqual(['dm'])
    me.value = { id: 'next-viewer' } as AuthUser
    reject(new Error('old account request failed'))
    await muting
    expect(state.refs.get('chat-conversation-sound-viewer-id')!.value).toBe('next-viewer')
    expect(state.refs.get('chat-muted-conversation-ids')!.value).toEqual([])
    expect(state.refs.get('chat-accepted-conversation-ids')!.value).toEqual([])
    api.teardown()
  })
})

describe('off-chat conversation metadata', () => {
  it('coalesces unknown arrivals into one existing detail request and shares its eligibility', async () => {
    const { me, api } = fixture()
    const metadata = useChatConversationMetadata(me)
    let resolve!: (value: unknown) => void
    state.api.mockImplementation(() => new Promise(done => { resolve = done }))
    const first = metadata.ensureConversation('unknown')
    const second = metadata.ensureConversation('unknown')
    await Promise.resolve()
    expect(state.api).toHaveBeenCalledTimes(1)
    resolve({ data: { conversation: { id: 'unknown', type: 'direct', viewerStatus: 'accepted', isMuted: false } } })
    expect((await first)?.viewerStatus).toBe('accepted')
    expect((await second)?.id).toBe('unknown')
    expect(metadata.acceptedConversationIds.value).toContain('unknown')
    await metadata.ensureConversation('unknown')
    expect(state.api).toHaveBeenCalledTimes(1)
    api.teardown()
  })
  it('rejects old account responses and lets newer local mute changes win an older lookup', async () => {
    const { me, api } = fixture()
    const metadata = useChatConversationMetadata(me)
    let resolve!: (value: unknown) => void
    state.api.mockImplementation(() => new Promise(done => { resolve = done }))
    const old = metadata.ensureConversation('unknown')
    await Promise.resolve()
    me.value = { id: 'next' } as AuthUser
    resolve({ data: { conversation: { id: 'unknown', type: 'direct', viewerStatus: 'accepted', isMuted: false } } })
    expect(await old).toBeNull()
    expect(metadata.acceptedConversationIds.value).toEqual([])
    const pending = metadata.ensureConversation('unknown')
    await Promise.resolve()
    metadata.sync({ id: 'unknown', type: 'direct', viewerStatus: 'accepted', isMuted: true })
    resolve({ data: { conversation: { id: 'unknown', type: 'direct', viewerStatus: 'accepted', isMuted: false } } })
    expect((await pending)?.isMuted).toBe(true)
    expect(metadata.mutedConversationIds.value).toEqual(['unknown'])
    api.teardown()
  })
  it('bounds long-lived eligibility metadata and excludes crew/request/blocked conversations', () => {
    const { me, api } = fixture()
    const metadata = useChatConversationMetadata(me)
    for (let index = 0; index < 300; index++) metadata.sync({ id: `dm-${index}`, type: 'direct', viewerStatus: 'accepted', isMuted: false })
    expect(metadata.acceptedConversationIds.value).toHaveLength(256)
    metadata.sync({ id: 'crew', type: 'crew_wall', viewerStatus: 'accepted', isMuted: false })
    metadata.sync({ id: 'request', type: 'direct', viewerStatus: 'pending', isMuted: false })
    metadata.sync({ id: 'blocked', type: 'direct', viewerStatus: 'accepted', isMuted: false, isBlockedWith: true })
    expect(metadata.acceptedConversationIds.value).not.toContain('crew')
    expect(metadata.acceptedConversationIds.value).not.toContain('request')
    expect(metadata.acceptedConversationIds.value).not.toContain('blocked')
    api.teardown()
  })
  it('fails closed when a known conversation refresh fails after its metadata expires', async () => {
    const { me, api } = fixture()
    const metadata = useChatConversationMetadata(me)
    const originalTime = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(originalTime + 16_000)
    state.api.mockRejectedValue(new Error('metadata refresh unavailable'))
    expect(await metadata.ensureConversation('dm')).toBeNull()
    expect(metadata.acceptedConversationIds.value).not.toContain('dm')
    api.teardown()
  })
})
