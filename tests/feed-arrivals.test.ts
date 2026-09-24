import { effectScope, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FeedPost } from '~/types/api'
import { useFeedArrivals } from '~/composables/useFeedArrivals'

function post(id: string, author = id, extra: Partial<FeedPost> = {}): FeedPost {
  return { id, createdAt: new Date(Date.now() + 1).toISOString(), body: id, visibility: 'public', parentId: null, communityGroupId: null,
    deletedAt: null, author: { id: author, username: author, avatarUrl: null }, ...extra } as FeedPost
}
const scopes: ReturnType<typeof effectScope>[] = []
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-24T18:00:00Z')) })
afterEach(() => { scopes.splice(0).forEach(scope => scope.stop()); vi.useRealTimers() })
function setup() {
  const scope = effectScope(); scopes.push(scope)
  const posts = ref([post('existing')])
  const viewerId = ref('me')
  const filter = ref('all')
  const context = ref('forYou:all')
  const arrivals = scope.run(() => useFeedArrivals({
    posts, viewerId, filter, context,
    prepend: item => { if (!posts.value.some(p => p.id === item.id)) posts.value.unshift(item) },
  }))!
  return { ...arrivals, posts, viewerId, filter, context }
}

describe('feed arrivals', () => {
  it('rejects old, equal-boundary and invalid dates from polling and realtime', () => {
    const a = setup()
    const old = post('yesterday', 'old', { createdAt: '2026-09-23T18:00:00Z' })
    const beforeVisit = post('today', 'old', { createdAt: '2026-09-24T17:59:00Z' })
    const boundary = post('boundary', 'old', { createdAt: new Date().toISOString() })
    const invalid = post('invalid', 'old', { createdAt: 'invalid' })
    a.receive(old); a.receive(beforeVisit); a.receive(boundary); a.receive(invalid)
    a.receiveBatch([old, beforeVisit, boundary, invalid, post('fresh')])
    expect(a.pending.value.map(p => p.id)).toEqual(['fresh'])
    expect(a.authors.value.map(author => author.id)).toEqual(['fresh'])
    a.reveal()
    expect(a.posts.value.map(p => p.id)).toEqual(['fresh', 'existing'])
  })
  it('refresh advances the boundary while preserving posts published during the request', () => {
    const a = setup()
    a.receive(post('before-refresh'))
    vi.advanceTimersByTime(1000)
    const refreshStarted = Date.now()
    a.receive(post('during-refresh'))
    vi.advanceTimersByTime(1000)
    a.advanceBoundary(refreshStarted)
    expect(a.pending.value.map(p => p.id)).toEqual(['during-refresh'])
    a.receiveBatch([post('resurfaced', 'old', { createdAt: new Date(refreshStarted - 1).toISOString() })])
    expect(a.pending.value.map(p => p.id)).toEqual(['during-refresh'])
    a.advanceBoundary(refreshStarted - 2000)
    a.receive(post('still-old', 'old', { createdAt: new Date(refreshStarted).toISOString() }))
    expect(a.pending.value.map(p => p.id)).toEqual(['during-refresh'])
  })
  it('a new feed context establishes a new freshness boundary', () => {
    const a = setup()
    const earlier = post('earlier')
    a.receive(earlier)
    vi.advanceTimersByTime(1000)
    a.context.value = 'following:all'
    a.receive(earlier)
    a.receive(post('fresh'))
    expect(a.pending.value.map(p => p.id)).toEqual(['fresh'])
  })
  it('keeps the visible feed unchanged until reveal, newest first and without echoes', () => {
    const a = setup()
    a.receive(post('first')); a.receive(post('second')); a.receive(post('first'))
    expect(a.posts.value.map(p => p.id)).toEqual(['existing'])
    expect(a.pending.value.map(p => p.id)).toEqual(['second', 'first'])
    a.reveal(); a.reveal()
    expect(a.posts.value.map(p => p.id)).toEqual(['second', 'first', 'existing'])
    expect(a.pending.value).toEqual([])
  })
  it('always buffers arrivals, including when the feed is at the top', () => {
    const a = setup(); a.receive(post('first')); a.receive(post('later'))
    expect(a.posts.value.map(p => p.id)).toEqual(['existing'])
    expect(a.pending.value.map(p => p.id)).toEqual(['later', 'first'])
  })
  it('merges recommendations in server order and deduplicates socket echoes', () => {
    const a = setup(); a.receive(post('socket'))
    a.receiveBatch([post('recommended'), post('socket'), post('existing'), post('older')])
    expect(a.pending.value.map(p => p.id)).toEqual(['recommended', 'older', 'socket'])
    a.reveal()
    expect(a.posts.value.map(p => p.id)).toEqual(['recommended', 'older', 'socket', 'existing'])
  })
  it('bounds the queue without discarding arrivals already promised to the reader', () => {
    const a = setup()
    for (let i = 0; i < 65; i++) a.receive(post(String(i)))
    expect(a.pending.value).toHaveLength(60)
    expect(a.pending.value.at(-1)?.id).toBe('0')
  })
  it('does not queue a root already embedded in a loaded conversation', () => {
    const a = setup()
    a.posts.value = [post('reply', 'a', {parentId:'root', parent:post('root')})]
    a.receiveBatch([post('root'), post('new')])
    expect(a.pending.value.map(p => p.id)).toEqual(['new'])
  })
  it('shows at most three distinct authors', () => {
    const a = setup()
    for (const [id, author] of [['1','a'], ['2','b'], ['3','c'], ['4','d'], ['5','d']]) a.receive(post(id!, author!))
    expect(a.authors.value.map(author => author.id)).toEqual(['d','c','b'])
  })
  it('ignores own posts, known rows, private/group/reply/deleted posts and other filters', () => {
    const a = setup()
    a.receive(post('own','me')); a.receive(post('existing'))
    a.receive(post('private','a',{ visibility: 'onlyMe' }))
    a.receive(post('group','a',{ communityGroupId: 'g' }))
    a.receive(post('reply','a',{ parentId: 'p' }))
    a.receive(post('gone','a',{ deletedAt: new Date().toISOString() }))
    a.filter.value = 'verifiedOnly'; a.receive(post('public'))
    expect(a.pending.value).toEqual([])
    a.receive(post('verified','a',{ visibility: 'verifiedOnly' }))
    expect(a.pending.value).toHaveLength(1)
  })
  it('drops deleted arrivals and patches edits before reveal', () => {
    const a = setup(); a.receive(post('first')); a.receive(post('second'))
    a.applyUpdate({ postId: 'first', reason: 'edited', version: '1', patch: { body: 'new body' } })
    a.applyUpdate({ postId: 'second', reason: 'deleted', version: '2', patch: { deletedAt: new Date().toISOString() } })
    a.reveal()
    expect(a.posts.value[0]?.body).toBe('new body')
    expect(a.posts.value.some(p => p.id === 'second')).toBe(false)
  })
  it('clears on filter/account changes and prunes arrivals loaded through another path', async () => {
    const a = setup(); a.receive(post('first')); a.context.value = 'following:all'
    expect(a.pending.value).toEqual([])
    a.receive(post('second')); a.viewerId.value = 'other'
    expect(a.pending.value).toEqual([])
    a.receive(post('third')); a.posts.value.unshift(post('third')); await nextTick()
    expect(a.pending.value).toEqual([])
  })
})
