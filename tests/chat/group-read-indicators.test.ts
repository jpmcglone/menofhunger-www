import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Message, MessageParticipant } from '~/types/api'
import type { ChatListItem } from '~/composables/chat/useChatTimeFormatting'
import { assignGroupReadIndicators } from '../../utils/chat-read-indicators'

const root = resolve(__dirname, '../..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

function sender(id: string): Message['sender'] {
  return {
    id,
    username: id,
    name: id,
    premium: false,
    premiumPlus: false,
    isOrganization: false,
    verifiedStatus: 'none',
    avatarUrl: null,
  }
}

function messageItem(id: string, senderId: string, createdAt: string): ChatListItem {
  return {
    type: 'message',
    key: id,
    index: 0,
    createdAtMs: Date.parse(createdAt),
    message: {
      id,
      createdAt,
      body: id,
      conversationId: 'c1',
      sender: sender(senderId),
      reactions: [],
      deletedForMe: false,
      deletedForAll: false,
      editedAt: null,
      replyTo: null,
      media: [],
    },
  }
}

function participant(id: string, lastReadAt: string | null): MessageParticipant {
  return {
    user: sender(id),
    status: 'accepted',
    role: 'member',
    acceptedAt: '2026-01-01T00:00:00.000Z',
    lastReadAt,
  }
}

const t1 = '2026-01-01T12:00:00.000Z'
const t2 = '2026-01-01T12:01:00.000Z'
const t3 = '2026-01-01T12:02:00.000Z'
const t4 = '2026-01-01T12:03:00.000Z'

describe('assignGroupReadIndicators', () => {
  const items: ChatListItem[] = [
    { type: 'divider', key: 'd', dayKey: '2026-01-01', label: 'Today' },
    messageItem('m1', 'alice', t1),
    messageItem('m2', 'me', t2),
    messageItem('m3', 'me', t3),
  ]

  it('puts everyone who read the latest message on that message', () => {
    const map = assignGroupReadIndicators(
      items,
      [participant('alice', t4), participant('bob', t4), participant('me', t4)],
      { meId: 'me', hideViewer: true },
    )
    expect(map.get('m3')?.map((p) => p.user.id).sort()).toEqual(['alice', 'bob'])
    expect(map.get('m2')).toBeUndefined()
    expect(map.get('m1')).toBeUndefined()
  })

  it('puts a reader three messages back on that older message', () => {
    const map = assignGroupReadIndicators(
      items,
      [participant('alice', t4), participant('bob', t1)],
      { meId: 'me', hideViewer: true },
    )
    expect(map.get('m3')?.map((p) => p.user.id)).toEqual(['alice'])
    expect(map.get('m1')?.map((p) => p.user.id)).toEqual(['bob'])
  })

  it('walks back when last-read lands on a message they sent', () => {
    const threaded: ChatListItem[] = [
      messageItem('m0', 'me', '2026-01-01T11:59:00.000Z'),
      messageItem('m1', 'alice', t1),
      messageItem('m2', 'me', t2),
    ]
    const map = assignGroupReadIndicators(
      threaded,
      [participant('alice', t1)],
      { meId: 'me', hideViewer: true },
    )
    expect(map.get('m1')).toBeUndefined()
    expect(map.get('m0')?.map((p) => p.user.id)).toEqual(['alice'])
  })

  it('skips participants with no lastReadAt', () => {
    const map = assignGroupReadIndicators(
      items,
      [participant('alice', null)],
      { meId: 'me', hideViewer: true },
    )
    expect(map.size).toBe(0)
  })
})

describe('group read-receipt wiring', () => {
  it('uses the shared assigner and treats type=group as a group chat', () => {
    const list = read('components/app/chat/ChatMessageList.vue')
    const page = read('pages/chat.vue')
    expect(list).toMatch(/assignGroupReadIndicators/)
    expect(page).toMatch(/type === 'group' \|\| type === 'crew_wall'/)
    expect(page).not.toMatch(/participants\?\.length \?\? 0\) >= 3/)
  })
})
