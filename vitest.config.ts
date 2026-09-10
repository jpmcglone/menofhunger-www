import { defineVitestConfig } from '@nuxt/test-utils/config'
import { fileURLToPath } from 'node:url'

export default defineVitestConfig({
  test: {
    alias: {
      // Client plugins boot in every Nuxt test app. Keep these SDKs inert:
      // Sentry/PostHog must not start telemetry, and socket.io must not open
      // `ws` (happy-dom throws `Illegal invocation` on WebSocket.close).
      '@sentry/nuxt': fileURLToPath(new URL('./tests/stubs/sentry.ts', import.meta.url)),
      'posthog-js': fileURLToPath(new URL('./tests/stubs/posthog.ts', import.meta.url)),
      'socket.io-client': fileURLToPath(new URL('./tests/stubs/socket.io-client.ts', import.meta.url)),
    },
    environment: 'nuxt',
    globals: true,
    include: ['tests/**/*.{test,spec}.ts'],
    environmentOptions: {
      nuxt: {
        domEnvironment: 'happy-dom',
        // The deploy-manifest poller outlives Nuxt's test DOM. It belongs to
        // browser integration checks, not isolated unit-test app instances.
        overrides: { experimental: { appManifest: false } },
      },
    },
  },
})
