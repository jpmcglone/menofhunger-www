import * as Sentry from '@sentry/nuxt'
import { browserTracingIntegration, replayIntegration } from '@sentry/nuxt'
import { scrubSentryEvent } from '~/utils/sentry-scrub'

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

  // Include user IP + some default request/context data so we can correlate errors
  // with affected users and environments. Actual PII (auth cookies, session tokens,
  // Authorization headers, emails in request bodies) is stripped by `beforeSend` /
  // `beforeSendTransaction` below. See `utils/sentry-scrub.ts` and `docs/observability.md`.
  sendDefaultPii: true,

  // Strip auth cookies / tokens / obvious PII before events leave the browser.
  beforeSend(event) {
    return scrubSentryEvent(event)
  },
  beforeSendTransaction(event) {
    return scrubSentryEvent(event)
  },

  // Keep Sentry event capture enabled, but avoid forwarding every console line
  // to Sentry Logs in development.
  enableLogs: false,

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
    // Chunk loading after a deploy: the user has stale HTML in memory referencing
    // chunk hashes that no longer exist on the server. `plugins/chunk-error-recovery.client.ts`
    // catches these in `app:error` and forces a single page reload, which transparently
    // recovers the user. The error here is just noise from a self-healing condition —
    // keep this list in sync with `isChunkLoadError()` in that plugin.
    /Loading chunk \d+ failed/,
    /Loading CSS chunk \d+ failed/,
    /Importing a module script failed/i, // Mobile Safari / iOS
    /Failed to fetch dynamically imported module/i, // Chrome / Firefox
    /error loading dynamically imported module/i, // Vite generic
    /Unable to preload CSS/i, // Vite CSS preload
    // User aborted requests
    'AbortError',
    'The user aborted a request',
    // Safari push permission quirks
    'NotAllowedError',
    // Facebook in-app browser injects its own JS that tries to reach the native Facebook app via
    // window.webkit.messageHandlers. That bridge isn't available in every FBIAB context, so the
    // injected script crashes — at our URL, so Sentry blames us. Not our code; not actionable.
    /window\.webkit\.messageHandlers/,
    "undefined is not an object (evaluating 'window.webkit.messageHandlers')",
  ],

  debug: false,
})
