import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readFromRepo(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

describe('useApiClient guardrails (structural)', () => {
  it('keeps SSR inflight dedupe request-scoped (no module-scope growth)', () => {
    const src = readFromRepo('composables/useApiClient.ts')
    expect(src).toMatch(/function\s+inflightMapForCurrentContext\(\)/)
    expect(src).toMatch(/useRequestEvent\(\)/)
    expect(src).toMatch(/mohApiInflight/)
  })

  it('keeps client inflight/cache module-scoped (explicitly client-only)', () => {
    const src = readFromRepo('composables/useApiClient.ts')
    expect(src).toMatch(/const\s+clientInflight\s*=\s*new\s+Map/)
    expect(src).toMatch(/const\s+clientResponseCache\s*=\s*new\s+Map/)
    expect(src).not.toMatch(/const\s+inflight\s*=\s*new\s+Map/)
    expect(src).not.toMatch(/const\s+responseCache\s*=\s*new\s+Map/)
  })
})

