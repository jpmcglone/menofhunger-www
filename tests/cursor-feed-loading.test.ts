import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCursorFeed } from '~/composables/useCursorFeed'

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
})
