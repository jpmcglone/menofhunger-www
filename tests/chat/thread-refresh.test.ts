import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { createChatThreadLoad, type ChatThreadLoadCtx } from '~/composables/chat/useChatThreadLoad'
import type { Message, MessageConversation } from '~/types/api'

const message = (id: string) => ({ id, conversationId: 'one', body: id, createdAt: `2026-10-09T00:00:${id.padStart(2, '0')}Z` }) as Message
function fixture(initial: Message[] = [message('1')]) {
  const api = vi.fn()
  const ctx: ChatThreadLoadCtx = {
    selectedConversationId: ref('one'), selectedChatKey: ref('one'), messagesScroller: ref(null),
    scroll: { setAtBottomState: vi.fn(), refreshAtBottomFromScroller: () => true, isAtBottom: () => true },
    conversationsApi: { selectedConversation: ref({ id: 'one' } as MessageConversation) }, apiFetch: api as ChatThreadLoadCtx['apiFetch'], messages: ref(initial),
    messagesNextCursor: ref('older'), messagesNewerCursor: ref(null), messagesLoading: ref(false),
    loadingOlder: ref(false), loadingNewer: ref(false), jumpTargetMessageId: ref(null), jumpHighlightTimer: { current: null },
    messagesReady: ref(true), animateMessageList: ref(true), renderedChatKey: ref('one'), messagesPaneState: ref('ready'),
    sendingMessageIds: ref(new Set()), replyToMessage: ref(message('reply')), resetTyping: vi.fn(),
    clearMessagesPaneTimer: vi.fn(), dividerEls: new Map(), revealMessagesPaneAfterFade: vi.fn(), updateStickyDivider: vi.fn(),
  }
  return { ctx, api, loader: createChatThreadLoad(ctx) }
}

