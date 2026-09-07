// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AvatarVideoStorage } from '../utils/avatar-video-storage'
import { AvatarVideoCache } from '../utils/avatar-video-cache'

describe('avatar MP4 cache', () => {
  let stored: Map<string, Blob>
  let storage: AvatarVideoStorage
  let fetcher: ReturnType<typeof vi.fn>
  beforeEach(() => {
    stored = new Map()
    let lock = Promise.resolve()
    vi.stubGlobal('navigator', { locks: { request: (_key: string, action: () => Promise<Blob>) => {
      const result = lock.then(action)
      lock = result.then(() => {}, () => {})
      return result
    } } })
    storage = { get: async key => stored.get(key), put: async (key, blob) => { stored.set(key, blob) }, touch: vi.fn(async () => {}) }
    fetcher = vi.fn(async () => new Response(new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]), {
      headers: { 'content-type': 'video/mp4' },
    }))
    vi.stubGlobal('fetch', fetcher)
  })
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

  it('downloads once for 30 simultaneous instances and subsequent mounts', async () => {
    const cache = new AvatarVideoCache(storage)
    const blobs = await Promise.all(Array.from({ length: 30 }, () => cache.load('https://cdn.test/avatar-v1.mp4')))
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(new Set(blobs).size).toBe(1)
    await cache.load('https://cdn.test/avatar-v1.mp4')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('refreshes persistent recency on memory reuse without writing for every duplicate', async () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(100_000)
    const cache = new AvatarVideoCache(storage)
    await cache.load('https://cdn.test/a.mp4')
    clock.mockReturnValue(161_000)
    await Promise.all(Array.from({ length: 30 }, () => cache.load('https://cdn.test/a.mp4')))
    expect(storage.touch).toHaveBeenCalledTimes(1)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('coordinates independent page instances and persists across recreation', async () => {
    await Promise.all([new AvatarVideoCache(storage).load('https://cdn.test/a.mp4'), new AvatarVideoCache(storage).load('https://cdn.test/a.mp4')])
    expect(fetcher).toHaveBeenCalledTimes(1)
    fetcher.mockRejectedValue(new Error('offline'))
    expect((await new AvatarVideoCache(storage).load('https://cdn.test/a.mp4')).size).toBe(8)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('downloads a new immutable version independently', async () => {
    const cache = new AvatarVideoCache(storage)
    await cache.load('https://cdn.test/a-v1.mp4')
    await cache.load('https://cdn.test/a-v2.mp4')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it('never stores partial responses and lets a later request retry', async () => {
    fetcher.mockResolvedValueOnce(new Response('partial', { status: 206, headers: { 'content-type': 'video/mp4' } }))
    const cache = new AvatarVideoCache(storage)
    await expect(cache.load('https://cdn.test/a.mp4')).rejects.toThrow()
    expect(stored.size).toBe(0)
    await cache.load('https://cdn.test/a.mp4')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it('bounds bytes even when Content-Length is absent', async () => {
    fetcher.mockResolvedValue(new Response(new Uint8Array(512 * 1024 + 1), { headers: { 'content-type': 'video/mp4' } }))
    await expect(new AvatarVideoCache(storage).load('https://cdn.test/a.mp4')).rejects.toThrow('too large')
    expect(stored.size).toBe(0)
  })
  it('deduplicates in memory when persistent storage is unavailable', async () => {
    storage = { get: async () => { throw new Error('quota') }, put: async () => { throw new Error('quota') }, touch: async () => { throw new Error('quota') } }
    const cache = new AvatarVideoCache(storage)
    await cache.load('https://cdn.test/a.mp4')
    await cache.load('https://cdn.test/a.mp4')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
});
