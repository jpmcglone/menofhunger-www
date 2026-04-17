import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readFromRepo(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

describe('useAuth hydration guardrails (structural)', () => {
  it('keeps auth badge count useState refs at setup scope', () => {
    const src = readFromRepo('composables/useAuth.ts')
    expect(src).toMatch(/const\s+notifCount\s*=\s*useState<number>\('notifications-undelivered-count'/)
    expect(src).toMatch(
      /const\s+messageUnreadCounts\s*=\s*useState<\{\s*primary:\s*number;\s*requests:\s*number\s*\}>\('messages-unread-counts'/,
    )
  })

  it('does not call useState inside me\(\) after awaiting /auth/me', () => {
    const src = readFromRepo('composables/useAuth.ts')
    const meBlock =
      src.match(/async function me\(\): Promise<AuthUser \| null> \{[\s\S]*?\n {2}\}\n\n {2}async function ensureLoaded/)?.[0] ?? ''
    expect(meBlock).toContain(`await apiFetch<AuthUser | null>('/auth/me'`)
    expect(meBlock).not.toMatch(/useState<|useState\(/)
    expect(meBlock).toMatch(/notifCount\.value\s*=/)
    expect(meBlock).toMatch(/messageUnreadCounts\.value\s*=/)
  })

  it('keeps SSR auth init cookie-gated before /auth/me fetch', () => {
    const src = readFromRepo('composables/useAuth.ts')
    expect(src).toMatch(/if \(import\.meta\.server\) \{/)
    expect(src).toMatch(/const cookieHeader = useRequestHeaders\(\['cookie'\]\)\.cookie/)
    expect(src).toMatch(/if \(!cookieHeader\?\.includes\('moh_session='\)\) \{\s*didAttempt\.value = true/)
    expect(src).toMatch(/await ensureLoaded\(\)/)
  })
})

