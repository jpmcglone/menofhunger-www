import { describe, expect, it } from 'vitest'
import { pickArticles, pickThreads } from '../composables/useRailRecommendations'

const article = (id: string, extra: Record<string, unknown> = {}) =>
  ({ id, deletedAt: null, isDraft: false, viewerCanAccess: true, ...extra }) as never
const thread = (id: string, extra: Record<string, unknown> = {}) => ({ id, viewerHidden: false, ...extra }) as never

describe('pickArticles', () => {
  it('excludes the current article and earlier selections before applying the limit', () => {
    const taken = new Set(['current'])
    const related = pickArticles([article('current'), article('a'), article('b'), article('c')], taken, 3)
    expect(related.map((a) => a.id)).toEqual(['a', 'b', 'c'])

    const byAuthor = pickArticles([article('b'), article('d'), article('e'), article('f')], taken, 2)
    expect(byAuthor.map((a) => a.id)).toEqual(['d', 'e'])
  })

  it('skips restricted previews, drafts, and deleted articles', () => {
    const picked = pickArticles(
      [
        article('locked', { viewerCanAccess: false }),
        article('draft', { isDraft: true }),
        article('gone', { deletedAt: '2026-01-01T00:00:00Z' }),
        article('ok'),
      ],
      new Set(),
      3,
    )
    expect(picked.map((a) => a.id)).toEqual(['ok'])
  })
})

describe('pickThreads', () => {
  it('drops the current and hidden threads, then limits', () => {
    const picked = pickThreads(
      [thread('t0'), thread('t1', { viewerHidden: true }), thread('t2'), thread('t2'), thread('t3'), thread('t4')],
      't0',
      2,
    )
    expect(picked.map((t) => t.id)).toEqual(['t2', 't3'])
  })

  it('returns nothing when only the current thread remains', () => {
    expect(pickThreads([thread('only')], 'only', 4)).toEqual([])
  })
})
