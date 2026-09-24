import { describe, expect, it, vi } from 'vitest'
import { init } from '@sentry/nuxt'
import '../sentry.client.config'

/** Client fields we assert; `init` args are a union that omits replay keys on CoreOptions. */
type AssertedSentryInitOptions = {
  integrations?: unknown
  replaysOnErrorSampleRate?: number
  ignoreErrors?: Array<string | RegExp>
}

function sentryInitOptions(): AssertedSentryInitOptions {
  const options = vi.mocked(init).mock.calls[0]?.[0] as AssertedSentryInitOptions | undefined
  expect(options).toBeDefined()
  return options as AssertedSentryInitOptions
}

describe('Sentry client ignore list', () => {
  it('initializes tracing without production replay in the test environment', () => {
    const options = sentryInitOptions()
    expect(options.integrations)
      .toEqual([{ name: 'BrowserTracing' }])
    expect(options.replaysOnErrorSampleRate).toBe(0)
  })

  it('drops Facebook Android IAB postMessage noise (MENOFHUNGER-WWW-1V)', () => {
    const options = sentryInitOptions()
    const ignored = (message: string) => options.ignoreErrors?.some((pattern: string | RegExp) =>
      typeof pattern === 'string' ? message.includes(pattern) : pattern.test(message),
    )
    expect(ignored('Error invoking postMessage: Java object is gone')).toBe(true)
    expect(ignored('navigation_performance_logger_android')).toBe(true)
    expect(ignored('Cannot read properties of null (reading commands)')).toBe(false)
  })
})