describe('thread reconnect catch-up', () => {
  it('patches a contiguous snapshot without remounting the pane or changing reply/older history', async () => {
    const { ctx, api, loader } = fixture([message('0'), message('1')])
    api.mockResolvedValue({ data: { messages: [message('2'), { ...message('1'), body: 'Edited' }] }, pagination: { nextCursor: 'new-older' } })
    await loader.loadThread('one', { refresh: true })
    expect(ctx.messages.value.map(message => message.id)).toEqual(['0', '1', '2'])
    expect(ctx.messages.value[1]!.body).toBe('Edited')
    expect(ctx.replyToMessage.value?.id).toBe('reply')
    expect(ctx.messagesNextCursor.value).toBe('older')
    expect(ctx.revealMessagesPaneAfterFade).not.toHaveBeenCalled()
    expect(ctx.scroll.setAtBottomState).not.toHaveBeenCalled()
  })
  it('does not join disconnected history to a latest snapshot after more than one window was missed', async () => {
    const { ctx, api, loader } = fixture()
    api.mockResolvedValueOnce({ data: { messages: [message('60'), message('59')] } })
    api.mockResolvedValueOnce({ data: { messages: [message('1'), message('2'), message('3')], newerCursor: 'newer-after-3' } })
    await loader.loadThread('one', { refresh: true })
    expect(api.mock.calls[1]![0]).toContain('/messages/around/1')
    expect(ctx.messages.value.map(message => message.id)).toEqual(['1', '2', '3'])
    expect(ctx.messagesNewerCursor.value).toBe('newer-after-3')
    expect(ctx.scroll.setAtBottomState).toHaveBeenCalledWith(false)
  })
  it('ignores late requests after the workspace owner is reset', async () => {
    const { ctx, api, loader } = fixture()
    let resolve!: (value: unknown) => void
    api.mockImplementation(() => new Promise(done => { resolve = done }))
    const loading = loader.loadThread('one', { refresh: true })
    loader.resetThread()
    resolve({ data: { messages: [message('2')] } })
    await loading
    expect(ctx.messages.value).toEqual([])
    expect(ctx.renderedChatKey.value).toBeNull()
  })
  it('blocks read eligibility for an in-flight or failed catch-up and restores it only after fresh rendering', async () => {
    const { api, loader } = fixture()
    api.mockResolvedValueOnce({ data: { messages: [message('1')] } })
    await loader.loadThread('one', { refresh: true })
    expect(loader.readReady.value).toBe(true)
    let resolve!: (value: unknown) => void
    api.mockImplementationOnce(() => new Promise(done => { resolve = done }))
    const catchUp = loader.loadThread('one', { refresh: true })
    expect(loader.readReady.value).toBe(false)
    resolve({ data: { messages: [message('2'), message('1')] } })
    await catchUp
    expect(loader.readReady.value).toBe(true)
    api.mockRejectedValueOnce(new Error('offline'))
    await expect(loader.loadThread('one', { refresh: true })).rejects.toThrow('offline')
    expect(loader.readReady.value).toBe(false)
  })
  it('anchors catch-up before a concurrent arrival and deduplicates the newer page before resuming reads', async () => {
    const { ctx, api, loader } = fixture()
    let resolve!: (value: unknown) => void
    api.mockImplementationOnce(() => new Promise(done => { resolve = done }))
    const catchUp = loader.loadThread('one', { refresh: true })
    ctx.messages.value.push(message('60'))
    api.mockResolvedValueOnce({ data: { messages: [message('1'), message('2')], newerCursor: 'after-2' } })
    resolve({ data: { messages: [message('60'), message('59')] } })
    await catchUp
    expect(api.mock.calls[1]![0]).toContain('/messages/around/1')
    expect(ctx.messagesNewerCursor.value).toBe('after-2')
    api.mockResolvedValueOnce({ data: [message('3'), message('60')], pagination: { newerCursor: null } })
    await loader.loadNewerMessages()
    expect(ctx.messages.value.map(message => message.id)).toEqual(['1', '2', '3', '60'])
    expect(loader.readReady.value).toBe(true)
    expect(ctx.messagesNewerCursor.value).toBeNull()
  })
  it('releases the initial/jump spinner after failure and retries the requested target without losing the draft reply', async () => {
    const { ctx, api, loader } = fixture()
    loader.beginThreadSwitch({ jumpToMessageId: 'target' })
    api.mockRejectedValueOnce(new Error('temporary unavailable'))
    await expect(loader.loadThread('one', { jumpToMessageId: 'target' })).rejects.toThrow('temporary unavailable')
    expect(ctx.messagesLoading.value).toBe(false)
    expect(ctx.renderedChatKey.value).toBe('one')
    expect(ctx.messagesPaneState.value).toBe('ready')
    expect(loader.loadError.value).toBe('Couldn’t load messages. Try again.')
    expect(loader.readReady.value).toBe(false)
    expect(ctx.replyToMessage.value?.id).toBe('reply')
    api.mockResolvedValueOnce({ data: { messages: [message('1')], olderCursor: null, newerCursor: 'after-target' } })
    await loader.loadThread('one', { refresh: true })
    expect(api.mock.calls[1]![0]).toContain('/messages/around/target')
    expect(loader.loadError.value).toBeNull()
    expect(ctx.messagesNewerCursor.value).toBe('after-target')
    expect(ctx.replyToMessage.value?.id).toBe('reply')
    expect(ctx.revealMessagesPaneAfterFade).not.toHaveBeenCalled()
  })
  it('does not expose another conversation history when a new selection fails', async () => {
    const { ctx, api, loader } = fixture([{ ...message('1'), conversationId: 'previous' }])
    loader.beginThreadSwitch()
    api.mockRejectedValueOnce(new Error('offline'))
    await expect(loader.loadThread('one')).rejects.toThrow('offline')
    expect(ctx.messages.value).toEqual([])
    expect(ctx.renderedChatKey.value).toBe('one')
    expect(loader.readReady.value).toBe(false)
  })
  it('loads authorized header metadata before a search-first message window without replacing it with latest messages', async () => {
    const { ctx, api, loader } = fixture([])
    const selected = ref<MessageConversation | null>(null)
    ctx.conversationsApi.selectedConversation = selected
    ctx.conversationsApi.mergeConversation = conversation => { selected.value = conversation }
    const conversation = { id: 'one', type: 'group', title: 'Testing 123', participants: [{ user: { id: 'participant', name: 'Participant' } }], viewerStatus: 'accepted' } as MessageConversation
    api.mockResolvedValueOnce({ data: { conversation, messages: [message('60')] } })
    api.mockResolvedValueOnce({ data: { messages: [message('1')], olderCursor: null, newerCursor: 'after-target' } })
    await loader.loadThread('one', { jumpToMessageId: 'target' })
    expect(selected.value?.title).toBe('Testing 123')
    expect(selected.value?.participants[0]?.user.name).toBe('Participant')
    expect(ctx.messages.value.map(message => message.id)).toEqual(['1'])
    expect(ctx.messagesNewerCursor.value).toBe('after-target')
  })
  it('rejects stale search metadata after the thread identity has changed', async () => {
    const { ctx, api, loader } = fixture([])
    ctx.conversationsApi.selectedConversation = ref(null)
    const merge = vi.fn()
    ctx.conversationsApi.mergeConversation = merge
    let resolve!: (value: unknown) => void
    api.mockImplementationOnce(() => new Promise(done => { resolve = done }))
    const loading = loader.loadThread('one', { jumpToMessageId: 'target' })
    loader.resetThread()
    ctx.selectedConversationId.value = 'other'
    resolve({ data: { conversation: { id: 'one', title: 'Stale title' }, messages: [] } })
    await loading
    expect(merge).not.toHaveBeenCalled()
    expect(api).toHaveBeenCalledTimes(1)
    expect(ctx.messages.value).toEqual([])
  })
})
