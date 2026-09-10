import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('unit-test CI stubs', () => {
  it('aliases telemetry and socket transports so happy-dom never opens them', () => {
    const config = readFileSync(resolve(import.meta.dirname, '../vitest.config.ts'), 'utf8')
    expect(config).toContain("'@sentry/nuxt'")
    expect(config).toContain('./tests/stubs/sentry.ts')
    expect(config).toContain("'posthog-js'")
    expect(config).toContain('./tests/stubs/posthog.ts')
    expect(config).toContain("'socket.io-client'")
    expect(config).toContain('./tests/stubs/socket.io-client.ts')
  })
})
