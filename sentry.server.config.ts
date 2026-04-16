import * as Sentry from '@sentry/nuxt'
import { scrubSentryEvent } from '~/utils/sentry-scrub'

const config = useRuntimeConfig()
const dsn = String(config.public?.sentry?.dsn || '').trim()
const environment = String(config.public?.sentry?.environment || '').trim() || undefined
const isProd = environment === 'production'

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  environment,

  // 100% in dev/staging; 20% in production to stay within quota.
  tracesSampleRate: isProd ? 0.2 : 1.0,

  // Include request + user metadata so we can correlate SSR errors with affected
  // users. Actual PII (cookies, tokens, auth headers, etc.) is stripped by the
  // scrubber below. See `utils/sentry-scrub.ts` and `docs/observability.md`.
  sendDefaultPii: true,

  beforeSend(event) {
    return scrubSentryEvent(event)
  },
  beforeSendTransaction(event) {
    return scrubSentryEvent(event)
  },

  // Keep Sentry event capture enabled, but avoid extra SDK info logs in dev SSR.
  enableLogs: false,
  debug: false,
})
