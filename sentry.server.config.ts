import * as Sentry from '@sentry/nuxt'

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

  sendDefaultPii: true,
  enableLogs: true,
  debug: false,
})
