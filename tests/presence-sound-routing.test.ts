import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { registerPresenceSoundHandlers } from '~/composables/presence/registerPresenceSoundHandlers'
import type { Socket } from 'socket.io-client'

const play = vi.fn()
let viewerID: string | null = 'me'
let viewingID: string | null = null
let preferenceViewer: string | null = 'me'
let acceptedIDs = ['c']
let mutedIDs: string[] = []
const ensureConversation = vi.fn()
beforeEach(() => {
  play.mockClear()
  ensureConversation.mockReset().mockImplementation(async () => acceptedIDs.includes('c')
    ? { id: 'c', type: 'direct', viewerStatus: 'accepted', isMuted: mutedIDs.includes('c') } : null)
  viewerID = 'me'
  viewingID = null
  preferenceViewer = 'me'
  acceptedIDs = ['c']
  mutedIDs = []
})
afterEach(() => { vi.useRealTimers() })
function handlers() {
  const listeners = new Map<string, (payload: unknown) => unknown>()
  registerPresenceSoundHandlers({ on: (event: string, callback: (payload: unknown) => unknown) => listeners.set(event, callback) } as unknown as Socket, {
    viewerID: () => viewerID,
    viewingConversationID: () => viewingID,
    conversationPreferences: () => ({ viewerID: preferenceViewer, acceptedIDs, mutedIDs }),
    ensureConversation,
    play,
  })
  return (event: string, data: unknown) => listeners.get(event)?.(data)
}
function notification(kind: string, context = {}) {
  return { notification: { id: kind, createdAt: new Date().toISOString(), kind, actor: { id: 'other' }, ...context } }
}
function message(id = 'm') {
  return { conversationId: 'c', message: { id, sender: { id: 'other' }, createdAt: new Date().toISOString() } }
}

describe('realtime sound routing', () => {
  it('routes group and Board alerts, skips silent and own events, and deduplicates echoes', () => {
    const emit = handlers()
    const group = notification('community_group_post')
    emit('notifications:new', group)
    emit('notifications:new', group)
    emit('notifications:new', notification('comment', { boardThreadId: 't' }))
    emit('notifications:new', { ...notification('follow'), silent: true })
    emit('notifications:new', notification('boost', { actor: { id: 'me' } }))
    expect(play.mock.calls.map(call => call[0])).toEqual(['group-activity', 'board-activity'])
  })
  it('announces one DM cue even when a message notification arrives too', async () => {
    const emit = handlers()
    emit('notifications:new', notification('message'))
    const arrival = message()
    await emit('messages:new', arrival)
    await emit('messages:new', arrival)
    await emit('messages:new', { ...message('own'), message: { ...message().message, sender: { id: 'me' } } })
    expect(play.mock.calls.map(call => call[0])).toEqual(['message'])
  })
  it('silences muted, unaccepted, and unknown conversations', async () => {
    const emit = handlers()
    mutedIDs = ['c']
    await emit('messages:new', message())
    mutedIDs = []
    acceptedIDs = []
    await emit('messages:new', message('unknown'))
    expect(play).not.toHaveBeenCalled()
  })

  it('resolves metadata for an off-chat message without mounting the inbox', async () => {
    acceptedIDs = []
    ensureConversation.mockImplementation(async () => { acceptedIDs = ['c']; return { id: 'c', type: 'direct', viewerStatus: 'accepted', isMuted: false } })
    const emit = handlers()
    await emit('messages:new', message())
    expect(ensureConversation).toHaveBeenCalledWith('c')
    expect(play.mock.calls.map(call => call[0])).toEqual(['message'])
  })
  it('drops a metadata lookup after account or viewing changes', async () => {
    acceptedIDs = []
    ensureConversation.mockImplementation(async () => { acceptedIDs = ['c']; viewerID = 'switched'; return { id: 'c', type: 'direct', viewerStatus: 'accepted', isMuted: false } })
    const emit = handlers()
    await emit('messages:new', message())
    expect(play).not.toHaveBeenCalled()
  })

  it('drops slow metadata and failed permission lookups instead of playing a delayed cue', async () => {
    vi.useFakeTimers()
    const emit = handlers()
    ensureConversation.mockImplementation(async () => {
      vi.advanceTimersByTime(601)
      return { id: 'c', type: 'direct', viewerStatus: 'accepted', isMuted: false }
    })
    await emit('messages:new', message('slow'))
    ensureConversation.mockResolvedValue(null)
    await emit('messages:new', message('forbidden'))
    expect(play).not.toHaveBeenCalled()
  })
  it('silences viewed conversations and cancels pending decode after the identity changes', async () => {
    const emit = handlers()
    viewingID = 'c'
    await emit('messages:new', message())
    expect(play).not.toHaveBeenCalled()
    viewingID = null
    await emit('messages:new', message('next'))
    const valid = play.mock.calls[0]![1].valid
    expect(valid()).toBe(true)
    viewerID = 'switched'
    expect(valid()).toBe(false)
  })
})
