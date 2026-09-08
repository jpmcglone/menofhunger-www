import { defineVitestConfig } from '@nuxt/test-utils/config'
import { fileURLToPath } from 'node:url'

export default defineVitestConfig({
  test: {
    alias: {
      '@sentry/nuxt': fileURLToPath(new URL('./tests/stubs/sentry.ts', import.meta.url)),
      'posthog-js': fileURLToPath(new URL('./tests/stubs/posthog.ts', import.meta.url)),
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
