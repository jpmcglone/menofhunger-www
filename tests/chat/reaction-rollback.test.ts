import { ref, shallowRef } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createChatThreadActions, type ChatThreadActionsCtx } from '../../composables/chat/useChatThreadActions'
import type { ChatMessage } from '../../composables/chat/useChatThread'
import type { MessageReactionSummary } from '../../types/api'

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), toast: vi.fn() }))
vi.mock('~/composables/useAppToast', () => ({ useAppToast: () => ({ push: mocks.toast }) }))

const myReaction: MessageReactionSummary = {
  reactionId: 'heart', emoji: '❤️', count: 1, reactedByMe: true,
  reactors: [{ id: 'alice', username: 'alice', avatarUrl: null, avatarVideo: null }],
}

function fixture(reactions: MessageReactionSummary[] = []) {
  const messages = shallowRef<ChatMessage[]>([
    { id: 'message', conversationId: 'one', body: 'Hello', reactions } as ChatMessage,
  ])
  const me = ref({ id: 'alice', username: 'alice', avatarUrl: null, avatarVideo: null })
  const actions = createChatThreadActions({
    me, messages,
    availableReactions: ref([{ id: 'heart', emoji: '❤️' }]),
    apiFetch: mocks.fetch,
    mutateMessageAt: (idx: number, message: ChatMessage) => {
      if (!messages.value[idx]) return false
      messages.value[idx] = message
      return true
    },
  } as unknown as ChatThreadActionsCtx)
  return { actions, messages, me }
}

function rejectLater() {
  let reject!: (error: Error) => void
  mocks.fetch.mockImplementationOnce(() => new Promise((_resolve, failure) => { reject = failure }))
  return () => reject(new Error('Offline'))
}

beforeEach(() => {
  mocks.fetch.mockReset().mockResolvedValue({})
  mocks.toast.mockReset()
})

describe('Chat reaction requests', () => {
  it('rolls back a failed addition and reports the error', async () => {
    const f = fixture()
    mocks.fetch.mockRejectedValueOnce(new Error('Offline'))
    const pending = f.actions.handleReact(f.messages.value[0]!, 'heart')
    expect(f.messages.value[0]!.reactions).toEqual([myReaction])
    await pending
    expect(f.messages.value[0]!.reactions).toEqual([])
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Offline', tone: 'error' }))
  })

  it('restores the final reaction group when removal fails', async () => {
    const f = fixture([myReaction])
    mocks.fetch.mockRejectedValueOnce(new Error('Offline'))
    const pending = f.actions.handleReact(f.messages.value[0]!, 'heart')
    expect(f.messages.value[0]!.reactions).toEqual([])
    await pending
    expect(f.messages.value[0]!.reactions).toEqual([myReaction])
    expect(mocks.fetch).toHaveBeenCalledWith('/messages/conversations/one/messages/message/reactions/heart', { method: 'DELETE' })
  })

  it('finds the same message after pagination and preserves other updated fields', async () => {
    const f = fixture()
    const fail = rejectLater()
    const pending = f.actions.handleReact(f.messages.value[0]!, 'heart')
    f.messages.value[0] = { ...f.messages.value[0]!, body: 'Edited while waiting' }
    f.messages.value.unshift({ id: 'older', conversationId: 'one', reactions: [] } as unknown as ChatMessage)
    fail()
    await pending
    expect(f.messages.value[0]!.id).toBe('older')
    expect(f.messages.value[1]!.body).toBe('Edited while waiting')
    expect(f.messages.value[1]!.reactions).toEqual([])
  })

  it('preserves an authoritative socket reaction snapshot', async () => {
    const f = fixture()
    const fail = rejectLater()
    const pending = f.actions.handleReact(f.messages.value[0]!, 'heart')
    const serverReactions = [{ ...myReaction, count: 2 }]
    f.messages.value[0] = { ...f.messages.value[0]!, reactions: serverReactions }
    fail()
    await pending
    expect(f.messages.value[0]!.reactions).toEqual(serverReactions)
  })

  it('does not roll back a message in a newly opened thread', async () => {
    const f = fixture()
    const fail = rejectLater()
    const pending = f.actions.handleReact(f.messages.value[0]!, 'heart')
    f.messages.value = [{ id: 'other', conversationId: 'two', reactions: [myReaction] } as ChatMessage]
    fail()
    await pending
    expect(f.messages.value[0]!.reactions).toEqual([myReaction])
  })

  it('does not restore reaction state after the viewer identity changes', async () => {
    const f = fixture()
    const fail = rejectLater()
    const pending = f.actions.handleReact(f.messages.value[0]!, 'heart')
    f.me.value = { ...f.me.value, id: 'bob' }
    fail()
    await pending
    expect(f.messages.value[0]!.reactions).toEqual([myReaction])
  })

  it('ignores duplicate taps while a message reaction request is pending', async () => {
    const f = fixture()
    const fail = rejectLater()
    const pending = f.actions.handleReact(f.messages.value[0]!, 'heart')
    await f.actions.handleReact(f.messages.value[0]!, 'heart')
    expect(mocks.fetch).toHaveBeenCalledTimes(1)
    fail()
    await pending
    await f.actions.handleReact(f.messages.value[0]!, 'heart')
    expect(mocks.fetch).toHaveBeenCalledTimes(2)
    expect(f.messages.value[0]!.reactions).toEqual([myReaction])
  })

  it('uses the current row instead of a stale menu snapshot to choose the request', async () => {
    const f = fixture([myReaction])
    await f.actions.handleReact({ ...f.messages.value[0]!, reactions: [] }, 'heart')
    expect(mocks.fetch).toHaveBeenCalledWith('/messages/conversations/one/messages/message/reactions/heart', { method: 'DELETE' })
    expect(f.messages.value[0]!.reactions).toEqual([])
  })
})
