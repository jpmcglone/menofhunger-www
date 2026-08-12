import { describe, expect, it } from 'vitest'

/**
 * Structural guard: spaces notify/schedule live updates must patch in place via
 * `spaces:updated`, not only via HTTP refresh after Notify me.
 */
describe('spaces updated realtime wiring (structural)', () => {
  async function read(path: string) {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    return readFileSync(resolve(process.cwd(), path), 'utf8')
  }

  it('listens for spaces:updated and exposes onUpdated on SpacesCallback', async () => {
    const domains = await read('composables/presence/usePresenceDomains.ts')
    const types = await read('composables/presence/types.ts')
    expect(domains).toMatch(/socket\.on\('spaces:updated'/)
    expect(types).toMatch(/onUpdated\?:\s*\(payload:\s*SpacesUpdatedPayload\)/)
  })

  it('patches the lobby cache from spaces:updated without clobbering viewer flags', async () => {
    const lobby = await read('composables/useSpaceLobby.ts')
    const spaces = await read('composables/useSpaces.ts')
    expect(lobby).toMatch(/onUpdated:\s*\(payload\)\s*=>\s*\{/)
    expect(lobby).toMatch(/patchSpace\(/)
    expect(spaces).toMatch(/function patchSpace\(/)
    expect(spaces).toMatch(/upsertSpace\(\{\s*\.\.\.existing,\s*\.\.\.patch\s*\}\)/)
  })
})
