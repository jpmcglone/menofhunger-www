import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCursorFeed, useCursorFeeds } from '~/composables/useCursorFeed'

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }))
vi.mock('~/composables/useApiClient', () => ({ useApiClient: () => ({ apiFetch: mocks.fetch }) }))
beforeEach(() => { mocks.fetch.mockReset() })
const makeFeed = () => useCursorFeed<string>({ stateKey: 'loading-test', stateMode: 'local', buildRequest: () => ({ path: '/test' }) })

describe('cursor feed lifecycle', () => {
  it('distinguishes first paint, pending fetch, empty success and refresh', async () => {
    const feed = makeFeed()
    expect(feed.initialLoading.value).toBe(true)
    mocks.fetch.mockImplementation(async () => {
      expect(feed.loading.value).toBe(true)
      return { data: [], pagination: {} }
    })
    await feed.refresh()
    expect(feed.initialLoading.value).toBe(false)
    expect(feed.hasLoaded.value).toBe(true)
    mocks.fetch.mockImplementation(async () => {
      expect(feed.initialLoading.value).toBe(false)
      expect(feed.items.value).toEqual([])
      return { data: ['new'] }
    })
    await feed.refresh()
    expect(feed.items.value).toEqual(['new'])
  })

  it('keeps rows when refresh fails and exposes the error', async () => {
    const feed = makeFeed()
    mocks.fetch.mockResolvedValue({ data: ['existing'] })
    await feed.refresh()
    mocks.fetch.mockRejectedValue(new Error('Offline'))
    await feed.refresh()
    expect(feed.items.value).toEqual(['existing'])
    expect(feed.error.value).toBeTruthy()
    expect(feed.initialLoading.value).toBe(false)
  })

  it('does not display an obsolete response while a replacement filter is queued', async () => {
    const feed = makeFeed()
    feed.items.value = ['established']
    let resolve!: (value: { data: string[] }) => void
    mocks.fetch.mockImplementationOnce(() => new Promise(r => { resolve = r }))
    const first = feed.refresh()
    const second = feed.refresh()
    mocks.fetch.mockImplementation(async () => {
      expect(feed.items.value).toEqual(['established'])
      return { data: ['latest'] }
    })
    resolve({ data: ['obsolete'] })
    await Promise.all([first, second])
    expect(feed.items.value).toEqual(['latest'])
  })

  it('resolves empty without fetching when buildRequest returns null', async () => {
    const feed = useCursorFeed<string>({ stateKey: 'skip', stateMode: 'local', buildRequest: () => null })
    feed.items.value = ['stale']
    await feed.refresh()
    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(feed.items.value).toEqual([])
    expect(feed.hasLoaded.value).toBe(true)
    expect(feed.hasMore.value).toBe(false)
  })

  it('clears rows up front on reset refresh and on failure with clearOnError', async () => {
    const feed = useCursorFeed<string>({ stateKey: 'clear', stateMode: 'local', clearOnError: true, buildRequest: () => ({ path: '/x' }) })
    mocks.fetch.mockResolvedValueOnce({ data: ['a'], pagination: { nextCursor: 'c1' } })
    await feed.refresh()
    mocks.fetch.mockImplementationOnce(async () => {
      expect(feed.items.value).toEqual([])
      throw new Error('down')
    })
    await feed.refresh({ reset: true })
    expect(feed.items.value).toEqual([])
    expect(feed.nextCursor.value).toBeNull()
    expect(feed.error.value).toBeTruthy()
  })

  it('drops a loadMore page that resolves after a newer refresh', async () => {
    const feed = useCursorFeed<string>({ stateKey: 'gen', stateMode: 'local', buildRequest: (c) => ({ path: '/x', query: { cursor: c ?? undefined } }) })
    mocks.fetch.mockResolvedValueOnce({ data: ['a'], pagination: { nextCursor: 'c1' } })
    await feed.refresh()
    let resolveMore!: (v: { data: string[] }) => void
    mocks.fetch.mockImplementationOnce(() => new Promise(r => { resolveMore = r }))
    const more = feed.loadMore()
    mocks.fetch.mockResolvedValueOnce({ data: ['fresh'] })
    await feed.refresh()
    resolveMore({ data: ['stale-page'] })
    await more
    expect(feed.items.value).toEqual(['fresh'])
    expect(feed.loadingMore.value).toBe(false)
  })
})

describe('named cursor streams', () => {
  it('pages each stream independently', async () => {
    const feeds = useCursorFeeds<{ followers: string; following: string }>({
      stateKey: 'follow',
      stateMode: 'local',
      streams: {
        followers: { buildRequest: (c) => ({ path: '/followers', query: { cursor: c ?? undefined } }) },
        following: { buildRequest: (c) => ({ path: '/following', query: { cursor: c ?? undefined } }) },
      },
    })
    mocks.fetch.mockImplementation(async (path: string) => ({ data: [path], pagination: { nextCursor: path === '/followers' ? 'n' : null } }))
    await Promise.all([feeds.followers.refresh(), feeds.following.refresh()])
    expect(feeds.followers.items.value).toEqual(['/followers'])
    expect(feeds.following.items.value).toEqual(['/following'])
    expect(feeds.followers.hasMore.value).toBe(true)
    expect(feeds.following.hasMore.value).toBe(false)
    await feeds.followers.loadMore()
    expect(feeds.followers.items.value).toEqual(['/followers', '/followers'])
    expect(mocks.fetch).toHaveBeenLastCalledWith('/followers', { method: 'GET', query: { cursor: 'n' } })
  })
})
