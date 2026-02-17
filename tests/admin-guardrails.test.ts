import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readFromRepo(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

describe('admin guardrails (structural)', () => {
  it('admin middleware hides admin pages from non-admins with 404 (not 401/403)', () => {
    const src = readFromRepo('middleware/admin.ts')
    expect(src).toMatch(/siteAdmin/)
    expect(src).toMatch(/createError\(\{\s*statusCode:\s*404/)
    expect(src).toMatch(/statusMessage:\s*'Not Found'/)
  })
})

