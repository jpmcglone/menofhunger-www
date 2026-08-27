import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')

describe('online presence realtime wiring', () => {
  it('dispatches platform changes through the shared presence composable', () => {
    const presence = readFileSync(
      resolve(root, 'composables/presence/usePresenceOnline.ts'),
      'utf8',
    )

    expect(presence).toContain("socket.on('presence:platforms-changed'")
    expect(presence).toContain('cb.onPlatformsChanged?.(data)')
  })

  it('patches existing online rows and preserves platform badges across snapshots', () => {
    const page = readFileSync(resolve(root, 'pages/online.vue'), 'utf8')

    expect(page).toContain('onPlatformsChanged(payload)')
    expect(page).toContain('user.id === payload.userId ? { ...user, platforms: payload.platforms }')
    expect(page).toContain('platforms: user.platforms ?? previousById.get(user.id)?.platforms')
    expect(page).toContain('recentUsers.value = [')
  })

  it('keeps an empty Recently section compact', () => {
    const page = readFileSync(resolve(root, 'pages/online.vue'), 'utf8')

    expect(page).toContain("recentlyOnlineUsers.length ? 'pt-8 pb-2' : 'pt-5 pb-3'")
    expect(page).toContain("{{ recentUsers.length === 0 ? 'No one recently around.' : 'No one in the last hour.' }}")
    expect(page).toContain("recentlyOnlineUsers.length ? 'pt-8' : 'pt-4'")
    expect(page).not.toMatch(/No one in the last hour\.\s*<\/div>\s*<div v-if="olderOnlineUsers\.length" class="px-4 pt-8/)
  })

  it('sorts most-recently-connected first, matching iOS', () => {
    const page = readFileSync(resolve(root, 'pages/online.vue'), 'utf8')

    expect(page).toContain('const ta = a.lastConnectAt ?? 0')
    expect(page).toContain('if (ta !== tb) return tb - ta')
    expect(page).not.toContain('return ta - tb')
  })
})
