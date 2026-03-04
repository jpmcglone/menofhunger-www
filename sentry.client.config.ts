import * as Sentry from '@sentry/nuxt'
import { browserTracingIntegration, replayIntegration } from '@sentry/nuxt'

const config = useRuntimeConfig()
const dsn = String(config.public?.sentry?.dsn || '').trim()
const environment = String(config.public?.sentry?.environment || '').trim() || undefined
const isProd = environment === 'production'

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  environment,

  integrations: [
    // Captures page-load and navigation performance spans, and wires up distributed tracing.
    browserTracingIntegration(),
    // Records session replays; on error always capture, otherwise sample lightly.
    replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],

  // 100% in dev/staging so nothing is missed; 20% in production to stay within quota.
  tracesSampleRate: isProd ? 0.2 : 1.0,

  // Replay: record 10% of normal sessions, always record sessions with errors.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Send cookies, headers, and user IP so we can correlate sessions/errors.
  sendDefaultPii: true,

  // Forward console.log/warn/error to Sentry Logs.
  enableLogs: true,

  // Suppress known browser-noise errors that are not actionable.
  ignoreErrors: [
    // Network / connectivity
    'NetworkError',
    'Failed to fetch',
    'Load failed',
    'Network request failed',
    'The network connection was lost',
    'The Internet connection appears to be offline',
    // Browser extension interference
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    // Safari back/forward cache quirks
    'Blocked a frame with origin',
    // Chunk loading (usually from stale client after deploy — user refresh fixes it)
    /Loading chunk \d+ failed/,
    /Loading CSS chunk \d+ failed/,
    // User aborted requests
    'AbortError',
    'The user aborted a request',
    // Safari push permission quirks
    'NotAllowedError',
  ],

  debug: false,
})
