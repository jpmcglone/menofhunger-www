// @vitest-environment node
import { readFile } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRouter } from 'radix3'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { renderLinksCardPng } from '../server/utils/og-links-card'

mockNuxtImport('useRuntimeConfig', () => () => ({ apiBaseUrl: 'https://api.example.test/v1' }))

vi.mock('../server/utils/og-map-card', async (importOriginal) => {
  const original = await importOriginal<typeof import('../server/utils/og-map-card')>()
  return {
    ...original,
    loadFonts: async () => Promise.all(([400, 600, 800] as const).map(async (weight) => ({
      name: 'Inter', weight, style: 'normal' as const,
      data: await readFile(new URL(`../server/assets/og-fonts/inter-latin-${weight}-normal.woff`, import.meta.url)),
    }))),
  }
})

const router = createRouter()
router.insert('/og/links/:username.png', { route: true })
const headers = vi.fn()
const fetchPage = vi.fn()
const page = {
  user: { username: 'john', name: 'John McGlone', bio: 'Faith, family, and strength.', isOrganization: false, avatarUrl: null },
}

beforeEach(() => {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('getRouterParam', (event: { context: { params: Record<string, string> } }, key: string) => event.context.params[key])
  vi.stubGlobal('setResponseHeader', headers)
  vi.stubGlobal('createError', (details: object) => Object.assign(new Error('HTTP error'), details))
  vi.stubGlobal('$fetch', fetchPage)
  fetchPage.mockReset()
  headers.mockClear()
})
afterEach(() => vi.unstubAllGlobals())

function eventFor(username: string) {
  return { context: { params: router.lookup(`/og/links/${username}.png`)!.params } } as never
}

function expectPng(png: Buffer) {
  expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
  expect(png.readUInt32BE(16)).toBe(1200)
  expect(png.readUInt32BE(20)).toBe(630)
}

describe('links share image', () => {
  it('serves an actual PNG using Nitro suffix parameters without visitor cookies', async () => {
    fetchPage.mockResolvedValue({ data: page })
    const handler = (await import('../server/routes/og/links/[username].png.get')).default
    const event = eventFor('JOHN')
    expectPng(await handler(event))
    expect(fetchPage).toHaveBeenCalledWith('https://api.example.test/v1/users/john/links', { timeout: 8000, retry: 0 })
    expect(headers).toHaveBeenCalledWith(event, 'Content-Type', 'image/png')
    expect(headers).toHaveBeenLastCalledWith(event, 'Cache-Control', expect.stringContaining('public'))
  })

  it('returns an uncacheable 404 for unavailable profiles', async () => {
    fetchPage.mockRejectedValue({ statusCode: 404 })
    const handler = (await import('../server/routes/og/links/[username].png.get')).default
    const event = eventFor('missing')
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 404 })
    expect(headers).toHaveBeenLastCalledWith(event, 'Cache-Control', 'no-store')
  })

  it('treats API failures as retryable, without caching a broken preview', async () => {
    fetchPage.mockRejectedValue({ statusCode: 500 })
    const handler = (await import('../server/routes/og/links/[username].png.get')).default
    const event = eventFor('retryable')
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 503 })
    expect(headers).toHaveBeenLastCalledWith(event, 'Cache-Control', 'no-store')
    fetchPage.mockResolvedValue({ data: page })
    expectPng(await handler(event))
  })

  it('rejects invalid usernames before fetching the API', async () => {
    const handler = (await import('../server/routes/og/links/[username].png.get')).default
    await expect(handler(eventFor('bad-name'))).rejects.toMatchObject({ statusCode: 404 })
    expect(fetchPage).not.toHaveBeenCalled()
  })

  it('renders with an initial when a photo cannot be decoded', async () => {
    expectPng(await renderLinksCardPng({ name: 'John', username: 'john', bio: null, isOrganization: true, avatarDataUri: 'data:image/png;base64,bm90IGEgcGhvdG8=' }))
  })
})
