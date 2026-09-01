import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Message } from '~/types/api'
import type { ChatListItem } from '~/composables/chat/useChatTimeFormatting'
import { shouldShowGroupIncomingAvatar } from '../../utils/chat-incoming-avatar'

const root = resolve(__dirname, '../..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

function sender(id: string, username = id): Message['sender'] {
  return {
    id,
    username,
    name: username,
    premium: false,
    premiumPlus: false,
    isOrganization: false,
    verifiedStatus: 'none',
    avatarUrl: null,
  }
}

function messageItem(id: string, senderId: string, createdAt = '2026-01-01T12:00:00.000Z'): ChatListItem {
  return {
    type: 'message',
    key: id,
    index: 0,
    createdAtMs: Date.parse(createdAt),
    message: {
      id,
      createdAt,
      body: 'hi',
      conversationId: 'c1',
      sender: sender(senderId),
      kind: 'text',
      call: null,
      reactions: [],
      deletedForMe: false,
      deletedForAll: false,
      editedAt: null,
      replyTo: null,
      media: [],
    },
  }
}

function divider(dayKey: string): ChatListItem {
  return { type: 'divider', key: `divider-${dayKey}`, dayKey, label: 'Today' }
}

const group = { isGroupChat: true, meId: 'me' }
const dm = { isGroupChat: false, meId: 'me' }

describe('shouldShowGroupIncomingAvatar', () => {
  it('never shows in 1:1 chats', () => {
    const items = [messageItem('m1', 'alice')]
    expect(shouldShowGroupIncomingAvatar(items, 0, dm)).toBe(false)
  })

  it('never shows on your own messages', () => {
    const items = [messageItem('m1', 'me')]
    expect(shouldShowGroupIncomingAvatar(items, 0, group)).toBe(false)
  })

  it('shows on a lone incoming message', () => {
    const items = [messageItem('m1', 'alice')]
    expect(shouldShowGroupIncomingAvatar(items, 0, group)).toBe(true)
  })

  it('shows only on the last message in a same-sender run', () => {
    const items = [
      messageItem('m1', 'alice'),
      messageItem('m2', 'alice'),
      messageItem('m3', 'alice'),
    ]
    expect(shouldShowGroupIncomingAvatar(items, 0, group)).toBe(false)
    expect(shouldShowGroupIncomingAvatar(items, 1, group)).toBe(false)
    expect(shouldShowGroupIncomingAvatar(items, 2, group)).toBe(true)
  })

  it('shows again when the sender changes', () => {
    const items = [
      messageItem('m1', 'alice'),
      messageItem('m2', 'alice'),
      messageItem('m3', 'bob'),
    ]
    expect(shouldShowGroupIncomingAvatar(items, 1, group)).toBe(true)
    expect(shouldShowGroupIncomingAvatar(items, 2, group)).toBe(true)
  })

  it('resets the run on a day divider', () => {
    const items = [
      messageItem('m1', 'alice', '2026-01-01T23:50:00.000Z'),
      divider('2026-01-02'),
      messageItem('m2', 'alice', '2026-01-02T00:10:00.000Z'),
      messageItem('m3', 'alice', '2026-01-02T00:11:00.000Z'),
    ]
    expect(shouldShowGroupIncomingAvatar(items, 0, group)).toBe(true)
    expect(shouldShowGroupIncomingAvatar(items, 2, group)).toBe(false)
    expect(shouldShowGroupIncomingAvatar(items, 3, group)).toBe(true)
  })
})

describe('group incoming avatar wiring', () => {
  it('renders a bottom-aligned avatar only in group chats', () => {
    const row = read('components/app/chat/ChatMessageListRow.vue')
    const list = read('components/app/chat/ChatMessageList.vue')
    expect(list).toMatch(/shouldShowGroupIncomingAvatar/)
    expect(row).toMatch(/v-if="groupIncoming"/)
    expect(row).toMatch(/items-end gap-1\.5/)
    expect(row).toMatch(/AppUserAvatar/)
    expect(row).toMatch(/size-class="h-7 w-7"/)
    expect(row).toMatch(/`\/u\/\$\{encodeURIComponent\(senderUsername\)\}`/)
  })
})
