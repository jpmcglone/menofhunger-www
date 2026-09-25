import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { boardPostHref } from '~/utils/board-links'
import { isLoggedOutAllowedPath } from '~/config/routes'
import { countBoardReplies, useBoardCommentTree } from '~/composables/useBoardCommentTree'
import type { BoardComment } from '~/types/api'

function comment(id: string, parentId: string | null, replies: BoardComment[] = []): BoardComment {
  return {
    id,
    threadId: 't1',
    parentId,
    depth: 0,
    body: id,
    author: { id: 'u', username: 'u' } as BoardComment['author'],
    mentions: [],
    createdAt: new Date().toISOString(),
    deleted: false,
    points: 0,
    replyCount: replies.length,
    viewerHasBoosted: false,
    replies,
  }
}

describe('boardPostHref', () => {
  it('routes Board threads, Board comments, and leaves regular posts alone', () => {
    expect(boardPostHref({ id: 't1', kind: 'board', parentId: null, boardRootId: 't1' })).toBe('/b/t1')
    expect(boardPostHref({ id: 'c1', kind: 'board', parentId: 't1', boardRootId: 't1' })).toBe('/b/t1/c/c1')
    expect(boardPostHref({ id: 'p1', kind: 'regular', parentId: null })).toBeNull()
  })
})

describe('Board logged-out routing', () => {
  it('lets guests read the list, threads, and comment permalinks but not compose', () => {
    expect(isLoggedOutAllowedPath('/b')).toBe(true)
    expect(isLoggedOutAllowedPath('/b/t1')).toBe(true)
    expect(isLoggedOutAllowedPath('/b/t1/c/c1')).toBe(true)
    expect(isLoggedOutAllowedPath('/b/new')).toBe(false)
    expect(isLoggedOutAllowedPath('/bookmarks')).toBe(false)
  })
})

describe('useBoardCommentTree', () => {
  it('inserts top-level and nested comments once, and counts replies', () => {
    const list = ref<BoardComment[]>([comment('a', null)])
    const tree = useBoardCommentTree(list)
    tree.add(comment('b', null))
    tree.add(comment('a1', 'a'))
    tree.add(comment('a1', 'a'))
    expect(list.value.map((c) => c.id)).toEqual(['b', 'a'])
    expect(list.value[1]!.replies.map((c) => c.id)).toEqual(['a1'])
    expect(countBoardReplies(list.value[1]!)).toBe(1)
  })

  it('keeps a deleted comment with replies as a placeholder and drops leaves', () => {
    const list = ref<BoardComment[]>([comment('a', null, [comment('a1', 'a')]), comment('b', null)])
    const tree = useBoardCommentTree(list)
    tree.remove('a')
    tree.remove('b')
    expect(list.value).toHaveLength(1)
    expect(list.value[0]!.deleted).toBe(true)
    expect(list.value[0]!.replies).toHaveLength(1)
  })
})
