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
    expect(presence).toContain("socket.on('presence:anonymous-count'")
    expect(presence).toContain('cb.onAnonymousCount?.(data)')
  })

  it('sends a stable anon id on logged-out socket connect', () => {
    const core = readFileSync(
      resolve(root, 'composables/presence/usePresenceSocketCore.ts'),
      'utf8',
    )

    expect(core).toContain('if (!didAttempt.value) return')
    expect(core).toContain("window.location.pathname === '/login'")
    expect(core).toContain('query.anon = anonViewId.value')
    expect(core).toContain('if (!user.value && didAttempt.value && anonViewId.value)')
  })

  it('does not count the login wall as a guest', () => {
    const presence = readFileSync(resolve(root, 'composables/usePresence.ts'), 'utf8')

    expect(presence).toContain("curr.path === '/login'")
    expect(presence).toContain('if (!curr.userId && curr.path === \'/login\')')
  })

  it('starts the connect watcher once per tab, not once per usePresence() caller', () => {
    const presence = readFileSync(resolve(root, 'composables/usePresence.ts'), 'utf8')
    const core = readFileSync(resolve(root, 'composables/presence/usePresenceSocketCore.ts'), 'utf8')

    expect(presence).toContain("const PRESENCE_LIFECYCLE_FLAG = '__mohPresenceLifecycleStarted'")
    expect(presence).toContain('function claimPresenceLifecycle')
    expect(presence).toContain('if (claimPresenceLifecycle())')
    expect(presence).toContain('effectScope(true).run')
    expect(core).toContain("const SOCKET_IDENTITY_PROP = '__mohIdentity'")
    expect(core).toContain('function stampIdentity')
    expect(core).toContain('existingKey === null || existingKey === key')
  })

  it('shows a muted guest count next to the online-now subtitle', () => {
    const page = readFileSync(resolve(root, 'pages/online.vue'), 'utf8')

    expect(page).toContain("anonymousOnline === 1 ? 'guest' : 'guests'")
    expect(page).toContain('onAnonymousCount(payload)')
    expect(page).toContain('anonymousOnline.value = Math.max(0, Math.floor(payload.anonymousOnline))')
  })

  it('patches existing online rows and preserves platform badges across snapshots', () => {
    const page = readFileSync(resolve(root, 'pages/online.vue'), 'utf8')

    expect(page).toContain('onPlatformsChanged(payload)')
    expect(page).toContain('user.id === payload.userId ? { ...user, platforms: payload.platforms }')
    expect(page).toContain('platforms: user.platforms ?? prev?.platforms')
    expect(page).toContain('hydrateFollowRelationship(prev?.relationship, user.relationship)')
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
