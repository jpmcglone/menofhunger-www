import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ChannelIcon from '~/components/app/channels/ChannelIcon.vue'
import Glyph from '~/components/app/channels/Glyph.vue'
import MessageRow from '~/components/app/channels/MessageRow.vue'
import type { ChannelMessage } from '~/types/api'

const message = (patch: Partial<ChannelMessage> = {}): ChannelMessage => ({
  id: 'm1', sequence: 1, revision: 1, receipt: null, body: 'Hello', createdAt: '2026-10-06T15:00:00Z', conversationId: 'c', channelId: 'ch',
  threadRootId: null, clientRequestId: null, replyCount: 0, lastReplyAt: null, following: false, pinned: false, canEdit: false, canDelete: false,
  deletedForAll: false, editedAt: null, media: [], reactions: [], sender: { id: 'u1', name: 'Marcus Hale', username: 'marcus', avatarUrl: null },
  ...patch,
} as unknown as ChannelMessage)
const row = (item: ChannelMessage, extra: Record<string, unknown> = {}) => mountSuspended(MessageRow, { props: { message: item, grouped: false, canReact: true, actions: [], reactions: [], ...extra } })

describe('channel icon', () => {
  it('shows the default # glyph and a custom emoji instead of it', async () => {
    const plain = await mountSuspended(ChannelIcon, { props: { channel: { icon: null, privacy: 'normal' } } })
    expect(plain.find('svg').exists()).toBe(true)
    const custom = await mountSuspended(ChannelIcon, { props: { channel: { icon: '🔥', privacy: 'normal' } } })
    expect(custom.text()).toBe('🔥')
    expect(custom.find('svg').exists()).toBe(false)
  })
  it('marks private channels without losing the icon', async () => {
    const wrapper = await mountSuspended(ChannelIcon, { props: { channel: { icon: '🔥', privacy: 'private' } } })
    expect(wrapper.text()).toContain('🔥')
    expect(wrapper.html()).toContain('Private')
  })
  it('draws distinct custom tab glyphs', async () => {
    const hash = (await mountSuspended(Glyph, { props: { kind: 'hash' } })).html()
    const posts = (await mountSuspended(Glyph, { props: { kind: 'posts' } })).html()
    expect(hash).not.toBe(posts)
    expect(hash).toContain('M10 3.5L8 20.5')
  })
})

describe('deleted message that still has replies', () => {
  it('replaces the message with a placeholder and a thread chip, without author or actions', async () => {
    const wrapper = await row(message({ deletedForAll: true, body: '', replyCount: 3, lastReplyAt: '2026-10-06T15:02:00Z' }))
    const text = wrapper.text()
    expect(text).toContain('Message deleted')
    expect(text).toContain('The replies below are still here.')
    expect(text).toContain('3 replies')
    expect(text).not.toContain('Marcus Hale')
    expect(wrapper.find('.message-toolbar').exists()).toBe(false)
    expect(wrapper.find('.touch-message-more').exists()).toBe(false)
    await wrapper.find('button.moh-focus').trigger('click')
    expect(wrapper.emitted('reply')).toHaveLength(1)
  })
  it('uses singular wording for one reply', async () => {
    const text = (await row(message({ deletedForAll: true, body: '', replyCount: 1 }))).text()
    expect(text).toContain('The reply below is still here.')
    expect(text).toContain('1 reply')
  })
  it('keeps normal messages unchanged', async () => {
    const wrapper = await row(message())
    expect(wrapper.text()).toContain('Marcus Hale')
    expect(wrapper.text()).not.toContain('Message deleted')
    expect(wrapper.find('.message-toolbar').exists()).toBe(true)
  })
})

describe('channel titles', () => {
  it('prefers the display name and falls back to the handle', async () => {
    const { channelTitle, channelHandleFor } = await import('~/utils/channels/reducer')
    expect(channelTitle({ name: 'fitness', displayName: 'Morning Workout' })).toBe('Morning Workout')
    expect(channelTitle({ name: 'fitness', displayName: null })).toBe('fitness')
    expect(channelTitle({ name: 'fitness', displayName: '  ' })).toBe('fitness')
    expect(channelHandleFor('Café & Prayer!')).toBe('cafe-prayer')
  })
})
