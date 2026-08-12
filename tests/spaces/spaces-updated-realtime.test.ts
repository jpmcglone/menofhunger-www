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
    expect(spaces).toMatch(/upsertSpace\(\{\s*\.\.\.existing,\s*\.\.\.rest\s*\}\)/)
  })

  it('patches mode changes and removes deleted spaces from the lobby cache', async () => {
    const lobby = await read('composables/useSpaceLobby.ts')
    const spaces = await read('composables/useSpaces.ts')
    expect(lobby).toMatch(/onModeChanged:\s*\(payload\)\s*=>\s*\{/)
    expect(spaces).toMatch(/function removeSpace\(/)
    expect(spaces).toMatch(/if \(patch\.deleted\)/)
  })

  it('subscribes to lobby counts from the app shell, not page unmount', async () => {
    const layout = await read('layouts/app.vue')
    const index = await read('pages/spaces/index.vue')
    const spacePage = await read('pages/s/[username].vue')
    expect(layout).toMatch(/subscribeLobbyCounts\(/)
    expect(layout).toMatch(/unsubscribeLobbyCounts\(/)
    expect(index).not.toMatch(/unsubscribeLobbyCounts/)
    expect(index).not.toMatch(/1500/)
    expect(spacePage).not.toMatch(/unsubscribeLobbyCounts/)
  })

  it('binds live listener badges and hides preview chrome', async () => {
    const row = await read('components/app/AppSpaceRow.vue')
    expect(row).toMatch(/lobbyCountForSpace/)
    expect(row).toMatch(/v-if="!preview"/)
  })

  it('keeps a single AppRadioBar instance via Teleport', async () => {
    const layout = await read('layouts/app.vue')
    const mounts = layout.match(/<AppRadioBar\s*\/>/g) ?? []
    expect(mounts.length).toBe(1)
    expect(layout).toMatch(/<Teleport/)
  })
})
