import { describe, expect, it, vi } from 'vitest'
import { init } from '@sentry/nuxt'
import '../sentry.client.config'

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

