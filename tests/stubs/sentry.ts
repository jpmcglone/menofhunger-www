import { vi } from 'vitest'

// Nuxt bootstraps before test setup files. Resolve the SDK here so browser
// plugins do not load its Node entry point or send telemetry during unit tests.
export const init = vi.fn()
export const setUser = vi.fn()
export const setTag = vi.fn()
export const browserTracingIntegration = vi.fn(() => ({ name: 'BrowserTracing' }))
export const replayIntegration = vi.fn(() => ({ name: 'Replay' }))
export const diagnoseSdkConnectivity = vi.fn(async () => 'sentry-reachable')
export const startSpan = vi.fn((_options: unknown, callback: () => unknown) => callback())
