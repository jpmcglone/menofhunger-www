import { describe, expect, it, vi } from 'vitest'
import { channelArrivals, channelLink, mergeChannel, mergeChannelMessages } from '~/utils/channels/reducer'
import { formatBytes } from '~/utils/channels/format'
import { destinationDraftKey } from '~/utils/channels/drafts'
import { actionSections } from '~/utils/surface-actions'
import type { ChannelMessage, GroupChannel } from '~/types/api'
const message = (id: string, sequence: number, revision: number): ChannelMessage => ({ id, sequence, revision, receipt: null, hiddenPreviews: [], body: 'Hello', createdAt: '2026-10-06T00:00:00Z', conversationId: 'conversation', channelId: 'channel', threadRootId: null, clientRequestId: null, replyCount: 0, lastReplyAt: null, following: false, pinned: false, canEdit: false, canDelete: false, joinWelcome: null, sender: { id: 'sender', username: 'sam', name: 'Sam', premium: false, premiumPlus: false, verifiedStatus: 'manual', avatarUrl: null, isOrganization: false, orgAffiliations: [] }, reactions: [], media: [], deletedForAll: false, deletedForMe: false, editedAt: null, replyTo: null, kind: 'text', call: null })
const channel = (revision: number, viewerUpdatedAt: string): GroupChannel => ({ id: 'channel', groupId: 'group', name: 'general', topic: '', icon: null, displayName: null, privacy: 'normal', defaultPurpose: 'general', archivedAt: null, revision, viewerUpdatedAt, readThrough: 0, hasUnread: false, personalCount: 0, preference: 'mentions', mutedUntil: null, hidden: false, capabilities: { canSend: true, canReact: true, canManage: false, canInvite: false, canModerate: false, canArchive: false, canRename: false } })
describe('channel client convergence and destinations', () => {
  it('deduplicates HTTP/socket echoes, preserves newer edits and orders positions', () => {
    const current = [message('two', 2, 3), message('one', 1, 1)]
    const merged = mergeChannelMessages(current, [message('two', 2, 2), message('one', 1, 1), message('three', 3, 4)])
    expect(merged.map(item => item.id)).toEqual(['one', 'two', 'three'])
    expect(merged[1]?.revision).toBe(3)
  })
  it('drops deleted messages unless they still anchor replies', () => {
    const root = { ...message('root', 1, 2), deletedForAll: true, replyCount: 1 }
    const reply = { ...message('reply', 2, 2), threadRootId: 'root', deletedForAll: true }
    expect(mergeChannelMessages([message('root', 1, 1)], [root]).map(item => item.id)).toEqual(['root'])
    expect(mergeChannelMessages([root], [{ ...root, revision: 3, replyCount: 0 }])).toEqual([])
    expect(mergeChannelMessages([message('reply', 2, 1)], [reply])).toEqual([])
  })
  it('merges content by revision and read state by viewer time', () => {
    const current = { ...channel(4, '2026-10-06T02:00:00Z'), name: 'renamed', preference: 'all' as const, readThrough: 9 }
    expect(mergeChannel(current, channel(3, '2026-10-06T01:00:00Z'))).toBe(current)
    const staleContent = mergeChannel(current, { ...channel(3, '2026-10-06T03:00:00Z'), preference: 'off', readThrough: 12 })
    expect(staleContent).toMatchObject({ name: 'renamed', revision: 4, preference: 'off', readThrough: 12, viewerUpdatedAt: '2026-10-06T03:00:00Z' })
    const staleViewer = mergeChannel(current, { ...channel(5, '2026-10-06T01:00:00Z'), name: 'newer', hasUnread: true })
    expect(staleViewer).toMatchObject({ name: 'newer', revision: 5, preference: 'all', readThrough: 9, hasUnread: true })
  })
  it('counts only messages appended after the newest one the reader already had', () => {
    const rows = ['a', 'b', 'c', 'd'].map(id => ({ id, sender: { id: id === 'd' ? 'me' : 'sam' } })) as Pick<ChannelMessage, 'id' | 'sender'>[]
    expect(channelArrivals(rows, 'b', 'me')).toEqual({ own: 1, others: 1 })
    expect(channelArrivals(rows, 'd', 'me')).toEqual({ own: 0, others: 0 })
    expect(channelArrivals(rows, undefined, 'me')).toEqual({ own: 0, others: 0 })
    expect(channelArrivals(rows, 'gone', 'me')).toEqual({ own: 0, others: 0 })
    expect(channelArrivals([{ id: 'older', sender: { id: 'sam' } }, ...rows] as Pick<ChannelMessage, 'id' | 'sender'>[], 'a', 'me').others).toBe(2)
  })
  it('formats attachment sizes for the tray', () => {
    expect([0, 512, 1536, 1_258_291, 15_728_640].map(formatBytes)).toEqual(['0 KB', '1 KB', '2 KB', '1.2 MB', '15 MB'])
  })
  it('copied links use stable channel IDs and exact thread targets', () => {
    expect(channelLink('feedback', 'stable', { id: 'reply', threadRootId: 'root' })).toBe('/groups/feedback/channels/stable?message=reply&thread=root')
  })
  it('draft keys isolate account, surface, audience and thread even with delimiter characters', () => {
    const base = { identity: 'a:b', surface: 'channel', destination: 'c' }
    const keys = [base, { ...base, root: 'thread' }, { ...base, identity: 'a', destination: 'b:c' }, { ...base, surface: 'chat' }, { ...base, destination: 'private' }].map(destinationDraftKey)
    expect(new Set(keys).size).toBe(keys.length)
  })
  it('action sections hide unavailable operations while preserving Info and Restore', () => {
    const run = vi.fn()
    const sections = actionSections([
      { id: 'info', label: 'Info', icon: 'info', section: 'message', run },
      { id: 'edit', label: 'Edit', icon: 'edit', section: 'message', available: false, run },
      { id: 'restore', label: 'Restore', icon: 'restore', section: 'restore', run },
    ])
    expect(sections.map(([id, actions]) => [id, actions.map(action => action.id)])).toEqual([['message', ['info']], ['restore', ['restore']]])
  })
})
