import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useDailyContentToday } from '../composables/useDailyContentToday'
import { useWebsters1828Wotd } from '../composables/useWebsters1828Wotd'

const { fetchData, asyncData, persistent, requestVersion } = vi.hoisted(() => ({
  fetchData: vi.fn(), asyncData: vi.fn(), requestVersion: { value: 0 }, persistent: { value: { word: 'Yesterday' } as unknown },
}))
mockNuxtImport('useApiClient', () => () => ({ apiFetchData: fetchData }))
mockNuxtImport('useAsyncData', () => asyncData)
mockNuxtImport('useState', () => (key: string) => key === 'wotd:request-version' ? requestVersion : persistent)

describe('daily content cache refresh', () => {
  beforeEach(() => { fetchData.mockReset(); asyncData.mockReset(); persistent.value = { word: 'Yesterday' } })

  it('forces a network read for a quote refresh even if a pre-publication request is in flight', async () => {
    useDailyContentToday()
    const [, handler] = asyncData.mock.calls[0]!
    fetchData.mockResolvedValue({ quote: { text: 'Today' } })
    expect(await handler()).toEqual({ quote: { text: 'Today' } })
    expect(fetchData).toHaveBeenCalledWith('/meta/daily-content/today', expect.objectContaining({ cache: 'no-store', mohDedupe: false }))
  })

  it('does not resurrect a persistent old word on notification navigation', async () => {
    useWebsters1828Wotd()
    const [key, handler, options] = asyncData.mock.calls[0]!
    const app = { isHydrating: false, payload: { data: { [key]: { word: 'Yesterday' } } } }
    expect(options.getCachedData(key, app)).toBeUndefined()
    fetchData.mockResolvedValue({ word: 'Today' })
    await handler()
    expect(persistent.value).toEqual({ word: 'Today' })
    expect(fetchData).toHaveBeenCalledWith(expect.stringContaining('/meta/websters1828/wotd'), expect.objectContaining({ cache: 'no-store', mohDedupe: false }))
  })

  it('does not let a slow old request replace the freshly published persistent word', async () => {
    useWebsters1828Wotd()
    const [, handler] = asyncData.mock.calls[0]!
    let finishOld!: (value: unknown) => void
    fetchData.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve }))
      .mockResolvedValueOnce({ word: 'Today' })
    const old = handler()
    await handler()
    finishOld({ word: 'Yesterday' })
    await old
    expect(persistent.value).toEqual({ word: 'Today' })
  })

  it('preserves the server snapshot for initial hydration only', () => {
    useWebsters1828Wotd()
    const [key, , options] = asyncData.mock.calls[0]!
    const payload = { word: 'Today' }
    expect(options.getCachedData(key, { isHydrating: true, payload: { data: { [key]: payload } } })).toBe(payload)
  })
})
