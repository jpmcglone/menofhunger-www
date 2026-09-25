import { defineComponent, h, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BoardComment, FeedPost } from '~/types/api'
import { useBoardCommentTree } from '~/composables/useBoardCommentTree'
import { useBoardThreadLive } from '~/composables/useBoardThreadLive'

const spies = vi.hoisted(() => ({
  addPosts: vi.fn(),
  removePosts: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  emitTyping: vi.fn(),
}))
mockNuxtImport('useAuth', () => () => ({ user: ref({ id: 'me' }) }))
mockNuxtImport('usePresence', () => () => ({
  addPostsCallback: spies.addPosts,
  removePostsCallback: spies.removePosts,
  subscribePosts: spies.subscribe,
  unsubscribePosts: spies.unsubscribe,
  emitPostsTyping: spies.emitTyping,
}))

function comment(id: string, parentId: string | null, replies: BoardComment[] = []): BoardComment {
  return {
    id, threadId: 't1', parentId, depth: 0, body: id,
    author: { id: 'u', username: 'u' } as BoardComment['author'],
    mentions: [], createdAt: new Date().toISOString(), deleted: false,
    points: 0, replyCount: replies.length, viewerHasBoosted: false, replies,
  }
}

function reply(id: string, parentPostId: string, authorId = 'other', createdAt = new Date().toISOString()): FeedPost {
  return { id, parentId: parentPostId, boardRootId: 't1', body: id, createdAt, author: { id: authorId, username: authorId } } as unknown as FeedPost
}

function harness(rootParentId?: string | null) {
  const list = ref<BoardComment[]>([comment('a', null)])
  let live!: ReturnType<typeof useBoardThreadLive>
  const wrapper = mount(defineComponent({
    setup() {
      const tree = useBoardCommentTree(list, ref(rootParentId ?? null))
      live = useBoardThreadLive({
        threadId: ref('t1'),
        tree,
        ...(rootParentId !== undefined ? { rootParentId: ref(rootParentId) } : {}),
        canAccess: ref(true),
      })
      return () => h('div')
    },
  }))
  // usePostTyping and the live composable each register a posts callback; fan events to both.
  const registered = spies.addPosts.mock.calls.map((c) => c[0] as Record<string, (p: unknown) => void>)
  const fire = (name: string) => (payload: unknown) => registered.forEach((r) => r[name]?.(payload))
  const cb = {
    onCommentAdded: fire('onCommentAdded'),
    onCommentDeleted: fire('onCommentDeleted'),
    onTyping: fire('onTyping'),
  }
  return { list, live: () => live, cb, registered, wrapper }
}

beforeEach(() => {
  spies.addPosts.mockReset()
  spies.removePosts.mockReset()
  spies.subscribe.mockReset()
  spies.unsubscribe.mockReset()
  spies.emitTyping.mockReset()
})

describe('useBoardThreadLive', () => {
  it('holds other people’s comments behind the pill and reveals them in order', () => {
    const { list, live, cb, registered, wrapper } = harness()
    cb.onCommentAdded({ parentPostId: 't1', comment: reply('b', 't1', 'other', '2026-01-01T00:00:00Z') })
    cb.onCommentAdded({ parentPostId: 't1', comment: reply('b1', 'b', 'other', '2026-01-01T00:00:01Z') })
    cb.onCommentAdded({ parentPostId: 't1', comment: reply('b', 't1') })
    expect(live().pending.value.map((c) => c.id)).toEqual(['b', 'b1'])
    expect(list.value.map((c) => c.id)).toEqual(['a'])

    const first = live().reveal()
    expect(first).toBe('b')
    expect(list.value.map((c) => c.id)).toEqual(['b', 'a'])
    expect(list.value[0]!.replies.map((c) => c.id)).toEqual(['b1'])
    expect(live().freshIds.value.has('b1')).toBe(true)
    wrapper.unmount()
    for (const r of registered) expect(spies.removePosts).toHaveBeenCalledWith(r)
    expect(spies.unsubscribe).toHaveBeenCalledWith(['t1'])
  })

  it('lands your own comments from another device immediately and drops deleted pending ones', () => {
    const { list, live, cb, wrapper } = harness()
    cb.onCommentAdded({ parentPostId: 't1', comment: reply('mine', 'a', 'me') })
    expect(list.value[0]!.replies.map((c) => c.id)).toEqual(['mine'])
    cb.onCommentAdded({ parentPostId: 't1', comment: reply('x', 't1') })
    cb.onCommentDeleted({ commentId: 'x' })
    expect(live().pending.value).toHaveLength(0)
    wrapper.unmount()
  })

  it('on a comment permalink only counts replies to what is on screen', () => {
    const { live, cb, wrapper } = harness(null)
    cb.onCommentAdded({ parentPostId: 't1', comment: reply('sibling', 't1') })
    cb.onCommentAdded({ parentPostId: 't1', comment: reply('child', 'a') })
    expect(live().pending.value.map((c) => c.id)).toEqual(['child'])
    wrapper.unmount()
  })

  it('shows typing per comment and top-level', () => {
    const { live, cb, wrapper } = harness()
    const user = { id: 'other', username: 'other', verifiedStatus: 'manual', premium: false, premiumPlus: false, isOrganization: false }
    cb.onTyping({ postId: 't1', user, typing: true, replyToId: 'a' })
    expect(live().typingFor('a').map((u) => u.userId)).toEqual(['other'])
    expect(live().typingFor(null)).toHaveLength(0)
    cb.onTyping({ postId: 't1', user, typing: true })
    expect(live().typingFor(null).map((u) => u.userId)).toEqual(['other'])
    wrapper.unmount()
  })
})
