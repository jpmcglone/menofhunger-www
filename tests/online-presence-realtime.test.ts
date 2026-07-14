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

  it('matches the API and iOS longest-online-first ordering', () => {
    const page = readFileSync(resolve(root, 'pages/online.vue'), 'utf8')

    expect(page).toContain('const ta = a.lastConnectAt ?? Number.POSITIVE_INFINITY')
    expect(page).toContain('if (ta !== tb) return ta - tb')
    expect(page).not.toContain('return tb - ta')
  })
})
