import { effectScope, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import type { FeedPost } from '~/types/api'
import { useFeedArrivals } from '~/composables/useFeedArrivals'

function post(id: string, author = id, extra: Partial<FeedPost> = {}): FeedPost {
  return { id, body: id, visibility: 'public', parentId: null, communityGroupId: null,
    deletedAt: null, author: { id: author, username: author, avatarUrl: null }, ...extra } as FeedPost
}
const scopes: ReturnType<typeof effectScope>[] = []
afterEach(() => { scopes.splice(0).forEach(scope => scope.stop()) })
function setup() {
  const scope = effectScope(); scopes.push(scope)
  const posts = ref([post('existing')])
  const viewerId = ref('me')
  const filter = ref('all')
  const context = ref('forYou:all')
  let reading = true
  const arrivals = scope.run(() => useFeedArrivals({
    posts, viewerId, filter, context, isReading: () => reading,
    prepend: item => { if (!posts.value.some(p => p.id === item.id)) posts.value.unshift(item) },
  }))!
  return { ...arrivals, posts, viewerId, filter, context, atTop: () => { reading = false } }
}

describe('feed arrivals', () => {
  it('keeps the visible feed unchanged until reveal, newest first and without echoes', () => {
    const a = setup()
    a.receive(post('first')); a.receive(post('second')); a.receive(post('first'))
    expect(a.posts.value.map(p => p.id)).toEqual(['existing'])
    expect(a.pending.value.map(p => p.id)).toEqual(['second', 'first'])
    a.reveal(); a.reveal()
    expect(a.posts.value.map(p => p.id)).toEqual(['second', 'first', 'existing'])
    expect(a.pending.value).toEqual([])
  })
  it('inserts directly at the top but never flushes an existing reading queue', () => {
    const a = setup(); a.atTop(); a.receive(post('first'))
    expect(a.posts.value[0]?.id).toBe('first')
    const b = setup(); b.receive(post('queued')); b.atTop(); b.receive(post('later'))
    expect(b.posts.value.map(p => p.id)).toEqual(['existing'])
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
