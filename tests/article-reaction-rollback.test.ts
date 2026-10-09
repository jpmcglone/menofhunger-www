import { nextTick, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useArticleReactions } from '../composables/useArticleReactions'
import type { ArticleReactionSummary } from '../types/api'

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), toast: vi.fn() }))
vi.mock('~/composables/useApiClient', () => ({ useApiClient: () => ({ apiFetchData: mocks.fetch }) }))
vi.mock('~/composables/useAppToast', () => ({ useAppToast: () => ({ push: mocks.toast }) }))

const reaction: ArticleReactionSummary = { reactionId: 'heart', emoji: '❤️', count: 1, viewerHasReacted: true }

function fixture(type: 'article' | 'comment' = 'article', initial: ArticleReactionSummary[] = [reaction]) {
  const id = ref('one')
  const source = ref(initial)
  return { id, source, service: useArticleReactions(type, id, source) }
}

function rejectLater() {
  let reject!: (error: Error) => void
  mocks.fetch.mockImplementationOnce(() => new Promise((_resolve, failure) => { reject = failure }))
  return () => reject(new Error('Offline'))
}

beforeEach(() => {
  mocks.fetch.mockReset().mockResolvedValue({})
  mocks.toast.mockReset()
})

describe('Article and comment reaction requests', () => {
  it.each(['article', 'comment'] as const)('restores the last %s reaction after a failed removal', async type => {
    const f = fixture(type)
    mocks.fetch.mockRejectedValueOnce(new Error('Offline'))
    const pending = f.service.toggle('heart', '❤️')
    expect(f.service.reactions.value).toEqual([])
    await pending
    expect(f.service.reactions.value).toEqual([reaction])
    const path = type === 'article' ? '/articles/one/reactions/heart' : '/articles/comments/one/reactions/heart'
    expect(mocks.fetch).toHaveBeenCalledWith(path, { method: 'DELETE' })
  })

  it('restores the previous count after a failed addition', async () => {
    const previous = { ...reaction, count: 3, viewerHasReacted: false }
    const f = fixture('article', [previous])
    mocks.fetch.mockRejectedValueOnce(new Error('Offline'))
    const pending = f.service.toggle('heart', '❤️')
    expect(f.service.reactions.value[0]?.count).toBe(4)
    await pending
    expect(f.service.reactions.value).toEqual([previous])
  })

  it('preserves a server snapshot received before the failed request settles', async () => {
    const f = fixture()
    const fail = rejectLater()
    const pending = f.service.toggle('heart', '❤️')
    f.source.value = [{ ...reaction, count: 2 }]
    await nextTick()
    fail()
    await pending
    expect(f.service.reactions.value).toEqual([{ ...reaction, count: 2 }])
  })

  it('does not restore reactions from an article that is no longer open', async () => {
    const f = fixture()
    const fail = rejectLater()
    const pending = f.service.toggle('heart', '❤️')
    f.id.value = 'two'
    f.source.value = []
    await nextTick()
    fail()
    await pending
    expect(f.service.reactions.value).toEqual([])
  })

  it('ignores repeated taps until the current request settles', async () => {
    const f = fixture()
    const fail = rejectLater()
    const pending = f.service.toggle('heart', '❤️')
    await f.service.toggle('heart', '❤️')
    expect(mocks.fetch).toHaveBeenCalledTimes(1)
    fail()
    await pending
    await f.service.toggle('heart', '❤️')
    expect(mocks.fetch).toHaveBeenCalledTimes(2)
    expect(f.service.reactions.value).toEqual([])
  })
})
