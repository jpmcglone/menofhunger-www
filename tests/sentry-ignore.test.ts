import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { init } from '@sentry/nuxt'
import '../sentry.client.config'

const media = readFileSync(
  resolve(process.cwd(), 'components/app/PostMediaGrid.vue'),
  'utf8',
)

describe('Sentry client ignore list', () => {
  it('initializes browser integrations during Nuxt startup', () => {
    const options = vi.mocked(init).mock.calls[0]?.[0]
    expect(options).toBeDefined()
    expect(options?.integrations)
      .toEqual([{ name: 'BrowserTracing' }, { name: 'Replay' }])
  })

  it('drops Facebook Android IAB postMessage noise (MENOFHUNGER-WWW-1V)', () => {
    const options = vi.mocked(init).mock.calls[0]?.[0]
    expect(options).toBeDefined()
    const ignored = (message: string) => options?.ignoreErrors?.some((pattern: string | RegExp) =>
      typeof pattern === 'string' ? message.includes(pattern) : pattern.test(message),
    )
    expect(ignored('Error invoking postMessage: Java object is gone')).toBe(true)
    expect(ignored('navigation_performance_logger_android')).toBe(true)
    expect(ignored('Cannot read properties of null (reading commands)')).toBe(false)
  })
})

describe('PostMediaGrid TDZ (MENOFHUNGER-WWW-1T)', () => {
  it('declares items before the video watchEffect that reads it', () => {
    const itemsAt = media.indexOf('const items = computed')
    const watchAt = media.indexOf('watchEffect((onCleanup)')
    expect(itemsAt).toBeGreaterThan(-1)
    expect(watchAt).toBeGreaterThan(itemsAt)
  })
})
