import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { boardPostHref } from '~/utils/board-links'
import { boardNavPopAction, isLoggedOutAllowedPath, shouldInterceptSameNavClick } from '~/config/routes'
import { countBoardReplies, newSinceIds, useBoardCommentTree } from '~/composables/useBoardCommentTree'
import { boardThreadOpenHref } from '~/composables/useBoardApi'
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

  it('opens article Board posts on the article', () => {
    expect(boardPostHref({ id: 't2', kind: 'board', parentId: null, boardRootId: 't2', article: { id: 'a1' } })).toBe('/a/a1')
    expect(boardThreadOpenHref({ id: 't2', articleId: 'a1' })).toBe('/a/a1')
    expect(boardThreadOpenHref({ id: 't3', articleId: null })).toBe('/b/t3')
  })
})

describe('newSinceIds', () => {
  const at = (id: string, iso: string, authorId = 'other', replies: BoardComment[] = []) => ({
    ...comment(id, null, replies),
    createdAt: iso,
    author: { id: authorId, username: authorId } as BoardComment['author'],
  })

  it('marks comments by others after the last visit, in reading order', () => {
    const list = [
      at('old', '2026-09-01T00:00:00Z', 'other', [at('newReply', '2026-09-03T00:00:00Z')]),
      at('mine', '2026-09-03T00:00:00Z', 'me'),
      at('newTop', '2026-09-04T00:00:00Z'),
    ]
    expect(newSinceIds(list, '2026-09-02T00:00:00Z', 'me')).toEqual(['newReply', 'newTop'])
  })

  it('marks nothing on a first visit', () => {
    expect(newSinceIds([at('c', '2026-09-04T00:00:00Z')], null, 'me')).toEqual([])
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

describe('Board nav click from inside the Board', () => {
  const click = { metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, button: 0 }

  it('pops one step when we came from inside the Board, else goes to the list', () => {
    expect(boardNavPopAction({ currentPath: '/b/t1', to: '/b', historyBack: '/b?sort=new', event: click })).toBe('back')
    expect(boardNavPopAction({ currentPath: '/b/t1/c/c1', to: '/b', historyBack: '/b/t1', event: click })).toBe('back')
    expect(boardNavPopAction({ currentPath: '/b/t1', to: '/b', historyBack: '/home', event: click })).toBe('navigate')
    expect(boardNavPopAction({ currentPath: '/b/t1', to: '/b', historyBack: null, event: click })).toBe('navigate')
    // Not a Board sub-page, a different nav item, or a new-tab click: leave it alone.
    expect(boardNavPopAction({ currentPath: '/b', to: '/b', historyBack: '/home', event: click })).toBeNull()
    expect(boardNavPopAction({ currentPath: '/b/t1', to: '/home', historyBack: '/b', event: click })).toBeNull()
    expect(boardNavPopAction({ currentPath: '/b/t1', to: '/b', historyBack: '/b', event: { ...click, metaKey: true } })).toBeNull()
  })

  it('no longer swallows the click on a thread just because Board is highlighted', () => {
    expect(shouldInterceptSameNavClick({ currentPath: '/b/t1', to: '/b', event: click })).toBe(false)
    expect(shouldInterceptSameNavClick({ currentPath: '/b', to: '/b', event: click })).toBe(true)
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
